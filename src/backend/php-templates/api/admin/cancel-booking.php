
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

// Log errors
function logCancelBookingError($message, $data = []) {
    error_log("CANCEL BOOKING ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/cancel_booking_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
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
        logCancelBookingError('Missing booking ID', $data);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Failed to connect to database after retries");
        }
    } catch (Exception $e) {
        logCancelBookingError('Database connection error', ['error' => $e->getMessage()]);
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Database connection failed. Please try again later.',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Extract booking ID
    $bookingId = $data['bookingId'];
    
    // Verify booking exists
    try {
        $checkStmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ?");
        if (!$checkStmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $checkStmt->bind_param("i", $bookingId);
        if (!$checkStmt->execute()) {
            throw new Exception("Failed to execute statement: " . $checkStmt->error);
        }
        
        $result = $checkStmt->get_result();
        
        if ($result->num_rows === 0) {
            logCancelBookingError('Booking not found', ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
    } catch (Exception $e) {
        logCancelBookingError('Error checking booking', ['booking_id' => $bookingId, 'error' => $e->getMessage()]);
        
        // If this is likely a missing bookings table issue, return a more helpful message
        if (strpos($e->getMessage(), "doesn't exist") !== false) {
            sendJsonResponse([
                'status' => 'error', 
                'message' => 'The bookings table does not exist. Please initialize the database first.',
                'error_details' => $debugMode ? $e->getMessage() : null
            ], 500);
        } else {
            sendJsonResponse([
                'status' => 'error', 
                'message' => 'Error checking booking details',
                'error_details' => $debugMode ? $e->getMessage() : null
            ], 500);
        }
    }
    
    // Check if the booking can be cancelled (not already completed)
    if ($booking['status'] === 'completed') {
        sendJsonResponse(['status' => 'error', 'message' => 'Cannot cancel a completed booking'], 400);
    }
    
    // Update booking status to cancelled
    try {
        $updateStmt = $conn->prepare("
            UPDATE bookings 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = ?
        ");
        
        if (!$updateStmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        $updateStmt->bind_param("i", $bookingId);
        $success = $updateStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update booking: " . $updateStmt->error);
        }
    } catch (Exception $e) {
        logCancelBookingError('Error updating booking status', [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Failed to cancel booking',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Fetch the updated booking
    try {
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
        logCancelBookingError('Error fetching updated booking', [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        // Even if there's an error fetching the updated booking, the cancellation probably worked
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Booking cancelled successfully, but could not retrieve updated booking details',
            'error_details' => $debugMode ? $e->getMessage() : null,
            'data' => [
                'id' => (int)$bookingId,
                'status' => 'cancelled'
            ]
        ]);
    }

} catch (Exception $e) {
    logCancelBookingError("Unhandled error", ['error' => $e->getMessage()]);
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
