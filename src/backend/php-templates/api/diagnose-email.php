
<?php
// Basic diagnostic endpoint for email troubleshooting
header('Content-Type: text/plain');
echo "Email System Diagnostic Report\n";
echo "============================\n";
echo "Generated: " . date('Y-m-d H:i:s') . "\n\n";

// PHP Version
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Server OS: " . PHP_OS . "\n\n";

// Mail Function
echo "Mail Function Available: " . (function_exists('mail') ? 'Yes' : 'No') . "\n";
echo "sendmail_path: " . ini_get('sendmail_path') . "\n";
echo "SMTP Setting: " . ini_get('SMTP') . "\n";
echo "SMTP Port: " . ini_get('smtp_port') . "\n\n";

// Check for required files
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';
$emailPath = $utilsPath . 'email.php';
$responsePath = $utilsPath . 'response.php';

echo "File Checks:\n";
echo "mailer.php exists: " . (file_exists($mailerPath) ? 'Yes' : 'No') . "\n";
echo "email.php exists: " . (file_exists($emailPath) ? 'Yes' : 'No') . "\n";
echo "response.php exists: " . (file_exists($responsePath) ? 'Yes' : 'No') . "\n\n";

// Check log directory
$logDir = __DIR__ . '/../logs';
echo "Logs directory exists: " . (file_exists($logDir) ? 'Yes' : 'No') . "\n";
echo "Logs directory writable: " . (is_writable($logDir) ? 'Yes' : 'No') . "\n\n";

// Try to include mailer.php
echo "Including mailer.php: ";
try {
    include_once $mailerPath;
    echo "Success\n";
} catch (Throwable $e) {
    echo "Failed - " . $e->getMessage() . "\n";
}

// Check PHPMailer class
echo "PHPMailer class exists: " . (class_exists('PHPMailer') ? 'Yes' : 'No') . "\n";
echo "PHPMailer has isSMTP method: " . (method_exists('PHPMailer', 'isSMTP') ? 'Yes' : 'No') . "\n\n";

// Verify key methods are available
echo "Key Functions Available:\n";
echo "sendEmailWithPHPMailer: " . (function_exists('sendEmailWithPHPMailer') ? 'Yes' : 'No') . "\n";
echo "testDirectMailFunction: " . (function_exists('testDirectMailFunction') ? 'Yes' : 'No') . "\n";
echo "sendEmailAllMethods: " . (function_exists('sendEmailAllMethods') ? 'Yes' : 'No') . "\n\n";

// Try a test email if requested
if (isset($_GET['test']) && !empty($_GET['email'])) {
    $testEmail = $_GET['email'];
    echo "TEST MODE: Attempting to send test email to $testEmail\n\n";
    
    if (function_exists('testDirectMailFunction')) {
        echo "Testing with testDirectMailFunction()...\n";
        $subject = "Email System Diagnostic Test";
        $body = "<h1>Test Email</h1><p>This is a test from the email diagnostic tool at " . date('Y-m-d H:i:s') . "</p>";
        
        $result = testDirectMailFunction($testEmail, $subject, $body);
        echo "Result: " . ($result ? "SUCCESS" : "FAILED") . "\n\n";
    } else {
        echo "testDirectMailFunction not available\n\n";
    }
    
    // Try basic PHP mail() for comparison
    if (function_exists('mail')) {
        echo "Testing with PHP mail()...\n";
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: info@vizagup.com' . "\r\n";
        
        $result = mail($testEmail, "PHP Mail Test", "<p>This is a test email sent with PHP's mail() function</p>", $headers);
        echo "Result: " . ($result ? "SUCCESS" : "FAILED") . "\n";
        
        if (!$result) {
            $error = error_get_last();
            if ($error) {
                echo "Error: " . $error['message'] . "\n\n";
            }
        }
        
        // Try with additional parameters
        echo "Testing with PHP mail() and sendmail parameters...\n";
        $result = mail($testEmail, "PHP Mail Test with params", "<p>This is a test email sent with PHP's mail() function and additional parameters</p>", $headers, "-finfo@vizagup.com");
        echo "Result: " . ($result ? "SUCCESS" : "FAILED") . "\n";
        
        if (!$result) {
            $error = error_get_last();
            if ($error) {
                echo "Error: " . $error['message'] . "\n\n";
            }
        }
    }
}

echo "\nNOTE: For a quick email test, use test-email.php?email=your@email.com\n";
echo "For detailed diagnostics in JSON format, use: diagnose-email.php?format=json\n";
echo "To test email sending, use: diagnose-email.php?test=1&email=your@email.com\n";

// If JSON format requested
if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode([
        'timestamp' => date('Y-m-d H:i:s'),
        'php' => [
            'version' => phpversion(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'os' => PHP_OS
        ],
        'mail' => [
            'function_exists' => function_exists('mail'),
            'sendmail_path' => ini_get('sendmail_path'),
            'smtp' => ini_get('SMTP'),
            'smtp_port' => ini_get('smtp_port')
        ],
        'files' => [
            'mailer_exists' => file_exists($mailerPath),
            'email_exists' => file_exists($emailPath),
            'response_exists' => file_exists($responsePath)
        ],
        'logs' => [
            'dir_exists' => file_exists($logDir),
            'dir_writable' => is_writable($logDir)
        ],
        'classes' => [
            'phpmailer_exists' => class_exists('PHPMailer'),
            'phpmailer_has_issmtp' => method_exists('PHPMailer', 'isSMTP')
        ],
        'functions' => [
            'sendEmailWithPHPMailer' => function_exists('sendEmailWithPHPMailer'),
            'testDirectMailFunction' => function_exists('testDirectMailFunction'),
            'sendEmailAllMethods' => function_exists('sendEmailAllMethods')
        ]
    ]);
}
