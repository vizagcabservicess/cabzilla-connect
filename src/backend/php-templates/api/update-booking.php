<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow PUT requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get booking ID from URL
$bookingId = null;
if (isset($_GET['id'])) {
    $bookingId = $_GET['id'];
} else {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

if (!$userId && !$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

// Get data from request body
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // First check if the booking exists and belongs to the user or the user is an admin
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking belongs to the user or if the user is an admin
    if ($booking['user_id'] != $userId && !$isAdmin) {
        sendJsonResponse(['status' => 'error', 'message' => 'You do not have permission to update this booking'], 403);
        exit;
    }
    
    // Build the update query based on provided fields
    $updateFields = [];
    $updateValues = [];
    $updateTypes = "";
    
    $allowedFields = [
        'pickup_location' => 'pickupLocation',
        'drop_location' => 'dropLocation',
        'pickup_date' => 'pickupDate',
        'return_date' => 'returnDate',
        'passenger_name' => 'passengerName',
        'passenger_phone' => 'passengerPhone',
        'passenger_email' => 'passengerEmail',
        'status' => 'status'
    ];
    
    // Map API field names to database field names
    foreach ($allowedFields as $dbField => $apiField) {
        if (isset($data[$apiField])) {
            $updateFields[] = "$dbField = ?";
            $updateValues[] = $data[$apiField];
            $updateTypes .= "s"; // Assume all fields are strings for simplicity
        }
    }
    
    // Add the booking ID at the end of values
    $updateValues[] = $bookingId;
    $updateTypes .= "i";
    
    // If no fields to update, return success (no changes)
    if (count($updateFields) === 0) {
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
        exit;
    }
    
    // Update the booking
    $updateQuery = "UPDATE bookings SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateQuery);
    
    // Dynamically bind parameters
    $bindParams = array_merge([$updateTypes], $updateValues);
    $updateStmt->bind_param(...$bindParams);
    
    $success = $updateStmt->execute();
    
    if (!$success) {
        throw new Exception('Database error: ' . $updateStmt->error);
    }
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Format the response
    $booking = [
        'id' => (int)$updatedBooking['id'],
        'userId' => (int)$updatedBooking['user_id'],
        'bookingNumber' => $updatedBooking['booking_number'],
        'pickupLocation' => $updatedBooking['pickup_location'],
        'dropLocation' => $updatedBooking['drop_location'],
        'pickupDate' => $updatedBooking['pickup_date'],
        'returnDate' => $updatedBooking['return_date'],
        'cabType' => $updatedBooking['cab_type'],
        'distance' => (float)$updatedBooking['distance'],
        'tripType' => $updatedBooking['trip_type'],
        'tripMode' => $updatedBooking['trip_mode'],
        'totalAmount' => (float)$updatedBooking['total_amount'],
        'status' => $updatedBooking['status'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    sendJsonResponse(['status' => 'success', 'message' => 'Booking updated successfully', 'data' => $booking]);
    
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to update booking: ' . $e->getMessage()], 500);
}
