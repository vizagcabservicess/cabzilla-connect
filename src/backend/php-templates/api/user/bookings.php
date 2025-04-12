
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Include the fix-cors.php file for CORS headers and helper functions
require_once __DIR__ . '/../fix-cors.php';

// Log request for debugging
logError("Bookings API request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'headers' => getallheaders()
]);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

logError("User bookings request received");

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    logError("Found auth token", ['token_preview' => substr($token, 0, 10) . '...']);
    
    try {
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                logError("User authenticated", ['user_id' => $userId, 'is_admin' => $isAdmin ? 'yes' : 'no']);
            } else {
                logError("Token payload missing user_id", ['payload' => $payload]);
            }
        } else {
            logError("verifyJwtToken function not available");
        }
    } catch (Exception $e) {
        logError("JWT verification failed", ['error' => $e->getMessage()]);
    }
}

// For demo token, still return sample bookings
if ($token && strpos($token, 'demo_token_') === 0) {
    logError("Demo token detected, returning demo bookings");
    $fallbackBookings = createFallbackBookings(999);
    sendJsonResponse([
        'status' => 'success', 
        'bookings' => $fallbackBookings, 
        'source' => 'demo',
        'userId' => 999,
        'isAdmin' => false
    ]);
    exit;
}

// Connect to database
try {
    // Define database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Connect directly to database
    logError("Connecting to database", ['host' => $dbHost, 'db' => $dbName]);
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    logError("Database connection established for bookings");
    
    // Check if bookings table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'bookings'");
    $hasBookingsTable = ($tableExists && $tableExists->num_rows > 0);
    
    logError("Bookings table exists", ['exists' => $hasBookingsTable ? 'Yes' : 'No']);
    
    // Initialize bookings array and data source
    $bookings = [];
    $dataSource = 'unknown';
    
    if ($hasBookingsTable && ($userId || $isAdmin)) {
        try {
            logError("Attempting to get real bookings from database for user", ['user_id' => $userId]);
            
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
            if (!$stmt->execute()) {
                throw new Exception("Failed to execute query: " . $stmt->error);
            }
            
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
            logError("Successfully retrieved bookings from database", ['count' => count($bookings)]);
            
        } catch (Exception $e) {
            logError("Error fetching bookings from database", ['error' => $e->getMessage()]);
            // We'll use fallback data below
        }
    } else {
        logError("Cannot get real bookings", [
            'table_exists' => $hasBookingsTable ? 'Yes' : 'No',
            'user_id' => $userId,
            'is_admin' => $isAdmin ? 'Yes' : 'No'
        ]);
    }
    
    // If no bookings were found or there was an error, use fallback data
    if (empty($bookings)) {
        // Check if this was because it's a new user with no bookings yet
        if ($userId && $hasBookingsTable) {
            // User exists but has no bookings
            logError("User has no bookings yet", ['user_id' => $userId]);
            $dataSource = 'empty';
        } else {
            // Generate fallback bookings
            $bookings = createFallbackBookings($userId);
            $dataSource = 'fallback';
            logError("Using fallback booking data", ['count' => count($bookings)]);
        }
    }
    
    // Close database connection
    $conn->close();
    
    // Return bookings
    sendJsonResponse([
        'status' => 'success', 
        'bookings' => $bookings, 
        'source' => $dataSource,
        'userId' => $userId,
        'isAdmin' => $isAdmin
    ]);
    
} catch (Exception $e) {
    logError("Error in bookings endpoint", ['error' => $e->getMessage()]);
    
    // Provide fallback data
    $fallbackBookings = createFallbackBookings($userId);
    sendJsonResponse([
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
