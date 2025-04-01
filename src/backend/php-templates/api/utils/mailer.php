
<?php
require_once __DIR__ . '/../../config.php';

// Function to send email using Hostinger's hsendmail specifically
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

// Function to send booking confirmation email using the reliable method
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
    
    logError("Sending booking confirmation email with Hostinger-optimized method", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    // Try Hostinger-specific method first
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if (!$result) {
        // If that fails, try regular reliable method
        $result = sendMailReliable($to, $subject, $htmlBody);
    }
    
    logError("Booking confirmation email result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'recipient' => $to
    ]);
    
    return $result;
}

// Function to send admin notification email using the reliable method
function sendReliableAdminNotificationEmail($booking) {
    $to = 'info@vizagtaxihub.com';
    $subject = "New Booking - #" . $booking['bookingNumber'];
    $htmlBody = generateAdminNotificationEmail($booking);
    
    logError("Sending admin notification email with Hostinger-optimized method", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    // Try Hostinger-specific method first
    $result = sendHostingerMail($to, $subject, $htmlBody);
    
    if (!$result) {
        // If that fails, try regular reliable method
        $result = sendMailReliable($to, $subject, $htmlBody);
    }
    
    logError("Admin notification email result", [
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
            <p>© 2023 Vizag Taxi Hub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>';
    
    // Try our more reliable method
    return sendHostingerMail($to, $subject, $htmlBody);
}
