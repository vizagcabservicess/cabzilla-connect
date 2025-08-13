<?php
// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Preflight OK']);
    exit;
}

// Include required utilities
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';
$emailPath = $utilsPath . 'email.php';

if (file_exists($mailerPath)) {
    include_once $mailerPath;
}

if (file_exists($emailPath)) {
    include_once $emailPath;
}

// Test email data
$testData = [
    'bookingNumber' => 'TEST' . date('ymd') . rand(1000, 9999),
    'pickupLocation' => 'Visakhapatnam',
    'dropLocation' => 'Kakinada, Andhra Pradesh',
    'pickupDate' => date('Y-m-d H:i:s', strtotime('+1 day')),
    'cabType' => 'Swift Dzire',
    'totalAmount' => 4954,
    'passengerName' => 'Test User',
    'passengerEmail' => 'narendrakumarupwork@gmail.com', // Replace with your test email
    'passengerPhone' => '9966363662'
];

try {
    // Test the email confirmation function
    if (function_exists('sendBookingConfirmationEmail')) {
        $result = sendBookingConfirmationEmail($testData);
        echo json_encode([
            'status' => 'success',
            'message' => 'Email test completed',
            'email_sent' => $result,
            'test_data' => $testData
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'sendBookingConfirmationEmail function not found',
            'available_functions' => get_defined_functions()['user']
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Email test failed: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>

