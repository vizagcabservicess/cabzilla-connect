<?php
/**
 * Test script to verify partial payment confirmation email functionality
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
    
    // Calculate partial payment (30% of total)
    $partialAmount = round($booking['total_amount'] * 0.3, 2);
    $remainingBalance = $booking['total_amount'] - $partialAmount;
    
    // Format booking data for email with partial payment details
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
        'payment_status' => 'payment_pending', // Partial payment
        'payment_method' => 'razorpay',
        'advance_paid_amount' => $partialAmount, // 30% advance
        'razorpay_payment_id' => 'test_partial_payment_' . time(),
        'razorpay_order_id' => 'test_partial_order_' . time(),
        'razorpay_signature' => 'test_partial_signature_' . time(),
        'createdAt' => $booking['created_at'],
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    // Test partial payment confirmation email
    $success = sendPaymentConfirmationEmail($formattedBooking);
    
    if ($success) {
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Partial payment confirmation email test completed successfully',
            'booking_number' => $formattedBooking['bookingNumber'],
            'payment_status' => $formattedBooking['payment_status'],
            'advance_paid_amount' => $formattedBooking['advance_paid_amount'],
            'total_amount' => $formattedBooking['totalAmount'],
            'remaining_balance' => $remainingBalance,
            'payment_percentage' => round(($partialAmount / $booking['total_amount']) * 100, 1) . '%',
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com',
            'email_type' => 'Payment Confirmation (Partial Payment)'
        ]);
    } else {
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Partial payment confirmation email test failed',
            'booking_number' => $formattedBooking['bookingNumber']
        ], 500);
    }
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test partial payment confirmation email: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
