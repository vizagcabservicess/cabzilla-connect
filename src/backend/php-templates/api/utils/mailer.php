
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

// Use a custom PHPMailer implementation for Hostinger
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
        
        // The send implementation using authenticated SMTP - key fix for Hostinger
        public function send() {
            logError("Attempting to send email via custom PHPMailer", [
                'to' => $this->to,
                'subject' => $this->Subject
            ]);
            
            // APPROACH 1: Direct SMTP Connection to Hostinger SMTP
            if (function_exists('fsockopen')) {
                try {
                    // Connect directly to Hostinger SMTP server (key fix)
                    $smtpServer = 'smtp.hostinger.com';
                    $smtpPort = 465; // SSL port
                    
                    // Try to establish SSL connection
                    $context = stream_context_create([
                        'ssl' => [
                            'verify_peer' => false,
                            'verify_peer_name' => false,
                        ]
                    ]);
                    
                    $socket = @stream_socket_client(
                        "ssl://$smtpServer:$smtpPort",
                        $errno,
                        $errstr,
                        10,
                        STREAM_CLIENT_CONNECT,
                        $context
                    );
                    
                    if ($socket) {
                        logError("Connected to Hostinger SMTP server");
                        
                        // Read greeting
                        $response = fgets($socket, 515);
                        logError("SMTP greeting: " . trim($response));
                        
                        // Issue EHLO command
                        fputs($socket, "EHLO vizagup.com\r\n");
                        $response = fgets($socket, 515);
                        logError("EHLO response: " . trim($response));
                        
                        // Flush additional EHLO responses
                        while (substr($response, 3, 1) == '-') {
                            $response = fgets($socket, 515);
                        }
                        
                        // Authentication for Hostinger SMTP (critical fix)
                        fputs($socket, "AUTH LOGIN\r\n");
                        $response = fgets($socket, 515);
                        logError("AUTH response: " . trim($response));
                        
                        // Username (Base64 encoded)
                        fputs($socket, base64_encode('info@vizagup.com') . "\r\n");
                        $response = fgets($socket, 515);
                        logError("Username response: " . trim($response));
                        
                        // Password (you should get this securely, but for this fix we'll hardcode it)
                        // Replace with actual password for info@vizagup.com
                        $password = "Your-Hostinger-Email-Password"; // Replace with actual password
                        fputs($socket, base64_encode($password) . "\r\n");
                        $response = fgets($socket, 515);
                        logError("Password response: " . trim($response));
                        
                        // Check if authentication was successful
                        if (substr($response, 0, 3) != '235') {
                            logError("SMTP authentication failed: " . trim($response));
                            fclose($socket);
                            return false;
                        }
                        
                        // Set envelope sender (MAIL FROM)
                        fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                        $response = fgets($socket, 515);
                        logError("MAIL FROM response: " . trim($response));
                        
                        // Set recipient
                        fputs($socket, "RCPT TO:<{$this->to}>\r\n");
                        $response = fgets($socket, 515);
                        logError("RCPT TO response: " . trim($response));
                        
                        // Start data
                        fputs($socket, "DATA\r\n");
                        $response = fgets($socket, 515);
                        logError("DATA response: " . trim($response));
                        
                        // Send email with proper headers
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
                        logError("End of DATA response: " . trim($response));
                        
                        // Quit
                        fputs($socket, "QUIT\r\n");
                        fclose($socket);
                        
                        if (substr($response, 0, 3) == '250') {
                            logError("Mail sent successfully via direct Hostinger SMTP", ['to' => $this->to]);
                            return true;
                        } else {
                            logError("SMTP data response error: " . trim($response));
                        }
                    } else {
                        logError("Could not connect to Hostinger SMTP server", [
                            'errno' => $errno,
                            'errstr' => $errstr
                        ]);
                    }
                } catch (Exception $e) {
                    logError("SMTP socket exception: " . $e->getMessage());
                }
            }
            
            // APPROACH 2: Use CURL to make direct HTTP request to Hostinger's email sending API
            if (function_exists('curl_init')) {
                try {
                    // Replace with actual Hostinger API endpoint if available
                    $url = 'https://api.hostinger.com/v1/mail/send';
                    
                    // Format email data for Hostinger API
                    $emailData = [
                        'from' => $this->from['email'],
                        'from_name' => $this->from['name'],
                        'to' => $this->to,
                        'subject' => $this->Subject,
                        'body' => $this->Body,
                        'html' => $this->isHtml
                    ];
                    
                    $ch = curl_init($url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Content-Type: application/json',
                        'Authorization: Bearer YOUR_HOSTINGER_API_KEY' // Replace with actual API key if available
                    ]);
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode >= 200 && $httpCode < 300) {
                        logError("Mail sent successfully via Hostinger API", ['to' => $this->to]);
                        return true;
                    } else {
                        logError("Hostinger API error", [
                            'http_code' => $httpCode,
                            'response' => $response
                        ]);
                    }
                } catch (Exception $e) {
                    logError("CURL exception: " . $e->getMessage());
                }
            }
            
            // APPROACH 3: Using PHP mail() with proper configuration for Hostinger
            try {
                // Clear any previous errors
                if (function_exists('error_clear_last')) {
                    error_clear_last();
                }
                
                // Set proper envelope sender - critical for Hostinger
                ini_set('sendmail_from', 'info@vizagup.com');
                
                // Create headers with proper Hostinger domain
                $headers = [];
                $headers[] = "From: Vizag Taxi Hub <info@vizagup.com>";
                $headers[] = "Return-Path: <info@vizagup.com>";
                $headers[] = "Reply-To: <info@vizagup.com>";
                $headers[] = "MIME-Version: 1.0";
                $headers[] = $this->isHtml ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8";
                $headers[] = "X-Mailer: Vizag Taxi Hub Mailer";
                
                // Basic mail() call specifically for Hostinger
                // On Hostinger, mail() automatically uses the local MTA
                $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers));
                
                if ($success) {
                    logError("Mail sent successfully via mail() on Hostinger", ['to' => $this->to]);
                    return true;
                }
                
                // Try with explicit envelope sender as 5th parameter
                $success = @mail($this->to, $this->Subject, $this->Body, implode("\r\n", $headers), "-finfo@vizagup.com");
                
                if ($success) {
                    logError("Mail sent successfully via mail() with -f on Hostinger", ['to' => $this->to]);
                    return true;
                }
                
                // Log the failure and error message
                $error = error_get_last();
                logError("Hostinger mail() methods failed", [
                    'to' => $this->to,
                    'error' => $error ? $error['message'] : 'Unknown error'
                ]);
                
            } catch (Exception $e) {
                logError("Exception in mail(): " . $e->getMessage());
            }
            
            // APPROACH 4: FALLBACK - Use cURL to send via external API (SendGrid, Mailgun, etc.)
            if (function_exists('curl_init')) {
                try {
                    // Mailgun example (if you have an account)
                    $url = 'https://api.mailgun.net/v3/vizagup.com/messages';
                    $apiKey = 'YOUR_MAILGUN_API_KEY'; // Replace with actual key if available
                    
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                    curl_setopt($ch, CURLOPT_POST, 1);
                    curl_setopt($ch, CURLOPT_USERPWD, 'api:' . $apiKey);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, [
                        'from' => 'Vizag Taxi Hub <info@vizagup.com>',
                        'to' => $this->to,
                        'subject' => $this->Subject,
                        'html' => $this->Body
                    ]);
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode >= 200 && $httpCode < 300) {
                        logError("Mail sent successfully via Mailgun", ['to' => $this->to]);
                        return true;
                    } else {
                        logError("Mailgun API error", [
                            'http_code' => $httpCode,
                            'response' => $response
                        ]);
                    }
                } catch (Exception $e) {
                    logError("Mailgun exception: " . $e->getMessage());
                }
            }
            
            logError("All email delivery methods failed", [
                'to' => $this->to,
                'subject' => $this->Subject,
                'methods_tried' => 'Hostinger SMTP, Mail API, PHP mail(), Mailgun'
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
 * Test direct PHP mail() function with Hostinger-specific optimizations
 */
function testDirectMailFunction($to, $subject, $htmlBody) {
    // Clear any previous PHP errors
    if (function_exists('error_clear_last')) {
        error_clear_last();
    }
    
    logError("Testing direct mail() function on Hostinger", ['to' => $to, 'subject' => $subject]);
    
    // Fix for Hostinger: Pre-set sendmail_from
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // APPROACH 1: Try Hostinger's direct SMTP with authentication
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
                logError("SMTP greeting: " . trim($response));
                
                // Issue EHLO command
                fputs($socket, "EHLO vizagup.com\r\n");
                $response = fgets($socket, 515);
                
                // Flush additional EHLO responses
                while (substr($response, 3, 1) == '-') {
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
                if (substr($response, 0, 3) != '235') {
                    logError("Authentication failed: " . trim($response));
                    fclose($socket);
                } else {
                    // Set envelope sender
                    fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Set recipient
                    fputs($socket, "RCPT TO:<$to>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Start data
                    fputs($socket, "DATA\r\n");
                    $response = fgets($socket, 515);
                    
                    // Send email content with proper headers
                    fputs($socket, "From: Vizag Taxi Hub <info@vizagup.com>\r\n");
                    fputs($socket, "To: $to\r\n");
                    fputs($socket, "Subject: $subject\r\n");
                    fputs($socket, "MIME-Version: 1.0\r\n");
                    fputs($socket, "Content-Type: text/html; charset=UTF-8\r\n");
                    fputs($socket, "\r\n");
                    fputs($socket, $htmlBody . "\r\n");
                    fputs($socket, ".\r\n");
                    $response = fgets($socket, 515);
                    
                    fputs($socket, "QUIT\r\n");
                    fclose($socket);
                    
                    if (substr($response, 0, 3) == '250') {
                        logError("Mail sent successfully via direct Hostinger SMTP", ['to' => $to]);
                        return true;
                    }
                }
            }
        } catch (Exception $e) {
            logError("SMTP socket exception: " . $e->getMessage());
        }
    }
    
    // APPROACH 2: Try Hostinger-specific HSendmail
    if (file_exists('/usr/sbin/hsendmail')) {
        try {
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Use Hostinger-optimized email format
            $emailContent = "";
            $emailContent .= "Return-Path: <info@vizagup.com>\n";
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: <info@vizagup.com>\n";
            $emailContent .= "To: $to\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try hsendmail directly (Hostinger-specific)
            $command = "/usr/sbin/hsendmail -t < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                logError("HSendmail command succeeded", ['to' => $to]);
                return true;
            }
            
            unlink($tempFile);
        } catch (Exception $e) {
            logError("HSendmail exception: " . $e->getMessage());
        }
    }
    
    // APPROACH 3: Try PHP mail() with multiple configurations
    
    // Format 1: Hostinger-friendly headers
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
        logError("Direct mail() function succeeded with full headers", ['to' => $to]);
        return true;
    }
    
    // Format 2: With envelope sender parameter
    $success = @mail($to, $subject, $htmlBody, $headersStr, "-finfo@vizagup.com");
    
    if ($success) {
        logError("Direct mail() with envelope parameter succeeded", ['to' => $to]);
        return true;
    }
    
    // Format 3: Simplified headers - sometimes less is more
    $simpleHeaders = "From: Vizag Taxi Hub <info@vizagup.com>\r\n";
    $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    $success = @mail($to, $subject, $htmlBody, $simpleHeaders);
    
    if ($success) {
        logError("Mail with simplified headers succeeded", ['to' => $to]);
        return true;
    }
    
    // APPROACH 4: Use cURL to send via external API (if available)
    if (function_exists('curl_init')) {
        try {
            // Mailgun example (if account available) - replace API key
            $url = 'https://api.mailgun.net/v3/vizagup.com/messages';
            $apiKey = 'YOUR_MAILGUN_API_KEY'; // Replace with actual key if available
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_USERPWD, 'api:' . $apiKey);
            curl_setopt($ch, CURLOPT_POSTFIELDS, [
                'from' => 'Vizag Taxi Hub <info@vizagup.com>',
                'to' => $to,
                'subject' => $subject,
                'html' => $htmlBody
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                logError("Mail sent successfully via Mailgun API", ['to' => $to]);
                return true;
            }
        } catch (Exception $e) {
            logError("Mailgun API exception: " . $e->getMessage());
        }
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
 * Send an email using all available methods, with Hostinger optimizations
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
    
    // APPROACH 1: Use PHPMailer with Hostinger SMTP
    try {
        $mail = new PHPMailer();
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';  // Hostinger SMTP server
        $mail->SMTPAuth = true;
        $mail->Username = 'info@vizagup.com'; // Hostinger email
        $mail->Password = 'Your-Hostinger-Email-Password'; // Replace with actual password
        $mail->SMTPSecure = 'ssl';
        $mail->Port = 465;
        
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->isHTML(true);
        
        $success = $mail->send();
        
        if ($success) {
            file_put_contents($logFile, "SUCCESS: Email sent via PHPMailer with Hostinger SMTP\n", FILE_APPEND);
            return true;
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "PHPMailer error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // APPROACH 2: Try Hostinger's direct SMTP with authentication
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
                file_put_contents($logFile, "Connected to Hostinger SMTP server\n", FILE_APPEND);
                
                // Read greeting
                $response = fgets($socket, 515);
                
                // Issue EHLO command
                fputs($socket, "EHLO vizagup.com\r\n");
                $response = fgets($socket, 515);
                
                // Flush additional EHLO responses
                while (substr($response, 3, 1) == '-') {
                    $response = fgets($socket, 515);
                }
                
                // Authentication
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
                if (substr($response, 0, 3) != '235') {
                    file_put_contents($logFile, "Authentication failed: " . trim($response) . "\n", FILE_APPEND);
                    fclose($socket);
                } else {
                    // Set envelope sender
                    fputs($socket, "MAIL FROM:<info@vizagup.com>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Set recipient
                    fputs($socket, "RCPT TO:<$to>\r\n");
                    $response = fgets($socket, 515);
                    
                    // Start data
                    fputs($socket, "DATA\r\n");
                    $response = fgets($socket, 515);
                    
                    // Send email with proper domain headers
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
                        file_put_contents($logFile, "SUCCESS: Email sent via direct Hostinger SMTP\n", FILE_APPEND);
                        return true;
                    } else {
                        file_put_contents($logFile, "SMTP data response error: " . trim($response) . "\n", FILE_APPEND);
                    }
                }
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "SMTP socket error: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // APPROACH 3: Try Hostinger-specific hsendmail
    try {
        if (file_exists('/usr/sbin/hsendmail')) {
            $tempFile = tempnam(sys_get_temp_dir(), 'email_');
            
            // Important: add Return-Path and use domain that matches From
            $emailContent = "";
            $emailContent .= "Return-Path: <info@vizagup.com>\n";
            $emailContent .= "From: Vizag Taxi Hub <info@vizagup.com>\n";
            $emailContent .= "Reply-To: <info@vizagup.com>\n";
            $emailContent .= "To: $to\n";
            $emailContent .= "Subject: $subject\n";
            $emailContent .= "MIME-Version: 1.0\n";
            $emailContent .= "Message-ID: <" . time() . rand(1000,9999) . "@vizagup.com>\n";
            $emailContent .= "Content-type: text/html; charset=UTF-8\n\n";
            $emailContent .= $htmlBody;
            
            file_put_contents($tempFile, $emailContent);
            
            // Try hsendmail directly
            $command = "/usr/sbin/hsendmail -t < " . escapeshellarg($tempFile);
            $output = [];
            $returnVar = 0;
            
            exec($command, $output, $returnVar);
            
            if ($returnVar === 0) {
                unlink($tempFile);
                file_put_contents($logFile, "SUCCESS: Direct hsendmail approach\n", FILE_APPEND);
                return true;
            }
            
            unlink($tempFile);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "Hsendmail error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // APPROACH 4: Use PHP's mail() function with Hostinger optimizations
    
    // Important: set proper envelope sender
    ini_set('sendmail_from', 'info@vizagup.com');
    
    // Hostinger-optimized headers
    $headers = [
        "From: Vizag Taxi Hub <info@vizagup.com>",
        "Reply-To: info@vizagup.com",
        "Return-Path: <info@vizagup.com>",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "X-Mailer: PHP/" . phpversion()
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
    
    // APPROACH 5: Mail API fallback (if credentials available)
    if (function_exists('curl_init')) {
        try {
            // Mailgun example
            $url = 'https://api.mailgun.net/v3/vizagup.com/messages';
            $apiKey = 'YOUR_MAILGUN_API_KEY'; // Replace with actual key if available
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_USERPWD, 'api:' . $apiKey);
            curl_setopt($ch, CURLOPT_POSTFIELDS, [
                'from' => 'Vizag Taxi Hub <info@vizagup.com>',
                'to' => $to,
                'subject' => $subject,
                'html' => $htmlBody
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                file_put_contents($logFile, "SUCCESS: Email sent via Mailgun API\n", FILE_APPEND);
                return true;
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "Mail API error: " . $e->getMessage() . "\n", FILE_APPEND);
        }
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
