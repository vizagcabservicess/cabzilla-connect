
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
    
    // LiteSpeed-specific: Check sendmail path
    $sendmailPath = ini_get('sendmail_path');
    logError("Checking sendmail path", ['path' => $sendmailPath ?: 'not set']);
    
    // Try using PHP's built-in error reporting to catch issues
    $previousErrorReporting = error_reporting(E_ALL);
    $previousDisplayErrors = ini_get('display_errors');
    ini_set('display_errors', '1');

    ob_start(); // Start output buffering to capture any error messages
    
    // LiteSpeed Method 1: Very minimal approach that often works on Hostinger
    try {
        // Very simple headers - sometimes LiteSpeed servers reject complex headers
        $simpleHeaders = "From: $from\r\n";
        
        // Use direct mail call with minimal parameters
        $success = mail($to, $subject, $htmlBody, $simpleHeaders);
        
        $errors = ob_get_contents();
        if (!empty($errors)) {
            logError("Captured output during mail attempt", ['output' => $errors]);
        }
        
        if ($success) {
            logError("Email sent successfully with minimal headers method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'Minimal headers'
            ]);
            ob_end_clean();
            return true;
        } else {
            logError("LiteSpeed minimal headers method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        logError("Exception in minimal headers method", ['error' => $error]);
    }
    
    ob_end_clean(); // End output buffering
    
    // LiteSpeed Method 2: Try with named From parameter
    try {
        // Reset error buffer
        if (function_exists('error_clear_last')) {
            error_clear_last();
        }
        
        ob_start(); // Start output buffering again
        
        // Use named From parameter
        $namedHeaders = "From: $fromName <$from>\r\n";
        $namedHeaders .= "Reply-To: $from\r\n";
        
        // Try with additional parameters
        $additionalParams = "-f$from";
        
        $success = mail($to, $subject, $htmlBody, $namedHeaders, $additionalParams);
        
        $errors = ob_get_contents();
        if (!empty($errors)) {
            logError("Captured output during named From attempt", ['output' => $errors]);
        }
        
        if ($success) {
            logError("Email sent successfully with named From method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'Named From with f parameter'
            ]);
            ob_end_clean();
            return true;
        } else {
            logError("LiteSpeed named From method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error .= ' | ' . $e->getMessage();
        logError("Exception in named From method", ['error' => $e->getMessage()]);
    }
    
    ob_end_clean(); // End output buffering
    
    // LiteSpeed Method 3: Try without any formatting in From header
    try {
        // Reset error buffer
        if (function_exists('error_clear_last')) {
            error_clear_last();
        }
        
        ob_start(); // Start output buffering again
        
        // No formatting in From
        $plainHeaders = "From: $from\r\n";
        
        // Try without additional parameters
        $success = mail($to, $subject, $htmlBody, $plainHeaders);
        
        $errors = ob_get_contents();
        if (!empty($errors)) {
            logError("Captured output during plain From attempt", ['output' => $errors]);
        }
        
        if ($success) {
            logError("Email sent successfully with plain From method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'Plain From'
            ]);
            ob_end_clean();
            return true;
        } else {
            logError("LiteSpeed plain From method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error .= ' | ' . $e->getMessage();
        logError("Exception in plain From method", ['error' => $e->getMessage()]);
    }
    
    ob_end_clean(); // End output buffering
    
    // LiteSpeed Method 4: Extreme simplified version
    try {
        // Reset error buffer
        if (function_exists('error_clear_last')) {
            error_clear_last();
        }
        
        ob_start(); // Start output buffering again
        
        // Try setting mail.add_x_header to off
        @ini_set('mail.add_x_header', 'Off');
        
        // Simplest approach - no headers, no parameters
        $success = mail($to, $subject, $htmlBody);
        
        $errors = ob_get_contents();
        if (!empty($errors)) {
            logError("Captured output during no headers attempt", ['output' => $errors]);
        }
        
        if ($success) {
            logError("Email sent successfully with no headers method", [
                'to' => $to,
                'subject' => $subject,
                'method' => 'No headers at all'
            ]);
            ob_end_clean();
            return true;
        } else {
            logError("LiteSpeed no headers method failed", [
                'to' => $to,
                'error' => error_get_last() ? error_get_last()['message'] : 'Unknown error'
            ]);
        }
    } catch (Exception $e) {
        $error .= ' | ' . $e->getMessage();
        logError("Exception in no headers method", ['error' => $e->getMessage()]);
    }
    
    ob_end_clean(); // End output buffering
    
    // LiteSpeed Method 5: Try forcing mail with exec if available and allowed
    try {
        // Only attempt if exec is available and not disabled
        if (function_exists('exec') && !in_array('exec', explode(',', ini_get('disable_functions')))) {
            logError("Attempting to send mail using exec command", ['to' => $to]);
            
            // Create a temporary file for the email body
            $tempFile = tempnam(sys_get_temp_dir(), 'email');
            file_put_contents($tempFile, $htmlBody);
            
            // Build the mail command
            $command = "cat $tempFile | mail -s \"$subject\" -a \"From: $from\" $to";
            $output = [];
            $returnCode = 0;
            
            // Execute the command
            exec($command, $output, $returnCode);
            
            // Clean up
            unlink($tempFile);
            
            // Check the result
            if ($returnCode === 0) {
                logError("Email sent successfully using exec command", [
                    'to' => $to,
                    'subject' => $subject,
                    'method' => 'exec mail command'
                ]);
                return true;
            } else {
                logError("Exec mail command failed", [
                    'to' => $to,
                    'return_code' => $returnCode,
                    'output' => implode("\n", $output)
                ]);
            }
        } else {
            logError("Exec function not available for mail sending", [
                'exec_exists' => function_exists('exec') ? 'yes' : 'no',
                'disabled_functions' => ini_get('disable_functions')
            ]);
        }
    } catch (Exception $e) {
        $error .= ' | ' . $e->getMessage();
        logError("Exception in exec mail method", ['error' => $e->getMessage()]);
    }
    
    // Restore original error reporting settings
    error_reporting($previousErrorReporting);
    ini_set('display_errors', $previousDisplayErrors);
    
    // Log detailed failure information
    logError("All LiteSpeed email methods failed", [
        'to' => $to,
        'subject' => $subject,
        'errors' => $error,
        'server_info' => [
            'php_version' => phpversion(),
            'os' => PHP_OS,
            'sapi' => php_sapi_name(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'mail_function' => function_exists('mail') ? 'available' : 'unavailable',
            'sendmail_path' => ini_get('sendmail_path') ?: 'not set',
            'disable_functions' => ini_get('disable_functions')
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
