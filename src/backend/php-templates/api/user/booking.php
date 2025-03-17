
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
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log request data for debugging
logError("booking.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'uri' => $_SERVER['REQUEST_URI']
]);

// Get booking ID from URL
$requestUri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($requestUri, '/'));
$bookingId = end($parts);

if (!is_numeric($bookingId)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Ensure user is authenticated
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    logError("Missing authorization header");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id'])) {
    logError("Authentication failed");
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    exit;
}

$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Prepare query with user restriction (unless admin)
    if ($isAdmin) {
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
    } else {
        $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $bookingId, $userId);
    }
    
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();
    
    if (!$booking) {
        if ($isAdmin) {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found or does not belong to you'], 404);
        }
        exit;
    }
    
    // Format the booking data for response
    $formattedBooking = [
        'id' => $booking['id'],
        'userId' => $booking['user_id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => floatval($booking['distance']),
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => floatval($booking['total_amount']),
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'driverName' => $booking['driver_name'],
        'driverPhone' => $booking['driver_phone'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'data' => $formattedBooking
    ]);
    
} catch (Exception $e) {
    logError("Error fetching booking", [
        'error' => $e->getMessage(),
        'booking_id' => $bookingId
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ], 500);
}
