
<?php
require_once '../config.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

// Validate request
if (!isset($data['bookingId']) || !$data['bookingId']) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();

// Get booking details
$sql = "SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone 
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id 
        WHERE b.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $data['bookingId']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    exit;
}

$booking = $result->fetch_assoc();

// Set email recipient
$to = $data['email'] ?? $booking['passenger_email'];
if (!$to) {
    sendJsonResponse(['status' => 'error', 'message' => 'Email address is required'], 400);
    exit;
}

// Format date
$pickupDate = date('d M Y, h:i A', strtotime($booking['pickup_date']));
$returnDate = $booking['return_date'] ? date('d M Y, h:i A', strtotime($booking['return_date'])) : 'N/A';

// Create receipt HTML
$receiptUrl = "https://vizagtaxihub.com/receipt/" . $booking['id'];

$subject = "Your Booking Receipt - " . $booking['booking_number'];

$message = "
<html>
<head>
    <title>Booking Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 15px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .booking-info { margin-bottom: 20px; }
        .booking-info p { margin: 5px 0; }
        .total { font-weight: bold; font-size: 18px; margin-top: 15px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>Booking Confirmation</h2>
        </div>
        <div class='content'>
            <p>Dear " . ($booking['passenger_name'] ?? 'Customer') . ",</p>
            <p>Thank you for booking with Vizag Taxi Hub. Your booking has been confirmed.</p>
            
            <div class='booking-info'>
                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> " . $booking['booking_number'] . "</p>
                <p><strong>Trip Type:</strong> " . ucfirst($booking['trip_type']) . " (" . ucfirst($booking['trip_mode']) . ")</p>
                <p><strong>Vehicle Type:</strong> " . $booking['cab_type'] . "</p>
                <p><strong>From:</strong> " . $booking['pickup_location'] . "</p>
                <p><strong>To:</strong> " . $booking['drop_location'] . "</p>
                <p><strong>Pickup Date:</strong> " . $pickupDate . "</p>";

if ($booking['trip_mode'] === 'round-trip') {
    $message .= "<p><strong>Return Date:</strong> " . $returnDate . "</p>";
}

if ($booking['trip_type'] === 'local') {
    $message .= "<p><strong>Package:</strong> " . $booking['hourly_package'] . "</p>";
}

$message .= "
                <p><strong>Distance:</strong> " . $booking['distance'] . " km</p>
                <p class='total'><strong>Total Amount:</strong> ₹" . number_format($booking['total_amount'], 2) . "</p>
            </div>
            
            <p>You can view your booking receipt online at:</p>
            <p style='text-align: center;'>
                <a href='" . $receiptUrl . "' class='button'>View Receipt</a>
            </p>
            
            <p>If you have any questions or need assistance, please contact our customer support.</p>
            
            <p>Thank you,<br>Team Vizag Taxi Hub</p>
        </div>
        <div class='footer'>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; " . date('Y') . " Vizag Taxi Hub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
";

// Send email using PHPMailer
try {
    // Setup SMTP configuration
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'info@vizagtaxihub.com';  // SMTP username
    $mail->Password = 'F@s4L[c;gkq4[MyY';       // SMTP password
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    // Recipients
    $mail->setFrom('info@vizagtaxihub.com', 'Vizag Taxi Hub');
    $mail->addAddress($to);
    
    // Content
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $message;
    $mail->AltBody = strip_tags(str_replace('<br>', "\n", $message));

    $mail->send();
    
    // Log successful email
    logError("Email sent successfully", ['to' => $to, 'booking_id' => $data['bookingId']]);
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Receipt sent successfully'
    ]);
} catch (Exception $e) {
    logError("Email sending failed", [
        'error' => $e->getMessage(),
        'to' => $to,
        'booking_id' => $data['bookingId']
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to send receipt: ' . $e->getMessage()
    ], 500);
}
