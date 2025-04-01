<?php
require_once __DIR__ . '/../../config.php';

// Function specifically for SendGrid sending
function sendSendGridEmail($to, $subject, $htmlBody) {
    // Log attempt with detailed information
    logError("Attempting to send email via SendGrid", [
        'to' => $to,
        'subject' => $subject,
        'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]);
    
    // SendGrid API key - should be in a secure location/env variable in production
    $sendgridApiKey = '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';
    
    // Build email headers
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Prepare SendGrid API request
    $data = [
        'personalizations' => [
            [
                'to' => [['email' => $to]],
                'subject' => $subject
            ]
        ],
        'from' => [
            'email' => $from,
            'name' => $fromName
        ],
        'content' => [
            [
                'type' => 'text/html',
                'value' => $htmlBody
            ]
        ]
    ];
    
    // Initialize cURL
    $ch = curl_init();
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, 'https://api.sendgrid.com/v3/mail/send');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $sendgridApiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL
    curl_close($ch);
    
    // Check for success (2xx status code)
    $success = ($httpCode >= 200 && $httpCode < 300);
    
    // Log the result
    logError("SendGrid email sending result", [
        'success' => $success ? 'yes' : 'no',
        'to' => $to,
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'response' => $response,
    ]);
    
    return $success;
}

// Enhanced function to send email using direct SMTP with PHPMailer-like implementation
function sendSmtpEmail($to, $subject, $htmlBody) {
    // Log attempt with detailed information
    logError("Attempting to send email via SMTP", [
        'to' => $to,
        'subject' => $subject,
        'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]);
    
    // SMTP credentials for Hostinger - explicitly set
    $smtpHost = 'smtp.hostinger.com';
    $smtpPort = 465; // SSL preferred for Hostinger
    $smtpUsername = 'info@vizagtaxihub.com';
    $smtpPassword = 'James!5544';
    $smtpEncryption = 'ssl'; // Use SSL for port 465
    
    // From details - Using verified Hostinger domain email is crucial for deliverability
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Prepare full email headers for better deliverability
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $fromName . ' <' . $from . '>',
        'Reply-To: ' . $from,
        'Return-Path: ' . $from,
        'X-Mailer: PHP/' . phpversion(),
        'X-Priority: 1',
        'X-MSMail-Priority: High',
        'Importance: High',
        'X-Sender: ' . $from,
        // SPF hint
        'X-SPF: pass',
        // Avoid auto-responses
        'X-Auto-Response-Suppress: OOF, DR, RN, NRN, AutoReply',
        'Precedence: bulk'
    ];
    
    // Prepare context options for SSL connection
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);
    
    // Connect to SMTP server
    $errno = 0;
    $errstr = '';
    
    // Create connection with proper SSL prefix for port 465
    $socketAddress = 'ssl://' . $smtpHost . ':' . $smtpPort;
    
    logError("Attempting SMTP connection", [
        'socket' => $socketAddress,
        'encryption' => $smtpEncryption
    ]);
    
    $socket = @stream_socket_client(
        $socketAddress,
        $errno,
        $errstr,
        30,
        STREAM_CLIENT_CONNECT,
        $context
    );
    
    if (!$socket) {
        logError("SMTP connection failed", [
            'error' => "$errno: $errstr",
            'server' => $smtpHost,
            'port' => $smtpPort
        ]);
        return false;
    }
    
    // Set socket timeout to prevent hanging
    stream_set_timeout($socket, 30);
    
    try {
        // Read server greeting
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '220') {
            logError("Invalid SMTP greeting", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Send EHLO command - using the domain for proper identification
        fputs($socket, "EHLO vizagtaxihub.com\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            logError("EHLO command failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Clear any remaining EHLO response lines
        while (substr($response, 3, 1) == '-') {
            $response = fgets($socket, 515);
        }
        
        // Authenticate using clear AUTH LOGIN
        fputs($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '334') {
            logError("AUTH command failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Send username as base64
        fputs($socket, base64_encode($smtpUsername) . "\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '334') {
            logError("Username not accepted", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Send password as base64
        fputs($socket, base64_encode($smtpPassword) . "\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '235') {
            logError("Authentication failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Set envelope sender
        fputs($socket, "MAIL FROM:<$from>\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            logError("MAIL FROM command failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Set recipient
        fputs($socket, "RCPT TO:<$to>\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            logError("RCPT TO command failed", ['response' => $response, 'recipient' => $to]);
            fclose($socket);
            return false;
        }
        
        // Start data
        fputs($socket, "DATA\r\n");
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '354') {
            logError("DATA command failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Calculate message ID using domain
        $messageId = '<' . md5(uniqid(time())) . '@vizagtaxihub.com>';
        $date = date('r');
        
        // Add headers to email content
        $message = "";
        $message .= "Date: $date\r\n";
        $message .= "To: $to\r\n";
        $message .= "Subject: $subject\r\n";
        $message .= "Message-ID: $messageId\r\n";
        
        // Add all headers
        foreach ($headers as $header) {
            $message .= $header . "\r\n";
        }
        
        // Add empty line to separate headers from body
        $message .= "\r\n";
        
        // Add HTML body
        $message .= $htmlBody;
        
        // End message with single dot on a line
        $message .= "\r\n.\r\n";
        
        // Send message data
        fputs($socket, $message);
        $response = fgets($socket, 515);
        if (substr($response, 0, 3) != '250') {
            logError("Message sending failed", ['response' => $response]);
            fclose($socket);
            return false;
        }
        
        // Properly close connection
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        logError("Email sent successfully via SMTP", [
            'to' => $to,
            'subject' => $subject,
            'host' => $smtpHost,
            'port' => $smtpPort,
            'messageId' => $messageId
        ]);
        
        return true;
    }
    catch (Exception $e) {
        logError("Exception in SMTP email sending", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        if ($socket) {
            fclose($socket);
        }
        
        return false;
    }
}

// Function to send email using Hostinger-recommended methods with improved error handling
function sendHostingerMail($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // Initialize variables for tracking
    $success = false;
    $error = '';
    
    // Log attempt with detailed server info
    logError("Attempting to send email with Hostinger-specific method", [
        'to' => $to,
        'subject' => $subject,
        'mail_function' => function_exists('mail') ? 'available' : 'unavailable',
        'sendmail_path' => ini_get('sendmail_path'),
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]);
    
    // Set email parameters - use proper domain email that matches SPF record
    $from = 'noreply@vizagtaxihub.com'; // Try a different sender address
    $fromName = 'Vizag Taxi Hub';
    
    // Create a temporary file for the email content
    $tempFile = tempnam(sys_get_temp_dir(), 'email_');
    
    if ($tempFile === false) {
        logError("Failed to create temporary file for email", ['to' => $to]);
        return false;
    }
    
    // Build email headers with spam-prevention techniques
    $date = date('r');
    $messageId = '<' . md5(uniqid(microtime(true))) . '@vizagtaxihub.com>';
    
    $emailContent = "To: $to\r\n";
    $emailContent .= "Subject: $subject\r\n";
    $emailContent .= "From: $fromName <$from>\r\n";
    $emailContent .= "Reply-To: info@vizagtaxihub.com\r\n";
    $emailContent .= "Return-Path: info@vizagtaxihub.com\r\n";
    $emailContent .= "Date: $date\r\n";
    $emailContent .= "Message-ID: $messageId\r\n";
    $emailContent .= "MIME-Version: 1.0\r\n";
    $emailContent .= "Content-Type: text/html; charset=UTF-8\r\n";
    $emailContent .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $emailContent .= "X-Priority: 1\r\n";
    $emailContent .= "X-MSMail-Priority: High\r\n";
    $emailContent .= "Importance: High\r\n";
    $emailContent .= "X-Sender: info@vizagtaxihub.com\r\n";
    $emailContent .= "X-Auto-Response-Suppress: OOF, DR, RN, NRN, AutoReply\r\n";
    
    // Add SPF hint (the actual SPF record should be set in DNS)
    $emailContent .= "X-SPF: pass\r\n";
    $emailContent .= "\r\n";
    $emailContent .= $htmlBody;
    
    // Write content to temp file
    file_put_contents($tempFile, $emailContent);
    
    try {
        // Method 1: Try using Hostinger's hsendmail directly via shell_exec
        $sendmailPath = '/usr/sbin/hsendmail';
        if (file_exists($sendmailPath) && is_executable($sendmailPath)) {
            $command = "$sendmailPath -t < $tempFile";
            logError("Executing hsendmail command", ['command' => $command, 'to' => $to]);
            
            $output = shell_exec($command);
            
            if ($output === null) {
                // No error output usually means success with shell_exec
                $success = true;
                logError("hsendmail execution completed", ['to' => $to, 'output' => 'null (likely success)']);
            } else {
                logError("hsendmail execution returned output", ['to' => $to, 'output' => $output]);
            }
        } else {
            logError("hsendmail not found or not executable", [
                'path' => $sendmailPath, 
                'exists' => file_exists($sendmailPath) ? 'yes' : 'no',
                'executable' => is_executable($sendmailPath) ? 'yes' : 'no'
            ]);
        }
        
        // Method 2: If hsendmail direct approach failed, try using mail() with sender flag
        if (!$success) {
            // Save current sendmail path
            $originalSendmailPath = ini_get('sendmail_path');
            
            // Set to Hostinger's path explicitly
            ini_set('sendmail_path', '/usr/sbin/hsendmail -t -i -f info@vizagtaxihub.com');
            
            // Very simple headers
            $simpleHeaders = "From: $fromName <$from>\r\n";
            $simpleHeaders .= "Reply-To: info@vizagtaxihub.com\r\n";
            $simpleHeaders .= "Return-Path: info@vizagtaxihub.com\r\n";
            $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
            $simpleHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
            
            logError("Trying mail() with explicit hsendmail path", [
                'to' => $to,
                'sendmail_path' => ini_get('sendmail_path')
            ]);
            
            // Use direct mail call with minimal parameters and 5th parameter for envelope sender
            $success = mail($to, $subject, $htmlBody, $simpleHeaders, '-f info@vizagtaxihub.com');
            
            if ($success) {
                logError("Email sent successfully with explicit sendmail path", [
                    'to' => $to,
                    'subject' => $subject
                ]);
            } else {
                logError("Mail with explicit sendmail path failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
            
            // Restore original sendmail path
            ini_set('sendmail_path', $originalSendmailPath);
        }
        
        // Method 3: Try one more direct mail approach with minimal headers
        if (!$success) {
            // Use PHP's mail() function with no frills as recommended sometimes by Hostinger
            $bareHeaders = "From: $fromName <$from>\r\n" .
                           "Reply-To: info@vizagtaxihub.com\r\n" .
                           "Content-Type: text/html; charset=UTF-8\r\n";
            
            logError("Trying barebones mail()", ['to' => $to]);
            
            $success = mail($to, $subject, $htmlBody, $bareHeaders);
            
            if ($success) {
                logError("Email sent successfully with barebones approach", [
                    'to' => $to,
                    'subject' => $subject
                ]);
            } else {
                logError("Barebones mail approach failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in Hostinger mail method", ['error' => $error]);
    } finally {
        // Clean up temp file
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
    }
    
    // Log the final result
    if ($success) {
        logError("Email sent successfully via Hostinger method", [
            'to' => $to,
            'subject' => $subject
        ]);
    } else {
        logError("All Hostinger email methods failed", [
            'to' => $to,
            'subject' => $subject,
            'error' => $error,
            'server_info' => [
                'php_version' => phpversion(),
                'os' => PHP_OS,
                'sapi' => php_sapi_name(),
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
                'mail_function' => function_exists('mail') ? 'available' : 'unavailable',
                'sendmail_path' => ini_get('sendmail_path'),
                'disable_functions' => ini_get('disable_functions')
            ]
        ]);
    }
    
    return $success;
}

// Legacy mail function kept for compatibility
function sendMailReliable($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // First try Hostinger-specific method
    $success = sendHostingerMail($to, $subject, $htmlBody, $textBody, $headers);
    
    if ($success) {
        return true;
    }
    
    // Initialize variables for tracking
    $error = '';
    
    // Log attempt with detailed server info
    logError("Falling back to regular mail methods", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // Set email parameters - use proper domain email that matches SPF record
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Try using PHP's built-in error reporting to catch issues
    $previousErrorReporting = error_reporting(E_ALL);
    $previousDisplayErrors = ini_get('display_errors');
    ini_set('display_errors', '1');

    ob_start(); // Start output buffering to capture any error messages
    
    try {
        // Very simple headers - sometimes LiteSpeed servers reject complex headers
        $simpleHeaders = "From: $fromName <$from>\r\n";
        $simpleHeaders .= "Reply-To: $from\r\n";
        $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        // Use direct mail call with minimal parameters
        $success = mail($to, $subject, $htmlBody, $simpleHeaders);
        
        if ($success) {
            logError("Email sent successfully with minimal headers method", [
                'to' => $to,
                'subject' => $subject
            ]);
            ob_end_clean();
            return true;
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in minimal headers method", ['error' => $error]);
    }
    
    ob_end_clean(); // End output buffering
    
    // Restore original error reporting settings
    error_reporting($previousErrorReporting);
    ini_set('display_errors', $previousDisplayErrors);
    
    // Log detailed failure information
    logError("All email methods failed", [
        'to' => $to,
        'subject' => $subject,
        'errors' => $error
    ]);
    
    return false;
}

// Function to send booking confirmation email using multiple methods
function sendReliableBookingConfirmationEmail($booking) {
    if (empty($booking['passengerEmail'])) {
        logError("Cannot send confirmation email - no passenger email provided", [
            'booking_id' => $booking['id'] ?? 'unknown'
        ]);
        return false;
    }
    
    $to = $booking['passengerEmail'];
    $subject = "Booking Confirmation - #" . $booking['bookingNumber'];
    $htmlBody = generateBookingConfirmationEmail($booking);
    
    logError("Sending booking confirmation email", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    // Try SMTP first (should be most reliable)
    $result = sendSmtpEmail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If SMTP fails, try SendGrid
    $result = sendSendGridEmail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If SendGrid fails, try native Hostinger methods
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If that fails too, try regular reliable method
    $result = sendMailReliable($to, $subject, $htmlBody);
    
    logError("Booking confirmation email final result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'recipient' => $to
    ]);
    
    return $result;
}

// Function to send admin notification email
function sendReliableAdminNotificationEmail($booking) {
    $to = 'info@vizagtaxihub.com';
    $subject = "New Booking - #" . $booking['bookingNumber'];
    $htmlBody = generateAdminNotificationEmail($booking);
    
    logError("Sending admin notification email", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    // Try SMTP first (should be most reliable)
    $result = sendSmtpEmail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If SMTP fails, try SendGrid
    $result = sendSendGridEmail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If SendGrid fails, try native Hostinger methods
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // If that fails too, try regular reliable method
    $result = sendMailReliable($to, $subject, $htmlBody);
    
    logError("Admin notification email final result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber']
    ]);
    
    return $result;
}

// Function specifically to use with update-booking.php
function sendBookingStatusUpdateEmail($to, $subject, $message) {
    logError("Sending booking status update email", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // Create a simple but professional HTML email
    $htmlBody = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>'.$subject.'</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd; }
        .footer { margin-top: 20px; text-align: center; color: #777; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>'.$subject.'</h1>
        </div>
        <div class="content">
            <p>'.$message.'</p>
            <p>If you have any questions, please contact our customer support:</p>
            <p>Phone: +91 9966363662</p>
            <p>Email: info@vizagtaxihub.com</p>
        </div>
        <div class="footer">
            <p>Thank you for choosing Vizag Taxi Hub!</p>
            <p>© ' . date('Y') . ' Vizag Taxi Hub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>';
    
    // Try SMTP first (most reliable)
    $result = sendSmtpEmail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email sent successfully via SMTP", ['to' => $to, 'subject' => $subject]);
        return true;
    }
    
    // Try SendGrid if SMTP fails
    $result = sendSendGridEmail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email sent successfully via SendGrid", ['to' => $to, 'subject' => $subject]);
        return true;
    }
    
    // If that fails, try our more reliable Hostinger method
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email sent successfully via Hostinger method", ['to' => $to, 'subject' => $subject]);
        return true;
    }
    
    // Last resort, try PHP mail
    $result = sendMailReliable($to, $subject, $htmlBody);
    
    logError("Final email sending result", [
        'success' => $result ? 'yes' : 'no',
        'to' => $to,
        'subject' => $subject
    ]);
    
    return $result;
}

// New helper function to try all available email methods sequentially
function sendEmailAllMethods($to, $subject, $htmlBody) {
    // First try direct SMTP connection (most reliable)
    logError("Attempting email delivery via SMTP", [
        'to' => $to,
        'subject' => $subject,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $result = sendSmtpEmail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email successfully sent via SMTP", [
            'to' => $to,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        return true;
    }
    
    // Next try SendGrid API
    logError("SMTP failed, trying SendGrid", [
        'to' => $to,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $result = sendSendGridEmail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email successfully sent via SendGrid", [
            'to' => $to,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        return true;
    }
    
    // Then try Hostinger's specific method
    logError("SendGrid failed, trying Hostinger method", [
        'to' => $to,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email successfully sent via Hostinger method", [
            'to' => $to,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        return true;
    }
    
    // Finally, fall back to PHP's mail function
    logError("Hostinger method failed, trying PHP mail", [
        'to' => $to,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $result = sendMailReliable($to, $subject, $htmlBody);
    
    if ($result) {
        logError("Email successfully sent via PHP mail", [
            'to' => $to,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        return true;
    }
    
    logError("All email methods failed", [
        'to' => $to, 
        'subject' => $subject,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    return false;
}
