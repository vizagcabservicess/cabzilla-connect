
<?php
// Enable debug mode for email functions
define('EMAIL_DEBUG_MODE', true);

// Helper function to log errors during email sending
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
}

// Use a custom PHPMailer implementation for Hostinger compatibility
if (!class_exists('PHPMailer')) {
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
        
        public function isSMTP() {
            $this->mailType = 'smtp';
            return true;
        }
        
        // The send implementation is the critical part that needs fixing
        public function send() {
            logError("Attempting to send email via custom PHPMailer", [
                'to' => $this->to,
                'subject' => $this->Subject
            ]);
            
            // APPROACH 1: Use php.ini settings for mail() to avoid path issues
            ini_set('sendmail_from', $this->from['email']);
            
            // Prepare headers
            $headers = [];
            $headers[] = "From: " . ($this->from['name'] ? $this->from['name'] . ' <' . $this->from['email'] . '>' : $this->from['email']);
            $headers[] = "Reply-To: " . ($this->replyTo['email'] ? $this->replyTo['email'] : $this->from['email']);
            $headers[] = "MIME-Version: 1.0";
            $headers[] = $this->isHtml ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8";
            $headers[] = "X-Mailer: PHP-Custom/" . phpversion();
            
            // Try several approaches, starting with the most robust
            
            // 1. First try mail() with basic configuration
            $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers));
            
            if ($success) {
                logError("Mail sent successfully via simple mail()", ['to' => $this->to]);
                return true;
            }
            
            logError("Simple mail() failed, trying alternative approach", ['to' => $this->to]);
            
            // 2. Try with specific envelope sender parameter
            $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers), "-f" . $this->from['email']);
            
            if ($success) {
                logError("Mail sent successfully via mail() with envelope parameter", ['to' => $this->to]);
                return true;
            }
            
            // 3. Try with multipart content
            $boundary = md5(time());
            
            $mpHeaders = [];
            $mpHeaders[] = "From: " . ($this->from['name'] ? $this->from['name'] . ' <' . $this->from['email'] . '>' : $this->from['email']);
            $mpHeaders[] = "Reply-To: " . ($this->replyTo['email'] ? $this->replyTo['email'] : $this->from['email']);
            $mpHeaders[] = "MIME-Version: 1.0";
            $mpHeaders[] = "Content-Type: multipart/alternative; boundary=\"$boundary\"";
            $mpHeaders[] = "X-Mailer: PHP-Custom/" . phpversion();
            
            $message = "";
            $message .= "--$boundary\r\n";
            $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $message .= strip_tags($this->Body) . "\r\n\r\n";
            
            $message .= "--$boundary\r\n";
            $message .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $message .= $this->Body . "\r\n\r\n";
            
            $message .= "--$boundary--";
            
            $success = @mail($this->to, $this->Subject, $message, implode("\r\n", $mpHeaders));
            
            if ($success) {
                logError("Mail sent successfully via multipart mail()", ['to' => $this->to]);
                return true;
            }
            
            // 4. Try using direct file-based sendmail approach (Hostinger specific)
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
                // Try multiple possible sendmail paths for Hostinger
                $sendmailPaths = [
                    '/usr/sbin/sendmail',
                    '/usr/lib/sendmail',
                    '/usr/sbin/hsendmail', // Hostinger-specific
                    '/usr/lib/hsendmail'   // Hostinger-specific
                ];
                
                foreach ($sendmailPaths as $sendmailPath) {
                    if (!file_exists($sendmailPath)) continue;
                    
                    try {
                        // Create temporary email file
                        $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                        
                        // Build email content with explicit Return-Path to avoid SMTP blocking
                        $emailContent = "";
                        $emailContent .= "Return-Path: {$this->from['email']}\n";
                        $emailContent .= "From: {$this->from['email']}\n";
                        $emailContent .= "To: {$this->to}\n";
                        $emailContent .= "Subject: {$this->Subject}\n";
                        $emailContent .= "MIME-Version: 1.0\n";
                        $emailContent .= "Content-Type: " . ($this->isHtml ? "text/html" : "text/plain") . "; charset=UTF-8\n\n";
                        $emailContent .= $this->Body;
                        
                        file_put_contents($tempFile, $emailContent);
                        
                        // Execute sendmail with different flags (avoiding -t which can cause issues on some hostings)
                        $command = "$sendmailPath -oi {$this->to} < " . escapeshellarg($tempFile);
                        $output = [];
                        $returnVar = 0;
                        
                        exec($command, $output, $returnVar);
                        
                        // Clean up
                        unlink($tempFile);
                        
                        if ($returnVar === 0) {
                            logError("Mail sent successfully via direct sendmail", [
                                'path' => $sendmailPath,
                                'command' => $command,
                                'to' => $this->to
                            ]);
                            return true;
                        }
                        
                        // Try alternative flag configuration
                        $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                        file_put_contents($tempFile, $emailContent);
                        
                        $command = "$sendmailPath -i -f{$this->from['email']} {$this->to} < " . escapeshellarg($tempFile);
                        exec($command, $output, $returnVar);
                        
                        unlink($tempFile);
                        
                        if ($returnVar === 0) {
                            logError("Mail sent successfully via alternative sendmail flags", [
                                'path' => $sendmailPath,
                                'command' => $command,
                                'to' => $this->to
                            ]);
                            return true;
                        }
                    } catch (Exception $e) {
                        logError("Exception in sendmail approach: " . $e->getMessage());
                    }
                }
            }
            
            // 5. Last resort: Try disabling verification for sendmail (Hostinger workaround)
            try {
                $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                $emailContent = "";
                $emailContent .= "From: {$this->from['email']}\n";
                $emailContent .= "To: {$this->to}\n";
                $emailContent .= "Subject: {$this->Subject}\n";
                $emailContent .= "MIME-Version: 1.0\n";
                $emailContent .= "Content-Type: " . ($this->isHtml ? "text/html" : "text/plain") . "; charset=UTF-8\n\n";
                $emailContent .= $this->Body;
                
                file_put_contents($tempFile, $emailContent);
                
                // On some hosting environments, using -f with the from address triggers anti-spam
                // Try without it and with explicit --force flag which some sendmail versions support
                $command = "/usr/sbin/sendmail -i --force {$this->to} < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                unlink($tempFile);
                
                if ($returnVar === 0) {
                    logError("Mail sent successfully via sendmail with force flag", ['to' => $this->to]);
                    return true;
                }
            } catch (Exception $e) {
                logError("Exception in final sendmail attempt: " . $e->getMessage());
            }
            
            // 6. Very last attempt - use stream socket if available
            if (function_exists('fsockopen')) {
                try {
                    $smtpServer = 'localhost';
                    $smtpPort = 25;
                    $timeout = 30;
                    
                    // Try to establish a direct SMTP connection
                    $socket = fsockopen($smtpServer, $smtpPort, $errno, $errstr, $timeout);
                    
                    if ($socket) {
                        $response = fgets($socket, 515);
                        if (substr($response, 0, 3) != '220') {
                            fclose($socket);
                            logError("SMTP socket error: " . $response);
                            return false;
                        }
                        
                        // Send HELO
                        fputs($socket, "HELO " . $_SERVER['SERVER_NAME'] . "\r\n");
                        $response = fgets($socket, 515);
                        
                        // Set sender
                        fputs($socket, "MAIL FROM:<{$this->from['email']}>\r\n");
                        $response = fgets($socket, 515);
                        
                        // Set recipient
                        fputs($socket, "RCPT TO:<{$this->to}>\r\n");
                        $response = fgets($socket, 515);
                        
                        // Start data
                        fputs($socket, "DATA\r\n");
                        $response = fgets($socket, 515);
                        
                        // Send email content
                        fputs($socket, "Subject: {$this->Subject}\r\n");
                        fputs($socket, "From: {$this->from['email']}\r\n");
                        fputs($socket, "To: {$this->to}\r\n");
                        fputs($socket, "MIME-Version: 1.0\r\n");
                        fputs($socket, "Content-Type: " . ($this->isHtml ? "text/html" : "text/plain") . "; charset=UTF-8\r\n");
                        fputs($socket, "\r\n");
                        fputs($socket, $this->Body . "\r\n");
                        fputs($socket, ".\r\n");
                        $response = fgets($socket, 515);
                        
                        // Quit
                        fputs($socket, "QUIT\r\n");
                        fclose($socket);
                        
                        logError("Mail sent successfully via direct SMTP socket", ['to' => $this->to]);
                        return true;
                    }
                } catch (Exception $e) {
                    logError("Exception in SMTP socket approach: " . $e->getMessage());
                }
            }
            
            // If we got here, all approaches failed
            logError("All email delivery methods failed", [
                'to' => $this->to,
                'subject' => $this->Subject,
                'php_version' => phpversion(),
                'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
                'os' => PHP_OS
            ]);
            
            return false;
        }
    }
}

// Define SMTP only if not already defined
if (!class_exists('SMTP')) {
    class SMTP {}
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
    
    // Fix for Hostinger: Pre-set sendmail_from to ensure envelope sender is properly set
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // Try multiple approaches to increase chances of success
    
    // APPROACH 1: Use a specific email headers setup that works with Hostinger
    $headers = [];
    $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
    $headers[] = "Reply-To: info@vizagup.com";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-type: text/html; charset=UTF-8";
    $headers[] = "X-Mailer: PHP/" . phpversion();
    
    // Important: Hostinger requires specific header formatting
    $headersStr = implode("\r\n", $headers);
    
    // Try sending with this specific headers format
    $success = @mail($to, $subject, $htmlBody, $headersStr);
    
    if ($success) {
        logError("Direct mail() function succeeded with Hostinger headers", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // APPROACH 2: Try with envelope sender parameter (works on some hosts)
    $success = @mail($to, $subject, $htmlBody, $headersStr, "-finfo@vizagup.com");
    
    if ($success) {
        logError("Direct mail() function with envelope parameter succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // APPROACH 3: Try direct sendmail command - alternate for Hostinger
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
        try {
            $sendmailPaths = [
                '/usr/sbin/hsendmail',       // Hostinger specific
                '/usr/sbin/sendmail',        // Standard Linux
                '/usr/lib/sendmail'         // Alternative location
            ];
            
            foreach ($sendmailPaths as $sendmailPath) {
                if (!file_exists($sendmailPath)) {
                    continue;
                }
                
                $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                
                // Use Hostinger-specific email format
                $emailContent = "";
                $emailContent .= "Return-Path: info@vizagup.com\n"; // Important for delivery!
                $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
                $emailContent .= "To: $to\n";
                $emailContent .= "Subject: $subject\n";
                $emailContent .= "MIME-Version: 1.0\n";
                $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
                $emailContent .= $htmlBody;
                
                file_put_contents($tempFile, $emailContent);
                
                // Try using direct recipient specification (works better on some hosts)
                $command = "$sendmailPath $to < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Direct sendmail command succeeded", [
                        'to' => $to,
                        'path' => $sendmailPath,
                        'command' => $command
                    ]);
                    return true;
                }
                
                // Try alternative command format
                $command = "$sendmailPath -i $to < " . escapeshellarg($tempFile);
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Alternative sendmail command succeeded", [
                        'to' => $to,
                        'path' => $sendmailPath,
                        'command' => $command
                    ]);
                    return true;
                }
                
                unlink($tempFile);
            }
        } catch (Exception $e) {
            logError("Exception during sendmail attempts", ['error' => $e->getMessage()]);
        }
    }
    
    // APPROACH 4: Try with simplified content and headers (last resort)
    $minimalHeaders = "Content-Type: text/html; charset=UTF-8";
    $success = @mail($to, $subject, $htmlBody, $minimalHeaders);
    
    if ($success) {
        logError("Minimal headers mail() succeeded", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If all approaches fail, log and return false
    logError("All direct mail approaches failed", [
        'to' => $to,
        'subject' => $subject,
        'php_version' => phpversion(),
        'os' => PHP_OS,
        'error' => error_get_last() ? error_get_last()['message'] : 'Unknown mail() failure'
    ]);
    
    return false;
}

/**
 * Send email using PHPMailer implementation
 */
function sendEmailWithPHPMailer($to, $subject, $htmlBody, $attachments = []) {
    logError("Sending email with PHPMailer", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // Create a new PHPMailer instance
    $mail = new PHPMailer();
    
    try {
        // Set core email properties
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);
        $mail->addReplyTo('info@vizagup.com', 'Vizag Taxi Hub');
        
        // Set email content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = strip_tags($htmlBody);
        
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
        
        // Send the email
        $success = $mail->send();
        
        logError("PHPMailer send result", ['success' => $success ? 'true' : 'false']);
        return $success;
        
    } catch (Exception $e) {
        logError("PHPMailer Exception", ['error' => $e->getMessage()]);
        return false;
    }
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
    
    // APPROACH 1: Single-recipient direct sendmail command - most reliable on shared hosting
    try {
        // Try multiple possible sendmail paths for Hostinger
        $sendmailPaths = [
            '/usr/sbin/hsendmail',   // Hostinger-specific
            '/usr/sbin/sendmail',    // Standard Linux
            '/usr/lib/sendmail',     // Alternative location
            ini_get('sendmail_path') // PHP configured path
        ];
        
        foreach ($sendmailPaths as $sendmailPath) {
            if (empty($sendmailPath) || !file_exists(preg_replace('/\s.*$/', '', $sendmailPath))) {
                continue;
            }
            
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Use a format specifically optimized for Hostinger
            $emailContent = "";
            $emailContent .= "Return-Path: info@vizagup.com\n"; // Critical for delivery
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: info@vizagup.com\n";
            $emailContent .= "To: $to\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try direct recipient specification - works better on Hostinger
            $sendmailExec = preg_replace('/\s.*$/', '', $sendmailPath); // Extract just the binary path
            $command = "$sendmailExec $to < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with recipient arg\n", FILE_APPEND);
                logError("Successfully sent email via direct sendmail", [
                    'to' => $to,
                    'subject' => $subject,
                    'command' => $command
                ]);
                return true;
            }
            
            // Alternative approach - try with -i flag
            $command = "$sendmailExec -i $to < " . escapeshellarg($tempFile);
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with -i flag\n", FILE_APPEND);
                logError("Successfully sent email via sendmail with -i flag", [
                    'to' => $to,
                    'subject' => $subject
                ]);
                return true;
            }
            
            unlink($tempFile);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "Error with sendmail approach: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // APPROACH 2: Try using the custom PHPMailer implementation
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
    
    // APPROACH 3: Try all native PHP mail variations
    
    // Optimize headers for Hostinger
    $headers = [
        "From: Vizag Taxi Hub <info@vizagup.com>",
        "Reply-To: info@vizagup.com",
        "Return-Path: info@vizagup.com",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "X-Mailer: PHP/" . phpversion()
    ];
    
    $headersStr = implode("\r\n", $headers);
    
    // Set the envelope sender via php.ini
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // Try standard PHP mail
    $success = @mail($to, $subject, $htmlBody, $headersStr);
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via standard PHP mail()\n", FILE_APPEND);
        logError("Successfully sent email via standard PHP mail()", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // Try with envelope parameter
    $success = @mail($to, $subject, $htmlBody, $headersStr, "-finfo@vizagup.com");
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with envelope\n", FILE_APPEND);
        logError("Successfully sent email via mail() with envelope parameter", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // Try with minimal headers (some hosts work better with simpler headers)
    $minimalHeaders = "Content-Type: text/html; charset=UTF-8";
    $success = @mail($to, $subject, $htmlBody, $minimalHeaders);
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with minimal headers\n", FILE_APPEND);
        logError("Successfully sent email via mail() with minimal headers", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If all methods fail, log the failure
    file_put_contents($logFile, "FAILED: All email sending methods failed\n", FILE_APPEND);
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject,
        'php_version' => phpversion(),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'last_error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
    ]);
    
    return false;
}
