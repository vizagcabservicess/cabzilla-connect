
<?php
require_once __DIR__ . '/../../config.php';

// Function to send email using PHP mail() function optimized for Hostinger
function sendMailReliable($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // Initialize variables for tracking
    $success = false;
    $error = '';
    
    // Log attempt with detailed server info
    logError("Attempting to send email with Hostinger-optimized method", [
        'to' => $to,
        'subject' => $subject,
        'mail_function' => function_exists('mail') ? 'available' : 'unavailable',
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'server_os' => PHP_OS,
        'sapi' => php_sapi_name()
    ]);
    
    // Set email parameters - use proper domain email that matches SPF record
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Try primary email method specifically configured for Hostinger
    try {
        // Add properly formatted headers for Hostinger
        $additionalHeaders = [
            'From' => "$fromName <$from>",
            'Reply-To' => $from,
            'Return-Path' => $from,
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/html; charset=UTF-8',
            'X-Mailer' => 'PHP/' . phpversion()
        ];
        
        // Merge with custom headers
        $finalHeaders = array_merge($additionalHeaders, $headers);
        
        // Format headers for mail function
        $headerStr = '';
        foreach ($finalHeaders as $name => $value) {
            $headerStr .= "$name: $value\r\n";
        }
        
        // For Hostinger, make sure this from address matches the SPF record
        $additionalParams = "-f$from";
        
        // Set PHP ini settings that might help with delivery on Hostinger
        ini_set('sendmail_from', $from);
        
        // Attempt to send with Hostinger-specific parameters
        $success = mail($to, $subject, $htmlBody, $headerStr, $additionalParams);
        
        if ($success) {
            logError("Email sent successfully with Hostinger-optimized method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'PHP mail() with Hostinger parameters'
            ]);
            return true;
        } else {
            logError("Primary email method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in primary email method", ['error' => $error]);
    }
    
    // Method 2: Try alternative approach for Hostinger with simpler headers
    if (!$success) {
        try {
            // For Hostinger, simple headers sometimes work better
            $simpleHeaders = "From: $fromName <$from>\r\n";
            $simpleHeaders .= "Reply-To: $from\r\n";
            $simpleHeaders .= "MIME-Version: 1.0\r\n";
            $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
            
            // Try sending with simplified Hostinger approach
            $success = mail($to, $subject, $htmlBody, $simpleHeaders);
            
            if ($success) {
                logError("Email sent successfully with simplified Hostinger method", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'PHP mail() simplified for Hostinger'
                ]);
                return true;
            } else {
                logError("Secondary email method failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in secondary email method", ['error' => $e->getMessage()]);
        }
    }
    
    // Method 3: Last resort - use direct sendmail approach which sometimes works on Hostinger
    if (!$success) {
        try {
            // Try Hostinger's sendmail directly
            $tempFile = tempnam(sys_get_temp_dir(), 'mail');
            $handle = fopen($tempFile, 'w');
            
            // Email format optimized for Hostinger
            $emailContent = "To: $to\r\n";
            $emailContent .= "From: $fromName <$from>\r\n";
            $emailContent .= "Subject: $subject\r\n";
            $emailContent .= "MIME-Version: 1.0\r\n";
            $emailContent .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
            $emailContent .= $htmlBody;
            
            fwrite($handle, $emailContent);
            fclose($handle);
            
            // Use sendmail directly - this path is correct for Hostinger
            if (function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
                exec("/usr/sbin/sendmail -t < $tempFile", $output, $returnCode);
                $success = ($returnCode === 0);
                
                if ($success) {
                    logError("Email sent successfully with sendmail on Hostinger", [
                        'to' => $to,
                        'subject' => $subject,
                        'method' => 'sendmail via exec on Hostinger'
                    ]);
                } else {
                    logError("Hostinger sendmail command failed", [
                        'return_code' => $returnCode,
                        'output' => implode("\n", $output)
                    ]);
                }
            } else {
                logError("Exec function not available for sendmail approach", [
                    'disable_functions' => ini_get('disable_functions')
                ]);
            }
            
            // Clean up
            @unlink($tempFile);
            
            if ($success) {
                return true;
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in Hostinger fallback email method", ['error' => $e->getMessage()]);
        }
    }
    
    // Log detailed failure information
    logError("All Hostinger email methods failed", [
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
    
    logError("Sending booking confirmation email with Hostinger-optimized method", [
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
    
    logError("Sending admin notification email with Hostinger-optimized method", [
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
