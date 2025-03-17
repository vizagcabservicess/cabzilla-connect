
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Check if booking ID is provided
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

$bookingId = (int)$_GET['id'];

// Log the request for debugging
logError("Booking details request", ['booking_id' => $bookingId]);

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

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Prepare query - admins can view any booking, users can only view their own
    if ($isAdmin) {
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->bind_param("i", $bookingId);
    } else {
        // For regular users, either user_id must match or if null (guest booking), match by id and credential
        if ($userId) {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ? AND (user_id = ? OR user_id IS NULL)");
            $stmt->bind_param("ii", $bookingId, $userId);
        } else {
            // If no user ID (not logged in), only allow access if no user is associated with booking
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ? AND user_id IS NULL");
            $stmt->bind_param("i", $bookingId);
        }
    }
    
    // Execute the query
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Check if booking exists
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found or access denied'], 404);
        exit;
    }
    
    // Fetch booking data
    $booking = $result->fetch_assoc();
    
    // Format response data
    $formattedBooking = [
        'id' => (int)$booking['id'],
        'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => (float)$booking['distance'],
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => (float)$booking['total_amount'],
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'hourlyPackage' => $booking['hourly_package'],
        'tourId' => $booking['tour_id'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send response
    sendJsonResponse(['status' => 'success', 'data' => $formattedBooking]);
    
} catch (Exception $e) {
    logError("Error fetching booking details", ['error' => $e->getMessage(), 'booking_id' => $bookingId]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to get booking details: ' . $e->getMessage()], 500);
}
