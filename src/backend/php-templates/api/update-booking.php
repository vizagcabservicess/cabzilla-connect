
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log request data for debugging
logError("update-booking.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders()
]);

// Ensure user is authenticated
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    logError("Missing authorization header in update-booking.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id'])) {
    logError("Authentication failed in update-booking.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    exit;
}

$userId = $userData['user_id'];
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';

// Get the booking ID from URL
$requestUri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($requestUri, '/'));
$bookingId = end($parts);

if (!is_numeric($bookingId)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);
logError("Booking update data", ['booking_id' => $bookingId, 'data' => $data]);

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in update-booking.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Check if booking exists and belongs to the user (or if admin)
$stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
if (!$stmt) {
    logError("Prepare statement failed for booking check", ['error' => $conn->error]);
    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
    exit;
}

$stmt->bind_param("i", $bookingId);
if (!$stmt->execute()) {
    logError("Execute statement failed for booking check", ['error' => $stmt->error]);
    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
    exit;
}

$result = $stmt->get_result();
$booking = $result->fetch_assoc();

if (!$booking) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    exit;
}

// Check if this user is authorized to update this booking
if (!$isAdmin && $booking['user_id'] != $userId) {
    sendJsonResponse(['status' => 'error', 'message' => 'You are not authorized to update this booking'], 403);
    exit;
}

// Begin transaction for data consistency
$conn->begin_transaction();

try {
    // Prepare update fields
    $updateFields = [];
    $types = "";
    $params = [];
    
    // Fields that can be updated by users
    $allowedFields = [
        'passenger_name' => 'passengerName',
        'passenger_phone' => 'passengerPhone',
        'passenger_email' => 'passengerEmail',
        'pickup_date' => 'pickupDate',
        'pickup_location' => 'pickupLocation',
        'drop_location' => 'dropLocation'
    ];
    
    // Additional fields that can only be updated by admins
    if ($isAdmin) {
        $allowedFields = array_merge($allowedFields, [
            'return_date' => 'returnDate',
            'cab_type' => 'cabType',
            'trip_type' => 'tripType',
            'trip_mode' => 'tripMode',
            'total_amount' => 'totalAmount',
            'status' => 'status',
            'driver_name' => 'driverName',
            'driver_phone' => 'driverPhone'
        ]);
    }
    
    // Build the update statement dynamically
    foreach ($allowedFields as $dbField => $requestField) {
        if (isset($data[$requestField]) && $data[$requestField] !== null) {
            $updateFields[] = "$dbField = ?";
            
            // Determine the type for bind_param
            if ($dbField === 'total_amount') {
                $types .= "d"; // double
            } else {
                $types .= "s"; // string
            }
            
            // Make sure empty strings don't become null
            $value = $data[$requestField];
            if (is_string($value) && empty($value)) {
                $value = '';
            }
            
            $params[] = $value;
        }
    }
    
    // Always update the 'updated_at' field
    $updateFields[] = "updated_at = NOW()";
    
    // If there are no fields to update, return success
    if (empty($updateFields)) {
        $conn->commit();
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to update']);
        exit;
    }
    
    // Prepare and execute the update statement
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $types .= "i"; // For the booking ID
    $params[] = $bookingId;
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    // Bind parameters dynamically
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    // Log the update
    logError("Booking updated successfully", [
        'booking_id' => $bookingId,
        'fields_updated' => implode(", ", array_keys($allowedFields)),
        'updated_by' => $userId
    ]);
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed for select: " . $conn->error);
    }
    
    $stmt->bind_param("i", $bookingId);
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed for select: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    if (!$updatedBooking) {
        throw new Exception("No booking found after update");
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Format the booking data for response
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
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking updated successfully',
        'data' => $formattedBooking
    ]);
    
} catch (Exception $e) {
    // Roll back the transaction on error
    $conn->rollback();
    
    logError("Booking update failed", [
        'error' => $e->getMessage(),
        'booking_id' => $bookingId,
        'data' => $data
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to update booking: ' . $e->getMessage()
    ], 500);
}
