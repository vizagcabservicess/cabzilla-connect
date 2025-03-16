
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

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

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log the request for debugging
logError("Receipt request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'none',
    'path_info' => $_SERVER['PATH_INFO'] ?? 'none'
]);

// Get booking ID from URL
$bookingId = isset($_GET['id']) ? intval($_GET['id']) : 0;

// If ID is not in query string, try to get it from URL path
if (!$bookingId && isset($_SERVER['PATH_INFO'])) {
    $pathParts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    $bookingId = intval(end($pathParts));
}

// Try to get id from the last part of the URL if still no ID
if (!$bookingId) {
    $uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
    $lastPart = end($uriParts);
    if (is_numeric($lastPart)) {
        $bookingId = intval($lastPart);
    }
}

// Last attempt - try to parse from full URL
if (!$bookingId) {
    $url = $_SERVER['REQUEST_URI'];
    if (preg_match('/receipt\/([0-9]+)/', $url, $matches) || 
        preg_match('/booking\/([0-9]+)/', $url, $matches)) {
        $bookingId = intval($matches[1]);
    }
}

if (!$bookingId) {
    logError("Missing booking ID in receipt request", [
        'GET' => $_GET,
        'URL' => $_SERVER['REQUEST_URI'],
        'PATH_INFO' => $_SERVER['PATH_INFO'] ?? 'none'
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Authenticate user - BUT DON'T REQUIRE AUTH FOR RECEIPTS
// This allows customers to view receipts even without logging in
$userData = authenticate(false); // false means don't enforce authentication
$userId = $userData['user_id'] ?? null;
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
} else if ($userId) {
    $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $bookingId, $userId);
} else {
    // For non-logged in users, just check if booking exists
    // This allows customers without accounts to view their receipts using the URL
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $bookingId);
}

if (!$stmt->execute()) {
    logError("Failed to execute query", ['error' => $stmt->error]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to retrieve receipt'], 500);
    exit;
}

$result = $stmt->get_result();
$booking = $result->fetch_assoc();

if (!$booking) {
    sendJsonResponse(['status' => 'error', 'message' => 'Receipt not found or access denied'], 404);
    exit;
}

// Format the booking data for receipt
$receipt = [
    'id' => $booking['id'],
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
    'hourlyPackage' => $booking['hourly_package'],
    'tourId' => $booking['tour_id'],
    'driverName' => $booking['driver_name'],
    'driverPhone' => $booking['driver_phone'],
    'vehicleNumber' => $booking['vehicle_number'],
    'companyName' => 'Visakha Cab Services',
    'companyEmail' => 'info@vizcab.com',
    'companyPhone' => '+91 9876543210',
    'companyAddress' => 'Visakhapatnam, Andhra Pradesh',
    'paymentMethod' => 'Online Payment',
    'paymentStatus' => 'Paid',
    'bookingDate' => $booking['created_at'],
    'lastUpdated' => $booking['updated_at']
];

// Include cancellation reason if booking is cancelled
if ($booking['status'] === 'cancelled' && !empty($booking['cancellation_reason'])) {
    $receipt['cancellationReason'] = $booking['cancellation_reason'];
}

sendJsonResponse([
    'status' => 'success',
    'message' => 'Receipt retrieved successfully',
    'data' => $receipt
]);
