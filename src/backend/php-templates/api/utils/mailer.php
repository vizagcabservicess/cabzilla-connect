
<?php
require_once __DIR__ . '/../../config.php';

// Function to send email using more reliable methods suitable for shared hosting
function sendMailReliable($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // Initialize variables for tracking
    $success = false;
    $error = '';
    
    // Log attempt with detailed server info
    logError("Attempting to send email with reliable method", [
        'to' => $to,
        'subject' => $subject,
        'mail_function' => function_exists('mail') ? 'available' : 'unavailable',
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'server_os' => PHP_OS,
        'sapi' => php_sapi_name()
    ]);
    
    // Set email parameters
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Try method 1: Direct mail with additional parameters
    try {
        // Add To header to help with delivery
        $additionalHeaders = [
            'To' => $to,
            'From' => "$fromName <$from>",
            'Reply-To' => $from,
            'Return-Path' => $from,
            'X-Mailer' => 'PHP/' . phpversion(),
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/html; charset=UTF-8',
            'X-Priority' => '1',
            'X-MSMail-Priority' => 'High',
            'Importance' => 'High'
        ];
        
        // Merge with custom headers
        $finalHeaders = array_merge($additionalHeaders, $headers);
        
        // Format headers for mail function
        $headerStr = '';
        foreach ($finalHeaders as $name => $value) {
            $headerStr .= "$name: $value\r\n";
        }
        
        // Special additional parameters for shared hosting
        $additionalParams = "-f$from";
        
        // Set PHP ini settings that might help with delivery
        ini_set('sendmail_from', $from);
        
        // Attempt to send with extra parameters
        $success = mail($to, $subject, $htmlBody, $headerStr, $additionalParams);
        
        if ($success) {
            logError("Email sent successfully with direct method and parameters", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'PHP mail() with parameters'
            ]);
            return true;
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in primary email method", ['error' => $error]);
    }
    
    // Method 2: Try alternate approach with simpler parameters
    if (!$success) {
        try {
            // Simpler headers
            $simpleHeaders = "From: $fromName <$from>\r\n";
            $simpleHeaders .= "Reply-To: $from\r\n";
            $simpleHeaders .= "MIME-Version: 1.0\r\n";
            $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
            
            // Try sending with simplified approach
            $success = mail($to, $subject, $htmlBody, $simpleHeaders);
            
            if ($success) {
                logError("Email sent successfully with simplified method", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'PHP mail() simplified'
                ]);
                return true;
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in secondary email method", ['error' => $e->getMessage()]);
        }
    }
    
    // Method 3: Last resort - direct file method for some hosting environments
    if (!$success) {
        try {
            // Try a file-based approach which works on some hosts
            $tempFile = tempnam(sys_get_temp_dir(), 'mail');
            $handle = fopen($tempFile, 'w');
            
            // Simple email format
            $emailContent = "To: $to\r\n";
            $emailContent .= "From: $fromName <$from>\r\n";
            $emailContent .= "Subject: $subject\r\n";
            $emailContent .= "MIME-Version: 1.0\r\n";
            $emailContent .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
            $emailContent .= $htmlBody;
            
            fwrite($handle, $emailContent);
            fclose($handle);
            
            // Use system mail command if available (works on many Linux hosts)
            if (function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
                exec("/usr/sbin/sendmail -t < $tempFile", $output, $returnCode);
                $success = ($returnCode === 0);
                
                if ($success) {
                    logError("Email sent successfully with sendmail command", [
                        'to' => $to,
                        'subject' => $subject,
                        'method' => 'sendmail via exec'
                    ]);
                } else {
                    logError("Sendmail command failed", [
                        'return_code' => $returnCode,
                        'output' => implode("\n", $output)
                    ]);
                }
            }
            
            // Clean up
            @unlink($tempFile);
            
            if ($success) {
                return true;
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in fallback email method", ['error' => $e->getMessage()]);
        }
    }
    
    // Log detailed failure information
    logError("All email methods failed", [
        'to' => $to,
        'subject' => $subject,
        'errors' => $error,
        'server_info' => [
            'php_version' => phpversion(),
            'os' => PHP_OS,
            'sapi' => php_sapi_name(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]
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
    
    logError("Sending booking confirmation email with reliable method", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    $result = sendMailReliable($to, $subject, $htmlBody);
    
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
    
    logError("Sending admin notification email with reliable method", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber']
    ]);
    
    $result = sendMailReliable($to, $subject, $htmlBody);
    
    logError("Admin notification email result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber']
    ]);
    
    return $result;
}
