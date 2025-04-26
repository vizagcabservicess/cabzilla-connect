
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
error_log("Admin update-booking endpoint called: " . $_SERVER['REQUEST_METHOD']);

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
    
    error_log("Update booking request data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // Extract booking ID
    $bookingId = $data['bookingId'];
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking can be updated (not cancelled or completed)
    if ($booking['status'] === 'completed' || $booking['status'] === 'cancelled') {
        sendJsonResponse(['status' => 'error', 'message' => 'Cannot update a completed or cancelled booking'], 400);
    }
    
    // Prepare update SQL dynamically based on provided fields
    $updateFields = [];
    $types = "";
    $params = [];
    
    // Map fields from request to database columns
    $fieldMappings = [
        'passengerName' => 'passenger_name',
        'passengerPhone' => 'passenger_phone',
        'passengerEmail' => 'passenger_email',
        'pickupLocation' => 'pickup_location',
        'dropLocation' => 'drop_location',
        'pickupDate' => 'pickup_date',
        'returnDate' => 'return_date',
        'cabType' => 'cab_type',
        'totalAmount' => 'total_amount',
        'status' => 'status'
    ];
    
    // Build update query dynamically
    foreach ($fieldMappings as $requestField => $dbField) {
        if (isset($data[$requestField])) {
            $updateFields[] = "$dbField = ?";
            $types .= getTypeForField($data[$requestField]);
            $params[] = $data[$requestField];
        }
    }
    
    // Always add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // If nothing to update, just return success
    if (empty($params)) {
        sendJsonResponse(['status' => 'success', 'message' => 'No fields to update']);
    }
    
    // Add bookingId as the last parameter
    $types .= "i";
    $params[] = $bookingId;
    
    // Prepare and execute the update query
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $updateStmt = $conn->prepare($sql);
    
    // Dynamically bind parameters
    $bindParams = array_merge([$types], $params);
    $updateStmt->bind_param(...$bindParams);
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
        'pickupLocation' => $updatedBooking['pickup_location'],
        'dropLocation' => $updatedBooking['drop_location'],
        'pickupDate' => $updatedBooking['pickup_date'],
        'returnDate' => $updatedBooking['return_date'],
        'cabType' => $updatedBooking['cab_type'],
        'totalAmount' => (float)$updatedBooking['total_amount'],
        'status' => $updatedBooking['status'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Send success response
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Booking updated successfully',
        'data' => $formattedBooking
    ]);

} catch (Exception $e) {
    error_log("Error in update-booking.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to update booking: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Helper function to determine parameter type
function getTypeForField($value) {
    if (is_int($value)) return "i"; // integer
    if (is_float($value)) return "d"; // double/float
    return "s"; // string (default)
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
