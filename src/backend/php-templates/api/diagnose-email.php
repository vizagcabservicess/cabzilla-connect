
<?php
// Enhanced diagnostic endpoint for email troubleshooting - Hostinger optimized
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

// Check sendmail directly
$sendmailPath = ini_get('sendmail_path');
if (!empty($sendmailPath)) {
    echo "Sendmail path verification:\n";
    $sendmailExec = preg_replace('/\s.*$/', '', $sendmailPath); // Extract binary path
    echo "Sendmail binary: $sendmailExec\n";
    echo "Binary exists: " . (file_exists($sendmailExec) ? 'Yes' : 'No') . "\n";
    echo "Binary is executable: " . (is_executable($sendmailExec) ? 'Yes' : 'No') . "\n\n";
}

// Check for Hostinger's specific sendmail binary
echo "Hostinger sendmail check:\n";
$hostingerSendmail = '/usr/sbin/hsendmail';
echo "Hostinger sendmail exists: " . (file_exists($hostingerSendmail) ? 'Yes' : 'No') . "\n";
if (file_exists($hostingerSendmail)) {
    echo "Hostinger sendmail is executable: " . (is_executable($hostingerSendmail) ? 'Yes' : 'No') . "\n";
}
echo "\n";

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
    
    // Check PHPMailer class implementation
    echo "\nPHPMailer Implementation Check:\n";
    echo "PHPMailer class exists: " . (class_exists('PHPMailer') ? 'Yes' : 'No') . "\n";
    
    if (class_exists('PHPMailer')) {
        $methods = get_class_methods('PHPMailer');
        echo "PHPMailer has isSMTP method: " . (in_array('isSMTP', $methods) ? 'Yes' : 'No') . "\n";
        echo "PHPMailer has setFrom method: " . (in_array('setFrom', $methods) ? 'Yes' : 'No') . "\n";
        echo "PHPMailer has addAddress method: " . (in_array('addAddress', $methods) ? 'Yes' : 'No') . "\n";
        echo "PHPMailer has send method: " . (in_array('send', $methods) ? 'Yes' : 'No') . "\n";
        echo "Available PHPMailer methods: " . implode(', ', $methods) . "\n";
    }
} catch (Throwable $e) {
    echo "Failed - " . $e->getMessage() . "\n";
}

// Verify key methods are available
echo "\nKey Functions Available:\n";
echo "sendEmailWithPHPMailer: " . (function_exists('sendEmailWithPHPMailer') ? 'Yes' : 'No') . "\n";
echo "testDirectMailFunction: " . (function_exists('testDirectMailFunction') ? 'Yes' : 'No') . "\n";
echo "sendEmailAllMethods: " . (function_exists('sendEmailAllMethods') ? 'Yes' : 'No') . "\n\n";

// Try sending email directly with system command if on Linux
if (strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
    echo "Direct Sendmail Testing:\n";
    
    // Check multiple sendmail paths
    $sendmailBinaries = [
        '/usr/sbin/hsendmail',    // Hostinger specific
        '/usr/sbin/sendmail',     // Standard Linux
        ini_get('sendmail_path')  // PHP config
    ];
    
    foreach ($sendmailBinaries as $sendmailPath) {
        if (empty($sendmailPath)) continue;
        
        $sendmailExec = preg_replace('/\s.*$/', '', $sendmailPath); // Extract binary path
        if (!file_exists($sendmailExec)) continue;
        
        echo "Testing sendmail binary: $sendmailExec\n";
        
        if (isset($_GET['test']) && !empty($_GET['email'])) {
            $testEmail = $_GET['email'];
            
            // Create a test file in a temp directory
            $tempDir = sys_get_temp_dir();
            $tempFile = tempnam($tempDir, 'email_test_');
            
            $content = "Return-Path: info@vizagup.com\n"; // Important for Hostinger
            $content .= "From: info@vizagup.com\n";
            $content .= "To: $testEmail\n";
            $content .= "Subject: Sendmail Direct Test\n";
            $content .= "Content-Type: text/plain\n\n";
            $content .= "This is a direct sendmail test at " . date('Y-m-d H:i:s') . "\n";
            
            file_put_contents($tempFile, $content);
            
            echo "Created test email file: $tempFile\n";
            
            // Try direct recipient specification (works better on Hostinger)
            $command = "$sendmailExec $testEmail < " . escapeshellarg($tempFile);
            echo "Attempting to send directly with: $command\n";
            
            $output = [];
            $returnVar = 0;
            exec($command, $output, $returnVar);
            
            echo "Command result code: $returnVar (0 = success)\n";
            echo "Command output: " . implode("\n", $output) . "\n\n";
            
            // Try alternative approach with -i flag
            $command = "$sendmailExec -i $testEmail < " . escapeshellarg($tempFile);
            echo "Attempting with -i flag: $command\n";
            
            $output = [];
            $returnVar = 0;
            exec($command, $output, $returnVar);
            
            echo "Command result code: $returnVar (0 = success)\n";
            echo "Command output: " . implode("\n", $output) . "\n\n";
            
            // Clean up the temp file
            unlink($tempFile);
        }
    }
    
    if (!isset($_GET['test']) || empty($_GET['email'])) {
        echo "No test email provided. Add ?test=1&email=your@email.com to test direct sendmail.\n\n";
    }
}

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
    
    // Try basic PHP mail() with optimized settings for comparison
    if (function_exists('mail')) {
        echo "Testing with PHP mail() and Hostinger-optimized headers...\n";
        
        // Set proper envelope sender - critical for Hostinger
        ini_set('sendmail_from', 'info@vizagup.com');
        
        $headers = "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
        $headers .= "Reply-To: info@vizagup.com\r\n";
        $headers .= "Return-Path: info@vizagup.com\r\n"; // Important for Hostinger
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        
        $result = mail($testEmail, "PHP Mail Test with Hostinger headers", "<p>This is a test email sent with Hostinger-optimized headers</p>", $headers);
        echo "Result: " . ($result ? "SUCCESS" : "FAILED") . "\n";
        
        if (!$result) {
            $error = error_get_last();
            if ($error) {
                echo "Error: " . $error['message'] . "\n\n";
            }
        }
    }
    
    // Try to use sendEmailAllMethods if available
    if (function_exists('sendEmailAllMethods')) {
        echo "Testing with sendEmailAllMethods()...\n";
        $subject = "Test with All Methods";
        $body = "<h1>All Methods Test</h1><p>This is a test from the diagnostic tool using all methods at " . date('Y-m-d H:i:s') . "</p>";
        
        $result = sendEmailAllMethods($testEmail, $subject, $body);
        echo "Result: " . ($result ? "SUCCESS" : "FAILED") . "\n\n";
    }
}

echo "\nNOTE: For a quick email test, use test-email.php?email=your@email.com\n";
echo "For detailed diagnostics in JSON format, use: diagnose-email.php?format=json\n";
echo "To test email sending, use: diagnose-email.php?test=1&email=your@email.com\n";

// If JSON format requested
if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    
    // Get PHP mail settings
    $mailSettings = [
        'sendmail_from' => ini_get('sendmail_from'),
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port'),
        'mail_add_x_header' => ini_get('mail.add_x_header'),
        'mail_force_extra_parameters' => ini_get('mail.force_extra_parameters'),
        'mail_log' => ini_get('mail.log')
    ];
    
    // Check sendmail binary
    $sendmailInfo = [];
    if (!empty($mailSettings['sendmail_path'])) {
        $sendmailExec = preg_replace('/\s.*$/', '', $mailSettings['sendmail_path']);
        $sendmailInfo = [
            'binary' => $sendmailExec,
            'exists' => file_exists($sendmailExec),
            'executable' => is_executable($sendmailExec),
            'full_command' => $mailSettings['sendmail_path']
        ];
    }
    
    // Hostinger specific checks
    $hostingerInfo = [
        'hsendmail_exists' => file_exists('/usr/sbin/hsendmail'),
        'hsendmail_executable' => is_executable('/usr/sbin/hsendmail'),
        'is_hostinger' => (strpos($_SERVER['SERVER_SOFTWARE'] ?? '', 'LiteSpeed') !== false)
    ];
    
    // Gather PHPMailer methods if class exists
    $phpMailerMethods = [];
    if (class_exists('PHPMailer')) {
        $phpMailerMethods = get_class_methods('PHPMailer');
    }
    
    echo json_encode([
        'timestamp' => date('Y-m-d H:i:s'),
        'php' => [
            'version' => phpversion(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'os' => PHP_OS
        ],
        'mail' => [
            'function_exists' => function_exists('mail'),
            'settings' => $mailSettings,
            'sendmail' => $sendmailInfo,
            'hostinger' => $hostingerInfo
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
            'phpmailer_methods' => $phpMailerMethods
        ],
        'functions' => [
            'sendEmailWithPHPMailer' => function_exists('sendEmailWithPHPMailer'),
            'testDirectMailFunction' => function_exists('testDirectMailFunction'),
            'sendEmailAllMethods' => function_exists('sendEmailAllMethods')
        ]
    ], JSON_PRETTY_PRINT);
}
