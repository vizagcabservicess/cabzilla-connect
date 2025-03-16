
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log the request for debugging
logError("Booking cancellation request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'none'
]);

// Get booking ID from URL or POST data
$bookingId = 0;

// Check if ID is in URL path
if (isset($_GET['id'])) {
    $bookingId = intval($_GET['id']);
} else if (isset($_SERVER['PATH_INFO'])) {
    $pathParts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    $bookingId = intval(end($pathParts));
}

// Get input data
$data = json_decode(file_get_contents('php://input'), true);
if ($data && isset($data['bookingId']) && !$bookingId) {
    $bookingId = intval($data['bookingId']);
}

if (!$bookingId) {
    logError("Missing booking ID in cancel request", [
        'GET' => $_GET,
        'POST data' => $data,
        'URL' => $_SERVER['REQUEST_URI']
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Get reason for cancellation
$reason = isset($data['reason']) ? $data['reason'] : 'Cancelled by user';

// Authenticate the user
$userData = authenticate();
$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Check if booking exists and belongs to the user (or user is admin)
if ($isAdmin) {
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $bookingId);
} else {
    $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $bookingId, $userId);
}

if (!$stmt->execute()) {
    logError("Failed to execute query", ['error' => $stmt->error]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to retrieve booking details'], 500);
    exit;
}

$result = $stmt->get_result();
$booking = $result->fetch_assoc();

if (!$booking) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found or access denied'], 404);
    exit;
}

// Check if booking is in a status that can be cancelled
$allowedStatuses = ['pending', 'confirmed'];
if (!in_array($booking['status'], $allowedStatuses)) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'This booking cannot be cancelled (status: ' . $booking['status'] . ')'
    ], 400);
    exit;
}

// Update booking status to cancelled
$sql = "UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $reason, $bookingId);

if (!$stmt->execute()) {
    logError("Failed to execute cancellation query", ['error' => $stmt->error]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to cancel booking'], 500);
    exit;
}

// Get the updated booking for email
$sql = "SELECT * FROM bookings WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $bookingId);
$stmt->execute();
$result = $stmt->get_result();
$updatedBooking = $result->fetch_assoc();

// Format the booking data for email
$formattedBooking = [
    'id' => $updatedBooking['id'],
    'bookingNumber' => $updatedBooking['booking_number'],
    'pickupLocation' => $updatedBooking['pickup_location'],
    'dropLocation' => $updatedBooking['drop_location'],
    'pickupDate' => $updatedBooking['pickup_date'],
    'returnDate' => $updatedBooking['return_date'],
    'cabType' => $updatedBooking['cab_type'],
    'distance' => floatval($updatedBooking['distance']),
    'tripType' => $updatedBooking['trip_type'],
    'tripMode' => $updatedBooking['trip_mode'],
    'totalAmount' => floatval($updatedBooking['total_amount']),
    'status' => $updatedBooking['status'],
    'passengerName' => $updatedBooking['passenger_name'],
    'passengerPhone' => $updatedBooking['passenger_phone'],
    'passengerEmail' => $updatedBooking['passenger_email']
];

// Send email notifications
sendEmailNotification(
    $updatedBooking['passenger_email'],
    "Your booking #{$updatedBooking['booking_number']} has been cancelled",
    "Dear {$updatedBooking['passenger_name']},\n\n" .
    "Your booking #{$updatedBooking['booking_number']} has been cancelled.\n\n" .
    "Cancellation reason: {$reason}\n\n" .
    "Booking details:\n" .
    "Pickup: {$updatedBooking['pickup_location']}\n" .
    "Date: {$updatedBooking['pickup_date']}\n" .
    "Vehicle: {$updatedBooking['cab_type']}\n\n" .
    "Thank you for using our service."
);

// Send admin notification
sendEmailNotification(
    ADMIN_EMAIL,
    "Booking #{$updatedBooking['booking_number']} has been cancelled",
    "Booking #{$updatedBooking['booking_number']} has been cancelled.\n\n" .
    "Customer: {$updatedBooking['passenger_name']} ({$updatedBooking['passenger_email']})\n" .
    "Phone: {$updatedBooking['passenger_phone']}\n\n" .
    "Cancellation reason: {$reason}\n\n" .
    "Booking details:\n" .
    "Pickup: {$updatedBooking['pickup_location']}\n" .
    "Date: {$updatedBooking['pickup_date']}\n" .
    "Vehicle: {$updatedBooking['cab_type']}"
);

sendJsonResponse([
    'status' => 'success',
    'message' => 'Booking cancelled successfully',
    'data' => $formattedBooking
]);
