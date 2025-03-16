
<?php
// Include configuration
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

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Log request details
logError("Booking cancel.php request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'query_string' => $_SERVER['QUERY_STRING'],
    'get_params' => $_GET
]);

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Authenticate the user
$userData = authenticate();

// Get booking ID from URL or POST data
$bookingId = 0;
if (isset($_GET['id'])) {
    $bookingId = intval($_GET['id']);
}

// Get JSON request body
$data = json_decode(file_get_contents('php://input'), true);
logError("Cancel booking request data", ['data' => $data]);

// If booking ID wasn't in URL, try to get it from POST data
if (!$bookingId && isset($data['bookingId'])) {
    $bookingId = intval($data['bookingId']);
}

if (!$bookingId) {
    logError("Missing booking ID in request", ['GET' => $_GET, 'POST' => $data]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Get cancellation reason if provided
$reason = isset($data['reason']) ? $data['reason'] : 'Customer requested cancellation';

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // First, verify booking exists and belongs to this user (or user is admin)
    if (isset($userData['role']) && $userData['role'] === 'admin') {
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
    } else {
        $userId = $userData['user_id'];
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
    
    // Check if booking can be cancelled (only pending or confirmed bookings can be cancelled)
    $allowedStatuses = ['pending', 'confirmed'];
    if (!in_array($booking['status'], $allowedStatuses)) {
        throw new Exception("This booking cannot be cancelled (status: {$booking['status']})");
    }
    
    // Update booking status to cancelled
    $sql = "UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $reason, $bookingId);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to cancel booking: " . $stmt->error);
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
    
    if (!$updatedBooking) {
        throw new Exception("Failed to retrieve updated booking record");
    }
    
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
        'cancellationReason' => $updatedBooking['cancellation_reason'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Commit the transaction
    $conn->commit();
    
    // Send cancellation email
    sendCancellationEmail($formattedBooking, $reason);
    
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

// Function to send cancellation email
function sendCancellationEmail($booking, $reason) {
    // Admin email
    $adminEmail = 'narendrakumarupwork@gmail.com';
    
    // Log the notification attempt
    logError("Sending cancellation notification", [
        'booking_id' => $booking['id'],
        'booking_number' => $booking['bookingNumber'],
        'user_email' => $booking['passengerEmail'],
        'admin_email' => $adminEmail
    ]);
    
    // Prepare the email subject and message for user
    $userSubject = "Your booking #{$booking['bookingNumber']} has been cancelled";
    $userMessage = "Dear {$booking['passengerName']},\n\n";
    $userMessage .= "Your booking with reference number #{$booking['bookingNumber']} has been cancelled.\n\n";
    $userMessage .= "Cancellation reason: $reason\n\n";
    $userMessage .= "Booking details:\n";
    $userMessage .= "Pickup: {$booking['pickupLocation']}\n";
    if (!empty($booking['dropLocation'])) {
        $userMessage .= "Drop-off: {$booking['dropLocation']}\n";
    }
    $userMessage .= "Pickup Date: {$booking['pickupDate']}\n";
    $userMessage .= "Vehicle: {$booking['cabType']}\n";
    $userMessage .= "Total Amount: ₹{$booking['totalAmount']}\n\n";
    $userMessage .= "Thank you for choosing our service.\n";
    
    // Prepare the email subject and message for admin
    $adminSubject = "Booking #{$booking['bookingNumber']} has been cancelled";
    $adminMessage = "Booking #{$booking['bookingNumber']} has been cancelled.\n\n";
    $adminMessage .= "Cancellation reason: $reason\n\n";
    $adminMessage .= "Customer: {$booking['passengerName']} ({$booking['passengerEmail']})\n";
    $adminMessage .= "Phone: {$booking['passengerPhone']}\n";
    $adminMessage .= "Pickup: {$booking['pickupLocation']}\n";
    if (!empty($booking['dropLocation'])) {
        $adminMessage .= "Drop-off: {$booking['dropLocation']}\n";
    }
    $adminMessage .= "Pickup Date: {$booking['pickupDate']}\n";
    $adminMessage .= "Vehicle: {$booking['cabType']}\n";
    $adminMessage .= "Trip Type: {$booking['tripType']} ({$booking['tripMode']})\n";
    $adminMessage .= "Total Amount: ₹{$booking['totalAmount']}\n";
    
    // Set mail headers
    $headers = "From: noreply@yourdomain.com\r\n";
    $headers .= "Reply-To: noreply@yourdomain.com\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    // Send emails (without failing if they don't work - log errors instead)
    try {
        // Send email to user
        @mail($booking['passengerEmail'], $userSubject, $userMessage, $headers);
        
        // Send email to admin
        @mail($adminEmail, $adminSubject, $adminMessage, $headers);
        
        logError("Cancellation emails sent", [
            'user_email' => $booking['passengerEmail'],
            'admin_email' => $adminEmail
        ]);
        
        return true;
    } catch (Exception $e) {
        logError("Failed to send cancellation emails", [
            'error' => $e->getMessage(),
            'booking_id' => $booking['id']
        ]);
        
        return false;
    }
}
?>
