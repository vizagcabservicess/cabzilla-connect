
<?php
require_once '../config.php';
require_once '../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Set headers for JSON response
header('Content-Type: application/json');

// Get input data
$data = json_decode(file_get_contents('php://input'), true);
$bookingId = isset($data['bookingId']) ? intval($data['bookingId']) : null;
$email = isset($data['email']) ? filter_var($data['email'], FILTER_VALIDATE_EMAIL) : null;

// Validate input
if (!$bookingId || !$email) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing or invalid booking ID or email address'
    ]);
    exit;
}

try {
    // Connect to database
    $db = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get booking details
    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        echo json_encode([
            'success' => false,
            'message' => 'Booking not found'
        ]);
        exit;
    }
    
    // Create email content
    $mail = new PHPMailer(true);
    
    // Server settings
    $mail->isSMTP();
    $mail->Host = 'mail.vizagtaxihub.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'info@vizagtaxihub.com';
    $mail->Password = 'F@s4L[c;gkq4[MyY';
    $mail->SMTPSecure = 'ssl';
    $mail->Port = 465;
    
    // Recipients
    $mail->setFrom('info@vizagtaxihub.com', 'Vizag Taxi Hub');
    $mail->addAddress($email);
    
    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Your Booking Receipt - Vizag Taxi Hub';
    
    // Generate receipt HTML
    $receiptUrl = "https://" . $_SERVER['HTTP_HOST'] . "/receipt/" . $booking['id'];
    $pickupDate = date('M d, Y h:i A', strtotime($booking['pickup_date']));
    
    $mailBody = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;'>
        <div style='text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;'>
            <h2 style='color: #3a86ff;'>Vizag Taxi Hub</h2>
            <p>Booking Receipt #{$booking['booking_number']}</p>
        </div>
        
        <div style='padding: 20px 0;'>
            <h3>Dear {$booking['passenger_name']},</h3>
            <p>Thank you for booking with Vizag Taxi Hub. Here is your receipt for booking #{$booking['booking_number']}.</p>
            
            <div style='background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;'>
                <p><strong>Pickup Location:</strong> {$booking['pickup_location']}</p>
                <p><strong>Drop Location:</strong> {$booking['drop_location']}</p>
                <p><strong>Pickup Date & Time:</strong> {$pickupDate}</p>
                <p><strong>Vehicle Type:</strong> {$booking['cab_type']}</p>
                <p><strong>Total Amount:</strong> ₹{$booking['total_amount']}</p>
                <p><strong>Status:</strong> {$booking['status']}</p>
            </div>
            
            <p>You can view your detailed receipt online at: <a href='{$receiptUrl}' style='color: #3a86ff;'>{$receiptUrl}</a></p>
        </div>
        
        <div style='padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #777;'>
            <p>If you have any questions, please contact us at info@vizagtaxihub.com or call +91 8887776666.</p>
            <p>&copy; 2025 Vizag Taxi Hub. All rights reserved.</p>
        </div>
    </div>
    ";
    
    $mail->Body = $mailBody;
    $mail->AltBody = strip_tags($mailBody);
    
    // Send email
    $mail->send();
    
    echo json_encode([
        'success' => true,
        'message' => 'Receipt sent successfully to ' . $email
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error sending email: ' . $mail->ErrorInfo
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
