
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
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Log request for debugging
error_log("Bookings API request received - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);

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

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

error_log("User bookings request received");
error_log("Headers: " . json_encode($headers));

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    error_log("Found auth token: " . substr($token, 0, 10) . "...");
    
    try {
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                error_log("User authenticated: $userId, isAdmin: " . ($isAdmin ? 'yes' : 'no'));
            } else {
                error_log("Token payload missing user_id: " . json_encode($payload));
            }
        } else {
            error_log("verifyJwtToken function not available");
        }
    } catch (Exception $e) {
        error_log("JWT verification failed: " . $e->getMessage());
    }
}

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
        $fallbackBookings = createFallbackBookings(999);
        echo json_encode([
            'status' => 'success', 
            'bookings' => $fallbackBookings, 
            'source' => 'demo',
            'userId' => 999,
            'isAdmin' => false
        ]);
        exit;
    }
    
    // Try to get real data if we have a valid user ID and bookings table
    $bookings = [];
    $dataSource = 'unknown';
    
    if ($hasBookingsTable && ($userId || $isAdmin)) {
        try {
            error_log("Attempting to get real bookings from database");
            
            // Prepare the SQL query based on user role
            if ($isAdmin) {
                // Admins can see all bookings
                $sql = "SELECT * FROM bookings ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
            } else if ($userId) {
                // Regular users see only their bookings
                $sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $userId);
            } else {
                throw new Exception("No user ID available for query");
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
            error_log("Successfully retrieved " . count($bookings) . " bookings from database");
            
        } catch (Exception $e) {
            error_log("Error fetching bookings from database: " . $e->getMessage());
            // We'll fall through to the fallback below
        }
    } else {
        error_log("Cannot get real bookings: " . 
            (!$hasBookingsTable ? "Bookings table doesn't exist. " : "") .
            (!$userId ? "No user ID available. " : ""));
    }
    
    // CRITICAL FIX: Make sure we're always returning bookings in the proper format
    echo json_encode([
        'status' => 'success', 
        'bookings' => $bookings, 
        'source' => $bookings ? $dataSource : 'empty',
        'userId' => $userId,
        'isAdmin' => $isAdmin
    ]);
    exit;
    
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
    
    return [
        [
            'id' => 1001,
            'userId' => $userId,
            'bookingNumber' => 'FB' . rand(10000, 99999),
            'pickupLocation' => 'Fallback Airport',
            'dropLocation' => 'Fallback Hotel',
            'pickupDate' => $now,
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
            'pickupLocation' => 'Fallback Hotel',
            'dropLocation' => 'Fallback Beach',
            'pickupDate' => $tomorrow,
            'returnDate' => null,
            'cabType' => 'innova_crysta',
            'distance' => 25.0,
            'tripType' => 'local',
            'tripMode' => 'round-trip',
            'totalAmount' => 2500,
            'status' => 'confirmed',
            'passengerName' => 'Demo User',
            'passengerPhone' => '9876543200',
            'passengerEmail' => 'demo@example.com',
            'driverName' => 'Demo Driver',
            'driverPhone' => '9876543201',
            'createdAt' => $now,
            'updatedAt' => $now
        ]
    ];
}
