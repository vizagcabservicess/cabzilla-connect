<?php
/**
 * Direct email test - bypasses database issues to test email functionality
 */

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
    // Create test booking data (no database required)
    $testBooking = [
        'id' => 999,
        'bookingNumber' => 'VTH' . date('Ymd') . 'TEST' . rand(100, 999),
        'pickupLocation' => 'Test Pickup Location, Visakhapatnam, Andhra Pradesh',
        'dropLocation' => 'Test Drop Location, Andhra Pradesh, India',
        'pickupDate' => date('Y-m-d H:i:s', strtotime('+1 day')),
        'returnDate' => null,
        'cabType' => 'Swift Dzire',
        'distance' => 150,
        'tripType' => 'outstation',
        'tripMode' => 'one-way',
        'totalAmount' => 5000,
        'status' => 'confirmed',
        'passengerName' => 'Test User',
        'passengerPhone' => '9876543210',
        'passengerEmail' => 'narendrakumarupwork@gmail.com', // Use your email for testing
        'payment_status' => 'payment_pending',
        'payment_method' => 'razorpay',
        'advance_paid_amount' => 1500, // 30% partial payment
        'razorpay_payment_id' => 'test_payment_' . time(),
        'razorpay_order_id' => 'test_order_' . time(),
        'razorpay_signature' => 'test_signature_' . time(),
        'createdAt' => date('Y-m-d H:i:s'),
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
    
    // Test 2: Generate receipt HTML
    $receiptResult = null;
    try {
        $receiptHtml = generatePaymentReceipt($testBooking);
        $receiptResult = [
            'status' => 'success',
            'html_length' => strlen($receiptHtml),
            'html_preview' => substr($receiptHtml, 0, 200) . '...'
        ];
    } catch (Exception $e) {
        $receiptResult = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 3: Generate PDF
    $pdfResult = null;
    try {
        $pdfFilename = 'test_receipt_' . $testBooking['bookingNumber'] . '_' . date('Y-m-d_H-i-s');
        $pdfFile = generatePDFFromHTML($receiptHtml, $pdfFilename);
        
        $pdfResult = [
            'status' => $pdfFile ? 'success' : 'failed',
            'file_path' => $pdfFile,
            'file_exists' => $pdfFile ? file_exists($pdfFile) : false,
            'file_size' => $pdfFile && file_exists($pdfFile) ? filesize($pdfFile) : 0
        ];
    } catch (Exception $e) {
        $pdfResult = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 4: Send email
    $emailResult = null;
    try {
        $emailSuccess = sendPaymentConfirmationEmail($testBooking);
        $emailResult = [
            'status' => $emailSuccess ? 'success' : 'failed',
            'description' => 'Payment confirmation email with PDF receipt',
            'customer_email' => $testBooking['passengerEmail'],
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
    
    // Test 5: Test basic email sending
    $basicEmailResult = null;
    try {
        $basicSuccess = sendEmail(
            $testBooking['passengerEmail'],
            'Test Email - ' . $testBooking['bookingNumber'],
            '<h1>Test Email</h1><p>This is a test email to verify the email system is working.</p>',
            'This is a test email to verify the email system is working.'
        );
        $basicEmailResult = [
            'status' => $basicSuccess ? 'success' : 'failed',
            'description' => 'Basic email test'
        ];
    } catch (Exception $e) {
        $basicEmailResult = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Direct email test completed',
        'booking_number' => $testBooking['bookingNumber'],
        'total_amount' => $testBooking['totalAmount'],
        'advance_paid' => $testBooking['advance_paid_amount'],
        'payment_status' => $testBooking['payment_status'],
        'function_checks' => $functionChecks,
        'receipt_test' => $receiptResult,
        'pdf_test' => $pdfResult,
        'email_test' => $emailResult,
        'basic_email_test' => $basicEmailResult,
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'current_time' => date('Y-m-d H:i:s'),
            'mail_function' => function_exists('mail') ? 'available' : 'not available',
            'sendmail_path' => ini_get('sendmail_path'),
            'smtp_host' => ini_get('SMTP'),
            'smtp_port' => ini_get('smtp_port')
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test email system: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}
?>
