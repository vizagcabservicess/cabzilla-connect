
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
    
    // Build email headers
    $emailContent = "To: $to\r\n";
    $emailContent .= "Subject: $subject\r\n";
    $emailContent .= "From: $fromName <$from>\r\n";
    $emailContent .= "Reply-To: $from\r\n";
    $emailContent .= "MIME-Version: 1.0\r\n";
    $emailContent .= "Content-Type: text/html; charset=UTF-8\r\n";
    $emailContent .= "X-Mailer: PHP/" . phpversion() . "\r\n";
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
        
        // Method 2: If hsendmail direct approach failed, try using mail() with explicit path
        if (!$success) {
            // Save current sendmail path
            $originalSendmailPath = ini_get('sendmail_path');
            
            // Set to Hostinger's path explicitly
            ini_set('sendmail_path', '/usr/sbin/hsendmail -t');
            
            // Very simple headers
            $simpleHeaders = "From: $from\r\n";
            
            logError("Trying mail() with explicit hsendmail path", [
                'to' => $to,
                'sendmail_path' => ini_get('sendmail_path')
            ]);
            
            // Use direct mail call with minimal parameters
            $success = mail($to, $subject, $htmlBody, $simpleHeaders);
            
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
        
        // Method 3: Contact Hostinger support method
        if (!$success) {
            // Use PHP's mail() function with no frills as recommended sometimes by Hostinger
            $bareHeaders = "From: $from\r\n" .
                           "MIME-Version: 1.0\r\n" .
                           "Content-type: text/html; charset=UTF-8\r\n";
            
            logError("Trying barebones mail() as recommended by Hostinger", ['to' => $to]);
            
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
        
        // Method 4: Direct file writing to mail queue if allowed (unlikely to work but worth a try)
        if (!$success && function_exists('posix_getuid') && posix_getuid() === 0) {
            // This will only work if PHP is running as root (very unlikely)
            $mailDir = '/var/spool/mail';
            if (is_dir($mailDir) && is_writable($mailDir)) {
                $queueFile = "$mailDir/hostinger";
                file_put_contents($queueFile, $emailContent, FILE_APPEND);
                logError("Attempted direct mail queue write", ['file' => $queueFile]);
                $success = true;
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
            'error' => $error
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
        $simpleHeaders = "From: $from\r\n";
        
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
