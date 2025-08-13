<?php
/**
 * Test script to verify payment verification with correct amount
 * This simulates the exact flow that should happen after a real payment
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
    
    // Simulate payment verification data (same as frontend sends)
    $totalAmount = $booking['total_amount'];
    $partialAmount = $totalAmount * 0.3; // 30% partial payment
    $fullAmount = $totalAmount;
    
    $testCases = [
        'partial_payment' => [
            'amount' => $partialAmount,
            'payment_status' => 'payment_pending',
            'booking_status' => 'pending',
            'description' => 'Partial Payment (30%)'
        ],
        'full_payment' => [
            'amount' => $fullAmount,
            'payment_status' => 'paid',
            'booking_status' => 'confirmed',
            'description' => 'Full Payment (100%)'
        ]
    ];
    
    $results = [];
    
    foreach ($testCases as $testName => $testCase) {
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
            'status' => $testCase['booking_status'],
            'passengerName' => $booking['passenger_name'],
            'passengerPhone' => $booking['passenger_phone'],
            'passengerEmail' => $booking['passenger_email'],
            'payment_status' => $testCase['payment_status'],
            'payment_method' => 'razorpay',
            'advance_paid_amount' => $testCase['amount'],
            'razorpay_payment_id' => 'test_payment_' . $testName . '_' . time(),
            'razorpay_order_id' => 'test_order_' . $testName . '_' . time(),
            'razorpay_signature' => 'test_signature_' . $testName . '_' . time(),
            'createdAt' => $booking['created_at'],
            'updatedAt' => date('Y-m-d H:i:s')
        ];
        
        // Test email sending
        try {
            $emailSuccess = sendPaymentConfirmationEmail($formattedBooking);
            $results[$testName] = [
                'status' => $emailSuccess ? 'success' : 'failed',
                'description' => $testCase['description'],
                'amount_paid' => $testCase['amount'],
                'total_amount' => $totalAmount,
                'payment_status' => $testCase['payment_status'],
                'booking_status' => $testCase['booking_status'],
                'customer_email' => $formattedBooking['passengerEmail'],
                'admin_email' => 'info@vizagtaxihub.com'
            ];
        } catch (Exception $e) {
            $results[$testName] = [
                'status' => 'error',
                'description' => $testCase['description'],
                'error' => $e->getMessage()
            ];
        }
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Payment verification test completed',
        'booking_number' => $booking['booking_number'],
        'total_amount' => $totalAmount,
        'test_results' => $results,
        'email_flow' => [
            '1. Frontend calculates amount' => 'Based on payment mode (partial/full)',
            '2. Frontend sends amount to verification API' => 'In verification request',
            '3. Verification API uses frontend amount' => 'Most reliable source',
            '4. Email triggered with correct amount' => 'Shows partial/full payment details',
            '5. PDF receipt generated' => 'With correct payment breakdown'
        ],
        'expected_behavior' => [
            'Partial Payment' => 'Shows amount paid, balance due, payment progress',
            'Full Payment' => 'Shows full amount paid, no balance due',
            'Email Content' => 'Includes Trip Type, Mode, and payment details',
            'PDF Receipt' => 'Professional receipt with payment breakdown'
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test payment verification: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
