
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin cancel-booking endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Only allow POST or PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    error_log("Cancel booking request data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // Extract booking ID
    $bookingId = $data['bookingId'];
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking can be cancelled (not already completed)
    if ($booking['status'] === 'completed') {
        sendJsonResponse(['status' => 'error', 'message' => 'Cannot cancel a completed booking'], 400);
    }
    
    // Update booking status to cancelled
    $updateStmt = $conn->prepare("
        UPDATE bookings 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ?
    ");
    
    $updateStmt->bind_param("i", $bookingId);
    $success = $updateStmt->execute();
    
    if (!$success) {
        throw new Exception("Failed to cancel booking: " . $conn->error);
    }
    
    // Fetch the updated booking
    $getStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $getStmt->bind_param("i", $bookingId);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Format response
    $formattedBooking = [
        'id' => (int)$updatedBooking['id'],
        'bookingNumber' => $updatedBooking['booking_number'],
        'status' => $updatedBooking['status'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Send success response
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Booking cancelled successfully',
        'data' => $formattedBooking
    ]);

} catch (Exception $e) {
    error_log("Error in cancel-booking.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to cancel booking: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
