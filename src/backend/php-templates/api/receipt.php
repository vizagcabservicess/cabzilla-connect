
<?php
// Include the configuration file
require_once __DIR__ . '/../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get booking ID from URL parameter
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

$bookingId = intval($_GET['id']);

// Log request for debugging
logError("Receipt request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'booking_id' => $bookingId,
    'query' => $_SERVER['QUERY_STRING']
]);

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in receipt.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Prepare SQL query to fetch booking details
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("i", $bookingId);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();
    
    if (!$booking) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    // Format booking data for response
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
        'driverName' => $booking['driver_name'] ?? null,
        'driverPhone' => $booking['driver_phone'] ?? null,
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send success response
    sendJsonResponse([
        'status' => 'success',
        'data' => $formattedBooking
    ]);
    
} catch (Exception $e) {
    logError("Error retrieving booking receipt", [
        'error' => $e->getMessage(),
        'booking_id' => $bookingId
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to retrieve booking receipt: ' . $e->getMessage()
    ], 500);
}
