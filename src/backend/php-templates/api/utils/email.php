
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/mailer.php';

/**
 * Send an email using PHP's mail function with improved error handling and debugging
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @param string $textBody Plain text content of the email
 * @param array $headers Additional headers
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendEmail($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    // Log attempt to send email through our enhanced system
    logError("Attempting to send email through enhanced system", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // First try our most reliable method - the combined approach
    $result = sendEmailAllMethods($to, $subject, $htmlBody);
    
    if ($result) {
        return true;
    }
    
    // Original implementation as fallback
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Log email sending attempt with more details
    logError("Attempting to send email", [
        'to' => $to,
        'subject' => $subject,
        'from' => $from,
        'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]);
    
    // Generate a boundary for the multipart message
    $boundary = md5(time());
    
    // Set up email headers with more delivery-focused headers
    $defaultHeaders = [
        'From' => "$fromName <$from>",
        'Reply-To' => $from,
        'Return-Path' => $from,  // Add return path for better delivery
        'MIME-Version' => '1.0',
        'Content-Type' => "multipart/alternative; boundary=\"$boundary\"",
        'X-Mailer' => 'PHP/' . phpversion(),
        'X-Priority' => '1',  // High priority
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High'
    ];
    
    // Merge default headers with custom headers
    $finalHeaders = array_merge($defaultHeaders, $headers);
    
    // Format headers for mail() function
    $headersStr = '';
    foreach ($finalHeaders as $name => $value) {
        $headersStr .= "$name: $value\r\n";
    }
    
    // If text body is empty, generate a simple one from HTML
    if (empty($textBody)) {
        $textBody = strip_tags($htmlBody);
    }
    
    // Create the message body
    $message = "";
    $message .= "--$boundary\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $textBody . "\r\n\r\n";
    
    $message .= "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $htmlBody . "\r\n\r\n";
    
    $message .= "--$boundary--";
    
    // Attempt to send email with better error capture
    $success = false;
    
    // Clear any existing errors
    if (function_exists('error_clear_last')) {
        error_clear_last();
    }
    
    try {
        // Try with additional parameters for better delivery
        ini_set('sendmail_from', $from);
        
        // Try native mail function first with enhanced parameters
        $success = mail($to, $subject, $message, $headersStr, "-f$from");
        $mailError = error_get_last();
        
        if (!$success) {
            logError("Native mail() function failed", [
                'error' => $mailError ? $mailError['message'] : 'Unknown error',
                'to' => $to,
                'headers' => $headersStr
            ]);
            
            // Try alternative approach if native mail fails
            // This uses more force with the fifth parameter
            $success = @mail($to, $subject, $message, $headersStr, "-f$from");
            $fallbackError = error_get_last();
            
            if (!$success) {
                logError("Fallback mail sending failed", [
                    'error' => $fallbackError ? $fallbackError['message'] : 'Unknown error',
                    'method' => 'mail with -f flag'
                ]);
                
                // Last attempt - try without fifth parameter but with sendmail_from
                ini_set('sendmail_from', $from);
                $success = @mail($to, $subject, $message, $headersStr);
                $lastAttemptError = error_get_last();
                
                if (!$success) {
                    logError("Last attempt mail sending failed", [
                        'error' => $lastAttemptError ? $lastAttemptError['message'] : 'Unknown error',
                        'method' => 'mail with sendmail_from'
                    ]);
                }
            }
        }
    } catch (Exception $e) {
        logError("Exception during mail sending", [
            'exception' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        $success = false;
    }
    
    // Log the result with more details
    if ($success) {
        logError("Email sent successfully", [
            'to' => $to, 
            'subject' => $subject,
            'method' => 'PHP mail()',
            'from' => $from,
            'php_version' => phpversion()
        ]);
    } else {
        $lastError = error_get_last();
        logError("Failed to send email", [
            'to' => $to, 
            'subject' => $subject, 
            'error' => $lastError ? $lastError['message'] : 'Unknown error',
            'php_mail_enabled' => function_exists('mail'),
            'server_os' => PHP_OS
        ]);
    }
    
    return $success;
}

/**
 * Generate HTML email template for booking confirmation
 * 
 * @param array $booking Booking details
 * @return string HTML content for the email
 */
function generateBookingConfirmationEmail($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = $booking['pickupLocation'] ?? 'N/A';
    $dropLocation = $booking['dropLocation'] ?? 'N/A';
    $pickupDate = isset($booking['pickupDate']) ? date('F j, Y \a\t g:i A', strtotime($booking['pickupDate'])) : 'N/A';
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['tripMode'] ?? '';
    
    // Format trip type
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripMode = ucwords($formattedTripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    
    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 5px 5px;
            border: 1px solid #ddd;
        }
        .booking-details {
            margin-bottom: 20px;
        }
        .booking-details h3 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            color: #555;
        }
        .detail-row {
            display: flex;
            margin-bottom: 15px;
        }
        .detail-label {
            font-weight: bold;
            width: 150px;
            color: #555;
        }
        .detail-value {
            flex: 1;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #4285F4;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 20px;
        }
        .contact {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
            <p>Your booking has been successfully confirmed.</p>
            <p style="font-size: 18px; font-weight: bold;">Booking #: $bookingNumber</p>
        </div>
        
        <div class="content">
            <div class="booking-details">
                <h3>Trip Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Pickup Location:</div>
                    <div class="detail-value">$pickupLocation</div>
                </div>
HTML;

    if (!empty($dropLocation) && $dropLocation !== 'N/A') {
        $html .= <<<HTML
                <div class="detail-row">
                    <div class="detail-label">Drop Location:</div>
                    <div class="detail-value">$dropLocation</div>
                </div>
HTML;
    }

    $html .= <<<HTML
                <div class="detail-row">
                    <div class="detail-label">Pickup Date & Time:</div>
                    <div class="detail-value">$pickupDate</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Trip Type:</div>
                    <div class="detail-value">$formattedTripType</div>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Vehicle Type:</div>
                    <div class="detail-value">$cabType</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Total Amount:</div>
                    <div class="detail-value">₹$totalAmount</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Passenger Name:</div>
                    <div class="detail-value">$passengerName</div>
                </div>
            </div>
            
            <div class="contact">
                <p>If you have any questions or need to modify your booking, please contact our customer support:</p>
                <p>Phone: +91 9966363662</p>
                <p>Email: info@vizagtaxihub.com</p>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing Vizag Taxi Hub!</p>
                <p>© 2023 Vizag Taxi Hub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}

/**
 * Generate HTML email template for admin notification of new booking
 * 
 * @param array $booking Booking details
 * @return string HTML content for the email
 */
function generateAdminNotificationEmail($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = $booking['pickupLocation'] ?? 'N/A';
    $dropLocation = $booking['dropLocation'] ?? 'N/A';
    $pickupDate = isset($booking['pickupDate']) ? date('F j, Y \a\t g:i A', strtotime($booking['pickupDate'])) : 'N/A';
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $passengerPhone = $booking['passengerPhone'] ?? 'N/A';
    $passengerEmail = $booking['passengerEmail'] ?? 'N/A';
    $bookingId = $booking['id'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['tripMode'] ?? '';
    
    // Format trip type
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripMode = ucwords($formattedTripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    
    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #3498db;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 5px 5px;
            border: 1px solid #ddd;
        }
        .booking-details {
            margin-bottom: 20px;
        }
        .booking-details h3 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            color: #555;
        }
        .detail-row {
            display: flex;
            margin-bottom: 15px;
        }
        .detail-label {
            font-weight: bold;
            width: 150px;
            color: #555;
        }
        .detail-value {
            flex: 1;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #4285F4;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 20px;
        }
        .admin-action {
            margin-top: 20px;
            padding: 15px;
            background-color: #f1f8ff;
            border: 1px solid #c8e1ff;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Booking Received!</h1>
            <p>A new booking has been created that requires your attention.</p>
            <p style="font-size: 18px; font-weight: bold;">Booking #: $bookingNumber</p>
        </div>
        
        <div class="content">
            <div class="booking-details">
                <h3>Trip Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Pickup Location:</div>
                    <div class="detail-value">$pickupLocation</div>
                </div>
HTML;

    if (!empty($dropLocation) && $dropLocation !== 'N/A') {
        $html .= <<<HTML
                <div class="detail-row">
                    <div class="detail-label">Drop Location:</div>
                    <div class="detail-value">$dropLocation</div>
                </div>
HTML;
    }

    $html .= <<<HTML
                <div class="detail-row">
                    <div class="detail-label">Pickup Date & Time:</div>
                    <div class="detail-value">$pickupDate</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Trip Type:</div>
                    <div class="detail-value">$formattedTripType</div>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Booking ID:</div>
                    <div class="detail-value">$bookingId</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Vehicle Type:</div>
                    <div class="detail-value">$cabType</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Total Amount:</div>
                    <div class="detail-value">₹$totalAmount</div>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Customer Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">$passengerName</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">$passengerPhone</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">$passengerEmail</div>
                </div>
            </div>
            
            <div class="admin-action">
                <p><strong>Admin Action Required:</strong> Please assign a driver to this booking and update the status in the admin dashboard.</p>
                <a href="https://saddlebrown-oryx-227656.hostingersite.com/admin" class="button">Go to Admin Dashboard</a>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from the Vizag Taxi Hub Booking System.</p>
                <p>© 2023 Vizag Taxi Hub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}

/**
 * Send booking confirmation email to the customer with improved error handling
 * 
 * @param array $booking Booking details
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendBookingConfirmationEmail($booking) {
    if (empty($booking['passengerEmail'])) {
        logError("Cannot send confirmation email - no passenger email provided", ['booking_id' => $booking['id'] ?? 'unknown']);
        return false;
    }
    
    $to = $booking['passengerEmail'];
    $subject = "Booking Confirmation - #" . $booking['bookingNumber'];
    $htmlBody = generateBookingConfirmationEmail($booking);
    
    // Add high importance headers and additional delivery headers
    $headers = [
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High',
        'X-Auto-Response-Suppress' => 'OOF, DR, RN, NRN, AutoReply'
    ];
    
    logError("Sending booking confirmation email through enhanced system", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber'],
        'passenger_name' => $booking['passengerName'] ?? 'unknown'
    ]);
    
    // Try our enhanced email delivery system first
    $result = sendEmailAllMethods($to, $subject, $htmlBody);
    
    if (!$result) {
        // If enhanced system fails, try original method as fallback
        $result = sendEmail($to, $subject, $htmlBody, '', $headers);
    }
    
    logError("Booking confirmation email result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'recipient' => $to,
        'methods_tried' => 'all available methods'
    ]);
    
    return $result;
}

/**
 * Send booking notification email to admin with improved error handling
 * 
 * @param array $booking Booking details
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendAdminNotificationEmail($booking) {
    // Admin email - should be a valid, existing email
    $to = 'info@vizagtaxihub.com';
    
    $subject = "New Booking - #" . $booking['bookingNumber'];
    $htmlBody = generateAdminNotificationEmail($booking);
    
    // Add high importance headers and additional delivery headers
    $headers = [
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High',
        'X-Auto-Response-Suppress' => 'OOF, DR, RN, NRN, AutoReply'
    ];
    
    logError("Sending admin notification email through enhanced system", [
        'to' => $to,
        'booking_number' => $booking['bookingNumber'],
        'booking_id' => $booking['id'] ?? 'unknown'
    ]);
    
    // Try our enhanced email delivery system first
    $result = sendEmailAllMethods($to, $subject, $htmlBody);
    
    if (!$result) {
        // If enhanced system fails, try original method as fallback
        $result = sendEmail($to, $subject, $htmlBody, '', $headers);
    }
    
    logError("Admin notification email result", [
        'success' => $result ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'methods_tried' => 'all available methods'
    ]);
    
    return $result;
}
