
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Expanded CORS Headers to ensure client can access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');
header('Content-Type: application/json');

// Handle preflight OPTIONS request explicitly
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log the start of request handling
logError("User bookings request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_GET,
    'headers' => array_keys(getallheaders())
]);

// Authenticate user
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    logError("Missing authorization header");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

logError("Token received for bookings", ['token_length' => strlen($token)]);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id'])) {
    logError("Authentication failed in bookings.php", [
        'token_length' => strlen($token),
        'token_parts' => count(explode('.', $token))
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    exit;
}

$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

logError("User authenticated successfully for bookings", [
    'user_id' => $userId, 
    'is_admin' => $isAdmin ? 'true' : 'false'
]);

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in bookings.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Get user's bookings - add explicit query logging
    logError("Preparing to fetch bookings for user", ['user_id' => $userId]);
    
    $sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
    logError("SQL Query", ['sql' => $sql, 'user_id' => $userId]);

    $stmt = $conn->prepare($sql);
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

    // Log the SQL query for debugging
    logError("SQL Query executed for bookings", [
        'query' => "SELECT * FROM bookings WHERE user_id = {$userId} ORDER BY created_at DESC"
    ]);

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Format each booking record consistently
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
            'passengerName' => $row['passenger_name'] ?? $userData['name'] ?? '',
            'passengerPhone' => $row['passenger_phone'] ?? '',
            'passengerEmail' => $row['passenger_email'] ?? $userData['email'] ?? '',
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
        $bookings[] = $booking;
    }

    // Log data found for debugging
    logError("Bookings found", ['count' => count($bookings), 'user_id' => $userId]);

    // Send response with consistent format
    $response = [
        'status' => 'success',
        'data' => $bookings
    ];
    
    logError("Sending bookings response", ['booking_count' => count($bookings)]);
    echo json_encode($response);
    exit;
    
} catch (Exception $e) {
    logError("Exception in bookings.php", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    sendJsonResponse(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}
