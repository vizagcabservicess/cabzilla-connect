<?php
/**
 * Send booking confirmation email endpoint
 */

require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/email.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

try {
    // Get JSON data from request
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    // Validate required fields
    if (!isset($data['booking_id']) || empty($data['booking_id'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

    $bookingId = $data['booking_id'];
    
    // Connect to database
    $db = getDbConnectionWithRetry();
    
    // Fetch booking details with tour information
    $stmt = $db->prepare("
        SELECT b.*, tf.tour_name 
        FROM bookings b
        LEFT JOIN tour_fares tf ON b.tour_id = tf.tour_id
        WHERE b.id = ?
    ");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Fetch tour itinerary if this is a tour booking
    $tourItinerary = [];
    if (!empty($booking['tour_id'])) {
        $itineraryStmt = $db->prepare("
            SELECT day_number as day, title, description, activities 
            FROM tour_itinerary 
            WHERE tour_id = ? 
            ORDER BY day_number
        ");
        $itineraryStmt->bind_param("s", $booking['tour_id']);
        $itineraryStmt->execute();
        $itineraryResult = $itineraryStmt->get_result();
        
        while ($itineraryRow = $itineraryResult->fetch_assoc()) {
            $activities = [];
            if (!empty($itineraryRow['activities'])) {
                $decoded = json_decode($itineraryRow['activities'], true);
                $activities = is_array($decoded) ? $decoded : explode(',', $itineraryRow['activities']);
            }
            
            $tourItinerary[] = [
                'day' => (int)$itineraryRow['day'],
                'title' => $itineraryRow['title'],
                'description' => $itineraryRow['description'],
                'activities' => $activities
            ];
        }
    }

    // Format booking data for email
    $formattedBooking = [
        'id' => $booking['id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => $booking['distance'],
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => $booking['total_amount'],
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'payment_status' => $booking['payment_status'],
        'payment_method' => $booking['payment_method'],
        'advance_paid_amount' => $booking['advance_paid_amount'],
        'razorpay_payment_id' => $booking['razorpay_payment_id'],
        'razorpay_order_id' => $booking['razorpay_order_id'],
        'razorpay_signature' => $booking['razorpay_signature'],
        'tourId' => $booking['tour_id'] ?? null,
        'tourName' => $booking['tour_name'] ?? null,
        'tour_itinerary' => $tourItinerary,
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send payment confirmation email (includes both customer and admin notifications)
    $success = sendPaymentConfirmationEmail($formattedBooking);
    
    if ($success) {
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Payment confirmation email sent successfully',
            'booking_number' => $formattedBooking['bookingNumber'],
            'payment_status' => $formattedBooking['payment_status']
        ]);
    } else {
        sendJsonResponse([
        'status' => 'error', 
            'message' => 'Failed to send payment confirmation email',
            'booking_number' => $formattedBooking['bookingNumber']
        ], 500);
    }
    
} catch (Exception $e) {
    logError("Error in send-booking-confirmation endpoint", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to send booking confirmation email: ' . $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
