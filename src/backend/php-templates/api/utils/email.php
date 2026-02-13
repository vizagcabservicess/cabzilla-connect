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
    $from = 'info@vizagtaxihub.com'; // Updated domain email
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

function generateBookingConfirmationEmail($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = $booking['pickupLocation'] ?? 'N/A';
    $dropLocation = $booking['dropLocation'] ?? 'N/A';
    $pickupDate = formatDateTimeForEmail($booking['pickupDate'] ?? null);
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $passengerPhone = $booking['passengerPhone'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['tripMode'] ?? '';
    
    // Format trip type
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripMode = ucwords($formattedTripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    
    // Payment details
    $paymentStatus = $booking['payment_status'] ?? 'pending';
    $paymentMethod = $booking['payment_method'] ?? 'N/A';
    $advancePaidAmount = isset($booking['advance_paid_amount']) ? (float)$booking['advance_paid_amount'] : 0;
    $totalAmountValue = isset($booking['totalAmount']) ? (float)$booking['totalAmount'] : 0;
    $remainingBalance = $totalAmountValue - $advancePaidAmount;
    
    // Payment status display
    $paymentStatusDisplay = ucfirst(str_replace('_', ' ', $paymentStatus));
    $paymentStatusColor = $paymentStatus === 'paid' ? '#4CAF50' : ($paymentStatus === 'payment_pending' ? '#FF9800' : '#F44336');
    
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
        .payment-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .payment-status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        .payment-details {
            margin-top: 15px;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        .payment-label {
            font-weight: bold;
        }
        .payment-amount {
            font-weight: bold;
        }
        .paid-amount {
            color: #28a745;
        }
        .balance-amount {
            color: #ffc107;
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
                <div class="detail-row">
                    <div class="detail-label">Pickup Date & Time:</div>
                    <div class="detail-value">$pickupDate</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Trip Type:</div>
                    <div class="detail-value">$formattedTripType</div>
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
            </div>
            
            <div class="booking-details">
                <h3>Contact Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">$passengerName</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone Number:</div>
                    <div class="detail-value">$passengerPhone</div>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Vehicle Type:</div>
                    <div class="detail-value">$cabType</div>
                </div>
            </div>
            
            <div class="payment-section">
                <h3>Payment Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Payment Status:</div>
                    <div class="detail-value">
                        <span class="payment-status" style="background-color: $paymentStatusColor;">$paymentStatusDisplay</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Payment Method:</div>
                    <div class="detail-value">$paymentMethod</div>
                </div>
                
                <div class="payment-details">
                    <div class="payment-row">
                        <span class="payment-label">Total Amount:</span>
                        <span class="payment-amount">₹$totalAmount</span>
                    </div>
HTML;

    // Show payment breakdown if partial payment
    if ($advancePaidAmount > 0 && $paymentStatus === 'payment_pending') {
        $advanceFormatted = number_format($advancePaidAmount, 2);
        $balanceFormatted = number_format($remainingBalance, 2);
        $percentagePaid = round(($advancePaidAmount / $totalAmountValue) * 100, 1);
        
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount paid-amount">₹$advanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Balance Due:</span>
                        <span class="payment-amount balance-amount">₹$balanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Payment Progress:</span>
                        <span class="payment-amount">$percentagePaid% Complete</span>
                    </div>
HTML;
    } elseif ($paymentStatus === 'paid') {
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount paid-amount">₹$totalAmount (Full Payment)</span>
                    </div>
HTML;
    } else {
        // Show pending payment status
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount">₹0.00 (Payment Pending)</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Balance Due:</span>
                        <span class="payment-amount balance-amount">₹$totalAmount</span>
                    </div>
HTML;
    }

    $html .= <<<HTML
                </div>
            </div>
            
            <div class="contact">
                <p>If you have any questions or need to modify your booking, please contact our customer support:</p>
                <p>Phone: +91 9966363662</p>
                <p>Email: info@vizagtaxihub.com</p>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing Vizag Taxi Hub!</p>
                <p>© 2025 Vizag Taxi Hub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}

function generateAdminNotificationEmail($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = $booking['pickupLocation'] ?? 'N/A';
    $dropLocation = $booking['dropLocation'] ?? 'N/A';
    $pickupDate = formatDateTimeForEmail($booking['pickupDate'] ?? null);
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
    
    // Payment details
    $paymentStatus = $booking['payment_status'] ?? 'pending';
    $paymentMethod = $booking['payment_method'] ?? 'N/A';
    $advancePaidAmount = isset($booking['advance_paid_amount']) ? (float)$booking['advance_paid_amount'] : 0;
    $totalAmountValue = isset($booking['totalAmount']) ? (float)$booking['totalAmount'] : 0;
    $remainingBalance = $totalAmountValue - $advancePaidAmount;
    
    // Payment status display
    $paymentStatusDisplay = ucfirst(str_replace('_', ' ', $paymentStatus));
    $paymentStatusColor = $paymentStatus === 'paid' ? '#4CAF50' : ($paymentStatus === 'payment_pending' ? '#FF9800' : '#F44336');
    
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
        .payment-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .payment-status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        .payment-details {
            margin-top: 15px;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        .payment-label {
            font-weight: bold;
        }
        .payment-amount {
            font-weight: bold;
        }
        .paid-amount {
            color: #28a745;
        }
        .balance-amount {
            color: #ffc107;
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
            </div>
            
            <div class="payment-section">
                <h3>Payment Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Payment Status:</div>
                    <div class="detail-value">
                        <span class="payment-status" style="background-color: $paymentStatusColor;">$paymentStatusDisplay</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Payment Method:</div>
                    <div class="detail-value">$paymentMethod</div>
                </div>
                
                <div class="payment-details">
                    <div class="payment-row">
                        <span class="payment-label">Total Amount:</span>
                        <span class="payment-amount">₹$totalAmount</span>
                    </div>
HTML;

    // Show payment breakdown if partial payment
    if ($advancePaidAmount > 0 && $paymentStatus === 'payment_pending') {
        $advanceFormatted = number_format($advancePaidAmount, 2);
        $balanceFormatted = number_format($remainingBalance, 2);
        $percentagePaid = round(($advancePaidAmount / $totalAmountValue) * 100, 1);
        
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount paid-amount">₹$advanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Balance Due:</span>
                        <span class="payment-amount balance-amount">₹$balanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Payment Progress:</span>
                        <span class="payment-amount">$percentagePaid% Complete</span>
                    </div>
HTML;
    } elseif ($paymentStatus === 'paid') {
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount paid-amount">₹$totalAmount (Full Payment)</span>
                    </div>
HTML;
    } else {
        // Show pending payment status
        $html .= <<<HTML
                    <div class="payment-row">
                        <span class="payment-label">Amount Paid:</span>
                        <span class="payment-amount">₹0.00 (Payment Pending)</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Balance Due:</span>
                        <span class="payment-amount balance-amount">₹$totalAmount</span>
                    </div>
HTML;
    }

    $html .= <<<HTML
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Customer Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">$passengerName</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone Number:</div>
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

function sendBookingConfirmationEmail($booking) {
    if (empty($booking['passengerEmail'])) {
        logError("Cannot send confirmation email - no passenger email provided", ['booking_id' => $booking['id'] ?? 'unknown']);
        return false;
    }
    
    $to = $booking['passengerEmail'];
    $subject = "Booking Confirmation - #" . $booking['bookingNumber'];
    $htmlBody = generateBookingConfirmationEmail($booking);
    
    // Add high importance headers
    $headers = [
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High',
        'X-Auto-Response-Suppress' => 'OOF, DR, RN, NRN, AutoReply'
    ];
    
    // Try sending with multiple methods
    $attempts = 0;
    $maxAttempts = 3;
    $success = false;
    
    while (!$success && $attempts < $maxAttempts) {
        $attempts++;
        
        // Try our enhanced email delivery system first
        $success = sendEmailAllMethods($to, $subject, $htmlBody);
        
        if (!$success) {
            // If enhanced system fails, try original method as fallback
            $success = sendEmail($to, $subject, $htmlBody, '', $headers);
        }
        
        if (!$success && $attempts < $maxAttempts) {
            sleep(2); // Wait 2 seconds before retrying
        }
    }
    
    // Also send admin notification
    $adminSuccess = sendAdminNotificationEmail($booking);
    
    logError("Booking confirmation email result", [
        'customer_email_success' => $success ? 'yes' : 'no',
        'admin_email_success' => $adminSuccess ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'attempts' => $attempts
    ]);
    
    return $success;
}

function sendAdminNotificationEmail($booking) {
    // Send to multiple admin emails for reliability
    $adminEmails = ['info@vizagtaxihub.com'];
    $subject = "New Booking - #" . $booking['bookingNumber'];
    $htmlBody = generateAdminNotificationEmail($booking);
    
    $headers = [
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High',
        'X-Auto-Response-Suppress' => 'OOF, DR, RN, NRN, AutoReply'
    ];
    
    $success = false;
    
    foreach ($adminEmails as $adminEmail) {
    $attempts = 0;
    $maxAttempts = 3;
    
    while (!$success && $attempts < $maxAttempts) {
        $attempts++;
        
            // Try enhanced system first
            $success = sendEmailAllMethods($adminEmail, $subject, $htmlBody);
        
        if (!$success) {
                // Try original method as fallback
                $success = sendEmail($adminEmail, $subject, $htmlBody, '', $headers);
        }
        
        if (!$success && $attempts < $maxAttempts) {
            sleep(2); // Wait 2 seconds before retrying
        }
    }
    
        if ($success) {
            break; // Stop if we successfully sent to any admin email
        }
    }
    
    logError("Admin notification email result", [
        'success' => $success ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'attempts' => $attempts
    ]);
    
    return $success;
}

/**
 * Generate HTML for customer email when booking is pending payment
 */
function generatePendingPaymentCustomerEmail($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = is_array($booking['pickupLocation'] ?? null) ? ($booking['pickupLocation']['name'] ?? 'N/A') : ($booking['pickupLocation'] ?? 'N/A');
    $dropLocation = is_array($booking['dropLocation'] ?? null) ? ($booking['dropLocation']['name'] ?? 'N/A') : ($booking['dropLocation'] ?? 'N/A');
    $pickupDate = formatDateTimeForEmail($booking['pickupDate'] ?? null);
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['trip_mode'] ?? $booking['tripMode'] ?? '';
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripMode = ucwords($formattedTripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    $bookingId = $booking['id'] ?? '';
    $expiresAt = $booking['paymentLinkExpiresAt'] ?? null;
    $baseUrl = 'https://vizagtaxihub.com/payment';
    if ($bookingId) {
        $params = ['bookingId' => $bookingId];
        if ($expiresAt) {
            $params['exp'] = $expiresAt;
        }
        $paymentUrl = $baseUrl . '?' . http_build_query($params);
    } else {
        $paymentUrl = $baseUrl;
    }

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Payment - Booking #$bookingNumber</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
        .detail-row { margin-bottom: 12px; }
        .detail-label { font-weight: bold; color: #555; }
        .cta-button { display: inline-block; background: #4CAF50; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { margin-top: 25px; text-align: center; color: #777; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Pending - Complete Your Payment</h1>
            <p style="font-size: 18px; font-weight: bold;">Booking #$bookingNumber</p>
            <p>Your booking details have been saved. Please complete your advance payment to confirm.</p>
        </div>
        <div class="content">
            <h3>Booking Summary</h3>
            <div class="detail-row"><span class="detail-label">Trip:</span> $formattedTripType</div>
            <div class="detail-row"><span class="detail-label">From:</span> $pickupLocation</div>
            <div class="detail-row"><span class="detail-label">To:</span> $dropLocation</div>
            <div class="detail-row"><span class="detail-label">Date & Time:</span> $pickupDate</div>
            <div class="detail-row"><span class="detail-label">Vehicle:</span> $cabType</div>
            <div class="detail-row"><span class="detail-label">Amount:</span> ₹$totalAmount</div>
            <p style="margin-top: 25px;">Click the button below to complete your payment securely:</p>
            <a href="$paymentUrl" class="cta-button">Complete Payment Now</a>
            <p style="font-size: 12px; color: #888; margin-top: 10px;">This link is valid for 30 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you have any questions, contact us at +91 9966363662 or info@vizagtaxihub.com</p>
        </div>
        <div class="footer">
            <p>Thank you for choosing Vizag Taxi Hub!</p>
            <p>© 2025 Vizag Taxi Hub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
    return $html;
}

/**
 * Generate HTML for admin notification when booking is pending payment
 */
function generatePendingPaymentAdminEmail($booking, $reason = 'awaiting_payment') {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = is_array($booking['pickupLocation'] ?? null) ? ($booking['pickupLocation']['name'] ?? 'N/A') : ($booking['pickupLocation'] ?? 'N/A');
    $dropLocation = is_array($booking['dropLocation'] ?? null) ? ($booking['dropLocation']['name'] ?? 'N/A') : ($booking['dropLocation'] ?? 'N/A');
    $pickupDate = formatDateTimeForEmail($booking['pickupDate'] ?? null);
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $passengerPhone = $booking['passengerPhone'] ?? 'N/A';
    $passengerEmail = $booking['passengerEmail'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['trip_mode'] ?? $booking['tripMode'] ?? '';
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    $statusBadge = $reason === 'cancelled' || $reason === 'abandoned' 
        ? '<span style="background:#F44336;color:white;padding:4px 10px;border-radius:4px;">Payment Cancelled/Abandoned</span>'
        : '<span style="background:#FF9800;color:white;padding:4px 10px;border-radius:4px;">Awaiting Payment</span>';

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Pending - #$bookingNumber</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; }
        .detail-row { margin-bottom: 10px; }
        .detail-label { font-weight: bold; width: 140px; display: inline-block; color: #555; }
        .admin-action { margin-top: 20px; padding: 15px; background: #fff3e0; border-left: 4px solid #FF9800; }
        .button { display: inline-block; background: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
        .footer { margin-top: 20px; text-align: center; color: #777; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Pending Payment</h1>
            <p style="font-size: 18px; font-weight: bold;">Booking #$bookingNumber</p>
            <p>$statusBadge</p>
        </div>
        <div class="content">
            <h3>Customer Details</h3>
            <div class="detail-row"><span class="detail-label">Name:</span> $passengerName</div>
            <div class="detail-row"><span class="detail-label">Phone:</span> $passengerPhone</div>
            <div class="detail-row"><span class="detail-label">Email:</span> $passengerEmail</div>
            <h3 style="margin-top: 20px;">Trip Details</h3>
            <div class="detail-row"><span class="detail-label">Route:</span> $pickupLocation → $dropLocation</div>
            <div class="detail-row"><span class="detail-label">Type:</span> $formattedTripType</div>
            <div class="detail-row"><span class="detail-label">Date/Time:</span> $pickupDate</div>
            <div class="detail-row"><span class="detail-label">Vehicle:</span> $cabType</div>
            <div class="detail-row"><span class="detail-label">Amount:</span> ₹$totalAmount</div>
            <div class="admin-action">
                <p><strong>Action Required:</strong> Customer has not completed payment. Follow up or assign driver once payment is received.</p>
                <a href="https://vizagtaxihub.com/admin" class="button">Go to Admin Dashboard</a>
            </div>
        </div>
        <div class="footer">
            <p>Vizag Taxi Hub - Automated Notification</p>
        </div>
    </div>
</body>
</html>
HTML;
    return $html;
}

/**
 * Send pending payment email to customer (booking created but payment not completed)
 */
function sendPendingPaymentEmailToCustomer($booking) {
    $email = $booking['passengerEmail'] ?? $booking['passenger_email'] ?? null;
    if (empty($email)) {
        if (function_exists('logError')) {
            logError("Cannot send pending email - no customer email", ['booking_number' => $booking['bookingNumber'] ?? 'unknown']);
        }
        return false;
    }
    $subject = "Complete Your Payment - Booking #" . ($booking['bookingNumber'] ?? 'N/A');
    $htmlBody = generatePendingPaymentCustomerEmail($booking);
    $headers = ['X-Priority' => '1', 'X-MSMail-Priority' => 'High', 'Importance' => 'High'];
    $success = sendEmailAllMethods($email, $subject, $htmlBody) ?: sendEmail($email, $subject, $htmlBody, '', $headers);
    if (function_exists('logError')) {
        logError("Pending payment email to customer", ['success' => $success ? 'yes' : 'no', 'booking_number' => $booking['bookingNumber'] ?? 'N/A']);
    }
    return $success;
}

/**
 * Send pending payment notification to admin
 * @param array $booking Booking data
 * @param string $reason 'awaiting_payment' | 'cancelled' | 'abandoned'
 */
function sendPendingPaymentNotificationToAdmin($booking, $reason = 'awaiting_payment') {
    $adminEmails = ['info@vizagtaxihub.com'];
    $subject = "Booking Pending Payment - #" . ($booking['bookingNumber'] ?? 'N/A');
    $htmlBody = generatePendingPaymentAdminEmail($booking, $reason);
    $headers = ['X-Priority' => '1', 'X-MSMail-Priority' => 'High', 'Importance' => 'High'];
    $success = false;
    foreach ($adminEmails as $adminEmail) {
        $success = sendEmailAllMethods($adminEmail, $subject, $htmlBody) ?: sendEmail($adminEmail, $subject, $htmlBody, '', $headers);
        if ($success) break;
    }
    if (function_exists('logError')) {
        logError("Pending payment notification to admin", ['success' => $success ? 'yes' : 'no', 'booking_number' => $booking['bookingNumber'] ?? 'N/A']);
    }
    return $success;
}

/**
 * Format date consistently with frontend (handles timezone properly)
 */
function formatDateTimeForEmail($dateString) {
    if (empty($dateString)) {
        return 'N/A';
    }
    
    // Handle SQL datetime format (YYYY-MM-DD HH:MM:SS)
    // The times are already stored in IST format, so no conversion needed
    $timestamp = strtotime($dateString);
    if ($timestamp === false) {
        return 'N/A';
    }
    
    // Format as "18 Aug 2025 at 08:29 AM" (IST time)
    return date('d M Y \a\t h:i A', $timestamp);
}

function formatPriceForEmail($amount) {
    if (!is_numeric($amount)) {
        return '₹0';
    }
    
    // Format with Indian number system (lakhs, crores)
    $formatted = number_format($amount, 2);
    
    // Add rupee symbol
    return '₹' . $formatted;
}

function generatePaymentReceipt($booking) {
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $pickupLocation = $booking['pickupLocation'] ?? 'N/A';
    $dropLocation = $booking['dropLocation'] ?? 'N/A';
    $pickupDate = formatDateTimeForEmail($booking['pickupDate'] ?? null);
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $passengerPhone = $booking['passengerPhone'] ?? 'N/A';
    $passengerEmail = $booking['passengerEmail'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['tripMode'] ?? '';
    
    // Format trip type
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripMode = ucwords($formattedTripMode);
        $formattedTripType .= " ($formattedTripMode)";
    }
    
    // Payment details
    $paymentStatus = $booking['payment_status'] ?? 'pending';
    $paymentMethod = $booking['payment_method'] ?? 'N/A';
    $advancePaidAmount = isset($booking['advance_paid_amount']) ? (float)$booking['advance_paid_amount'] : 0;
    $totalAmountValue = isset($booking['totalAmount']) ? (float)$booking['totalAmount'] : 0;
    $remainingBalance = $totalAmountValue - $advancePaidAmount;
    $razorpayPaymentId = $booking['razorpay_payment_id'] ?? 'N/A';
    $razorpayOrderId = $booking['razorpay_order_id'] ?? 'N/A';
    
    // Payment status display
    $paymentStatusDisplay = ucfirst(str_replace('_', ' ', $paymentStatus));
    $paymentStatusColor = $paymentStatus === 'paid' ? '#4CAF50' : ($paymentStatus === 'payment_pending' ? '#FF9800' : '#F44336');
    
    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - Booking #$bookingNumber</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .receipt-number {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-top: 15px;
            font-weight: bold;
            font-size: 18px;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section h3 {
            color: #2c3e50;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .detail-item {
            margin-bottom: 15px;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
        }
        .detail-value {
            color: #333;
            font-size: 16px;
        }
        .payment-section {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 5px solid #4CAF50;
        }
        .payment-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
        }
        .payment-breakdown {
            margin-top: 20px;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .payment-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #2c3e50;
        }
        .amount-paid {
            color: #28a745;
            font-weight: bold;
        }
        .balance-due {
            color: #ffc107;
            font-weight: bold;
        }
        .footer {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
        .contact-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .transaction-details {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
        }
        .transaction-details h4 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .transaction-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .transaction-row:last-child {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <h1>PAYMENT RECEIPT</h1>
            <p>Vizag Taxi Hub - Your Trusted Travel Partner</p>
            <div class="receipt-number">Receipt #: $bookingNumber</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>Customer Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">$passengerName</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">$passengerPhone</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">$passengerEmail</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Receipt Date</div>
                        <div class="detail-value">$pickupDate</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3>Trip Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">From</div>
                        <div class="detail-value">$pickupLocation</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">To</div>
                        <div class="detail-value">$dropLocation</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Vehicle Type</div>
                        <div class="detail-value">$cabType</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Trip Type</div>
                        <div class="detail-value">$formattedTripType</div>
                    </div>
                </div>
            </div>
            
            <div class="payment-section">
                <h3>Payment Information</h3>
                <div class="detail-item">
                    <div class="detail-label">Payment Status</div>
                    <div class="detail-value">
                        <span class="payment-status" style="background-color: $paymentStatusColor;">$paymentStatusDisplay</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Method</div>
                    <div class="detail-value">$paymentMethod</div>
                </div>
                
                <div class="payment-breakdown">
                    <div class="payment-row">
                        <span>Total Amount:</span>
                        <span>$totalAmount</span>
                    </div>
HTML;

    // Show payment breakdown if partial payment
    if ($advancePaidAmount > 0 && $paymentStatus === 'payment_pending') {
        $advanceFormatted = formatPriceForEmail($advancePaidAmount);
        $balanceFormatted = formatPriceForEmail($remainingBalance);
        $percentagePaid = round(($advancePaidAmount / $totalAmountValue) * 100, 1);
        
        $html .= <<<HTML
                    <div class="payment-row">
                        <span>Amount Paid:</span>
                        <span class="amount-paid">$advanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span>Balance Due:</span>
                        <span class="balance-due">$balanceFormatted</span>
                    </div>
                    <div class="payment-row">
                        <span>Payment Progress:</span>
                        <span>$percentagePaid% Complete</span>
                    </div>
HTML;
    } elseif ($paymentStatus === 'paid') {
        $html .= <<<HTML
                    <div class="payment-row">
                        <span>Amount Paid:</span>
                        <span class="amount-paid">$totalAmount (Full Payment)</span>
                    </div>
HTML;
    }

    $html .= <<<HTML
                </div>
                
                <div class="transaction-details">
                    <h4>Transaction Details</h4>
                    <div class="transaction-row">
                        <span>Payment ID:</span>
                        <span>$razorpayPaymentId</span>
                    </div>
                    <div class="transaction-row">
                        <span>Order ID:</span>
                        <span>$razorpayOrderId</span>
                    </div>
                    <div class="transaction-row">
                        <span>Transaction Date:</span>
                        <span>$pickupDate</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Thank you for choosing Vizag Taxi Hub!</strong></p>
            <div class="contact-info">
                <p>For any queries, please contact us:</p>
                <p>Phone: +91 9966363662 | Email: info@vizagtaxihub.com</p>
                <p>This is a computer generated receipt</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}

function sendPaymentConfirmationEmail($booking) {
    if (empty($booking['passengerEmail'])) {
        logError("Cannot send payment confirmation email - no passenger email provided", ['booking_id' => $booking['id'] ?? 'unknown']);
        return false;
    }
    
    $to = $booking['passengerEmail'];
    $paymentStatus = $booking['payment_status'] ?? 'pending';
    
    if ($paymentStatus === 'paid') {
        $subject = "Payment Confirmed - Booking #" . $booking['bookingNumber'];
    } else {
        $subject = "Partial Payment Received - Booking #" . $booking['bookingNumber'];
    }
    
    // Generate the email body
    $htmlBody = generateBookingConfirmationEmail($booking);
    
    // Try to generate PDF receipt (with timeout protection)
    $pdfFile = null;
    try {
        // Set timeout for PDF generation (5 seconds max)
        $startTime = microtime(true);
        $receiptHtml = generatePaymentReceipt($booking);
        $pdfFilename = 'receipt_' . $booking['bookingNumber'] . '_' . date('Y-m-d_H-i-s');
        $pdfFile = generatePDFFromHTML($receiptHtml, $pdfFilename);
        $pdfTime = microtime(true) - $startTime;
        
        logError("PDF generation completed", [
            'booking_number' => $booking['bookingNumber'],
            'pdf_file' => $pdfFile,
            'time_taken' => round($pdfTime, 2) . 's',
            'file_exists' => $pdfFile && file_exists($pdfFile) ? 'yes' : 'no'
        ]);
    } catch (Exception $pdfEx) {
        logError("PDF generation failed (non-blocking)", [
            'booking_number' => $booking['bookingNumber'],
            'error' => $pdfEx->getMessage()
        ]);
        // Continue without PDF - send email anyway
    }
    
    // Add high importance headers
    $headers = [
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High',
        'X-Auto-Response-Suppress' => 'OOF, DR, RN, NRN, AutoReply'
    ];
    
    // Try sending with multiple methods (simplified - skip PDF attachment for now)
    $attempts = 0;
    $maxAttempts = 2; // Reduced from 3 to speed up
    $success = false;
    
    while (!$success && $attempts < $maxAttempts) {
        $attempts++;
        
        // Skip PDF attachment for now - send simple email first
        // This matches the working driver hire email approach
        $success = sendEmailAllMethods($to, $subject, $htmlBody);
        
        if (!$success) {
            // If enhanced system fails, try original method as fallback
            $success = sendEmail($to, $subject, $htmlBody, '', $headers);
        }
        
        if (!$success && $attempts < $maxAttempts) {
            sleep(1); // Reduced wait time from 2 to 1 second
        }
    }
    
    // Try sending with PDF attachment as a separate attempt (optional)
    if ($success && $pdfFile && file_exists($pdfFile)) {
        try {
            $fileExtension = strtolower(pathinfo($pdfFile, PATHINFO_EXTENSION));
            $attachmentName = $fileExtension === 'html' ? 'Payment_Receipt.html' : 'Payment_Receipt.pdf';
            $attachmentSuccess = sendEmailWithAttachment($to, $subject . ' - Receipt Attached', $htmlBody, $pdfFile, $attachmentName);
            logError("PDF attachment email sent", [
                'booking_number' => $booking['bookingNumber'],
                'success' => $attachmentSuccess ? 'yes' : 'no'
            ]);
        } catch (Exception $attachEx) {
            logError("PDF attachment email failed (non-blocking)", [
                'booking_number' => $booking['bookingNumber'],
                'error' => $attachEx->getMessage()
            ]);
            // Don't fail the main email if attachment fails
        }
    }
        
    // Also send admin notification
    $adminSuccess = sendAdminNotificationEmail($booking);
    
    logError("Payment confirmation email result", [
        'customer_email_success' => $success ? 'yes' : 'no',
        'admin_email_success' => $adminSuccess ? 'yes' : 'no',
        'booking_number' => $booking['bookingNumber'],
        'payment_status' => $paymentStatus,
        'attempts' => $attempts
    ]);
    
    return $success;
}

/**
 * Send email with attachment
 */
function sendEmailWithAttachment($to, $subject, $htmlBody, $attachmentPath, $attachmentName) {
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Generate boundary for multipart message
    $boundary = md5(time());
    $boundary2 = md5(time() . '2');
    
    // Headers
    $headers = [
        'From' => "$fromName <$from>",
        'Reply-To' => $from,
        'Return-Path' => $from,
        'MIME-Version' => '1.0',
        'Content-Type' => "multipart/mixed; boundary=\"$boundary\"",
        'X-Mailer' => 'PHP/' . phpversion(),
        'X-Priority' => '1',
        'X-MSMail-Priority' => 'High',
        'Importance' => 'High'
    ];
    
    $headersStr = '';
    foreach ($headers as $name => $value) {
        $headersStr .= "$name: $value\r\n";
    }
    
    // Create message body
    $message = "--$boundary\r\n";
    $message .= "Content-Type: multipart/alternative; boundary=\"$boundary2\"\r\n\r\n";
    
    // Text version
    $textBody = strip_tags($htmlBody);
    $message .= "--$boundary2\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $textBody . "\r\n\r\n";
    
    // HTML version
    $message .= "--$boundary2\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $htmlBody . "\r\n\r\n";
    
    $message .= "--$boundary2--\r\n\r\n";
    
    // Attachment
    if (file_exists($attachmentPath)) {
        $attachmentContent = file_get_contents($attachmentPath);
        $attachmentEncoded = base64_encode($attachmentContent);
        
        // Determine content type based on file extension
        $fileExtension = strtolower(pathinfo($attachmentPath, PATHINFO_EXTENSION));
        $contentType = $fileExtension === 'html' ? 'text/html' : 'application/pdf';
        $attachmentFilename = $fileExtension === 'html' ? str_replace('.pdf', '.html', $attachmentName) : $attachmentName;
        
        $message .= "--$boundary\r\n";
        $message .= "Content-Type: $contentType; name=\"$attachmentFilename\"\r\n";
        $message .= "Content-Disposition: attachment; filename=\"$attachmentFilename\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split($attachmentEncoded) . "\r\n";
    }
    
    $message .= "--$boundary--";
    
    // Send email
    ini_set('sendmail_from', $from);
    $success = mail($to, $subject, $message, $headersStr, "-f$from");
    
    logError("Email with attachment sent", [
        'to' => $to,
        'subject' => $subject,
        'attachment' => $attachmentPath,
        'success' => $success ? 'yes' : 'no'
    ]);
    
    return $success;
}

/**
 * Generate PDF from HTML content using wkhtmltopdf or create HTML receipt
 */
function generatePDFFromHTML($html, $filename) {
    // Check if wkhtmltopdf is available
    $wkhtmltopdfPath = '/usr/local/bin/wkhtmltopdf'; // Common path on Linux
    if (PHP_OS === 'WINNT') {
        $wkhtmltopdfPath = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe'; // Windows path
    }
    
    // Create temp directory if it doesn't exist
    $tempDir = __DIR__ . '/temp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    
    // Try to generate PDF using wkhtmltopdf
    if (file_exists($wkhtmltopdfPath)) {
        $pdfFile = $tempDir . '/' . $filename . '.pdf';
        
        $command = sprintf(
            '"%s" --page-size A4 --margin-top 10mm --margin-bottom 10mm --margin-left 10mm --margin-right 10mm --encoding UTF-8 - %s',
            $wkhtmltopdfPath,
            escapeshellarg($pdfFile)
        );
        
        $descriptors = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w']  // stderr
        ];
        
        $process = proc_open($command, $descriptors, $pipes);
        
        if (is_resource($process)) {
            fwrite($pipes[0], $html);
            fclose($pipes[0]);
            
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            
            fclose($pipes[1]);
            fclose($pipes[2]);
            
            $returnCode = proc_close($process);
            
            if ($returnCode === 0 && file_exists($pdfFile)) {
                logError("PDF generated successfully", [
                    'file' => $pdfFile,
                    'size' => filesize($pdfFile)
                ]);
                return $pdfFile;
            } else {
                logError("PDF generation failed", [
                    'return_code' => $returnCode,
                    'stdout' => $stdout,
                    'stderr' => $stderr
                ]);
            }
        }
    }
    
    // Fallback: Create a professional HTML receipt file
    $htmlFile = $tempDir . '/' . $filename . '.html';
    
    // Add print-friendly CSS to the HTML
    $printCSS = '
    <style>
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
        }
        @media screen {
            body { font-family: Arial, sans-serif; margin: 20px; }
            .print-button { 
                background: #4CAF50; color: white; padding: 10px 20px; 
                border: none; border-radius: 5px; cursor: pointer; margin: 20px 0;
            }
        }
    </style>';
    
    // Add print button and instructions
    $printButton = '
    <div class="no-print" style="text-align: center; margin: 20px 0;">
        <button class="print-button" onclick="window.print()">Print Receipt</button>
        <p style="color: #666; font-size: 14px;">
            Click "Print Receipt" to save as PDF or print this receipt
        </p>
    </div>';
    
    $enhancedHtml = str_replace('</head>', $printCSS . '</head>', $html);
    $enhancedHtml = str_replace('<body>', '<body>' . $printButton, $enhancedHtml);
    
    file_put_contents($htmlFile, $enhancedHtml);
    
    logError("HTML receipt created as fallback", [
        'file' => $htmlFile,
        'size' => filesize($htmlFile)
    ]);
    
    return $htmlFile;
}
