
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
echo "PHPMailer class exists: " . (class_exists('PHPMailer') ? 'Yes' : 'No') . "\n\n";

// Check key functions
echo "Key Functions Available:\n";
echo "sendEmailWithPHPMailer: " . (function_exists('sendEmailWithPHPMailer') ? 'Yes' : 'No') . "\n";
echo "testDirectMailFunction: " . (function_exists('testDirectMailFunction') ? 'Yes' : 'No') . "\n";
echo "sendEmailAllMethods: " . (function_exists('sendEmailAllMethods') ? 'Yes' : 'No') . "\n\n";

echo "NOTE: For a quick email test, use test-email.php?email=your@email.com\n";
echo "For detailed diagnostics in JSON format, use: diagnose-email.php?format=json\n";

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
            'phpmailer_exists' => class_exists('PHPMailer')
        ],
        'functions' => [
            'sendEmailWithPHPMailer' => function_exists('sendEmailWithPHPMailer'),
            'testDirectMailFunction' => function_exists('testDirectMailFunction'),
            'sendEmailAllMethods' => function_exists('sendEmailAllMethods')
        ]
    ]);
}
