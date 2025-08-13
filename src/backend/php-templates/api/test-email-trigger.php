<?php
/**
 * Test script to verify email triggering
 * This simulates a payment verification to test email sending
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
    
    // Simulate payment verification data
    $payAmount = $booking['total_amount'] * 0.3; // 30% partial payment
    $paymentStatus = 'payment_pending';
    $bookingStatus = 'pending';
    $razorpay_payment_id = 'test_payment_' . time();
    $razorpay_order_id = 'test_order_' . time();
    $razorpay_signature = 'test_signature_' . time();
    
    // Format booking data for email testing (same as verify-razorpay-payment.php)
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
        'status' => $bookingStatus,
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'payment_status' => $paymentStatus,
        'payment_method' => 'razorpay',
        'advance_paid_amount' => $payAmount,
        'razorpay_payment_id' => $razorpay_payment_id,
        'razorpay_order_id' => $razorpay_order_id,
        'razorpay_signature' => $razorpay_signature,
        'createdAt' => $booking['created_at'],
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    // Test 1: Check if email functions exist
    $functionChecks = [
        'sendPaymentConfirmationEmail' => function_exists('sendPaymentConfirmationEmail'),
        'generatePaymentReceipt' => function_exists('generatePaymentReceipt'),
        'generatePDFFromHTML' => function_exists('generatePDFFromHTML'),
        'sendEmailWithAttachment' => function_exists('sendEmailWithAttachment'),
        'sendEmail' => function_exists('sendEmail'),
        'sendEmailAllMethods' => function_exists('sendEmailAllMethods')
    ];
    
    // Test 2: Try to send payment confirmation email
    $emailResult = null;
    try {
        $emailSuccess = sendPaymentConfirmationEmail($formattedBooking);
        $emailResult = [
            'status' => $emailSuccess ? 'success' : 'failed',
            'description' => 'Payment confirmation email with PDF receipt',
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com'
        ];
    } catch (Exception $e) {
        $emailResult = [
            'status' => 'error',
            'description' => 'Payment confirmation email failed',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ];
    }
    
    // Test 3: Check if PDF generation works
    $pdfResult = null;
    try {
        $receiptHtml = generatePaymentReceipt($formattedBooking);
        $pdfFilename = 'test_receipt_' . $formattedBooking['bookingNumber'] . '_' . date('Y-m-d_H-i-s');
        $pdfFile = generatePDFFromHTML($receiptHtml, $pdfFilename);
        
        $pdfResult = [
            'status' => $pdfFile ? 'success' : 'failed',
            'file_path' => $pdfFile,
            'file_exists' => $pdfFile ? file_exists($pdfFile) : false,
            'file_size' => $pdfFile && file_exists($pdfFile) ? filesize($pdfFile) : 0,
            'html_length' => strlen($receiptHtml)
        ];
    } catch (Exception $e) {
        $pdfResult = [
            'status' => 'error',
            'description' => 'PDF generation failed',
            'error' => $e->getMessage()
        ];
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Email trigger test completed',
        'booking_number' => $formattedBooking['bookingNumber'],
        'total_amount' => $formattedBooking['totalAmount'],
        'advance_paid' => $formattedBooking['advance_paid_amount'],
        'payment_status' => $formattedBooking['payment_status'],
        'function_checks' => $functionChecks,
        'email_test' => $emailResult,
        'pdf_test' => $pdfResult,
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'current_time' => date('Y-m-d H:i:s'),
            'booking_data_available' => !empty($booking),
            'formatted_booking_keys' => array_keys($formattedBooking)
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test email trigger: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
