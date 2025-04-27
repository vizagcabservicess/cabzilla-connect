
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Prevent any output before headers are sent
ob_start();

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
    ob_end_clean();
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
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Database connection failed after retries");
        }
    } catch (Exception $e) {
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Extract booking ID
    $bookingId = $data['bookingId'];
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        // For testing, if booking doesn't exist in DB, return mock success response
        if ($debugMode) {
            $mockBooking = [
                'id' => $bookingId,
                'booking_number' => 'TEST' . str_pad($bookingId, 8, '0', STR_PAD_LEFT),
                'passenger_name' => $data['passengerName'] ?? 'Test User',
                'passenger_phone' => $data['passengerPhone'] ?? '9876543210',
                'passenger_email' => $data['passengerEmail'] ?? 'test@example.com',
                'pickup_location' => $data['pickupLocation'] ?? 'Test Pickup',
                'drop_location' => $data['dropLocation'] ?? 'Test Drop',
                'pickup_date' => $data['pickupDate'] ?? date('Y-m-d H:i:s'),
                'return_date' => $data['returnDate'] ?? null,
                'cab_type' => $data['cabType'] ?? 'sedan',
                'total_amount' => $data['totalAmount'] ?? 1500,
                'status' => $data['status'] ?? 'confirmed',
                'driver_name' => $data['driverName'] ?? null,
                'driver_phone' => $data['driverPhone'] ?? null,
                'vehicle_number' => $data['vehicleNumber'] ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            sendJsonResponse([
                'status' => 'success', 
                'message' => 'Booking updated successfully (mock response)',
                'data' => $mockBooking
            ]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking can be updated (not cancelled or completed)
    if (!$debugMode && ($booking['status'] === 'completed' || $booking['status'] === 'cancelled')) {
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
        'status' => 'status',
        'driverName' => 'driver_name',
        'driverPhone' => 'driver_phone',
        'vehicleNumber' => 'vehicle_number'
    ];
    
    // Build update query dynamically
    foreach ($fieldMappings as $requestField => $dbField) {
        if (isset($data[$requestField]) && $data[$requestField] !== null) {
            $updateFields[] = "$dbField = ?";
            $types .= getTypeForField($data[$requestField]);
            $params[] = $data[$requestField];
        }
    }
    
    // Always add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // If nothing to update, just return success
    if (empty($params)) {
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'No fields to update',
            'data' => $booking
        ]);
    }
    
    // Add bookingId as the last parameter
    $types .= "i";
    $params[] = $bookingId;
    
    // Prepare and execute the update query
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $updateStmt = $conn->prepare($sql);
    
    // Use a helper function to properly reference values for bind_param
    function refValues($arr) {
        $refs = array();
        foreach($arr as $key => $value) {
            $refs[$key] = &$arr[$key];
        }
        return $refs;
    }
    
    // Dynamically bind parameters with proper referencing
    $bindParams = array($types);
    foreach ($params as $key => $value) {
        $bindParams[] = $params[$key];
    }
    
    call_user_func_array(array($updateStmt, 'bind_param'), refValues($bindParams));
    
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
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'vehicleNumber' => $updatedBooking['vehicle_number'],
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
