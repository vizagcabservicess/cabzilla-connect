<?php
// Comprehensive Email Test Script
// This will test all email functionality and provide detailed diagnostics

// Include configuration
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/email.php';
require_once __DIR__ . '/utils/mailer.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Test logging function
function testLog($message, $data = []) {
    $logFile = __DIR__ . '/../logs/email_test_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry);
}

// Start test session
testLog("=== EMAIL TEST SESSION STARTED ===");

try {
    $results = [];
    
    // Test 1: Check PHP Configuration
    testLog("Test 1: Checking PHP Configuration");
    $phpConfig = [
        'php_version' => phpversion(),
        'mail_function_exists' => function_exists('mail'),
        'fsockopen_exists' => function_exists('fsockopen'),
        'stream_socket_client_exists' => function_exists('stream_socket_client'),
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp_host' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port'),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'display_errors' => ini_get('display_errors'),
        'log_errors' => ini_get('log_errors'),
        'error_log' => ini_get('error_log')
    ];
    
    testLog("PHP Configuration", $phpConfig);
    $results['php_config'] = $phpConfig;
    
    // Test 2: Check File Permissions
    testLog("Test 2: Checking File Permissions");
    $permissions = [
        'logs_dir_exists' => file_exists($logDir),
        'logs_dir_writable' => is_writable($logDir),
        'current_dir_writable' => is_writable(__DIR__),
        'config_file_exists' => file_exists(__DIR__ . '/../config.php'),
        'email_file_exists' => file_exists(__DIR__ . '/utils/email.php'),
        'mailer_file_exists' => file_exists(__DIR__ . '/utils/mailer.php')
    ];
    
    testLog("File Permissions", $permissions);
    $results['permissions'] = $permissions;
    
    // Test 3: Check Email Configuration
    testLog("Test 3: Checking Email Configuration");
    $emailConfig = [
        'smtp_username' => defined('SMTP_USERNAME') ? SMTP_USERNAME : 'NOT_DEFINED',
        'smtp_host' => defined('SMTP_HOST') ? SMTP_HOST : 'NOT_DEFINED',
        'smtp_port' => defined('SMTP_PORT') ? SMTP_PORT : 'NOT_DEFINED',
        'smtp_secure' => defined('SMTP_SECURE') ? SMTP_SECURE : 'NOT_DEFINED',
        'app_url' => defined('APP_URL') ? APP_URL : 'NOT_DEFINED',
        'app_debug' => defined('APP_DEBUG') ? APP_DEBUG : 'NOT_DEFINED'
    ];
    
    testLog("Email Configuration", $emailConfig);
    $results['email_config'] = $emailConfig;
    
    // Test 4: Test Basic Mail Function
    testLog("Test 4: Testing Basic Mail Function");
    $testEmail = 'info@vizagtaxihub.com';
    $testSubject = 'Email Test - ' . date('Y-m-d H:i:s');
    $testBody = '<h1>Test Email</h1><p>This is a test email from Vizag Taxi Hub.</p>';
    
    // Set proper headers
    $headers = "From: Vizag Taxi Hub <info@vizagtaxihub.com>\r\n";
    $headers .= "Reply-To: info@vizagtaxihub.com\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Set envelope sender
    ini_set('sendmail_from', 'info@vizagtaxihub.com');
    
    $basicMailResult = @mail($testEmail, $testSubject, $testBody, $headers);
    $mailError = error_get_last();
    
    testLog("Basic Mail Result", [
        'success' => $basicMailResult,
        'error' => $mailError ? $mailError['message'] : 'No error',
        'to' => $testEmail,
        'subject' => $testSubject
    ]);
    
    $results['basic_mail'] = [
        'success' => $basicMailResult,
        'error' => $mailError ? $mailError['message'] : 'No error'
    ];
    
    // Test 5: Test sendEmailAllMethods Function
    testLog("Test 5: Testing sendEmailAllMethods Function");
    $emailSent = sendEmailAllMethods($testEmail, $testSubject, $testBody);
    
    testLog("sendEmailAllMethods Result", ['success' => $emailSent]);
    $results['sendEmailAllMethods'] = ['success' => $emailSent];
    
    // Test 6: Test Email Template Generation
    testLog("Test 6: Testing Email Template Generation");
    $testBooking = [
        'id' => 999,
        'bookingNumber' => 'TEST123',
        'pickupLocation' => 'Test Pickup',
        'dropLocation' => 'Test Drop',
        'pickupDate' => '2025-01-20 10:00:00',
        'cabType' => 'Sedan',
        'totalAmount' => 1000,
        'passengerName' => 'Test User',
        'passengerPhone' => '9876543210',
        'passengerEmail' => $testEmail,
        'payment_status' => 'paid',
        'payment_method' => 'razorpay'
    ];
    
    $emailTemplate = generateBookingConfirmationEmail($testBooking);
    $templateLength = strlen($emailTemplate);
    
    testLog("Email Template Generated", [
        'template_length' => $templateLength,
        'contains_html' => strpos($emailTemplate, '<html>') !== false,
        'contains_booking_number' => strpos($emailTemplate, 'TEST123') !== false
    ]);
    
    $results['email_template'] = [
        'generated' => !empty($emailTemplate),
        'length' => $templateLength,
        'contains_html' => strpos($emailTemplate, '<html>') !== false
    ];
    
    // Test 7: Test sendBookingConfirmationEmail Function
    testLog("Test 7: Testing sendBookingConfirmationEmail Function");
    $confirmationResult = sendBookingConfirmationEmail($testBooking);
    
    testLog("Booking Confirmation Email Result", ['success' => $confirmationResult]);
    $results['booking_confirmation'] = ['success' => $confirmationResult];
    
    // Test 8: Check for any error logs
    testLog("Test 8: Checking Error Logs");
    $errorLogs = [];
    $logFiles = glob($logDir . '/*.log');
    
    foreach ($logFiles as $logFile) {
        $fileName = basename($logFile);
        $fileSize = filesize($logFile);
        $lastModified = date('Y-m-d H:i:s', filemtime($logFile));
        
        $errorLogs[] = [
            'file' => $fileName,
            'size' => $fileSize,
            'last_modified' => $lastModified
        ];
    }
    
    testLog("Error Logs Found", $errorLogs);
    $results['error_logs'] = $errorLogs;
    
    // Test 9: Test Database Connection (for email functions that need it)
    testLog("Test 9: Testing Database Connection");
    try {
        $conn = getDbConnection();
        $dbConnected = true;
        $conn->close();
    } catch (Exception $e) {
        $dbConnected = false;
        $dbError = $e->getMessage();
    }
    
    testLog("Database Connection", [
        'connected' => $dbConnected,
        'error' => isset($dbError) ? $dbError : 'None'
    ]);
    
    $results['database'] = [
        'connected' => $dbConnected,
        'error' => isset($dbError) ? $dbError : 'None'
    ];
    
    // Summary
    testLog("=== EMAIL TEST SESSION COMPLETED ===");
    
    $summary = [
        'status' => 'success',
        'message' => 'Email test completed successfully',
        'timestamp' => date('Y-m-d H:i:s'),
        'results' => $results
    ];
    
    testLog("Test Summary", $summary);
    
    // Return results
    echo json_encode($summary, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    testLog("ERROR in email test", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    $errorResponse = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($errorResponse, JSON_PRETTY_PRINT);
}
?>
