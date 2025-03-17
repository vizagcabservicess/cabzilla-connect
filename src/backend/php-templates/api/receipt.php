
<?php
require_once '../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get booking ID from URL
$bookingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$bookingId) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();

// Get booking details
$sql = "SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone 
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id 
        WHERE b.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $bookingId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    exit;
}

$booking = $result->fetch_assoc();

// Format the booking data
$formattedBooking = [
    'id' => $booking['id'],
    'bookingNumber' => $booking['booking_number'],
    'userId' => $booking['user_id'],
    'userName' => $booking['user_name'] ?? $booking['passenger_name'],
    'userEmail' => $booking['user_email'] ?? $booking['passenger_email'],
    'userPhone' => $booking['user_phone'] ?? $booking['passenger_phone'],
    'pickupLocation' => $booking['pickup_location'],
    'dropLocation' => $booking['drop_location'],
    'pickupDate' => $booking['pickup_date'],
    'returnDate' => $booking['return_date'],
    'cabType' => $booking['cab_type'],
    'distance' => (float)$booking['distance'],
    'tripType' => $booking['trip_type'],
    'tripMode' => $booking['trip_mode'],
    'hourlyPackage' => $booking['hourly_package'],
    'tourId' => $booking['tour_id'],
    'totalAmount' => (float)$booking['total_amount'],
    'status' => $booking['status'],
    'passengerName' => $booking['passenger_name'],
    'passengerEmail' => $booking['passenger_email'],
    'passengerPhone' => $booking['passenger_phone'],
    'createdAt' => $booking['created_at'],
    'updatedAt' => $booking['updated_at']
];

// Send response
sendJsonResponse([
    'status' => 'success',
    'message' => 'Booking details retrieved successfully',
    'data' => $formattedBooking
]);
