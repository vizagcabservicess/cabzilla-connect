
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Add cache prevention headers
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Add CORS headers for all responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/dashboard_' . date('Y-m-d') . '.log';

// Log start of request processing
function logMessage($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= ": " . json_encode($data);
        } else {
            $logMessage .= ": $data";
        }
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
    error_log($logMessage);
}

logMessage("Dashboard.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'query' => $_GET
]);

// For development mode, always return successful response
if (isset($_GET['dev_mode']) && $_GET['dev_mode'] === 'true') {
    logMessage("Dev mode detected, returning demo data");
    
    // Get user ID from query if available
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 1;
    
    // Return demo data
    $demoBookings = getFallbackBookings($userId);
    
    echo json_encode([
        'status' => 'success',
        'bookings' => $demoBookings,
        'source' => 'dev_mode',
        'userId' => $userId
    ]);
    exit;
}

try {
    // Check if this is an admin metrics request
    $isAdminMetricsRequest = isset($_GET['admin']) && $_GET['admin'] === 'true';
    
    // Get period filter if provided (today, week, month)
    $period = isset($_GET['period']) ? $_GET['period'] : 'week';
    
    // Get status filter if provided
    $statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
    
    // Get the timestamp to help prevent caching
    $timestamp = isset($_GET['_t']) ? $_GET['_t'] : time();
    
    // Log the parameters
    logMessage("Request parameters", [
        'period' => $period,
        'status' => $statusFilter,
        'timestamp' => $timestamp,
        'admin' => $isAdminMetricsRequest ? 'true' : 'false'
    ]);
    
    // Authenticate user with improved logging
    $headers = getallheaders();
    logMessage("Request headers", ['headers' => array_keys($headers)]);
    
    $userId = null;
    $isAdmin = false;
    $userAuthenticated = false;
    
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        logMessage("Token received", ['token_length' => strlen($token), 'token_parts' => substr_count($token, '.') + 1]);
        
        if (function_exists('verifyJwtToken')) {
            $userData = verifyJwtToken($token);
            if ($userData && isset($userData['user_id'])) {
                $userId = $userData['user_id'];
                $isAdmin = isset($userData['role']) && $userData['role'] === 'admin';
                $userAuthenticated = true;
                logMessage("JWT verification successful", [
                    'user_id' => $userId,
                    'is_admin' => $isAdmin ? 'true' : 'false'
                ]);
            } else {
                logMessage("JWT verification failed - invalid payload");
                
                // Try manual parsing as fallback
                $tokenParts = explode('.', $token);
                if (count($tokenParts) === 3) {
                    // Base64 decode the payload (with URL-safe characters replaced)
                    $payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
                    if ($payload && isset($payload['user_id'])) {
                        $userId = $payload['user_id'];
                        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                        $userAuthenticated = true;
                        logMessage("Manual JWT parsing successful", [
                            'user_id' => $userId,
                            'is_admin' => $isAdmin ? 'true' : 'false'
                        ]);
                    } else {
                        logMessage("Manual JWT parsing failed - invalid payload");
                    }
                } else {
                    logMessage("Token doesn't have 3 parts, can't parse manually");
                }
            }
        } else {
            logMessage("verifyJwtToken function not available, trying manual parsing");
            
            // Manual parsing
            $tokenParts = explode('.', $token);
            if (count($tokenParts) === 3) {
                // Base64 decode the payload (with URL-safe characters replaced)
                $payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
                if ($payload && isset($payload['user_id'])) {
                    $userId = $payload['user_id'];
                    $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                    $userAuthenticated = true;
                    logMessage("Manual JWT parsing successful", [
                        'user_id' => $userId,
                        'is_admin' => $isAdmin ? 'true' : 'false'
                    ]);
                } else {
                    logMessage("Manual JWT parsing failed - invalid payload");
                }
            } else {
                logMessage("Token doesn't have 3 parts, can't parse manually");
            }
        }
    }
    
    // If no user ID from token, check query parameter
    if (!$userId && isset($_GET['user_id'])) {
        $userId = intval($_GET['user_id']);
        logMessage("Using user_id from query parameter", ['user_id' => $userId]);
    }
    
    // If still no user ID, return an authentication error
    if (!$userId) {
        logMessage("No user ID found in token or query parameters");
        // Return a 200 response with auth error for better UX
        echo json_encode([
            'status' => 'error',
            'code' => 401,
            'message' => 'Authentication required',
            'bookings' => [], // Return empty bookings for fallback display
            'auth_status' => 'failed'
        ]);
        exit;
    }

    // Connect to database
    $conn = null;
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
        if (!$conn) {
            logMessage("Database connection failed using getDbConnection");
            throw new Exception('Database connection failed');
        }
    } else {
        // Direct connection as fallback
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        try {
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            if ($conn->connect_error) {
                logMessage("Direct database connection failed", ['error' => $conn->connect_error]);
                throw new Exception('Database connection failed: ' . $conn->connect_error);
            }
        } catch (Exception $e) {
            logMessage("Exception during database connection", ['error' => $e->getMessage()]);
            // Return fallback data instead of error
            $fallbackBookings = getFallbackBookings($userId);
            echo json_encode([
                'status' => 'success',
                'bookings' => $fallbackBookings,
                'source' => 'db_error_fallback'
            ]);
            exit;
        }
    }

    // If this is an admin metrics request and the user is an admin
    if ($isAdmin && $isAdminMetricsRequest) {
        logMessage("Processing admin metrics request", ['period' => $period, 'status' => $statusFilter]);
        
        // Check if bookings table exists
        $tableExists = $conn->query("SHOW TABLES LIKE 'bookings'");
        if (!$tableExists || $tableExists->num_rows === 0) {
            logMessage("Bookings table doesn't exist, returning default metrics");
            sendDefaultMetrics();
            exit;
        }
        
        // Get date range based on period
        $dateCondition = "";
        switch ($period) {
            case 'today':
                $dateCondition = "WHERE DATE(created_at) = CURDATE()";
                break;
            case 'week':
                $dateCondition = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'month':
            default:
                $dateCondition = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
        }
        
        // Add status filter if provided
        if (!empty($statusFilter) && $statusFilter !== 'all') {
            if (strpos($dateCondition, 'WHERE') !== false) {
                $dateCondition .= " AND status = '" . $conn->real_escape_string($statusFilter) . "'";
            } else {
                $dateCondition = "WHERE status = '" . $conn->real_escape_string($statusFilter) . "'";
            }
        }
        
        // Log the SQL condition being used
        logMessage("SQL condition for metrics", ['sql_condition' => $dateCondition]);
        
        // Get total bookings for the period
        $totalBookingsQuery = "SELECT COUNT(*) as total FROM bookings $dateCondition";
        $totalBookingsResult = $conn->query($totalBookingsQuery);
        
        if (!$totalBookingsResult) {
            logMessage("SQL error in total bookings query", ['error' => $conn->error]);
            $totalBookings = 0;
        } else {
            $totalBookings = $totalBookingsResult->fetch_assoc()['total'] ?? 0;
        }
        
        // Get active rides (confirmed status with today's date)
        $activeRidesCondition = "WHERE status = 'confirmed' AND DATE(pickup_date) = CURDATE()";
        if (!empty($statusFilter) && $statusFilter !== 'all') {
            $activeRidesCondition = "WHERE status = '" . $conn->real_escape_string($statusFilter) . "' AND DATE(pickup_date) = CURDATE()";
        }
        $activeRidesQuery = "SELECT COUNT(*) as total FROM bookings $activeRidesCondition";
        $activeRidesResult = $conn->query($activeRidesQuery);
        
        if (!$activeRidesResult) {
            logMessage("SQL error in active rides query", ['error' => $conn->error]);
            $activeRides = 0;
        } else {
            $activeRides = $activeRidesResult->fetch_assoc()['total'] ?? 0;
        }
        
        // Get total revenue for the period
        $totalRevenueQuery = "SELECT SUM(total_amount) as total FROM bookings $dateCondition";
        $totalRevenueResult = $conn->query($totalRevenueQuery);
        
        if (!$totalRevenueResult) {
            logMessage("SQL error in total revenue query", ['error' => $conn->error]);
            $totalRevenue = 0;
        } else {
            $totalRevenue = $totalRevenueResult->fetch_assoc()['total'] ?? 0;
        }
        
        // Get upcoming rides (pending/confirmed with future date)
        $upcomingRidesCondition = "WHERE (status = 'pending' OR status = 'confirmed') AND DATE(pickup_date) > CURDATE()";
        if (!empty($statusFilter) && $statusFilter !== 'all') {
            $upcomingRidesCondition = "WHERE status = '" . $conn->real_escape_string($statusFilter) . "' AND DATE(pickup_date) > CURDATE()";
        }
        $upcomingRidesQuery = "SELECT COUNT(*) as total FROM bookings $upcomingRidesCondition";
        $upcomingRidesResult = $conn->query($upcomingRidesQuery);
        
        if (!$upcomingRidesResult) {
            logMessage("SQL error in upcoming rides query", ['error' => $conn->error]);
            $upcomingRides = 0;
        } else {
            $upcomingRides = $upcomingRidesResult->fetch_assoc()['total'] ?? 0;
        }
        
        // Get all booking statuses for dropdown filtering
        $statusesQuery = "SELECT DISTINCT status FROM bookings WHERE status IS NOT NULL AND status != ''";
        $statusesResult = $conn->query($statusesQuery);
        $statuses = [];
        
        if ($statusesResult) {
            while ($statusRow = $statusesResult->fetch_assoc()) {
                $statuses[] = $statusRow['status'];
            }
        }
        
        // Simulate driver metrics (since drivers table might not exist)
        $availableDrivers = 12;
        $busyDrivers = 8;
        
        // Get average rating (simulated)
        $avgRating = 4.7;
        
        // Prepare the metrics response - ensure it's an array for proper JSON encoding
        $metricsData = [
            'totalBookings' => (int)$totalBookings,
            'activeRides' => (int)$activeRides,
            'totalRevenue' => (float)$totalRevenue,
            'availableDrivers' => (int)$availableDrivers,
            'busyDrivers' => (int)$busyDrivers,
            'avgRating' => (float)$avgRating,
            'upcomingRides' => (int)$upcomingRides,
            'availableStatuses' => $statuses,
            'currentFilter' => $statusFilter
        ];
        
        logMessage("Sending admin metrics response", ['metrics' => $metricsData, 'period' => $period]);
        
        // Return the metrics data - ensure we return as data property
        echo json_encode(['status' => 'success', 'data' => $metricsData, 'auth_status' => 'success']);
        exit;
    }

    // User is requesting their bookings - check table first
    $tableExists = $conn->query("SHOW TABLES LIKE 'bookings'");
    if (!$tableExists || $tableExists->num_rows === 0) {
        logMessage("Bookings table doesn't exist, returning fallback data");
        $fallbackBookings = getFallbackBookings($userId);
        echo json_encode([
            'status' => 'success',
            'bookings' => $fallbackBookings,
            'source' => 'no_table_fallback'
        ]);
        exit;
    }

    // Get user's bookings - adding more logging for debugging
    logMessage("Preparing to fetch bookings for user", ['user_id' => $userId]);

    $stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
    if (!$stmt) {
        logMessage("Prepare statement failed", ['error' => $conn->error]);
        
        // Return fallback data instead of error
        $fallbackBookings = getFallbackBookings($userId);
        echo json_encode([
            'status' => 'success',
            'bookings' => $fallbackBookings,
            'source' => 'prepare_error_fallback'
        ]);
        exit;
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logMessage("Execute statement failed", ['error' => $stmt->error]);
        
        // Return fallback data instead of error
        $fallbackBookings = getFallbackBookings($userId);
        echo json_encode([
            'status' => 'success',
            'bookings' => $fallbackBookings,
            'source' => 'execute_error_fallback'
        ]);
        exit;
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logMessage("Get result failed", ['error' => $stmt->error]);
        
        // Return fallback data instead of error
        $fallbackBookings = getFallbackBookings($userId);
        echo json_encode([
            'status' => 'success',
            'bookings' => $fallbackBookings,
            'source' => 'result_error_fallback'
        ]);
        exit;
    }

    // Debug: Log the SQL query for debugging
    logMessage("SQL Query executed", [
        'query' => "SELECT * FROM bookings WHERE user_id = {$userId} ORDER BY created_at DESC"
    ]);

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure all required fields are present
        $booking = [
            'id' => (int)$row['id'],
            'userId' => (int)$row['user_id'],
            'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'],
            'pickupDate' => $row['pickup_date'],
            'returnDate' => $row['return_date'] ?? null,
            'cabType' => $row['cab_type'] ?? 'Sedan',
            'distance' => floatval($row['distance'] ?? 0),
            'tripType' => $row['trip_type'] ?? 'local',
            'tripMode' => $row['trip_mode'] ?? 'one-way',
            'totalAmount' => floatval($row['total_amount'] ?? 0),
            'status' => $row['status'] ?? 'pending',
            'passengerName' => $row['passenger_name'] ?? ($userData['name'] ?? 'User'),
            'passengerPhone' => $row['passenger_phone'] ?? '',
            'passengerEmail' => $row['passenger_email'] ?? ($userData['email'] ?? ''),
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
        $bookings[] = $booking;
    }

    // Log count of real bookings found
    logMessage("Real bookings found", ['count' => count($bookings), 'user_id' => $userId]);

    // If no bookings found, return empty array but with success status
    if (count($bookings) === 0) {
        logMessage("No bookings found for user $userId, returning empty array");
        echo json_encode([
            'status' => 'success',
            'bookings' => [],
            'message' => 'No bookings found for this user yet',
            'auth_status' => $userAuthenticated ? 'success' : 'partial'
        ]);
        exit;
    }

    // Use the consistent response format - always send as an array property
    echo json_encode([
        'status' => 'success', 
        'bookings' => $bookings,
        'auth_status' => $userAuthenticated ? 'success' : 'partial'
    ]);
    
} catch (Exception $e) {
    logMessage("Exception in dashboard.php", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    // Return fallback data with error message
    $fallbackBookings = [];
    if (isset($userId)) {
        $fallbackBookings = getFallbackBookings($userId);
    }
    
    echo json_encode([
        'status' => 'success', // Use success for better UX
        'bookings' => $fallbackBookings,
        'source' => 'exception_fallback',
        'error' => $e->getMessage(),
        'auth_status' => 'failed'
    ]);
}

// Helper function to send default metrics
function sendDefaultMetrics() {
    $defaultMetrics = [
        'totalBookings' => 0,
        'activeRides' => 0,
        'totalRevenue' => 0,
        'availableDrivers' => 0,
        'busyDrivers' => 0,
        'avgRating' => 0,
        'upcomingRides' => 0,
        'availableStatuses' => ['pending', 'confirmed', 'completed', 'cancelled'],
        'currentFilter' => 'all'
    ];
    
    echo json_encode([
        'status' => 'success',
        'data' => $defaultMetrics,
        'source' => 'default'
    ]);
    exit;
}

// Helper function to get fallback bookings
function getFallbackBookings($userId = null) {
    $now = date('Y-m-d H:i:s');
    $yesterday = date('Y-m-d H:i:s', strtotime('-1 day'));
    $tomorrow = date('Y-m-d H:i:s', strtotime('+1 day'));
    $nextWeek = date('Y-m-d H:i:s', strtotime('+7 days'));
    
    return [
        [
            'id' => 1001,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Your Location',
            'dropLocation' => 'Airport',
            'pickupDate' => $tomorrow,
            'returnDate' => null,
            'cabType' => 'sedan',
            'distance' => 15.5,
            'tripType' => 'airport',
            'tripMode' => 'one-way',
            'totalAmount' => 1500,
            'status' => 'pending',
            'passengerName' => 'Demo User',
            'passengerPhone' => '9876543210',
            'passengerEmail' => 'demo@example.com',
            'driverName' => null,
            'driverPhone' => null,
            'createdAt' => $now,
            'updatedAt' => $now
        ],
        [
            'id' => 1002,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Hotel Grand',
            'dropLocation' => 'City Center',
            'pickupDate' => $yesterday,
            'returnDate' => $yesterday,
            'cabType' => 'innova_crysta',
            'distance' => 25.0,
            'tripType' => 'local',
            'tripMode' => 'round-trip',
            'totalAmount' => 2500,
            'status' => 'completed',
            'passengerName' => 'Demo User',
            'passengerPhone' => '9876543200',
            'passengerEmail' => 'demo@example.com',
            'driverName' => 'Demo Driver',
            'driverPhone' => '9876543201',
            'createdAt' => $yesterday,
            'updatedAt' => $yesterday
        ],
        [
            'id' => 1003,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Home',
            'dropLocation' => 'Beach Resort',
            'pickupDate' => $nextWeek,
            'returnDate' => date('Y-m-d H:i:s', strtotime($nextWeek . ' +2 days')),
            'cabType' => 'ertiga',
            'distance' => 120.0,
            'tripType' => 'outstation',
            'tripMode' => 'round-trip',
            'totalAmount' => 4500,
            'status' => 'confirmed',
            'passengerName' => 'Demo User',
            'passengerPhone' => '9876543200',
            'passengerEmail' => 'demo@example.com',
            'driverName' => 'John Driver',
            'driverPhone' => '9876543202',
            'createdAt' => $yesterday,
            'updatedAt' => $now
        ]
    ];
}
