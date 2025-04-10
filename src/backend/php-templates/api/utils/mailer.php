
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

// Use a custom PHPMailer implementation optimized for Hostinger/Gmail
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
        
        // The send implementation for Hostinger + Gmail delivery
        public function send() {
            logError("Attempting to send email via custom PHPMailer", [
                'to' => $this->to,
                'subject' => $this->Subject
            ]);
            
            // Gmail requires proper domain verification via DKIM/SPF
            // Use direct SMTP connection if available
            if (function_exists('fsockopen') && $this->to) {
                try {
                    // Try connecting to localhost SMTP first 
                    $smtpServer = 'localhost';
                    $smtpPort = 25;
                    $timeout = 10; // Shorter timeout to fail faster
                    
                    $socket = @fsockopen($smtpServer, $smtpPort, $errno, $errstr, $timeout);
                    
                    if ($socket) {
                        $response = fgets($socket, 515);
                        if (substr($response, 0, 3) != '220') {
                            fclose($socket);
                            logError("SMTP not ready: " . $response);
                        } else {
                            // Use a proper domain for HELO to avoid spam filters
                            fputs($socket, "HELO vizagup.com\r\n");
                            $response = fgets($socket, 515);
                            
                            // Set proper envelope sender
                            fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                            $response = fgets($socket, 515);
                            
                            // Set recipient
                            fputs($socket, "RCPT TO:<{$this->to}>\r\n");
                            $response = fgets($socket, 515);
                            
                            // Start data
                            fputs($socket, "DATA\r\n");
                            $response = fgets($socket, 515);
                            
                            // Send email with proper domain headers
                            fputs($socket, "Return-Path: <info@vizagup.com>\r\n");
                            fputs($socket, "From: " . ($this->from['name'] ? $this->from['name'] . " <{$this->from['email']}>" : $this->from['email']) . "\r\n");
                            fputs($socket, "Reply-To: <{$this->from['email']}>\r\n");
                            fputs($socket, "Subject: {$this->Subject}\r\n");
                            fputs($socket, "To: {$this->to}\r\n");
                            fputs($socket, "MIME-Version: 1.0\r\n");
                            fputs($socket, "Content-Type: " . ($this->isHtml ? "text/html" : "text/plain") . "; charset=UTF-8\r\n");
                            fputs($socket, "X-Mailer: Vizag Taxi Hub Mailer\r\n");
                            fputs($socket, "X-Priority: 3\r\n");
                            fputs($socket, "\r\n");
                            fputs($socket, $this->Body . "\r\n");
                            fputs($socket, ".\r\n");
                            $response = fgets($socket, 515);
                            
                            // Quit
                            fputs($socket, "QUIT\r\n");
                            fclose($socket);
                            
                            if (substr($response, 0, 3) == '250') {
                                logError("Mail sent successfully via direct SMTP", ['to' => $this->to]);
                                return true;
                            } else {
                                logError("SMTP data response error: " . $response);
                            }
                        }
                    }
                } catch (Exception $e) {
                    logError("SMTP socket exception: " . $e->getMessage());
                }
            }
            
            // Next, try using external SMTP relay if available
            $smtpConfig = [
                'smtp.hostinger.com' => 465, // Hostinger SMTP 
                'smtp.gmail.com' => 587       // Gmail SMTP
            ];
            
            foreach ($smtpConfig as $host => $port) {
                try {
                    // Skip if fsockopen not available
                    if (!function_exists('fsockopen')) continue;
                    
                    $socket = @fsockopen($host, $port, $errno, $errstr, 5);
                    if ($socket) {
                        logError("SMTP relay available but not configured: " . $host);
                        fclose($socket);
                        // We found a server but don't have credentials, so continue to sendmail
                    }
                } catch (Exception $e) {
                    // Ignore, we'll try other methods
                }
            }
            
            // Next try external mail agents - msmtp, postfix, etc.
            // Try multiple approaches, starting with the most robust Sendmail
            $sendmailPaths = [
                '/usr/sbin/hsendmail',   // Hostinger specific
                '/usr/sbin/sendmail',    // Standard Linux
                '/usr/bin/msmtp',        // Alternative MTA
                '/usr/bin/mail'          // Basic mail command
            ];
            
            foreach ($sendmailPaths as $sendmailPath) {
                if (!file_exists($sendmailPath)) continue;
                
                try {
                    // Create temporary email file
                    $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                    
                    // Build proper email content with authenticated From headers
                    // Gmail now requires valid From domain that matches envelope sender
                    $emailContent = "";
                    // CRITICAL: Use explicit Return-Path
                    $emailContent .= "Return-Path: <info@vizagup.com>\n";
                    $emailContent .= "From: " . ($this->from['name'] ? $this->from['name'] . " <{$this->from['email']}>" : $this->from['email']) . "\n";
                    $emailContent .= "Reply-To: <{$this->from['email']}>\n";
                    $emailContent .= "To: {$this->to}\n";
                    $emailContent .= "Subject: {$this->Subject}\n";
                    $emailContent .= "MIME-Version: 1.0\n";
                    // Add additional headers to avoid spam filters
                    $emailContent .= "X-Mailer: Vizag Taxi Hub Mailer\n";
                    $emailContent .= "X-Priority: 3\n";
                    $emailContent .= "Content-Type: " . ($this->isHtml ? "text/html" : "text/plain") . "; charset=UTF-8\n\n";
                    $emailContent .= $this->Body;
                    
                    file_put_contents($tempFile, $emailContent);
                    
                    // Test both -t and direct recipient specification
                    // Use proper shell escaping and redirection
                    $command = "$sendmailPath -t < " . escapeshellarg($tempFile);
                    $output = [];
                    $returnVar = 0;
                    
                    exec($command, $output, $returnVar);
                    
                    if ($returnVar === 0) {
                        logError("Mail sent successfully using Sendmail -t", [
                            'command' => $command,
                            'to' => $this->to,
                            'method' => 'sendmail -t'
                        ]);
                        unlink($tempFile);
                        return true;
                    }
                    
                    // Try direct recipient format (works on Hostinger)
                    $command = "$sendmailPath -f info@vizagup.com {$this->to} < " . escapeshellarg($tempFile);
                    $output = [];
                    $returnVar = 0;
                    
                    exec($command, $output, $returnVar);
                    
                    if ($returnVar === 0) {
                        logError("Mail sent successfully using direct sendmail", [
                            'command' => $command,
                            'to' => $this->to,
                            'method' => 'sendmail with recipient'
                        ]);
                        unlink($tempFile);
                        return true;
                    }
                    
                    // Try with -i flag which ignores dots
                    $command = "$sendmailPath -i {$this->to} < " . escapeshellarg($tempFile);
                    $output = [];
                    $returnVar = 0;
                    
                    exec($command, $output, $returnVar);
                    
                    if ($returnVar === 0) {
                        logError("Mail sent successfully using sendmail -i", [
                            'command' => $command,
                            'to' => $this->to,
                            'method' => 'sendmail -i'
                        ]);
                        unlink($tempFile);
                        return true;
                    }
                    
                    // Try other configurations with explicit sender
                    $command = "$sendmailPath -i -f info@vizagup.com {$this->to} < " . escapeshellarg($tempFile);
                    $output = [];
                    $returnVar = 0;
                    
                    exec($command, $output, $returnVar);
                    
                    if ($returnVar === 0) {
                        logError("Mail sent successfully using sendmail with -f", [
                            'command' => $command,
                            'to' => $this->to,
                            'method' => 'sendmail -i -f'
                        ]);
                        unlink($tempFile);
                        return true;
                    }
                    
                    unlink($tempFile);
                } catch (Exception $e) {
                    logError("Exception in sendmail: " . $e->getMessage());
                    if (file_exists($tempFile)) {
                        unlink($tempFile);
                    }
                }
            }
            
            // Finally, try PHP's mail() with properly formatted headers
            // Sometimes mail() will work when sendmail direct calls don't
            try {
                // Clear any previous errors
                if (function_exists('error_clear_last')) {
                    error_clear_last();
                }
                
                // VERY IMPORTANT: Set proper envelope sender
                ini_set('sendmail_from', 'info@vizagup.com');
                
                // Create headers with proper DNS domain
                $headers = [];
                $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
                $headers[] = "Return-Path: <info@vizagup.com>";
                $headers[] = "Reply-To: <info@vizagup.com>";
                $headers[] = "MIME-Version: 1.0";
                $headers[] = $this->isHtml ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8";
                $headers[] = "X-Mailer: Vizag Taxi Hub Mailer";
                $headers[] = "X-MSMail-Priority: Normal";
                $headers[] = "X-Priority: 3";
                
                // Basic mail() call
                $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers));
                
                if ($success) {
                    logError("Mail sent successfully via mail()", ['to' => $this->to]);
                    return true;
                }
                
                // Try with explicit envelope sender as 5th parameter
                $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers), "-f info@vizagup.com");
                
                if ($success) {
                    logError("Mail sent successfully via mail() with -f", ['to' => $this->to]);
                    return true;
                }
                
                // Last option, try with minimal headers
                $minimalHeaders = "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
                $minimalHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
                
                $success = @mail($this->to, $this->Subject, strip_tags($this->Body), $minimalHeaders);
                
                if ($success) {
                    logError("Mail sent successfully via mail() with minimal headers", ['to' => $this->to]);
                    return true;
                }
                
                // Log the failure and error message
                $error = error_get_last();
                logError("All mail() methods failed", [
                    'to' => $this->to,
                    'error' => $error ? $error['message'] : 'Unknown error'
                ]);
                
            } catch (Exception $e) {
                logError("Exception in mail(): " . $e->getMessage());
            }
            
            // EXTERNAL API FALLBACK (uncomment if needed)
            /*
            // If all fails, try an external mail API
            $apiEndpoints = [
                'https://api.sendgrid.com/v3/mail/send' => 'sendgrid',
                'https://api.mailjet.com/v3.1/send' => 'mailjet'
            ];
            
            foreach ($apiEndpoints as $url => $service) {
                // Only enable if you have API keys/credentials
                // This is left as a placeholder for future implementation
            }
            */
            
            logError("All email delivery methods failed", [
                'to' => $this->to,
                'subject' => $this->Subject,
                'methods_tried' => 'SMTP, sendmail, PHP mail()'
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
 * Optimized with Hostinger and Gmail-specific workarounds
 */
function testDirectMailFunction($to, $subject, $htmlBody) {
    // Clear any previous PHP errors
    if (function_exists('error_clear_last')) {
        error_clear_last();
    }
    
    logError("Testing direct mail() function", ['to' => $to, 'subject' => $subject]);
    
    // Fix for Hostinger: Pre-set sendmail_from to ensure envelope sender is properly set
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // For Gmail delivery - Gmail requires the sending domain to match the envelope sender
    // and have proper SPF/DKIM records
    
    // APPROACH 1: Try external SMTP if available
    if (function_exists('fsockopen')) {
        try {
            $socket = @fsockopen('localhost', 25, $errno, $errstr, 5);
            if ($socket) {
                fclose($socket);
                // Attempt to use direct SMTP
                $mail = new PHPMailer();
                $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
                $mail->addAddress($to);
                $mail->Subject = $subject;
                $mail->Body = $htmlBody;
                $mail->isHTML(true);
                
                $result = $mail->send();
                if ($result) {
                    return true;
                }
            }
        } catch (Exception $e) {
            // Just log and continue with other methods
            logError("SMTP connection error: " . $e->getMessage());
        }
    }
    
    // APPROACH 2: Try direct sendmail command - Hostinger optimized
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'LIN') {
        try {
            $sendmailPaths = [
                '/usr/sbin/hsendmail',       // Hostinger specific
                '/usr/sbin/sendmail',        // Standard Linux
                '/usr/lib/sendmail'          // Alternative location
            ];
            
            foreach ($sendmailPaths as $sendmailPath) {
                if (!file_exists($sendmailPath)) {
                    continue;
                }
                
                $tempFile = tempnam(sys_get_temp_dir(), 'email_');
                
                // Use Hostinger/Gmail-optimized email format
                $emailContent = "";
                $emailContent .= "Return-Path: <info@vizagup.com>\n"; // CRITICAL for delivery
                $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
                $emailContent .= "Reply-To: <info@vizagup.com>\n";
                $emailContent .= "To: $to\n";
                $emailContent .= "Subject: $subject\n";
                $emailContent .= "MIME-Version: 1.0\n";
                // Add message ID with proper domain
                $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
                $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
                $emailContent .= $htmlBody;
                
                file_put_contents($tempFile, $emailContent);
                
                // Try with various command formats
                
                // Format 1: Direct recipient (works on many hosts)
                $command = "$sendmailPath $to < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Direct sendmail command succeeded", [
                        'to' => $to,
                        'method' => 'sendmail with recipient'
                    ]);
                    return true;
                }
                
                // Format 2: With -t flag (standard approach)
                $command = "$sendmailPath -t < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Sendmail -t command succeeded", [
                        'to' => $to,
                        'method' => 'sendmail -t'
                    ]);
                    return true;
                }
                
                // Format 3: Alternative form with -i flag
                $command = "$sendmailPath -i $to < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Sendmail -i command succeeded", [
                        'to' => $to,
                        'method' => 'sendmail -i'
                    ]);
                    return true;
                }
                
                // Format 4: With explicit envelope sender
                $command = "$sendmailPath -f info@vizagup.com $to < " . escapeshellarg($tempFile);
                $output = [];
                $returnVar = 0;
                
                exec($command, $output, $returnVar);
                
                if ($returnVar === 0) {
                    unlink($tempFile);
                    logError("Sendmail with -f command succeeded", [
                        'to' => $to,
                        'method' => 'sendmail -f'
                    ]);
                    return true;
                }
                
                unlink($tempFile);
            }
        } catch (Exception $e) {
            logError("Exception during sendmail attempts", ['error' => $e->getMessage()]);
        }
    }
    
    // APPROACH 3: Try PHP mail() with multiple formats
    
    // Format 1: Gmail-friendly headers
    $headers = [];
    $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
    $headers[] = "Reply-To: info@vizagup.com";
    $headers[] = "Return-Path: <info@vizagup.com>";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-type: text/html; charset=UTF-8";
    $headers[] = "X-Mailer: PHP/" . phpversion();
    
    $headersStr = implode("\r\n", $headers);
    
    // Try sending with this specific headers format
    $success = @mail($to, $subject, $htmlBody, $headersStr);
    
    if ($success) {
        logError("Direct mail() function succeeded with full headers", [
            'to' => $to
        ]);
        return true;
    }
    
    // Format 2: With envelope sender parameter
    $success = @mail($to, $subject, $htmlBody, $headersStr, "-finfo@vizagup.com");
    
    if ($success) {
        logError("Direct mail() with envelope parameter succeeded", [
            'to' => $to
        ]);
        return true;
    }
    
    // Format 3: Simplified headers - sometimes less is more
    $simpleHeaders = "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
    $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    $success = @mail($to, $subject, $htmlBody, $simpleHeaders);
    
    if ($success) {
        logError("Mail with simplified headers succeeded", [
            'to' => $to
        ]);
        return true;
    }
    
    // Format 4: Plain text only (some hosts block HTML)
    $success = @mail($to, $subject, strip_tags($htmlBody), "From: info@vizagup.com\r\nContent-Type: text/plain; charset=UTF-8");
    
    if ($success) {
        logError("Plain text mail succeeded", [
            'to' => $to
        ]);
        return true;
    }
    
    // Format 5: With additional parameters and minimal headers
    $success = @mail($to, $subject, $htmlBody, "From: info@vizagup.com", "-f info@vizagup.com");
    
    if ($success) {
        logError("Minimal headers with parameters succeeded", [
            'to' => $to
        ]);
        return true;
    }
    
    // All methods failed, log the error
    $error = error_get_last();
    logError("All direct mail methods failed", [
        'to' => $to,
        'subject' => $subject,
        'error' => $error ? $error['message'] : 'Unknown mail() failure',
        'php_version' => phpversion(),
        'os' => PHP_OS
    ]);
    
    return false;
}

/**
 * Send an email using all available methods, trying each until one succeeds
 * Optimized for Hostinger and Gmail delivery
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
    
    // APPROACH 1: Use PHPMailer first (most reliable on most hosts)
    try {
        $mail = new PHPMailer();
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->isHTML(true);
        
        $success = $mail->send();
        
        if ($success) {
            file_put_contents($logFile, "SUCCESS: Email sent via PHPMailer\n", FILE_APPEND);
            return true;
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "PHPMailer error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // APPROACH 2: Direct SMTP socket connection
    if (function_exists('fsockopen')) {
        try {
            $smtpServer = 'localhost';
            $smtpPort = 25;
            $timeout = 10;
            
            $socket = @fsockopen($smtpServer, $smtpPort, $errno, $errstr, $timeout);
            
            if ($socket) {
                $response = fgets($socket, 515);
                if (substr($response, 0, 3) == '220') {
                    // Use a proper domain for HELO to avoid spam filters
                    fputs($socket, "HELO vizagup.com\r\n");
                    $response = fgets($socket, 515);
                    
                    // Set proper envelope sender
                    fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Set recipient
                    fputs($socket, "RCPT TO:<$to>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Start data
                    fputs($socket, "DATA\r\n");
                    $response = fgets($socket, 515);
                    
                    // Send email with domain headers - important for Gmail
                    fputs($socket, "Return-Path: <info@vizagup.com>\r\n");
                    fputs($socket, "From: Vizag Taxi Hub <info@vizagup.com>\r\n");
                    fputs($socket, "Reply-To: <info@vizagup.com>\r\n");
                    fputs($socket, "Subject: $subject\r\n");
                    fputs($socket, "To: $to\r\n");
                    fputs($socket, "MIME-Version: 1.0\r\n");
                    fputs($socket, "Content-Type: text/html; charset=UTF-8\r\n");
                    fputs($socket, "X-Mailer: Vizag Taxi Hub Mailer\r\n");
                    fputs($socket, "X-Priority: 3\r\n");
                    fputs($socket, "\r\n");
                    fputs($socket, $htmlBody . "\r\n");
                    fputs($socket, ".\r\n");
                    $response = fgets($socket, 515);
                    
                    // Quit
                    fputs($socket, "QUIT\r\n");
                    fclose($socket);
                    
                    if (substr($response, 0, 3) == '250') {
                        file_put_contents($logFile, "SUCCESS: Email sent via direct SMTP socket\n", FILE_APPEND);
                        return true;
                    }
                }
                fclose($socket);
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "SMTP socket error: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // APPROACH 3: Try sendmail direct command - most reliable on shared hosts
    try {
        $sendmailPaths = [
            '/usr/sbin/hsendmail',   // Hostinger-specific
            '/usr/sbin/sendmail',    // Standard Linux
            '/usr/lib/sendmail',     // Alternative location
        ];
        
        foreach ($sendmailPaths as $sendmailPath) {
            if (empty($sendmailPath) || !file_exists($sendmailPath)) {
                continue;
            }
            
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Important: add Return-Path and use domain that matches From
            $emailContent = "";
            $emailContent .= "Return-Path: <info@vizagup.com>\n"; // Critical for Gmail
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: <info@vizagup.com>\n";
            $emailContent .= "To: $to\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            // Add message ID with proper domain
            $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try direct recipient approach first (works better on Hostinger)
            $command = "$sendmailPath $to < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with recipient approach\n", FILE_APPEND);
                return true;
            }
            
            // Try with -t flag 
            $command = "$sendmailPath -t < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with -t flag\n", FILE_APPEND);
                return true;
            }
            
            // Try with -i flag (ignore dots)
            $command = "$sendmailPath -i $to < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with -i flag\n", FILE_APPEND);
                return true;
            }
            
            // Try with explicit sender
            $command = "$sendmailPath -f info@vizagup.com $to < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct sendmail with -f flag\n", FILE_APPEND);
                return true;
            }
            
            unlink($tempFile);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "Sendmail error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // APPROACH 4: Use PHP's mail() function with various configurations
    
    // Important: set proper envelope sender to avoid Gmail filters
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // Gmail-optimized headers - Domain must match From header
    $headers = [
        "From: Vizag Taxi Hub <info@vizagup.com>",
        "Reply-To: info@vizagup.com",
        "Return-Path: <info@vizagup.com>",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "X-Mailer: PHP/" . phpversion(),
        "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>"
    ];
    
    $headersStr = implode("\r\n", $headers);
    
    // Standard mail() call
    $success = @mail($to, $subject, $htmlBody, $headersStr);
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via PHP mail()\n", FILE_APPEND);
        return true;
    }
    
    // Try with envelope sender parameter
    $success = @mail($to, $subject, $htmlBody, $headersStr, "-finfo@vizagup.com");
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with envelope\n", FILE_APPEND);
        return true;
    }
    
    // Try with minimal headers - sometimes less is better for spam filters
    $minimalHeaders = "From: Vizag Taxi Hub <info@vizagup.com>\r\nContent-Type: text/html; charset=UTF-8";
    $success = @mail($to, $subject, $htmlBody, $minimalHeaders);
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Email sent via mail() with minimal headers\n", FILE_APPEND);
        return true;
    }
    
    // Try plain text version
    $success = @mail($to, $subject, strip_tags($htmlBody), "From: info@vizagup.com\r\nContent-Type: text/plain; charset=UTF-8");
    
    if ($success) {
        file_put_contents($logFile, "SUCCESS: Plain text email sent via mail()\n", FILE_APPEND);
        return true;
    }
    
    // Log the failure
    file_put_contents($logFile, "FAILED: All email sending methods failed\n", FILE_APPEND);
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject,
        'php_version' => phpversion(),
        'last_error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
    ]);
    
    return false;
}
