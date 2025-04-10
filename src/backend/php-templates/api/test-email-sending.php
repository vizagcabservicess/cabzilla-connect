
<?php
// Simple script to test email sending

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Include required utilities
if (file_exists(__DIR__ . '/utils/mailer.php')) {
    require_once __DIR__ . '/utils/mailer.php';
}
if (file_exists(__DIR__ . '/utils/email.php')) {
    require_once __DIR__ . '/utils/email.php';
}

// Helper function to log results
function logTestResult($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_test_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Get email address from query parameter or use default
$testEmail = isset($_GET['email']) ? $_GET['email'] : 'test@example.com';
$testName = isset($_GET['name']) ? $_GET['name'] : 'Test User';

// Results array
$results = [
    'status' => 'success',
    'message' => 'Test completed, see details below',
    'methods' => [],
    'server_info' => [
        'php_version' => phpversion(),
        'mail_enabled' => function_exists('mail') ? 'Yes' : 'No',
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'operating_system' => PHP_OS,
        'hostname' => gethostname(),
        'time' => date('Y-m-d H:i:s')
    ]
];

// Test subject and content
$testSubject = "Email Testing - " . date('Y-m-d H:i:s');
$testHtmlBody = "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { padding: 20px; border: 1px solid #ddd; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>Test Email</h1>
        <p>This is a test email sent at " . date('Y-m-d H:i:s') . "</p>
        <p>If you're seeing this, the email system is working!</p>
        <p>Server: " . (gethostname() ?: 'Unknown') . "</p>
        <p>PHP Version: " . phpversion() . "</p>
    </div>
</body>
</html>
";

logTestResult("Starting email test", [
    'to' => $testEmail,
    'name' => $testName,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
]);

// Test Method 1: Direct PHP mail()
try {
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagtaxihub.com' . "\r\n";
    
    $mailResult = mail($testEmail, $testSubject . ' - PHP mail()', $testHtmlBody, $headers);
    $results['methods']['php_mail'] = [
        'success' => $mailResult ? true : false,
        'error' => $mailResult ? null : 'Mail function returned false'
    ];
    
    logTestResult("PHP mail() test result", ['success' => $mailResult ? 'yes' : 'no']);
} catch (Exception $e) {
    $results['methods']['php_mail'] = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    logTestResult("PHP mail() test exception", ['error' => $e->getMessage()]);
}

// Test Method 2: PHPMailer if available
if (function_exists('sendEmailWithPHPMailer')) {
    try {
        $phpMailerResult = sendEmailWithPHPMailer($testEmail, $testSubject . ' - PHPMailer', $testHtmlBody);
        $results['methods']['phpmailer'] = [
            'success' => $phpMailerResult ? true : false,
            'error' => $phpMailerResult ? null : 'PHPMailer function returned false'
        ];
        
        logTestResult("PHPMailer test result", ['success' => $phpMailerResult ? 'yes' : 'no']);
    } catch (Exception $e) {
        $results['methods']['phpmailer'] = [
            'success' => false,
            'error' => $e->getMessage()
        ];
        logTestResult("PHPMailer test exception", ['error' => $e->getMessage()]);
    }
} else {
    $results['methods']['phpmailer'] = [
        'success' => false,
        'error' => 'Function sendEmailWithPHPMailer not available'
    ];
    logTestResult("PHPMailer not available");
}

// Test Method 3: Enhanced email function if available
if (function_exists('sendEmailAllMethods')) {
    try {
        $enhancedResult = sendEmailAllMethods($testEmail, $testSubject . ' - Enhanced', $testHtmlBody);
        $results['methods']['enhanced_email'] = [
            'success' => $enhancedResult ? true : false,
            'error' => $enhancedResult ? null : 'Enhanced email function returned false'
        ];
        
        logTestResult("Enhanced email test result", ['success' => $enhancedResult ? 'yes' : 'no']);
    } catch (Exception $e) {
        $results['methods']['enhanced_email'] = [
            'success' => false,
            'error' => $e->getMessage()
        ];
        logTestResult("Enhanced email test exception", ['error' => $e->getMessage()]);
    }
} else {
    $results['methods']['enhanced_email'] = [
        'success' => false,
        'error' => 'Function sendEmailAllMethods not available'
    ];
    logTestResult("Enhanced email function not available");
}

// Check log files
$logDir = __DIR__ . '/../logs';
$logFiles = [];
if (is_dir($logDir)) {
    $files = scandir($logDir);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..' && is_file($logDir . '/' . $file)) {
            $logFiles[] = $file;
        }
    }
}
$results['log_files'] = $logFiles;

// Return results
echo json_encode($results, JSON_PRETTY_PRINT);
