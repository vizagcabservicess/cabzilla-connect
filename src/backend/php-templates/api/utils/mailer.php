
<?php
// Enable debug mode for email functions
define('EMAIL_DEBUG_MODE', true);

// PHPMailer integration for reliable email sending
// IMPORTANT: Avoid declaring PHPMailer class if it already exists
if (!class_exists('PHPMailer')) {
    // Custom PHPMailer implementation optimized for compatibility with PHP 8.x
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
        
        // Implementation of methods
        public function setFrom($email, $name = '') {
            $this->from = ['email' => $email, 'name' => $name];
            return true;
        }
        
        public function addAddress($email, $name = '') {
            $this->to = $email;
            return true;
        }
        
        public function addReplyTo($email, $name = '') {
            $this->replyTo = ['email' => $email, 'name' => $name];
            return true;
        }
        
        public function isHTML($isHtml) {
            $this->isHtml = $isHtml;
            return true;
        }
        
        public function addAttachment($path, $name = '') {
            $this->attachments[] = ['path' => $path, 'name' => $name];
            return true;
        }
        
        // Properly implement isSMTP method
        public function isSMTP() {
            $this->mailType = 'smtp';
            return true;
        }
        
        public function send() {
            // Log attempt to PHP error log for debugging
            error_log("Attempting to send email via PHPMailer to: {$this->to}");
            
            try {
                // Try using native mail function as fallback
                $headers = "From: {$this->from['email']}\r\n";
                $headers .= "Reply-To: {$this->from['email']}\r\n";
                $headers .= "MIME-Version: 1.0\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
                
                // TRY MULTIPLE APPROACHES:
                // 1. First try with native mail()
                $success = @mail($this->to, $this->Subject, $this->Body, $headers);
                
                if (!$success) {
                    // 2. Try with alternative approach
                    $success = @mail($this->to, $this->Subject, $this->Body, $headers, "-f{$this->from['email']}");
                    
                    if (!$success) {
                        // 3. Try direct command-line sendmail approach on Linux
                        if (strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
                            $sendmailPath = ini_get('sendmail_path');
                            if (!empty($sendmailPath)) {
                                // Create a temporary email file
                                $tempEmailFile = tempnam(sys_get_temp_dir(), 'email_');
                                $emailContent = "To: {$this->to}\n";
                                $emailContent .= "From: {$this->from['email']}\n";
                                $emailContent .= "Subject: {$this->Subject}\n";
                                $emailContent .= "MIME-Version: 1.0\n";
                                $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
                                $emailContent .= $this->Body;
                                
                                file_put_contents($tempEmailFile, $emailContent);
                                
                                // Execute sendmail directly
                                $cmd = "$sendmailPath -t < " . escapeshellarg($tempEmailFile);
                                $output = [];
                                $returnVar = 0;
                                exec($cmd, $output, $returnVar);
                                
                                // Clean up
                                unlink($tempEmailFile);
                                
                                $success = ($returnVar === 0);
                                
                                if ($success) {
                                    error_log("PHPMailer fallback to direct sendmail command: SUCCESS - Sent to {$this->to}");
                                    return true;
                                }
                            }
                        }
                        
                        // 4. Last resort: Try a minimal mail() call
                        $minHeaders = "Content-Type: text/html; charset=UTF-8\r\n";
                        $success = @mail($this->to, $this->Subject, $this->Body, $minHeaders);
                    }
                }
                
                // Log the result
                if ($success) {
                    error_log("PHPMailer mail delivery: SUCCESS - Sent to {$this->to}");
                } else {
                    error_log("PHPMailer mail delivery: FAILED - To {$this->to}");
                    $error = error_get_last();
                    if ($error) {
                        error_log("Mail error: " . print_r($error, true));
                    }
                }
                
                return $success;
            } catch (Exception $e) {
                error_log("PHPMailer exception: " . $e->getMessage());
                return false;
            }
        }
    }
}

// Define SMTP only if not already defined
if (!class_exists('SMTP')) {
    class SMTP {}
}

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
 * Send an email using PHP mailer with enhanced delivery options
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
        // Server settings - don't use SMTP configuration, use sendmail
        $mail->SMTPDebug = 0;                      // Disable debug output
        
        // Try using direct sendmail approach which is more reliable on Hostinger
        // Do not use SMTP as it might be blocked
        
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
        logError("Attempting to send email via PHPMailer fallback", [
            'to' => $to,
            'subject' => $subject
        ]);
        
        // Send the email
        $success = $mail->send();
        logError("PHPMailer send result", ['success' => $success ? 'true' : 'false']);
        return $success;
        
    } catch (Exception $e) {
        logError("PHPMailer Exception", [
            'error' => $e->getMessage()
        ]);
        
        // Try again with alternative method - direct native mail
        try {
            $directResult = testDirectMailFunction($to, $subject, $htmlBody);
            logError("Direct mail fallback result", ['success' => $directResult ? 'true' : 'false']);
            return $directResult;
        } catch (Exception $e2) {
            logError("Direct mail fallback also failed", ['error' => $e2->getMessage()]);
            return false;
        }
    }
}

/**
 * Test direct PHP mail() function with extensive logging and alternative approaches
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @return bool True if any mail method succeeded, false otherwise
 */
function testDirectMailFunction($to, $subject, $htmlBody) {
    // Clear any previous PHP errors
    if (function_exists('error_clear_last')) {
        error_clear_last();
    }
    
    logError("Testing direct PHP mail() function", ['to' => $to, 'subject' => $subject]);
    
    // Try multiple approaches to increase chances of success
    
    // Approach 1: Use default sendmail
    $sendmailPath = ini_get('sendmail_path');
    if (!empty($sendmailPath) && strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
        // Create a temporary email file
        $tempEmailFile = tempnam(sys_get_temp_dir(), 'email_');
        $emailContent = "To: $to\n";
        $emailContent .= "From: info@vizagup.com\n";
        $emailContent .= "Subject: $subject\n";
        $emailContent .= "MIME-Version: 1.0\n";
        $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
        $emailContent .= $htmlBody;
        
        file_put_contents($tempEmailFile, $emailContent);
        
        // Execute sendmail with -oi parameter to prevent treating dot as end of input
        $cmd = "$sendmailPath -oi -t < " . escapeshellarg($tempEmailFile);
        $output = [];
        $returnVar = 0;
        exec($cmd, $output, $returnVar);
        
        // Clean up
        unlink($tempEmailFile);
        
        if ($returnVar === 0) {
            logError("Direct sendmail command succeeded", [
                'to' => $to,
                'subject' => $subject,
                'return_code' => $returnVar
            ]);
            return true;
        } else {
            logError("Direct sendmail command failed", [
                'return_code' => $returnVar,
                'output' => $output,
                'command' => $cmd
            ]);
        }
    }
    
    // Approach 2: Try standard mail with basic headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagup.com' . "\r\n";
    
    $mailResult = @mail($to, $subject, $htmlBody, $headers);
    $phpError = error_get_last();
    
    if ($mailResult) {
        logError("Basic mail() function succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    } else {
        logError("Basic mail() function failed", [
            'error' => $phpError ? $phpError['message'] : 'Unknown mail() failure',
            'to' => $to
        ]);
    }
    
    // Approach 3: Try with additional parameters
    $mailResult2 = @mail($to, $subject, $htmlBody, $headers, "-finfo@vizagup.com");
    $phpError2 = error_get_last();
    
    if ($mailResult2) {
        logError("mail() with additional parameters succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    } else {
        logError("mail() with additional parameters failed", [
            'error' => $phpError2 ? $phpError2['message'] : 'Unknown mail() failure',
            'to' => $to
        ]);
    }
    
    // Approach 4: Try with minimal headers
    $minimalHeaders = "Content-type:text/html;charset=UTF-8\r\n";
    $mailResult3 = @mail($to, $subject, $htmlBody, $minimalHeaders);
    
    if ($mailResult3) {
        logError("mail() with minimal headers succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // Approach 5: Try a completely different mailer approach for Hostinger
    // Some shared hosts have specific requirements for mail sending
    
    $boundary = md5(time());
    
    $customHeaders = "MIME-Version: 1.0\r\n";
    $customHeaders .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
    $customHeaders .= "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
    $customHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    $message = "--$boundary\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $message .= strip_tags($htmlBody) . "\r\n\r\n";
    
    $message .= "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $message .= $htmlBody . "\r\n\r\n";
    
    $message .= "--$boundary--";
    
    $mailResult4 = @mail($to, $subject, $message, $customHeaders);
    
    if ($mailResult4) {
        logError("Multipart mail approach succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If all approaches fail, return false
    logError("All direct mail approaches failed", [
        'to' => $to,
        'subject' => $subject,
        'php_version' => phpversion(),
        'sendmail_path' => $sendmailPath
    ]);
    
    return false;
}

/**
 * Send an email using all available methods, trying each until one succeeds
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
    
    // First try the new Hostinger-specific approach
    file_put_contents($logFile, "Trying method: Hostinger direct /usr/sbin/hsendmail\n", FILE_APPEND);
    
    try {
        // Create temporary email file
        $tempEmailFile = tempnam(sys_get_temp_dir(), 'email_');
        $emailContent = "To: $to\n";
        $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
        $emailContent .= "Reply-To: info@vizagup.com\n";
        $emailContent .= "Subject: $subject\n";
        $emailContent .= "MIME-Version: 1.0\n";
        $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
        $emailContent .= $htmlBody;
        
        file_put_contents($tempEmailFile, $emailContent);
        
        // Try multiple sendmail path options
        $sendmailPaths = [
            '/usr/sbin/hsendmail -t',          // Hostinger specific
            '/usr/sbin/sendmail -t',           // Standard Linux
            '/usr/lib/sendmail -t',            // Alternative location
            ini_get('sendmail_path')           // PHP configured path
        ];
        
        foreach ($sendmailPaths as $sendmailCmd) {
            if (empty($sendmailCmd)) continue;
            
            file_put_contents($logFile, "Trying sendmail path: $sendmailCmd\n", FILE_APPEND);
            $command = "$sendmailCmd < " . escapeshellarg($tempEmailFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            file_put_contents($logFile, "Command result: " . ($returnVar === 0 ? "SUCCESS" : "FAILED ($returnVar)") . "\n", FILE_APPEND);
            
            if ($returnVar === 0) {
                // Clean up temp file
                unlink($tempEmailFile);
                file_put_contents($logFile, "SUCCESS: Email sent via direct sendmail\n", FILE_APPEND);
                logError("Successfully sent email via direct sendmail", [
                    'to' => $to,
                    'subject' => $subject,
                    'command' => $sendmailCmd
                ]);
                return true;
            }
        }
        
        // Clean up temp file
        unlink($tempEmailFile);
        
    } catch (Exception $e) {
        file_put_contents($logFile, "Error with sendmail approach: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // Try standard PHP mail with -f parameter (often works on shared hosting)
    file_put_contents($logFile, "Trying standard PHP mail with From parameter\n", FILE_APPEND);
    $headers = "From: info@vizagup.com\r\n";
    $headers .= "Reply-To: info@vizagup.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Use -f to set the envelope sender (often helps with delivery)
    $mailResult = @mail($to, $subject, $htmlBody, $headers, "-finfo@vizagup.com");
    
    if ($mailResult) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with -f parameter\n", FILE_APPEND);
        logError("Successfully sent email via mail() with -f parameter", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // Try with minimal headers to avoid filtering
    file_put_contents($logFile, "Trying PHP mail() with minimal headers\n", FILE_APPEND);
    $minimalHeaders = "Content-Type: text/html; charset=UTF-8\r\n";
    $mailResult2 = @mail($to, $subject, $htmlBody, $minimalHeaders);
    
    if ($mailResult2) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with minimal headers\n", FILE_APPEND);
        logError("Successfully sent email via mail() with minimal headers", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // Try with the PHPMailer class implementation 
    file_put_contents($logFile, "Trying PHPMailer implementation\n", FILE_APPEND);
    try {
        $mail = new PHPMailer();
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->isHTML(true);
        
        $success = $mail->send();
        
        if ($success) {
            file_put_contents($logFile, "SUCCESS: Email sent via PHPMailer implementation\n", FILE_APPEND);
            logError("Successfully sent email via PHPMailer implementation", [
                'to' => $to,
                'subject' => $subject
            ]);
            return true;
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "PHPMailer error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // If all methods fail, log the failure
    file_put_contents($logFile, "FAILED: All email sending methods failed\n", FILE_APPEND);
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject,
        'php_version' => phpversion(),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]);
    
    return false;
}

