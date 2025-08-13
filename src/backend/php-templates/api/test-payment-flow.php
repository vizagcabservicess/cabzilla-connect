<?php
/**
 * Test script to verify the complete payment flow
 * Tests both failed and successful payment scenarios
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
    
    // Test 1: Failed Payment (no payment made)
    $failedPaymentData = [
        'razorpay_payment_id' => 'test_failed_payment_' . time(),
        'razorpay_order_id' => 'test_failed_order_' . time(),
        'razorpay_signature' => 'test_failed_signature_' . time(),
        'booking_id' => $booking['id']
    ];
    
    // Test 2: Partial Payment (30% of total)
    $partialAmount = round($booking['total_amount'] * 0.3, 2);
    $partialPaymentData = [
        'razorpay_payment_id' => 'test_partial_payment_' . time(),
        'razorpay_order_id' => 'test_partial_order_' . time(),
        'razorpay_signature' => 'test_partial_signature_' . time(),
        'booking_id' => $booking['id']
    ];
    
    // Test 3: Full Payment
    $fullPaymentData = [
        'razorpay_payment_id' => 'test_full_payment_' . time(),
        'razorpay_order_id' => 'test_full_order_' . time(),
        'razorpay_signature' => 'test_full_signature_' . time(),
        'booking_id' => $booking['id']
    ];
    
    $results = [];
    
    // Test 1: Failed Payment
    $results['failed_payment'] = [
        'description' => 'Testing failed payment (no amount paid)',
        'data' => $failedPaymentData,
        'expected_status' => 'pending',
        'expected_payment_status' => 'pending'
    ];
    
    // Test 2: Partial Payment
    $results['partial_payment'] = [
        'description' => 'Testing partial payment (30% of total)',
        'data' => $partialPaymentData,
        'expected_status' => 'pending',
        'expected_payment_status' => 'payment_pending',
        'amount' => $partialAmount
    ];
    
    // Test 3: Full Payment
    $results['full_payment'] = [
        'description' => 'Testing full payment',
        'data' => $fullPaymentData,
        'expected_status' => 'confirmed',
        'expected_payment_status' => 'paid',
        'amount' => $booking['total_amount']
    ];
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Payment flow test scenarios prepared',
        'booking_number' => $booking['booking_number'],
        'total_amount' => $booking['total_amount'],
        'test_scenarios' => $results,
        'instructions' => [
            '1. Failed Payment: Should not send email, booking remains pending',
            '2. Partial Payment: Should send email with partial payment details, booking remains pending',
            '3. Full Payment: Should send email with full payment details, booking becomes confirmed'
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to prepare payment flow test: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
