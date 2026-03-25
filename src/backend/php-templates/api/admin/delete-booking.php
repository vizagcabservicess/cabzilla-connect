<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin delete-booking endpoint called: " . $_SERVER['REQUEST_METHOD']);

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
function logDeleteBookingError($message, $data = []) {
    error_log("DELETE BOOKING ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/delete_booking_errors.log';
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
    // Only allow POST or DELETE requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    error_log("Delete booking request data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId'])) {
        logDeleteBookingError('Missing booking ID', $data);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Failed to connect to database after retries");
        }
    } catch (Exception $e) {
        logDeleteBookingError('Database connection error', ['error' => $e->getMessage()]);
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
        $checkStmt = $conn->prepare("SELECT id, status, booking_number FROM bookings WHERE id = ?");
        if (!$checkStmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $checkStmt->bind_param("i", $bookingId);
        if (!$checkStmt->execute()) {
            throw new Exception("Failed to execute statement: " . $checkStmt->error);
        }
        
        $result = $checkStmt->get_result();
        
        if ($result->num_rows === 0) {
            logDeleteBookingError('Booking not found', ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
    } catch (Exception $e) {
        logDeleteBookingError('Error checking booking', ['booking_id' => $bookingId, 'error' => $e->getMessage()]);
        
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
    
    // Allow deleting completed bookings; block only active/in-progress ones.
    $status = strtolower(trim((string)($booking['status'] ?? '')));
    $activeStatuses = ['in_progress', 'started', 'on_trip', 'ongoing'];
    if (in_array($status, $activeStatuses, true)) {
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Cannot delete an in-progress booking. Please complete or cancel it first.'
        ], 400);
    }
    
    // Delete the booking
    try {
        $deleteStmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
        
        if (!$deleteStmt) {
            throw new Exception("Failed to prepare delete statement: " . $conn->error);
        }
        
        $deleteStmt->bind_param("i", $bookingId);
        $success = $deleteStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to delete booking: " . $deleteStmt->error);
        }
        
        // Check if any rows were affected
        if ($deleteStmt->affected_rows === 0) {
            throw new Exception("No booking was deleted. The booking may have already been deleted.");
        }
    } catch (Exception $e) {
        logDeleteBookingError('Error deleting booking', [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Failed to delete booking',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Send success response
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Booking deleted successfully',
        'data' => [
            'id' => (int)$bookingId,
            'bookingNumber' => $booking['booking_number'],
            'deletedAt' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    logDeleteBookingError("Unhandled error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to delete booking: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
