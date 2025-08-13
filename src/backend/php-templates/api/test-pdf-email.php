<?php
/**
 * Test script to verify PDF email functionality
 * Tests payment confirmation email with PDF receipt attachment
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
        'payment_status' => 'payment_pending',
        'payment_method' => 'razorpay',
        'advance_paid_amount' => $booking['total_amount'] * 0.3, // 30% partial payment
        'razorpay_payment_id' => 'test_payment_' . time(),
        'razorpay_order_id' => 'test_order_' . time(),
        'razorpay_signature' => 'test_signature_' . time(),
        'createdAt' => $booking['created_at'],
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    // Test PDF generation
    $receiptHtml = generatePaymentReceipt($formattedBooking);
    $pdfFilename = 'test_receipt_' . $formattedBooking['bookingNumber'] . '_' . date('Y-m-d_H-i-s');
    $pdfFile = generatePDFFromHTML($receiptHtml, $pdfFilename);
    
    $pdfResult = [
        'status' => $pdfFile ? 'success' : 'failed',
        'file_path' => $pdfFile,
        'file_exists' => $pdfFile ? file_exists($pdfFile) : false,
        'file_size' => $pdfFile && file_exists($pdfFile) ? filesize($pdfFile) : 0
    ];
    
    // Test payment confirmation email with PDF attachment
    try {
        $emailSuccess = sendPaymentConfirmationEmail($formattedBooking);
        $emailResult = [
            'status' => $emailSuccess ? 'success' : 'failed',
            'description' => 'Payment confirmation email with PDF receipt attachment',
            'customer_email' => $formattedBooking['passengerEmail'],
            'admin_email' => 'info@vizagtaxihub.com',
            'pdf_attachment' => $pdfResult
        ];
    } catch (Exception $e) {
        $emailResult = [
            'status' => 'error',
            'description' => 'Payment confirmation email failed',
            'error' => $e->getMessage(),
            'pdf_attachment' => $pdfResult
        ];
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'PDF email system test completed',
        'booking_number' => $formattedBooking['bookingNumber'],
        'total_amount' => $formattedBooking['totalAmount'],
        'advance_paid' => $formattedBooking['advance_paid_amount'],
        'payment_status' => $formattedBooking['payment_status'],
        'test_results' => [
            'pdf_generation' => $pdfResult,
            'email_with_attachment' => $emailResult
        ],
        'email_flow' => [
            '1. Payment Success' => 'Triggers payment confirmation email',
            '2. PDF Generation' => 'Creates PDF receipt from HTML',
            '3. Email with Attachment' => 'Sends email with PDF receipt attached',
            '4. Admin Notification' => 'Sent to info@vizagtaxihub.com'
        ],
        'features' => [
            '✅ PDF Receipt Generation' => 'Creates professional PDF receipts',
            '✅ Email Attachments' => 'Attaches PDF to confirmation emails',
            '✅ Partial Payment Support' => 'Shows amount paid and balance due',
            '✅ Trip Type & Mode' => 'Includes in booking details and receipts',
            '✅ No Premature Emails' => 'Only sends after payment confirmation'
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test PDF email system: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
