
<?php
// Include the configuration file
require_once __DIR__ . '/../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Check if ID is provided
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid or missing booking ID'], 400);
    exit;
}

$bookingId = $_GET['id'];

// Log the receipt request
logError("Receipt request", [
    'booking_id' => $bookingId,
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI']
]);

// Check for authentication
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
}

// Verify token if provided
$userId = null;
$isAdmin = false;

if ($token) {
    $userData = verifyJwtToken($token);
    
    if ($userData && isset($userData['user_id'])) {
        $userId = $userData['user_id'];
        $isAdmin = isset($userData['role']) && $userData['role'] === 'admin';
    }
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in receipt.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Prepare the SQL query based on user role and authentication
    if ($isAdmin) {
        // Admin can view any booking
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
    } else if ($userId) {
        // Regular user can only view their own bookings
        $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $bookingId, $userId);
    } else {
        // Allow public access to booking receipts (for sharing)
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();
    
    if (!$booking) {
        logError("Booking not found", ['booking_id' => $bookingId]);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    // Check authorization for non-admin users
    if ($userId && !$isAdmin && $booking['user_id'] != $userId) {
        logError("Unauthorized booking access", [
            'booking_id' => $bookingId,
            'user_id' => $userId,
            'booking_user_id' => $booking['user_id']
        ]);
        sendJsonResponse(['status' => 'error', 'message' => 'You are not authorized to view this booking'], 403);
        exit;
    }
    
    // Format the booking data for response
    $formattedBooking = [
        'id' => $booking['id'],
        'userId' => $booking['user_id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => floatval($booking['distance']),
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => floatval($booking['total_amount']),
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'driverName' => $booking['driver_name'],
        'driverPhone' => $booking['driver_phone'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send the response
    sendJsonResponse([
        'status' => 'success',
        'data' => $formattedBooking
    ]);
    
} catch (Exception $e) {
    logError("Error retrieving booking receipt", [
        'error' => $e->getMessage(),
        'booking_id' => $bookingId
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to retrieve booking receipt: ' . $e->getMessage()
    ], 500);
}
