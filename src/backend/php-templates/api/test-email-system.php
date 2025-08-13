<?php
/**
 * Test script to verify the complete email system
 * Tests both booking confirmation and payment confirmation emails
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
    
    // Format booking data for email testing
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
        'payment_status' => 'paid',
        'payment_method' => 'razorpay',
        'advance_paid_amount' => $booking['total_amount'],
        'razorpay_payment_id' => 'test_payment_' . time(),
        'razorpay_order_id' => 'test_order_' . time(),
        'razorpay_signature' => 'test_signature_' . time(),
        'createdAt' => $booking['created_at'],
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    $results = [];
    
    // Test 1: Booking Confirmation Email
    try {
        $bookingEmailSuccess = sendBookingConfirmationEmail($formattedBooking);
        $results['booking_confirmation'] = [
            'status' => $bookingEmailSuccess ? 'success' : 'failed',
            'description' => 'Booking confirmation email (original design)',
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com'
        ];
    } catch (Exception $e) {
        $results['booking_confirmation'] = [
            'status' => 'error',
            'description' => 'Booking confirmation email failed',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 2: Payment Confirmation Email
    try {
        $paymentEmailSuccess = sendPaymentConfirmationEmail($formattedBooking);
        $results['payment_confirmation'] = [
            'status' => $paymentEmailSuccess ? 'success' : 'failed',
            'description' => 'Payment confirmation email (with receipt)',
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com'
        ];
    } catch (Exception $e) {
        $results['payment_confirmation'] = [
            'status' => 'error',
            'description' => 'Payment confirmation email failed',
            'error' => $e->getMessage()
        ];
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Email system test completed',
        'booking_number' => $formattedBooking['bookingNumber'],
        'total_amount' => $formattedBooking['totalAmount'],
        'test_results' => $results,
        'email_flow' => [
            '1. Booking Creation' => 'Sends booking confirmation email (original design)',
            '2. Payment Success' => 'Sends both booking confirmation and payment confirmation emails',
            '3. Admin Notification' => 'Sent to info@vizagtaxihub.com for both emails'
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test email system: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
