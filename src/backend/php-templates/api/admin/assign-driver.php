
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
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required data (bookingId, driverName, driverPhone, vehicleNumber)'], 400);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // Extract booking ID and driver info
    $bookingId = $data['bookingId'];
    $driverName = $data['driverName'];
    $driverPhone = $data['driverPhone'];
    $vehicleNumber = $data['vehicleNumber'];
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }
    
    $booking = $result->fetch_assoc();
    
    // Update booking with driver information
    $updateStmt = $conn->prepare("
        UPDATE bookings 
        SET driver_name = ?, driver_phone = ?, vehicle_number = ?, status = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    // If booking was in pending or confirmed state, update to assigned
    $newStatus = 'assigned';
    if ($booking['status'] === 'cancelled') {
        // Don't change status if booking was already cancelled
        $newStatus = 'cancelled';
    }
    
    $updateStmt->bind_param("ssssi", $driverName, $driverPhone, $vehicleNumber, $newStatus, $bookingId);
    $success = $updateStmt->execute();
    
    if (!$success) {
        throw new Exception("Failed to update booking: " . $conn->error);
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
    error_log("Error in assign-driver.php: " . $e->getMessage());
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
