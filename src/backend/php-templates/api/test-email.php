
<?php
// Test endpoint for email sending with enhanced reliability
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error display for diagnostics
ini_set('display_errors', 0); // Turn off error display to ensure clean JSON output
ini_set('log_errors', 1);     // But enable error logging
error_reporting(E_ALL);

// Disable output buffering completely to prevent contamination
if (ob_get_level()) ob_end_clean();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include email utilities - use absolute paths for reliability
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';

// Log diagnostic information
error_log("Test email endpoint called from: " . $_SERVER['REQUEST_URI']);
error_log("Looking for mailer at: $mailerPath");

// First check if utility files exist
if (!file_exists($mailerPath)) {
    http_response_code(200); // Still return 200 for consistent API behavior
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
            $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE);
        } else {
            $logEntry .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Get mail server diagnostics
function getMailServerInfo() {
    $sendmailPath = ini_get('sendmail_path');
    error_log("Sendmail path: $sendmailPath");
    
    return [
        'php_version' => phpversion(),
        'mail_function_exists' => function_exists('mail'),
        'mail_config' => [
            'sendmail_path' => $sendmailPath,
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
    'remote_addr' => $_SERVER['REMOTE_ADDR'],
    'uri' => $_SERVER['REQUEST_URI']
]);

// Get the recipient email from the request
$recipientEmail = isset($_GET['email']) ? $_GET['email'] : 'test@example.com';
logTestEmail("Test email requested for recipient", $recipientEmail);

// Get server diagnostics
$serverInfo = getMailServerInfo();
logTestEmail("Server diagnostics", $serverInfo);

// Always set status to 200 for consistent API behavior
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
    
    // NEW METHOD: Try direct sendmail command first (most reliable on Linux)
    logTestEmail("Trying direct sendmail command");
    $sendmailPath = ini_get('sendmail_path');
    
    if (!empty($sendmailPath)) {
        // Create temporary email file
        $tempDir = sys_get_temp_dir();
        $tempFile = tempnam($tempDir, 'email_');
        
        // Build email content
        $emailContent = "To: $recipientEmail\n";
        $emailContent .= "From: info@vizagup.com\n";
        $emailContent .= "Subject: $subject\n";
        $emailContent .= "MIME-Version: 1.0\n";
        $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
        $emailContent .= $htmlBody;
        
        file_put_contents($tempFile, $emailContent);
        
        // Execute sendmail
        $command = "$sendmailPath -t < " . escapeshellarg($tempFile);
        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);
        
        logTestEmail("Sendmail command result: " . ($returnVar === 0 ? "SUCCESS" : "FAILED"), [
            'command' => $command,
            'return_code' => $returnVar,
            'output' => $output
        ]);
        
        $results['methods_tried'][] = 'Direct sendmail command';
        if ($returnVar === 0) {
            $results['successful'][] = 'Direct sendmail command';
            logTestEmail("Direct sendmail command succeeded");
        } else {
            $results['failed'][] = 'Direct sendmail command';
            logTestEmail("Direct sendmail command failed", ['return_code' => $returnVar]);
        }
        
        // Clean up
        unlink($tempFile);
    }
    
    // Try basic PHP mail function with minimal headers
    logTestEmail("Attempting to send test email with minimal PHP mail()");
    $minimalHeaders = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\n";
    
    $mailResult = @mail($recipientEmail, $subject, $htmlBody, $minimalHeaders);
    $results['methods_tried'][] = 'Minimal PHP mail()';
    
    if ($mailResult) {
        $results['successful'][] = 'Minimal PHP mail()';
        logTestEmail("Minimal PHP mail() test email sent successfully");
    } else {
        $results['failed'][] = 'Minimal PHP mail()';
        $error = error_get_last();
        logTestEmail("Minimal PHP mail() test email failed", [
            'error' => $error ? $error['message'] : 'Unknown error'
        ]);
    }
    
    // Try standard PHP mail with more headers
    logTestEmail("Attempting to send test email with PHP mail()");
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: noreply@vizagup.com' . "\r\n";
    
    $mailResult = @mail($recipientEmail, $subject, $htmlBody, $headers);
    $results['methods_tried'][] = 'PHP mail()';
    
    if ($mailResult) {
        $results['successful'][] = 'PHP mail()';
        logTestEmail("Direct PHP mail() test email sent successfully");
    } else {
        $results['failed'][] = 'PHP mail()';
        $error = error_get_last();
        logTestEmail("Direct PHP mail() test email failed", [
            'error' => $error ? $error['message'] : 'Unknown error'
        ]);
    }
    
    // Try simple mail with additional parameters
    logTestEmail("Attempting to send test email with mail() and additional parameters");
    $mailResult2 = @mail($recipientEmail, $subject, $htmlBody, $headers, "-fnoreply@vizagup.com");
    $results['methods_tried'][] = 'PHP mail() with parameters';
    
    if ($mailResult2) {
        $results['successful'][] = 'PHP mail() with parameters';
        logTestEmail("PHP mail() with additional parameters test email sent successfully");
    } else {
        $results['failed'][] = 'PHP mail() with parameters';
        $error = error_get_last();
        logTestEmail("PHP mail() with parameters test email failed", [
            'error' => $error ? $error['message'] : 'Unknown error'
        ]);
    }
    
    // Try with our utility functions if available
    if (function_exists('sendEmailAllMethods')) {
        logTestEmail("Attempting to send test email with sendEmailAllMethods");
        $allMethodsResult = sendEmailAllMethods($recipientEmail, $subject, $htmlBody);
        $results['methods_tried'][] = 'sendEmailAllMethods';
        
        if ($allMethodsResult) {
            $results['successful'][] = 'sendEmailAllMethods';
            logTestEmail("sendEmailAllMethods test email sent successfully");
        } else {
            $results['failed'][] = 'sendEmailAllMethods';
            logTestEmail("sendEmailAllMethods test email failed");
        }
    }
    
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
    
    // Ensure we return a properly formatted JSON response
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
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    logTestEmail("Exception during test email", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Ensure clean JSON response even on exception
    header('Content-Type: application/json');
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Exception during test email: ' . $e->getMessage(),
        'recipient' => $recipientEmail,
        'server_info' => $serverInfo,
        'time' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
