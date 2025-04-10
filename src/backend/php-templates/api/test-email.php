
<?php
// Enhanced Email Test script for vizagup.com
// Set proper headers for API response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Preflight OK']);
    exit;
}

// Include utilities if they exist
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';
$emailPath = $utilsPath . 'email.php';

// Check for required files and include them
$allFilesExist = true;
$missingFiles = [];

if (!file_exists($mailerPath)) {
    $allFilesExist = false;
    $missingFiles[] = 'mailer.php';
}

if (!file_exists($emailPath)) {
    $allFilesExist = false;
    $missingFiles[] = 'email.php';
}

// Include utilities with proper error handling
if (file_exists($mailerPath)) {
    include_once $mailerPath;
} 

if (file_exists($emailPath)) {
    include_once $emailPath;
}

// Function to check if email address is valid
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

// Get recipient email from query string
$recipientEmail = isset($_GET['email']) ? $_GET['email'] : '';

// If recipient email is not provided, return error
if (empty($recipientEmail)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Email address not provided. Use ?email=your@email.com'
    ]);
    exit;
}

// Validate email address
if (!isValidEmail($recipientEmail)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid email address: ' . $recipientEmail,
        'example' => 'Use a valid email like ?email=your@email.com'
    ]);
    exit;
}

// Check if required files exist before attempting to send email
if (!$allFilesExist) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Required files missing: ' . implode(', ', $missingFiles),
        'server_info' => [
            'php_version' => phpversion(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]
    ]);
    exit;
}

// Set up test variables
$subject = 'Test Email from Vizag Taxi Hub (' . date('Y-m-d H:i:s') . ')';
$htmlBody = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .header { background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email</h1>
        </div>
        <div class="content">
            <p>This is a test email from Vizag Taxi Hub.</p>
            <p>If you received this email, it means our email system is working correctly.</p>
            <p>Server Time: ' . date('Y-m-d H:i:s') . '</p>
            <p>Server Info: ' . php_uname() . '</p>
            <p>PHP Version: ' . phpversion() . '</p>
        </div>
        <div class="footer">
            <p>&copy; ' . date('Y') . ' Vizag Taxi Hub. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
';

// Track which methods we try
$methodsTried = [];
$successful = [];
$failed = [];

// Helper function to try a method and record results
function tryMethod($name, $callback, &$methodsTried, &$successful, &$failed) {
    $methodsTried[] = $name;
    
    try {
        $result = $callback();
        if ($result) {
            $successful[] = $name;
            return true;
        } else {
            $failed[] = $name;
            return false;
        }
    } catch (Exception $e) {
        $failed[] = $name;
        return false;
    }
}

// METHOD 1: Try Hostinger optimized approach
$hostingerMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    // 1. Try direct authenticated SMTP to smtp.hostinger.com:465
    if (function_exists('stream_socket_client')) {
        try {
            $context = stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ]
            ]);
            
            $socket = @stream_socket_client(
                "ssl://smtp.hostinger.com:465",
                $errno,
                $errstr,
                10,
                STREAM_CLIENT_CONNECT,
                $context
            );
            
            if ($socket) {
                // Read greeting
                $response = fgets($socket, 515);
                if (!$response) {
                    fclose($socket);
                    return false;
                }
                
                // Issue EHLO command
                fputs($socket, "EHLO vizagup.com\r\n");
                $response = fgets($socket, 515);
                
                // Flush additional EHLO responses
                while ($response && substr($response, 3, 1) == '-') {
                    $response = fgets($socket, 515);
                }
                
                // Authentication for Hostinger
                fputs($socket, "AUTH LOGIN\r\n");
                $response = fgets($socket, 515);
                
                // Username (Base64 encoded)
                fputs($socket, base64_encode('info@vizagup.com') . "\r\n");
                $response = fgets($socket, 515);
                
                // Password (replace with actual password)
                $password = "Your-Hostinger-Email-Password"; // Replace with actual password
                fputs($socket, base64_encode($password) . "\r\n");
                $response = fgets($socket, 515);
                
                // Check if authentication was successful
                if (!$response || substr($response, 0, 3) != '235') {
                    fclose($socket);
                    return false;
                }
                
                // Set envelope sender
                fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                $response = fgets($socket, 515);
                
                // Set recipient
                fputs($socket, "RCPT TO:<$recipientEmail>\r\n");
                $response = fgets($socket, 515);
                
                // Start data
                fputs($socket, "DATA\r\n");
                $response = fgets($socket, 515);
                
                // Send email content with proper headers
                fputs($socket, "From: Vizag Taxi Hub <info@vizagup.com>\r\n");
                fputs($socket, "To: $recipientEmail\r\n");
                fputs($socket, "Subject: $subject\r\n");
                fputs($socket, "MIME-Version: 1.0\r\n");
                fputs($socket, "Content-Type: text/html; charset=UTF-8\r\n");
                fputs($socket, "\r\n");
                fputs($socket, $htmlBody . "\r\n");
                fputs($socket, ".\r\n");
                $response = fgets($socket, 515);
                
                fputs($socket, "QUIT\r\n");
                fclose($socket);
                
                if ($response && substr($response, 0, 3) == '250') {
                    return true;
                }
            }
        } catch (Exception $e) {
            // Continue to next method
        }
    }
    
    return false;
};

// METHOD 2: Try direct sendmail command
$directSendmailMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    if (file_exists('/usr/sbin/hsendmail') || file_exists('/usr/sbin/sendmail')) {
        $sendmailPath = file_exists('/usr/sbin/hsendmail') ? '/usr/sbin/hsendmail' : '/usr/sbin/sendmail';
        
        try {
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Use properly formatted email
            $emailContent = "";
            $emailContent .= "Return-Path: <info@vizagup.com>\n";
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: <info@vizagup.com>\n";
            $emailContent .= "To: $recipientEmail\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try sendmail directly
            $command = "$sendmailPath -t < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            unlink($tempFile);
            
            if ($returnVar === 0) {
                return true;
            }
        } catch (Exception $e) {
            // Continue to next method
        }
    }
    
    return false;
};

// METHOD 3: Try sendmail with flag
$sendmailFlagMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    if (file_exists('/usr/sbin/hsendmail') || file_exists('/usr/sbin/sendmail')) {
        $sendmailPath = file_exists('/usr/sbin/hsendmail') ? '/usr/sbin/hsendmail' : '/usr/sbin/sendmail';
        
        try {
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Use properly formatted email
            $emailContent = "";
            $emailContent .= "Return-Path: <info@vizagup.com>\n";
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: <info@vizagup.com>\n";
            $emailContent .= "To: $recipientEmail\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try sendmail with -i flag
            $command = "$sendmailPath -i $recipientEmail < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            unlink($tempFile);
            
            if ($returnVar === 0) {
                return true;
            }
        } catch (Exception $e) {
            // Continue to next method
        }
    }
    
    return false;
};

// METHOD 4: Try sendEmailAllMethods
$sendEmailAllMethodsMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    if (function_exists('sendEmailAllMethods')) {
        return sendEmailAllMethods($recipientEmail, $subject, $htmlBody);
    }
    return false;
};

// METHOD 5: Try testDirectMailFunction
$testDirectMailFunctionMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    if (function_exists('testDirectMailFunction')) {
        return testDirectMailFunction($recipientEmail, $subject, $htmlBody);
    }
    return false;
};

// METHOD 6: Try minimal PHP mail
$minimalMailMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    $minimalHeaders = "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
    $minimalHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    return @mail($recipientEmail, $subject, $htmlBody, $minimalHeaders);
};

// METHOD 7: Try standard PHP mail
$standardMailMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    $headers = [];
    $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
    $headers[] = "Reply-To: info@vizagup.com";
    $headers[] = "Return-Path: <info@vizagup.com>";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-type: text/html; charset=UTF-8";
    $headers[] = "X-Mailer: PHP/" . phpversion();
    
    return @mail($recipientEmail, $subject, $htmlBody, implode("\r\n", $headers));
};

// METHOD 8: Try PHP mail with parameters
$mailWithParamsMethod = function() use ($recipientEmail, $subject, $htmlBody) {
    $headers = [];
    $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
    $headers[] = "Reply-To: info@vizagup.com";
    $headers[] = "Return-Path: <info@vizagup.com>";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-type: text/html; charset=UTF-8";
    
    return @mail($recipientEmail, $subject, $htmlBody, implode("\r\n", $headers), "-finfo@vizagup.com");
};

// Try each method in order
tryMethod('Hostinger optimized approach', $hostingerMethod, $methodsTried, $successful, $failed);
tryMethod('Direct sendmail command', $directSendmailMethod, $methodsTried, $successful, $failed);
tryMethod('Sendmail with -i flag', $sendmailFlagMethod, $methodsTried, $successful, $failed);
tryMethod('sendEmailAllMethods', $sendEmailAllMethodsMethod, $methodsTried, $successful, $failed);
tryMethod('testDirectMailFunction', $testDirectMailFunctionMethod, $methodsTried, $successful, $failed);
tryMethod('Minimal PHP mail()', $minimalMailMethod, $methodsTried, $successful, $failed);
tryMethod('PHP mail()', $standardMailMethod, $methodsTried, $successful, $failed);
tryMethod('PHP mail() with parameters', $mailWithParamsMethod, $methodsTried, $successful, $failed);

// Gather server info for diagnostics
$serverInfo = [
    'php_version' => phpversion(),
    'mail_function_exists' => function_exists('mail'),
    'mail_config' => [
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port')
    ],
    'server_info' => [
        'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'hostname' => gethostname() ?: 'unknown',
        'os' => PHP_OS
    ],
    'phpmailer_exists' => class_exists('PHPMailer'),
    'email_functions' => [
        'mail' => function_exists('mail'),
        'sendEmailWithPHPMailer' => function_exists('sendEmailWithPHPMailer'),
        'sendEmailAllMethods' => function_exists('sendEmailAllMethods')
    ],
    'time' => date('Y-m-d H:i:s')
];

// Return results
$status = !empty($successful) ? 'success' : 'error';
$message = !empty($successful) 
    ? 'Email sent successfully via: ' . implode(', ', $successful)
    : 'All email sending methods failed';

echo json_encode([
    'status' => $status,
    'message' => $message,
    'recipient' => $recipientEmail,
    'results' => [
        'methods_tried' => $methodsTried,
        'successful' => $successful,
        'failed' => $failed
    ],
    'server_info' => $serverInfo
]);
