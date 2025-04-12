<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');
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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');
header('Content-Type: application/json');

// Log start of request processing
logError("Dashboard.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'query' => $_GET
]);

try {
    // Check if this is an admin metrics request
    $isAdminMetricsRequest = isset($_GET['admin']) && $_GET['admin'] === 'true';
    
    // Get period filter if provided (today, week, month)
    $period = isset($_GET['period']) ? $_GET['period'] : 'week';
    
    // Get status filter if provided
    $statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
    
    // Get the timestamp to help prevent caching
    $timestamp = isset($_GET['_t']) ? $_GET['_t'] : time();
    
    // Explicitly get user_id from different sources (in priority order)
    // 1. Query parameter
    $userIdFromQuery = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    // 2. Header parameter (X-User-ID)
    $headers = getallheaders();
    $userIdFromHeader = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-user-id' && !empty($value)) {
            $userIdFromHeader = intval($value);
            break;
        }
    }
    
    // Log the parameters
    logError("Request parameters", [
        'period' => $period,
        'status' => $statusFilter,
        'timestamp' => $timestamp,
        'admin' => $isAdminMetricsRequest ? 'true' : 'false',
        'user_id_query' => $userIdFromQuery,
        'user_id_header' => $userIdFromHeader
    ]);
    
    // Authenticate user with improved logging
    $headers = getallheaders();
    logError("Request headers", ['headers' => array_keys($headers)]);
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("Missing authorization header");
        sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
        exit;
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    logError("Token received", ['token_length' => strlen($token), 'token_parts' => substr_count($token, '.') + 1]);
    
    // Special handling for demo token
    if (strpos($token, 'demo_token_') === 0) {
        logError("Demo token detected, providing demo data");
        
        // Create demo metrics with valid array for availableStatuses
        $defaultStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        
        $demoMetrics = [
            'totalBookings' => 45,
            'activeRides' => 8,
            'totalRevenue' => 85000,
            'availableDrivers' => 12,
            'busyDrivers' => 8,
            'avgRating' => 4.7,
            'upcomingRides' => 15,
            'availableStatuses' => $defaultStatuses,
            'currentFilter' => $statusFilter
        ];
        
        if ($isAdminMetricsRequest) {
            sendJsonResponse(['status' => 'success', 'data' => $demoMetrics]);
            exit;
        }
        
        // Return demo bookings (already handled by bookings.php)
        sendJsonResponse(['status' => 'success', 'message' => 'Please use the /api/user/bookings.php endpoint for bookings data']);
        exit;
    }
    
    $userData = verifyJwtToken($token);
    if (!$userData || !isset($userData['user_id'])) {
        logError("Authentication failed in dashboard.php", [
            'token_length' => strlen($token),
            'token_parts' => substr_count($token, '.') + 1
        ]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token. Please login again.'], 401);
        exit;
    }
    
    // Use the explicit user_id from query or header parameters if provided, otherwise use the one from token
    $userId = $userIdFromQuery ?: ($userIdFromHeader ?: $userData['user_id']);
    $isAdmin = isset($userData['role']) && $userData['role'] === 'admin';
    
    logError("User authenticated successfully", [
        'user_id_from_token' => $userData['user_id'],
        'user_id_used' => $userId,
        'is_admin' => $isAdmin ? 'true' : 'false',
        'token_parts' => substr_count($token, '.') + 1
    ]);

    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        logError("Database connection failed in dashboard.php");
        throw new Exception('Database connection failed');
    }

    // If this is an admin metrics request and the user is an admin
    if ($isAdmin) {
        logError("Processing admin metrics request", [
            'period' => $period, 
            'status' => $statusFilter,
            'user_id' => $userId
        ]);
        
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
        
        // Add user_id filter for the specific admin if we have it
        if ($userId) {
            if (strpos($dateCondition, 'WHERE') !== false) {
                $dateCondition .= " AND user_id = " . intval($userId);
            } else {
                $dateCondition = "WHERE user_id = " . intval($userId);
            }
            
            logError("Added user_id filter to SQL condition", ['user_id' => $userId]);
        }
        
        // Log the SQL condition being used
        logError("SQL condition for metrics", ['sql_condition' => $dateCondition]);
        
        // Get total bookings for the period
        $totalBookingsQuery = "SELECT COUNT(*) as total FROM bookings $dateCondition";
        $totalBookingsResult = $conn->query($totalBookingsQuery);
        
        if (!$totalBookingsResult) {
            logError("SQL error in total bookings query", ['error' => $conn->error]);
            throw new Exception("Database error: " . $conn->error);
        }
        
        $totalBookings = $totalBookingsResult->fetch_assoc()['total'] ?? 0;
        
        // Get active rides (confirmed status with today's date)
        $activeRidesCondition = "WHERE status = 'confirmed' AND DATE(pickup_date) = CURDATE()";
        if (!empty($statusFilter) && $statusFilter !== 'all') {
            $activeRidesCondition = "WHERE status = '" . $conn->real_escape_string($statusFilter) . "' AND DATE(pickup_date) = CURDATE()";
        }
        $activeRidesQuery = "SELECT COUNT(*) as total FROM bookings $activeRidesCondition";
        $activeRidesResult = $conn->query($activeRidesQuery);
        
        if (!$activeRidesResult) {
            logError("SQL error in active rides query", ['error' => $conn->error]);
            // Don't throw exception, just log and continue with 0 value
            $activeRides = 0;
        } else {
            $activeRides = $activeRidesResult->fetch_assoc()['total'] ?? 0;
        }
        
        // Get total revenue for the period
        $totalRevenueQuery = "SELECT SUM(total_amount) as total FROM bookings $dateCondition";
        $totalRevenueResult = $conn->query($totalRevenueQuery);
        
        if (!$totalRevenueResult) {
            logError("SQL error in total revenue query", ['error' => $conn->error]);
            // Don't throw exception, just log and continue with 0 value
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
            logError("SQL error in upcoming rides query", ['error' => $conn->error]);
            // Don't throw exception, just log and continue with 0 value
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
                if (!empty($statusRow['status'])) {
                    $statuses[] = $statusRow['status'];
                }
            }
        }
        
        // Define a default set of statuses
        $defaultStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        
        // Ensure statuses is always an array with at least the default values
        if (!is_array($statuses) || empty($statuses)) {
            $statuses = $defaultStatuses;
        }
        
        // Make sure all default statuses are included
        foreach ($defaultStatuses as $defaultStatus) {
            if (!in_array($defaultStatus, $statuses)) {
                $statuses[] = $defaultStatus;
            }
        }
        
        // Simulate driver metrics (since drivers table might not exist)
        $availableDrivers = 12;
        $busyDrivers = 8;
        
        // Get average rating (simulated)
        $avgRating = 4.7;
        
        // Prepare the metrics response - ensure it's a properly formatted array for JSON encoding
        $metricsData = [
            'totalBookings' => (int)$totalBookings,
            'activeRides' => (int)$activeRides,
            'totalRevenue' => (float)$totalRevenue,
            'availableDrivers' => (int)$availableDrivers,
            'busyDrivers' => (int)$busyDrivers,
            'avgRating' => (float)$avgRating,
            'upcomingRides' => (int)$upcomingRides,
            'availableStatuses' => $statuses, // This is now guaranteed to be an array with values
            'currentFilter' => $statusFilter
        ];
        
        logError("Sending admin metrics response", ['metrics' => $metricsData, 'period' => $period, 'user_id' => $userId]);
        
        // Always include current user_id in the response for verification
        $metricsData['userId'] = $userId;
        
        // Return the metrics data - ensure we return as data property
        sendJsonResponse(['status' => 'success', 'data' => $metricsData]);
        exit;
    }

    // Get user's bookings - adding more logging for debugging
    logError("Preparing to fetch bookings for user", ['user_id' => $userId]);

    $stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
    if (!$stmt) {
        logError("Prepare statement failed", ['error' => $conn->error]);
        throw new Exception('Database prepare error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logError("Execute statement failed", ['error' => $stmt->error]);
        throw new Exception('Database execute error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logError("Get result failed", ['error' => $stmt->error]);
        throw new Exception('Database result error: ' . $stmt->error);
    }

    // Debug: Log the SQL query for debugging
    logError("SQL Query executed", [
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
            'passengerName' => $row['passenger_name'] ?? $userData['name'],
            'passengerPhone' => $row['passenger_phone'] ?? '',
            'passengerEmail' => $row['passenger_email'] ?? $userData['email'],
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
        $bookings[] = $booking;
    }

    // Log count of real bookings found
    logError("Real bookings found", ['count' => count($bookings), 'user_id' => $userId]);

    // Use the consistent response format - always send as an array property with userId
    sendJsonResponse(['status' => 'success', 'bookings' => $bookings, 'userId' => $userId]);
    
} catch (Exception $e) {
    logError("Exception in dashboard.php", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    // Return fallback data with valid availableStatuses
    $fallbackData = [
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'data' => [
            'totalBookings' => 0,
            'activeRides' => 0,
            'totalRevenue' => 0,
            'availableDrivers' => 0,
            'busyDrivers' => 0,
            'avgRating' => 0,
            'upcomingRides' => 0,
            'availableStatuses' => ['pending', 'confirmed', 'completed', 'cancelled'],
            'currentFilter' => 'all'
        ]
    ];
    
    sendJsonResponse($fallbackData, 500);
}

// Helper function to send JSON responses with a consistent format
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
