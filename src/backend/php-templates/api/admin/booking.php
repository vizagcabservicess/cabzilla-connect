
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

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

// Log request info for debugging
logError("Admin booking endpoint request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_SERVER['QUERY_STRING'],
    'headers' => getallheaders()
]);

// Get booking ID from URL
$bookingId = null;
if (isset($_GET['id'])) {
    $bookingId = $_GET['id'];
} else {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

try {
    // Authenticate as admin
    $headers = getallheaders();
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("No auth header provided");
        sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
        exit;
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if (!$payload) {
        logError("Invalid token", ['token_length' => strlen($token)]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
        exit;
    }
    
    // Check if user is admin
    if (!isset($payload['role']) || $payload['role'] !== 'admin') {
        logError("Non-admin attempting admin action", ['user_id' => $payload['user_id'], 'role' => $payload['role'] ?? 'none']);
        sendJsonResponse(['status' => 'error', 'message' => 'Admin privileges required'], 403);
        exit;
    }
    
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }

    // Handle DELETE request
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // First check if booking exists
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            logError("Booking not found for deletion", ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            exit;
        }
        
        // Delete the booking
        $deleteStmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
        $deleteStmt->bind_param("i", $bookingId);
        $success = $deleteStmt->execute();
        
        if ($success) {
            logError("Booking deleted successfully", ['booking_id' => $bookingId, 'by_user_id' => $payload['user_id']]);
            sendJsonResponse(['status' => 'success', 'message' => 'Booking deleted successfully']);
        } else {
            throw new Exception("Failed to delete booking: " . $conn->error);
        }
    } 
    // Handle GET request for admin to view a specific booking
    else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            logError("Booking not found", ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            exit;
        }
        
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
            'createdAt' => $booking['created_at'],
            'updatedAt' => $booking['updated_at']
        ];
        
        sendJsonResponse(['status' => 'success', 'data' => $formattedBooking]);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in admin booking endpoint", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
