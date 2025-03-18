
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Updated to be more permissive
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');
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
logError("Booking details request", ['booking_id' => $bookingId, 'method' => $_SERVER['REQUEST_METHOD']]);

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;
$isAuthenticated = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        $isAuthenticated = true;
    }
}

logError("Auth info for booking details", ['user_id' => $userId, 'is_admin' => $isAdmin, 'is_authenticated' => $isAuthenticated]);

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // For debugging - log the database connection status
    logError("Database connection established", ['connected' => true]);
    
    // Build the query based on the user's authentication status
    if ($isAdmin) {
        // Admins can access any booking
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $params = [$bookingId];
        $types = "i";
    } elseif ($isAuthenticated) {
        // Authenticated users can access their own bookings
        $sql = "SELECT * FROM bookings WHERE id = ? AND (user_id = ? OR user_id IS NULL)";
        $params = [$bookingId, $userId];
        $types = "ii";
    } else {
        // Unauthenticated users can only access public bookings (guest bookings)
        $sql = "SELECT * FROM bookings WHERE id = ? AND user_id IS NULL";
        $params = [$bookingId];
        $types = "i";
    }
    
    // Log the SQL query for debugging
    logError("Executing SQL for booking", ['sql' => $sql, 'params' => $params]);
    
    // Prepare and execute the query
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Failed to prepare query: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Check if booking exists
    if ($result->num_rows === 0) {
        logError("Booking not found or access denied", ['booking_id' => $bookingId, 'user_id' => $userId]);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found or access denied'], 404);
        exit;
    }
    
    // Fetch booking data
    $booking = $result->fetch_assoc();
    
    // Log successful retrieval
    logError("Booking found successfully", ['booking_id' => $booking['id'], 'status' => $booking['status']]);
    
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
