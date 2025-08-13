<?php
/**
 * Test script to verify payment confirmation email functionality
 */

require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/email.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Connect to the database
    $db = getDbConnectionWithRetry();
    
    // Get the latest booking for testing
    $stmt = $db->prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse([
            'status' => 'error',
            'message' => 'No bookings found for testing'
        ]);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Format booking data for email with payment details
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
        'status' => 'confirmed',
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'payment_status' => 'paid', // Test with full payment
        'payment_method' => 'razorpay',
        'advance_paid_amount' => $booking['total_amount'], // Full payment
        'razorpay_payment_id' => 'test_payment_' . time(),
        'razorpay_order_id' => 'test_order_' . time(),
        'razorpay_signature' => 'test_signature_' . time(),
        'createdAt' => $booking['created_at'],
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    // Test payment confirmation email
    $success = sendPaymentConfirmationEmail($formattedBooking);
    
    if ($success) {
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Payment confirmation email test completed successfully',
            'booking_number' => $formattedBooking['bookingNumber'],
            'payment_status' => $formattedBooking['payment_status'],
            'advance_paid_amount' => $formattedBooking['advance_paid_amount'],
            'total_amount' => $formattedBooking['totalAmount'],
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com',
            'email_type' => 'Payment Confirmation (Full Payment)'
        ]);
    } else {
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Payment confirmation email test failed',
            'booking_number' => $formattedBooking['bookingNumber']
        ], 500);
    }
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test payment confirmation email: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>

