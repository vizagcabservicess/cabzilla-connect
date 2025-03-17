
<?php
// Include database configuration
require_once __DIR__ . '/../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // For CORS preflight requests
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Process authentication
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Authentication required']);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id'])) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token']);
    exit;
}

$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

// Get booking ID from URL
$bookingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$bookingId) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Booking ID is required']);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Check if user has access to this booking
$sql = "SELECT * FROM bookings WHERE id = ?";
if (!$isAdmin) {
    $sql .= " AND user_id = ?";
}

$stmt = $conn->prepare($sql);
if (!$stmt) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database query failed: ' . $conn->error]);
    exit;
}

if (!$isAdmin) {
    $stmt->bind_param("ii", $bookingId, $userId);
} else {
    $stmt->bind_param("i", $bookingId);
}

if (!$stmt->execute()) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to execute query: ' . $stmt->error]);
    exit;
}

$result = $stmt->get_result();
$booking = $result->fetch_assoc();

if (!$booking) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Booking not found or access denied']);
    exit;
}

// Format the booking data
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

// Add payment details if they exist
if (isset($booking['payment_method'])) {
    $formattedBooking['paymentMethod'] = $booking['payment_method'];
}

if (isset($booking['payment_status'])) {
    $formattedBooking['paymentStatus'] = $booking['payment_status'];
}

if (isset($booking['payment_date'])) {
    $formattedBooking['paymentDate'] = $booking['payment_date'];
}

// Send the response
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'data' => $formattedBooking
]);
exit;
