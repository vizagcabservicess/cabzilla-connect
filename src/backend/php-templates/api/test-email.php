
<?php
// Test endpoint for email sending
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error display for diagnostics
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Disable output buffering completely
if (ob_get_level()) ob_end_clean();
if (ob_get_length()) ob_clean();
if (ob_get_level()) ob_end_clean();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include email utilities - use absolute paths for reliability
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';
$responsePath = $utilsPath . 'response.php';

// Log diagnostic information
error_log("Test email endpoint called. Looking for: $mailerPath");

// First check if utility files exist
if (!file_exists($mailerPath)) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Mail utilities not found at: ' . $mailerPath,
        'server_path' => __DIR__
    ]);
    exit;
}

// Include required files
require_once $mailerPath;

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

function logTestEmail($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/test_email_' . date('Y-m-d') . '.log';
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
    error_log($logEntry); // Also log to PHP error log
}

// Get mail server diagnostics
function getMailServerInfo() {
    return [
        'php_version' => phpversion(),
        'mail_function_exists' => function_exists('mail'),
        'mail_config' => [
            'sendmail_path' => ini_get('sendmail_path'),
            'smtp' => ini_get('SMTP'),
            'smtp_port' => ini_get('smtp_port'),
        ],
        'server_info' => [
            'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'hostname' => gethostname() ?: 'unknown',
            'os' => PHP_OS,
        ],
        'phpmailer_exists' => class_exists('PHPMailer'),
        'email_functions' => [
            'mail' => function_exists('mail'),
            'sendEmailWithPHPMailer' => function_exists('sendEmailWithPHPMailer'),
            'sendEmailAllMethods' => function_exists('sendEmailAllMethods'),
        ]
    ];
}

// Log request details
logTestEmail("Test email request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_SERVER['QUERY_STRING'] ?? 'none',
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

// Get the recipient email from the request
$recipientEmail = isset($_GET['email']) ? $_GET['email'] : 'test@example.com';
logTestEmail("Test email requested for recipient", $recipientEmail);

// Get server diagnostics
$serverInfo = getMailServerInfo();
logTestEmail("Server diagnostics", $serverInfo);

// Always set status to 200 for browser visibility
http_response_code(200);

try {
    // Create test email content
    $subject = "Test Email from Vizag Taxi Hub";
    $htmlBody = "
        <html>
        <body>
            <h2>Test Email</h2>
            <p>This is a test email from Vizag Taxi Hub.</p>
            <p>If you received this email, the email sending functionality is working correctly.</p>
            <p>Time: " . date('Y-m-d H:i:s') . "</p>
            <p>Server: " . $_SERVER['SERVER_NAME'] . "</p>
        </body>
        </html>
    ";
    
    // Results tracking
    $results = [
        'methods_tried' => [],
        'successful' => [],
        'failed' => []
    ];
    
    // Try direct PHP mail function with additional error diagnostics
    logTestEmail("Attempting to send test email with PHP mail()");
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: noreply@vizagup.com' . "\r\n"; // Using a generic from address
    
    // Get initial error state
    $lastError = error_get_last();
    
    $mailResult = @mail($recipientEmail, $subject, $htmlBody, $headers);
    $results['methods_tried'][] = 'PHP mail()';
    
    // Check for new errors
    $newError = error_get_last();
    $errorMessage = ($newError !== $lastError) ? $newError['message'] : null;
    
    if ($mailResult) {
        $results['successful'][] = 'PHP mail()';
        logTestEmail("Direct PHP mail() test email sent successfully");
    } else {
        $results['failed'][] = 'PHP mail()';
        logTestEmail("Direct PHP mail() test email failed", ['error' => $errorMessage]);
    }
    
    // Try with PHPMailer if available
    if (function_exists('sendEmailWithPHPMailer')) {
        logTestEmail("Attempting to send test email with PHPMailer");
        $phpMailerResult = sendEmailWithPHPMailer($recipientEmail, $subject, $htmlBody);
        $results['methods_tried'][] = 'PHPMailer';
        
        if ($phpMailerResult) {
            $results['successful'][] = 'PHPMailer';
            logTestEmail("PHPMailer test email sent successfully");
        } else {
            $results['failed'][] = 'PHPMailer';
            logTestEmail("PHPMailer test email failed");
        }
    }
    
    // Try other utility methods if available
    if (function_exists('testDirectMailFunction')) {
        logTestEmail("Attempting to send test email with testDirectMailFunction");
        $directResult = testDirectMailFunction($recipientEmail, $subject, $htmlBody);
        $results['methods_tried'][] = 'testDirectMailFunction';
        
        if ($directResult) {
            $results['successful'][] = 'testDirectMailFunction';
            logTestEmail("testDirectMailFunction test email sent successfully");
        } else {
            $results['failed'][] = 'testDirectMailFunction';
            logTestEmail("testDirectMailFunction test email failed");
        }
    }
    
    // Determine if any method succeeded
    $anySuccess = !empty($results['successful']);
    
    // CRITICAL: Always ensure we return a properly formatted JSON response
    while (ob_get_level()) ob_end_clean(); // Clear any output buffering
    header('Content-Type: application/json'); // Re-establish content type
    
    echo json_encode([
        'status' => $anySuccess ? 'success' : 'error',
        'message' => $anySuccess ? 
            'Test email sent successfully using at least one method' : 
            'All email sending methods failed',
        'recipient' => $recipientEmail,
        'results' => $results,
        'server_info' => $serverInfo,
        'time' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    logTestEmail("Exception during test email", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // CRITICAL: Ensure clean JSON response even on exception
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json');
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Exception during test email: ' . $e->getMessage(),
        'recipient' => $recipientEmail,
        'server_info' => $serverInfo,
        'time' => date('Y-m-d H:i:s')
    ]);
}
