
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
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

// Log request for debugging
logError("Booking cancellation request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders()
]);

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
logError("Cancellation request data", ['data' => $data]);

// Get booking ID from URL or request body
$bookingId = isset($_GET['id']) ? intval($_GET['id']) : 0;

// If ID is not in query string, try to get it from URL path
if (!$bookingId && isset($_SERVER['PATH_INFO'])) {
    $pathParts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    $bookingId = intval(end($pathParts));
}

// If still no ID, look in the request body
if (!$bookingId && isset($data['bookingId'])) {
    $bookingId = intval($data['bookingId']);
}

// Validate booking ID
if (!$bookingId) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

logError("Cancellation booking ID resolved", ['bookingId' => $bookingId]);

$cancellationReason = isset($data['reason']) ? $data['reason'] : 'Customer requested cancellation';

// Authenticate user
$userData = authenticate();
$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Begin transaction
$conn->begin_transaction();

try {
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
        throw new Exception("Failed to execute query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();
    
    if (!$booking) {
        throw new Exception("Booking not found or access denied");
    }
    
    // Check if booking can be cancelled (not already completed or cancelled)
    if ($booking['status'] === 'completed' || $booking['status'] === 'cancelled') {
        throw new Exception("Cannot cancel a booking that is already {$booking['status']}");
    }
    
    // Update booking status to cancelled
    $sql = "UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $cancellationReason, $bookingId);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update booking status: " . $stmt->error);
    }
    
    // Get the updated booking
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $bookingId);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to retrieve updated booking: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Format the updated booking data
    $formattedBooking = [
        'id' => $updatedBooking['id'],
        'userId' => $updatedBooking['user_id'],
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
        'passengerEmail' => $updatedBooking['passenger_email'],
        'hourlyPackage' => $updatedBooking['hourly_package'],
        'tourId' => $updatedBooking['tour_id'],
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'vehicleNumber' => $updatedBooking['vehicle_number'],
        'cancellationReason' => $updatedBooking['cancellation_reason'],
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Commit the transaction
    $conn->commit();
    
    // Send cancellation notification email to customer
    $customerSubject = "Your booking #{$updatedBooking['booking_number']} has been cancelled";
    $customerMessage = "Dear {$updatedBooking['passenger_name']},\n\n";
    $customerMessage .= "Your booking with reference number #{$updatedBooking['booking_number']} has been cancelled.\n\n";
    $customerMessage .= "Booking details:\n";
    $customerMessage .= "Pickup: {$updatedBooking['pickup_location']}\n";
    if (!empty($updatedBooking['drop_location'])) {
        $customerMessage .= "Drop-off: {$updatedBooking['drop_location']}\n";
    }
    $customerMessage .= "Pickup Date: {$updatedBooking['pickup_date']}\n";
    if (!empty($updatedBooking['return_date'])) {
        $customerMessage .= "Return Date: {$updatedBooking['return_date']}\n";
    }
    $customerMessage .= "Vehicle: {$updatedBooking['cab_type']}\n";
    $customerMessage .= "Cancellation Reason: {$updatedBooking['cancellation_reason']}\n\n";
    $customerMessage .= "Thank you for using our service.\n";
    
    sendEmailNotification($updatedBooking['passenger_email'], $customerSubject, $customerMessage);
    
    // Send notification to admin
    $adminSubject = "Booking #{$updatedBooking['booking_number']} has been cancelled";
    $adminMessage = "Booking #{$updatedBooking['booking_number']} has been cancelled.\n\n";
    $adminMessage .= "Customer: {$updatedBooking['passenger_name']} ({$updatedBooking['passenger_email']})\n";
    $adminMessage .= "Phone: {$updatedBooking['passenger_phone']}\n";
    $adminMessage .= "Pickup: {$updatedBooking['pickup_location']}\n";
    if (!empty($updatedBooking['drop_location'])) {
        $adminMessage .= "Drop-off: {$updatedBooking['drop_location']}\n";
    }
    $adminMessage .= "Pickup Date: {$updatedBooking['pickup_date']}\n";
    if (!empty($updatedBooking['return_date'])) {
        $adminMessage .= "Return Date: {$updatedBooking['return_date']}\n";
    }
    $adminMessage .= "Vehicle: {$updatedBooking['cab_type']}\n";
    $adminMessage .= "Trip Type: {$updatedBooking['trip_type']} ({$updatedBooking['trip_mode']})\n";
    $adminMessage .= "Cancellation Reason: {$updatedBooking['cancellation_reason']}\n\n";
    
    sendEmailNotification(ADMIN_EMAIL, $adminSubject, $adminMessage);
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking cancelled successfully',
        'data' => $formattedBooking
    ]);
    
} catch (Exception $e) {
    // Roll back the transaction
    $conn->rollback();
    
    logError("Booking cancellation failed", [
        'error' => $e->getMessage(),
        'booking_id' => $bookingId
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to cancel booking: ' . $e->getMessage()
    ], 500);
}
