
<?php
// Test endpoint for email sending
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable output buffering completely
if (ob_get_level()) ob_end_clean();
if (ob_get_length()) ob_clean();
if (ob_get_level()) ob_end_clean();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include email utilities
require_once __DIR__ . '/utils/mailer.php';

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

// Log request details
logTestEmail("Test email request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_SERVER['QUERY_STRING'] ?? 'none',
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

// Get the recipient email from the request
$recipientEmail = isset($_GET['email']) ? $_GET['email'] : 'test@example.com';
logTestEmail("Test email requested for recipient", $recipientEmail);

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
    
    // Try sending with PHPMailer first
    logTestEmail("Attempting to send test email with PHPMailer");
    $phpMailerResult = sendEmailWithPHPMailer($recipientEmail, $subject, $htmlBody);
    
    if ($phpMailerResult) {
        logTestEmail("PHPMailer test email sent successfully");
        echo json_encode([
            'status' => 'success',
            'message' => 'Test email sent successfully using PHPMailer',
            'recipient' => $recipientEmail,
            'time' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // If PHPMailer fails, try the legacy method
    logTestEmail("PHPMailer failed, attempting legacy method");
    $legacyResult = false;
    
    if (function_exists('sendEmail')) {
        $legacyResult = sendEmail($recipientEmail, $subject, $htmlBody);
        
        if ($legacyResult) {
            logTestEmail("Legacy email method succeeded");
            echo json_encode([
                'status' => 'success',
                'message' => 'Test email sent successfully using legacy method',
                'recipient' => $recipientEmail,
                'time' => date('Y-m-d H:i:s')
            ]);
            exit;
        }
    }
    
    // If all methods fail, try direct PHP mail() function
    logTestEmail("Trying direct PHP mail() function");
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagtaxihub.com' . "\r\n";
    
    $directMailResult = mail($recipientEmail, $subject, $htmlBody, $headers);
    
    if ($directMailResult) {
        logTestEmail("Direct PHP mail() function succeeded");
        echo json_encode([
            'status' => 'success',
            'message' => 'Test email sent successfully using PHP mail function',
            'recipient' => $recipientEmail,
            'time' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // If all methods fail
    logTestEmail("All email sending methods failed");
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send test email. See server logs for details.',
        'recipient' => $recipientEmail,
        'time' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    logTestEmail("Exception during test email", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Exception during test email: ' . $e->getMessage(),
        'recipient' => $recipientEmail,
        'time' => date('Y-m-d H:i:s')
    ]);
}
