
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Simplified and permissive
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

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

logError("Request received for user bookings", ["headers" => array_keys($headers)]);

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

if (!$userId) {
    logError("Missing or invalid authentication token");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Log the user ID for debugging
    logError("Fetching bookings for user", ['user_id' => $userId]);
    
    // Get user's bookings
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
    if (!$stmt) {
        logError("Failed to prepare query", ['error' => $conn->error]);
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $success = $stmt->execute();
    
    if (!$success) {
        logError("Failed to execute query", ['error' => $stmt->error]);
        throw new Exception('Database error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logError("Failed to get result", ['error' => $stmt->error]);
        throw new Exception('Database error: ' . $stmt->error);
    }
    
    // Create an array of bookings
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $booking = [
            'id' => (int)$row['id'],
            'userId' => (int)$row['user_id'],
            'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'],
            'pickupDate' => $row['pickup_date'],
            'returnDate' => $row['return_date'],
            'cabType' => $row['cab_type'],
            'distance' => (float)$row['distance'],
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
    
    // Log the count of bookings found
    logError("Bookings found for user", [
        'user_id' => $userId, 
        'count' => count($bookings)
    ]);
    
    // Match the response format from dashboard.php
    sendJsonResponse(['status' => 'success', 'bookings' => $bookings]);
    
} catch (Exception $e) {
    logError("Error fetching user bookings", ['error' => $e->getMessage(), 'user_id' => $userId]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to fetch bookings: ' . $e->getMessage()], 500);
}
