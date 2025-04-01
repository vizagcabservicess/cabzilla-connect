
<?php
require_once __DIR__ . '/../../config.php';

// Function to send email using PHP mail() function optimized for LiteSpeed servers
function sendMailReliable($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // Initialize variables for tracking
    $success = false;
    $error = '';
    
    // Log attempt with detailed server info
    logError("Attempting to send email with LiteSpeed-optimized method", [
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
    
    // LiteSpeed Method 1: Simple direct approach
    try {
        // LiteSpeed specifically prefers minimal headers
        $simpleHeaders = "From: $fromName <$from>\r\n";
        $simpleHeaders .= "Reply-To: $from\r\n";
        $simpleHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        // Use -f parameter which is critical for LiteSpeed
        $additionalParams = "-f$from";
        
        // Attempt to send with minimal headers
        $success = mail($to, $subject, $htmlBody, $simpleHeaders, $additionalParams);
        
        if ($success) {
            logError("Email sent successfully with LiteSpeed simple method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'Simple LiteSpeed mail()'
            ]);
            return true;
        } else {
            logError("LiteSpeed simple method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in LiteSpeed simple method", ['error' => $error]);
    }
    
    // LiteSpeed Method 2: Try with minimal parameters
    if (!$success) {
        try {
            // Reset error buffer
            if (function_exists('error_clear_last')) {
                error_clear_last();
            }
            
            // For LiteSpeed, sometimes just the From header works better
            $minimalHeaders = "From: $from\r\n";
            $minimalHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
            
            // No additional parameters
            $success = mail($to, $subject, $htmlBody, $minimalHeaders);
            
            if ($success) {
                logError("Email sent successfully with minimal LiteSpeed method", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'Minimal LiteSpeed mail()'
                ]);
                return true;
            } else {
                logError("LiteSpeed minimal method failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in LiteSpeed minimal method", ['error' => $e->getMessage()]);
        }
    }
    
    // LiteSpeed Method 3: Try with full headers but no additional params
    if (!$success) {
        try {
            // Reset error buffer
            if (function_exists('error_clear_last')) {
                error_clear_last();
            }
            
            // Add properly formatted headers for LiteSpeed
            $fullHeaders = [
                'From' => "$fromName <$from>",
                'Reply-To' => $from,
                'Return-Path' => $from,
                'MIME-Version' => '1.0',
                'Content-Type' => 'text/html; charset=UTF-8',
                'X-Mailer' => 'PHP/' . phpversion()
            ];
            
            // Merge with custom headers
            $finalHeaders = array_merge($fullHeaders, $headers);
            
            // Format headers for mail function
            $headerStr = '';
            foreach ($finalHeaders as $name => $value) {
                $headerStr .= "$name: $value\r\n";
            }
            
            // No additional params for this attempt
            $success = mail($to, $subject, $htmlBody, $headerStr);
            
            if ($success) {
                logError("Email sent successfully with full headers LiteSpeed method", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'Full headers LiteSpeed mail()'
                ]);
                return true;
            } else {
                logError("LiteSpeed full headers method failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in LiteSpeed full headers method", ['error' => $e->getMessage()]);
        }
    }
    
    // LiteSpeed Method 4: Try without Content-Type header
    if (!$success) {
        try {
            // Reset error buffer
            if (function_exists('error_clear_last')) {
                error_clear_last();
            }
            
            // Some LiteSpeed servers have issues with Content-Type headers
            $noContentTypeHeaders = "From: $from\r\n";
            $noContentTypeHeaders .= "Reply-To: $from\r\n";
            
            // Try sending
            $success = mail($to, $subject, $htmlBody, $noContentTypeHeaders);
            
            if ($success) {
                logError("Email sent successfully with no Content-Type header method", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'No Content-Type LiteSpeed mail()'
                ]);
                return true;
            } else {
                logError("LiteSpeed no Content-Type method failed", [
                    'to' => $to,
                    'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
                ]);
            }
        } catch (Exception $e) {
            $error .= ' | ' . $e->getMessage();
            logError("Exception in LiteSpeed no Content-Type method", ['error' => $e->getMessage()]);
        }
    }
    
    // Log detailed failure information
    logError("All LiteSpeed email methods failed", [
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
    
    logError("Sending booking confirmation email with LiteSpeed-optimized method", [
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
    
    logError("Sending admin notification email with LiteSpeed-optimized method", [
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
