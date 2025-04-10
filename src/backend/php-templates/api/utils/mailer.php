<?php
// Enable debug mode for email functions
define('EMAIL_DEBUG_MODE', true);

// PHPMailer integration for reliable email sending

// Simulate PHPMailer for development environment with FIXED implementation
class PHPMailer {
    public $SMTPDebug = 0;
    public $Host = '';
    public $SMTPAuth = false;
    public $Username = '';
    public $Password = '';
    public $SMTPSecure = '';
    public $Port = 0;
    public $Subject = '';
    public $Body = '';
    public $AltBody = '';
    public $from = ['email' => '', 'name' => ''];
    public $to = '';
    public $replyTo = ['email' => '', 'name' => ''];
    public $isHtml = false;
    public $attachments = [];
    public $mailType = '';
    
    // Fixed implementation of missing methods
    public function setFrom($email, $name) {
        $this->from = ['email' => $email, 'name' => $name];
    }
    
    public function addAddress($email) {
        $this->to = $email;
    }
    
    public function addReplyTo($email, $name) {
        $this->replyTo = ['email' => $email, 'name' => $name];
    }
    
    public function isHTML($isHtml) {
        $this->isHtml = $isHtml;
    }
    
    public function addAttachment($path, $name = '') {
        $this->attachments[] = ['path' => $path, 'name' => $name];
    }
    
    // CRITICAL: Properly implement isSMTP method which was missing
    public function isSMTP() {
        $this->mailType = 'smtp';
    }
    
    public function send() {
        // In development, try to use native mail() function
        error_log("SIMULATION: Email would be sent to {$this->to} with subject: {$this->Subject}");
        
        // Log attempt to PHP error log for debugging
        error_log("Attempting to send email via PHPMailer to: {$this->to}");
        
        // Try using native mail function as fallback
        $headers = "From: {$this->from['email']}\r\n";
        $headers .= "Reply-To: {$this->from['email']}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        $success = mail($this->to, $this->Subject, $this->Body, $headers);
        
        // Log the result
        if ($success) {
            error_log("PHPMailer fallback to native mail(): SUCCESS - Sent to {$this->to}");
        } else {
            error_log("PHPMailer fallback to native mail(): FAILED - To {$this->to}");
            $error = error_get_last();
            if ($error) {
                error_log("Mail error: " . print_r($error, true));
            }
        }
        
        return $success;
    }
}

class SMTP {}
// CRITICAL: Do NOT declare Exception class, it's already part of PHP core

/**
 * Helper function to log errors during email sending
 */
function logError($message, $data = []) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
    
    // If debug mode is enabled, also output to error log
    if (defined('EMAIL_DEBUG_MODE') && EMAIL_DEBUG_MODE) {
        error_log("EMAIL DEBUG: " . $logEntry);
    }
}

/**
 * Send an email using PHPMailer with enhanced error handling
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @param array $attachments Optional array of attachments
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendEmailWithPHPMailer($to, $subject, $htmlBody, $attachments = []) {
    logError("Sending email with PHPMailer", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // Create a new PHPMailer instance
    $mail = new PHPMailer();
    
    try {
        // Server settings
        $mail->SMTPDebug = 0;                      // Disable debug output
        $mail->isSMTP();                           // Send using SMTP
        $mail->Host       = 'smtp.hostinger.com';  // SMTP server
        $mail->SMTPAuth   = true;                  // Enable SMTP authentication
        $mail->Username   = 'info@vizagup.com';    // SMTP username
        $mail->Password   = 'Joel@5544';           // SMTP password
        $mail->SMTPSecure = 'tls';                 // Enable TLS encryption
        $mail->Port       = 587;                   // TCP port to connect to
        
        // Recipients
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);                    // Add a recipient
        $mail->addReplyTo('info@vizagup.com', 'Vizag Taxi Hub');
        
        // Content
        $mail->isHTML(true);                       // Set email format to HTML
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = strip_tags($htmlBody);    // Plain text version
        
        // Add attachments if any
        if (!empty($attachments)) {
            foreach ($attachments as $attachment) {
                if (isset($attachment['path']) && file_exists($attachment['path'])) {
                    $mail->addAttachment(
                        $attachment['path'], 
                        isset($attachment['name']) ? $attachment['name'] : ''
                    );
                }
            }
        }
        
        // Log attempt before sending
        logError("Attempting to send email via PHPMailer SMTP", [
            'to' => $to,
            'subject' => $subject,
            'smtp_host' => $mail->Host
        ]);
        
        // Send the email
        $success = $mail->send();
        logError("PHPMailer send result", ['success' => $success ? 'true' : 'false']);
        return $success;
        
    } catch (Exception $e) {
        logError("PHPMailer Exception", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString() 
        ]);
        
        // Try again with alternative method
        try {
            // Try direct native mail as fallback
            $headers = "From: info@vizagup.com\r\n";
            $headers .= "Reply-To: info@vizagup.com\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            
            logError("Attempting direct mail send as fallback", ['to' => $to]);
            $directResult = mail($to, $subject, $htmlBody, $headers);
            
            $error = error_get_last();
            logError("Direct send result", [
                'success' => $directResult ? 'true' : 'false',
                'error' => $error ? $error['message'] : 'none'
            ]);
            
            return $directResult;
        } catch (Exception $e2) {
            logError("Direct mail send also failed", ['error' => $e2->getMessage()]);
            return false;
        }
    }
}

/**
 * Test direct PHP mail() function with extensive logging
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @return bool True if mail function succeeded, false otherwise
 */
function testDirectMailFunction($to, $subject, $htmlBody) {
    // Clear any previous PHP errors
    if (function_exists('error_clear_last')) {
        error_clear_last();
    }
    
    logError("Testing direct PHP mail() function", ['to' => $to, 'subject' => $subject]);
    
    // Prepare headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagup.com' . "\r\n";
    $headers .= 'Reply-To: info@vizagup.com' . "\r\n";
    
    // Attempt to send with extensive error checking
    error_log("Attempting to send mail to $to with subject: $subject");
    
    $mailResult = mail($to, $subject, $htmlBody, $headers);
    
    // Get error information if any
    $phpError = error_get_last();
    
    if (!$mailResult) {
        error_log("Mail FAILED to $to - Error: " . ($phpError ? $phpError['message'] : 'Unknown error'));
        logError("Direct mail() function failed", [
            'to' => $to,
            'subject' => $subject,
            'error' => $phpError ? $phpError['message'] : 'Unknown mail() failure',
            'headers' => $headers
        ]);
    } else {
        error_log("Mail SENT to $to with subject: $subject");
        logError("Direct mail() function succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
    }
    
    return $mailResult;
}

/**
 * Send an email using multiple methods, trying each in order until one succeeds
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @return bool True if any method succeeded, false if all failed
 */
function sendEmailAllMethods($to, $subject, $htmlBody) {
    // Create log directory if it doesn't exist
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_attempts_' . date('Y-m-d') . '.log';
    file_put_contents($logFile, "=== NEW EMAIL ATTEMPT ===\n", FILE_APPEND);
    file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
    file_put_contents($logFile, "To: $to\n", FILE_APPEND);
    file_put_contents($logFile, "Subject: $subject\n", FILE_APPEND);
    
    // First try direct PHP mail() as it's most likely to work on basic hosting
    file_put_contents($logFile, "Trying method 1: PHP mail()\n", FILE_APPEND);
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagup.com' . "\r\n";
    $headers .= 'Reply-To: info@vizagup.com' . "\r\n";
    
    // Try with error suppression to prevent any warnings breaking the page
    $mailResult = @mail($to, $subject, $htmlBody, $headers);
    $phpError = error_get_last();
    
    if ($mailResult) {
        file_put_contents($logFile, "Method 1 SUCCESS\n", FILE_APPEND);
        logError("Successfully sent email via mail()", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    } else {
        file_put_contents($logFile, "Method 1 FAILED: " . ($phpError ? $phpError['message'] : 'Unknown error') . "\n", FILE_APPEND);
    }
    
    // If simple mail() fails, try with additional parameters
    file_put_contents($logFile, "Trying method 2: mail() with additional parameters\n", FILE_APPEND);
    $mailResult2 = @mail($to, $subject, $htmlBody, $headers, "-finfo@vizagup.com");
    $phpError2 = error_get_last();
    
    if ($mailResult2) {
        file_put_contents($logFile, "Method 2 SUCCESS\n", FILE_APPEND);
        logError("Successfully sent email via mail() with additional parameters", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    } else {
        file_put_contents($logFile, "Method 2 FAILED: " . ($phpError2 ? $phpError2['message'] : 'Unknown error') . "\n", FILE_APPEND);
    }
    
    // Try with PHPMailer's simple implementation as a last resort
    file_put_contents($logFile, "Trying method 3: Simple PHPMailer implementation\n", FILE_APPEND);
    
    try {
        $mail = new PHPMailer();
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->isHTML(true);
        
        $success = $mail->send();
        
        if ($success) {
            file_put_contents($logFile, "Method 3 SUCCESS\n", FILE_APPEND);
            logError("Successfully sent email via simple PHPMailer", [
                'to' => $to,
                'subject' => $subject
            ]);
            return true;
        } else {
            file_put_contents($logFile, "Method 3 FAILED\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "Method 3 EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // If all methods fail, log the failure
    file_put_contents($logFile, "ALL METHODS FAILED\n", FILE_APPEND);
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    return false;
}

/**
 * Get mail server diagnostics information
 * 
 * @return array Array of mail server configuration details
 */
function getMailServerDiagnostics() {
    $diagnostics = [
        'php_version' => phpversion(),
        'mail_function_exists' => function_exists('mail') ? 'yes' : 'no',
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp_settings' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port'),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown',
        'server_os' => PHP_OS
    ];
    
    logError("Mail server diagnostics", $diagnostics);
    return $diagnostics;
}
