
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

/**
 * Send an email using PHP's mail function
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @param string $textBody Plain text content of the email
 * @param array $headers Additional headers
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendEmail($to, $subject, $htmlBody, $textBody = '', $headers = []) {
    $from = 'info@vizagtaxihub.com';
    $fromName = 'Vizag Taxi Hub';
    
    // Log email sending attempt
    logError("Attempting to send email", [
        'to' => $to,
        'subject' => $subject,
        'from' => $from
    ]);
    
    // Generate a boundary for the multipart message
    $boundary = md5(time());
    
    // Set up email headers
    $defaultHeaders = [
        'From' => "$fromName <$from>",
        'Reply-To' => $from,
        'MIME-Version' => '1.0',
        'Content-Type' => "multipart/alternative; boundary=\"$boundary\"",
        'X-Mailer' => 'PHP/' . phpversion()
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
    
    // Attempt to send the email
    $success = mail($to, $subject, $message, $headersStr);
    
    // Log the result
    if ($success) {
        logError("Email sent successfully", ['to' => $to, 'subject' => $subject]);
    } else {
        logError("Failed to send email", ['to' => $to, 'subject' => $subject, 'error' => error_get_last()]);
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
 * Send booking confirmation email to the customer
 * 
 * @param array $booking Booking details
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendBookingConfirmationEmail($booking) {
    if (empty($booking['passengerEmail'])) {
        logError("Cannot send confirmation email - no passenger email provided", ['booking' => $booking]);
        return false;
    }
    
    $to = $booking['passengerEmail'];
    $subject = "Booking Confirmation - #" . $booking['bookingNumber'];
    $htmlBody = generateBookingConfirmationEmail($booking);
    
    return sendEmail($to, $subject, $htmlBody);
}

/**
 * Send booking notification email to admin
 * 
 * @param array $booking Booking details
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendAdminNotificationEmail($booking) {
    $to = 'info@vizagtaxihub.com'; // Admin email
    $subject = "New Booking - #" . $booking['bookingNumber'];
    $htmlBody = generateAdminNotificationEmail($booking);
    
    return sendEmail($to, $subject, $htmlBody);
}
