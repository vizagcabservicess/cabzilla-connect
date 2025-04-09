
<?php
// Test script for PHPMailer email functionality
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Include the email utilities
require_once __DIR__ . '/utils/email.php';

// Function to log test results
function logTestResult($message, $data = null) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_test_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } else {
            $logEntry .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
}

// Create a sample booking data
$testBooking = [
    'bookingNumber' => 'TEST' . time(),
    'pickupLocation' => 'Test Location',
    'dropLocation' => 'Test Destination',
    'pickupDate' => date('Y-m-d H:i:s'),
    'cabType' => 'Sedan',
    'distance' => 25,
    'tripType' => 'outstation',
    'tripMode' => 'one-way',
    'totalAmount' => 2400,
    'passengerName' => 'Test User',
    'passengerEmail' => isset($_GET['email']) ? $_GET['email'] : 'info@vizagup.com',
    'passengerPhone' => '9999999999',
    'status' => 'confirmed'
];

// Log test start
logTestResult('Starting email test', [
    'recipient' => $testBooking['passengerEmail'],
    'booking_number' => $testBooking['bookingNumber']
]);

try {
    // Test sending customer email
    $customerEmailResult = sendBookingConfirmationEmail($testBooking);
    logTestResult('Customer email result', ['success' => $customerEmailResult ? 'yes' : 'no']);
    
    // Test sending admin notification
    $adminEmailResult = sendAdminNotificationEmail($testBooking);
    logTestResult('Admin email result', ['success' => $adminEmailResult ? 'yes' : 'no']);
    
    // Prepare and send response
    $response = [
        'status' => ($customerEmailResult || $adminEmailResult) ? 'success' : 'error',
        'message' => ($customerEmailResult || $adminEmailResult) 
            ? 'Email test completed successfully' 
            : 'Email test failed - check logs',
        'details' => [
            'customerEmailSent' => $customerEmailResult,
            'adminEmailSent' => $adminEmailResult,
            'testEmailAddress' => $testBooking['passengerEmail']
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    logTestResult('Test error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Email test failed with exception: ' . $e->getMessage()
    ]);
}
