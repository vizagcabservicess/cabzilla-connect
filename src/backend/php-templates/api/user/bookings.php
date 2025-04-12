
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Check if db_helper exists and include it
if (file_exists(__DIR__ . '/../common/db_helper.php')) {
    require_once __DIR__ . '/../common/db_helper.php';
}

// Set response headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-Force-User-Match');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Log request for debugging
error_log("Bookings API request received - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);
error_log("Bookings API query string: " . $_SERVER['QUERY_STRING']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Get user ID from multiple sources in priority order
$headers = getallheaders();
$userId = null;
$isAdmin = false;
$forceUserMatch = false;

error_log("User bookings request received with headers: " . json_encode($headers));

// Check for forced user match header
foreach ($headers as $key => $value) {
    $headerName = strtolower($key);
    if ($headerName === 'x-force-user-match' && $value === 'true') {
        $forceUserMatch = true;
        error_log("Force user match flag is set to true");
    }
    
    // Check for explicit user ID in header
    if ($headerName === 'x-user-id' && !empty($value)) {
        error_log("X-User-ID header found with value: $value");
        $explicitUserId = intval($value);
        if ($explicitUserId > 0) {
            error_log("Using explicit user ID from header: $explicitUserId");
            $userId = $explicitUserId; // Set initially, will validate against token below
        }
    }
}

// Also check for user_id in query string
if (isset($_GET['user_id']) && !empty($_GET['user_id'])) {
    $queryUserId = intval($_GET['user_id']);
    error_log("user_id in query string: $queryUserId");
    if (!$userId || $queryUserId > 0) {
        $userId = $queryUserId; // Use query parameter if no header value or if it's a valid ID
    }
}

// Extract authorization header manually - handle both camel case and lowercase
$authHeader = null;
foreach($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

$tokenUserId = null;

if ($authHeader) {
    $token = str_replace('Bearer ', '', $authHeader);
    
    error_log("Found auth token: " . substr($token, 0, 10) . "...");
    
    try {
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $tokenUserId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                error_log("User authenticated from token: $tokenUserId, isAdmin: " . ($isAdmin ? 'yes' : 'no'));
            } else {
                error_log("Token payload missing user_id: " . json_encode($payload));
            }
        } else {
            error_log("verifyJwtToken function not available");
            // Try to extract user_id directly from token (for demo/testing)
            $tokenParts = explode('.', $token);
            if (count($tokenParts) >= 2) {
                $payload = json_decode(base64_decode($tokenParts[1]), true);
                if ($payload && isset($payload['user_id'])) {
                    $tokenUserId = $payload['user_id'];
                    $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                    error_log("Manually extracted user from token: $tokenUserId");
                }
            }
        }
    } catch (Exception $e) {
        error_log("JWT verification failed: " . $e->getMessage());
    }
}

// Now decide which user ID to use, with explicit parameters taking precedence
// 1. If no userId from query/header, use token
if (!$userId && $tokenUserId) {
    $userId = $tokenUserId;
    error_log("Using user ID from token: $userId");
}
// 2. If userId from query/header doesn't match token and not admin, verify rights
else if ($userId && $tokenUserId && $userId != $tokenUserId && !$isAdmin) {
    if ($forceUserMatch) {
        error_log("Force user match is true, using token's user ID: $tokenUserId instead of: $userId");
        $userId = $tokenUserId;
    } else {
        error_log("Query/header user ID ($userId) doesn't match token user ID ($tokenUserId) and user is not admin");
        // Admin users can view other users' bookings, but normal users should only see their own
        // If a normal user tries to view someone else's bookings, use their own ID instead
        $userId = $tokenUserId;
    }
}

error_log("Final user ID for bookings query: $userId");

// Connect to database
try {
    // Connect to database - direct connection if helper functions are not available
    $conn = null;
    if (function_exists('getDbConnectionWithRetry')) {
        $conn = getDbConnectionWithRetry(2);
    } else if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else {
        // Direct connection as fallback
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        } else {
            error_log("Direct database connection successful for bookings");
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    error_log("Database connection established for bookings");
    
    // Check if bookings table exists - this is crucial
    $tableExists = $conn->query("SHOW TABLES LIKE 'bookings'");
    $hasBookingsTable = ($tableExists && $tableExists->num_rows > 0);
    
    error_log("Bookings table exists: " . ($hasBookingsTable ? 'Yes' : 'No'));
    
    // For demo token, still return sample bookings
    if ($token && strpos($token, 'demo_token_') === 0) {
        error_log("Demo token detected, returning demo bookings");
        $fallbackBookings = createFallbackBookings($userId ?: 999);
        echo json_encode([
            'status' => 'success', 
            'bookings' => $fallbackBookings, 
            'source' => 'demo',
            'userId' => $userId ?: 999,
            'isAdmin' => false
        ]);
        exit;
    }
    
    // Try to get real data if we have a valid user ID and bookings table
    $bookings = [];
    $dataSource = 'unknown';
    
    if ($hasBookingsTable) {
        try {
            error_log("Attempting to get real bookings from database for user ID: " . ($userId ?: 'unknown'));
            
            // Prepare the SQL query based on user role
            if ($isAdmin) {
                // Admins can see all bookings or filter by user_id if provided
                if ($userId) {
                    $sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param("i", $userId);
                    error_log("Admin user querying for specific user ID: $userId");
                } else {
                    $sql = "SELECT * FROM bookings ORDER BY created_at DESC";
                    $stmt = $conn->prepare($sql);
                    error_log("Admin user querying for all bookings");
                }
            } else {
                // Regular users see only their bookings
                if ($userId) {
                    $sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param("i", $userId);
                    error_log("Regular user querying own bookings with ID: $userId");
                } else {
                    // No user ID available - shouldn't happen, but handle it gracefully
                    error_log("No user ID available for filtering bookings, returning empty array");
                    echo json_encode([
                        'status' => 'error', 
                        'message' => 'No user ID available to fetch bookings',
                        'bookings' => [],
                        'userId' => null,
                        'isAdmin' => false
                    ]);
                    exit;
                }
            }
            
            if (!$stmt) {
                throw new Exception("Failed to prepare query: " . $conn->error);
            }
            
            // Execute the query
            $stmt->execute();
            $result = $stmt->get_result();
            
            if (!$result) {
                throw new Exception("Failed to get result: " . $stmt->error);
            }
            
            // Create an array of bookings
            while ($row = $result->fetch_assoc()) {
                $booking = [
                    'id' => (int)$row['id'],
                    'userId' => isset($row['user_id']) ? (int)$row['user_id'] : null,
                    'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
                    'pickupLocation' => $row['pickup_location'],
                    'dropLocation' => $row['drop_location'],
                    'pickupDate' => $row['pickup_date'],
                    'returnDate' => $row['return_date'],
                    'cabType' => $row['cab_type'],
                    'distance' => (float)($row['distance'] ?? 0),
                    'tripType' => $row['trip_type'],
                    'tripMode' => $row['trip_mode'],
                    'totalAmount' => (float)$row['total_amount'],
                    'status' => $row['status'],
                    'passengerName' => $row['passenger_name'],
                    'passengerPhone' => $row['passenger_phone'],
                    'passengerEmail' => $row['passenger_email'],
                    'driverName' => $row['driver_name'] ?? null,
                    'driverPhone' => $row['driver_phone'] ?? null,
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at'] ?? $row['created_at']
                ];
                $bookings[] = $booking;
            }
            
            $dataSource = 'database';
            error_log("Successfully retrieved " . count($bookings) . " bookings from database for user ID: $userId");
            
        } catch (Exception $e) {
            error_log("Error fetching bookings from database: " . $e->getMessage());
            // We'll fall through to the fallback below
        }
    } else {
        error_log("Cannot get real bookings: " . 
            (!$hasBookingsTable ? "Bookings table doesn't exist. " : "") .
            (!$userId ? "No user ID available. " : ""));
    }
    
    // If we have real bookings, return them
    if (count($bookings) > 0) {
        echo json_encode([
            'status' => 'success', 
            'bookings' => $bookings, 
            'source' => $dataSource,
            'userId' => $userId,
            'isAdmin' => $isAdmin
        ]);
        exit;
    }
    
    // If we get here, either we have no bookings or there was an error
    // Create sample bookings for the user or return empty array
    if ($userId) {
        // Generate sample bookings for this user ID
        $sampleBookings = createFallbackBookings($userId);
        
        echo json_encode([
            'status' => 'success', 
            'bookings' => $sampleBookings,
            'message' => 'No real bookings found, generating sample data',
            'source' => 'sample_data',
            'userId' => $userId,
            'isAdmin' => $isAdmin
        ]);
        exit;
    } else {
        // Return empty for unknown users
        echo json_encode([
            'status' => 'success', 
            'bookings' => [], 
            'message' => 'No user ID found to fetch bookings',
            'source' => 'no_user_id',
            'userId' => null,
            'isAdmin' => false
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log("Error in bookings endpoint: " . $e->getMessage());
    
    // Provide fallback data
    $fallbackBookings = createFallbackBookings($userId);
    echo json_encode([
        'status' => 'success', 
        'bookings' => $fallbackBookings, 
        'source' => 'error_fallback', 
        'error' => $e->getMessage(),
        'userId' => $userId,
        'isAdmin' => $isAdmin
    ]);
}

// Helper function to create fallback booking data
function createFallbackBookings($userId = null) {
    $now = date('Y-m-d H:i:s');
    $tomorrow = date('Y-m-d H:i:s', strtotime('+1 day'));
    $nextWeek = date('Y-m-d H:i:s', strtotime('+7 days'));
    
    return [
        [
            'id' => 1001,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Airport Terminal 2',
            'dropLocation' => 'Vizag Hotel',
            'pickupDate' => $now,
            'returnDate' => null,
            'cabType' => 'sedan',
            'distance' => 15.5,
            'tripType' => 'airport',
            'tripMode' => 'one-way',
            'totalAmount' => 1500,
            'status' => 'pending',
            'passengerName' => 'Sample User',
            'passengerPhone' => '9876543210',
            'passengerEmail' => 'user@example.com',
            'driverName' => null,
            'driverPhone' => null,
            'createdAt' => $now,
            'updatedAt' => $now
        ],
        [
            'id' => 1002,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Vizag Hotel',
            'dropLocation' => 'Beach Resort',
            'pickupDate' => $tomorrow,
            'returnDate' => $nextWeek,
            'cabType' => 'innova_crysta',
            'distance' => 25.0,
            'tripType' => 'local',
            'tripMode' => 'round-trip',
            'totalAmount' => 2500,
            'status' => 'confirmed',
            'passengerName' => 'Sample User',
            'passengerPhone' => '9876543200',
            'passengerEmail' => 'user@example.com',
            'driverName' => 'Demo Driver',
            'driverPhone' => '9876543201',
            'createdAt' => $now,
            'updatedAt' => $now
        ]
    ];
}
