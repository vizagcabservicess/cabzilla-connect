
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
error_log("Admin assign-driver endpoint called: " . $_SERVER['REQUEST_METHOD']);

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
function logAssignDriverError($message, $data = []) {
    error_log("ASSIGN DRIVER ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/assign_driver_errors.log';
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
    
    error_log("Assign driver request data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId']) || !isset($data['driverName']) || !isset($data['driverPhone']) || !isset($data['vehicleNumber'])) {
        logAssignDriverError('Missing required data', $data);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required data (bookingId, driverName, driverPhone, vehicleNumber)'], 400);
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Failed to connect to database after retries");
        }
    } catch (Exception $e) {
        logAssignDriverError('Database connection error', ['error' => $e->getMessage()]);
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Database connection failed. Please try again later.',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Extract booking ID and driver info
    $bookingId = $data['bookingId'];
    $driverName = $data['driverName'];
    $driverPhone = $data['driverPhone'];
    $vehicleNumber = $data['vehicleNumber'];
    
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
            logAssignDriverError('Booking not found', ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
    } catch (Exception $e) {
        logAssignDriverError('Error checking booking', ['booking_id' => $bookingId, 'error' => $e->getMessage()]);
        
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
    
    // Update booking with driver information
    try {
        $updateStmt = $conn->prepare("
            UPDATE bookings 
            SET driver_name = ?, driver_phone = ?, vehicle_number = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        if (!$updateStmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        // If booking was in pending or confirmed state, update to assigned
        $newStatus = 'assigned';
        if ($booking['status'] === 'cancelled') {
            // Don't change status if booking was already cancelled
            $newStatus = 'cancelled';
        }
        
        $updateStmt->bind_param("ssssi", $driverName, $driverPhone, $vehicleNumber, $newStatus, $bookingId);
        $success = $updateStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update booking: " . $updateStmt->error);
        }
    } catch (Exception $e) {
        logAssignDriverError('Error updating booking', [
            'booking_id' => $bookingId,
            'driver_name' => $driverName,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Failed to update booking with driver information',
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
            'driverName' => $updatedBooking['driver_name'],
            'driverPhone' => $updatedBooking['driver_phone'],
            'vehicleNumber' => $updatedBooking['vehicle_number'],
            'updatedAt' => $updatedBooking['updated_at']
        ];
        
        // Send success response
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Driver assigned successfully',
            'data' => $formattedBooking
        ]);
    } catch (Exception $e) {
        logAssignDriverError('Error fetching updated booking', [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        // Even if there's an error fetching the updated booking, the assignment probably worked
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Driver assigned successfully, but could not retrieve updated booking details',
            'error_details' => $debugMode ? $e->getMessage() : null,
            'data' => [
                'id' => (int)$bookingId,
                'driverName' => $driverName,
                'driverPhone' => $driverPhone,
                'vehicleNumber' => $vehicleNumber,
                'status' => $newStatus
            ]
        ]);
    }

} catch (Exception $e) {
    logAssignDriverError("Unhandled error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to assign driver: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
