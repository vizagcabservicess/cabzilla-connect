
<?php
/**
 * API endpoint to send booking confirmation emails
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include required files
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// Check if booking ID is provided
if (!isset($_GET['booking_id']) && !isset($_POST['booking_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Booking ID is required']);
    exit;
}

$bookingId = isset($_GET['booking_id']) ? $_GET['booking_id'] : $_POST['booking_id'];

try {
    // Get database connection
    $conn = getDbConnectionWithRetry(3);
    
    // Get booking details
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Booking not found']);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Include the PHPMailer library
    require_once __DIR__ . '/../../vendor/autoload.php';
    
    // Create a new PHPMailer instance
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USERNAME;
        $mail->Password = SMTP_PASSWORD;
        $mail->SMTPSecure = SMTP_SECURE;
        $mail->Port = SMTP_PORT;
        
        // Recipients
        $mail->setFrom(SMTP_FROM_EMAIL, 'Vizag Taxi Hub');
        $mail->addAddress($booking['passenger_email'], $booking['passenger_name']);
        $mail->addReplyTo(SMTP_FROM_EMAIL, 'Vizag Taxi Hub');
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Booking Confirmation - ' . $booking['booking_number'];
        
        // Email template
        $emailBody = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <div style="text-align: center; background-color: #f9f9f9; padding: 10px 0; margin-bottom: 20px;">
                <h2 style="color: #333;">Booking Confirmation</h2>
            </div>
            
            <p>Dear ' . htmlspecialchars($booking['passenger_name']) . ',</p>
            
            <p>Thank you for choosing Vizag Taxi Hub. Your booking has been confirmed!</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                <p><strong>Booking Number:</strong> ' . htmlspecialchars($booking['booking_number']) . '</p>
                <p><strong>Trip Type:</strong> ' . ucfirst(htmlspecialchars($booking['trip_type'])) . '</p>
                <p><strong>Cab Type:</strong> ' . htmlspecialchars($booking['cab_type']) . '</p>
                <p><strong>Pickup Location:</strong> ' . htmlspecialchars($booking['pickup_location']) . '</p>';
                
        if (!empty($booking['drop_location'])) {
            $emailBody .= '<p><strong>Drop Location:</strong> ' . htmlspecialchars($booking['drop_location']) . '</p>';
        }
        
        $emailBody .= '
                <p><strong>Pickup Date & Time:</strong> ' . date('F j, Y, g:i a', strtotime($booking['pickup_date'])) . '</p>';
                
        if (!empty($booking['return_date'])) {
            $emailBody .= '<p><strong>Return Date & Time:</strong> ' . date('F j, Y, g:i a', strtotime($booking['return_date'])) . '</p>';
        }
        
        // Include discount information if applicable
        if (!empty($booking['discount']) && $booking['discount'] > 0) {
            $emailBody .= '
                <p><strong>Original Amount:</strong> ₹' . number_format((float)$booking['original_amount'], 2) . '</p>';
            
            if ($booking['discount_type'] === 'percentage') {
                $discountAmount = ($booking['original_amount'] * $booking['discount']) / 100;
                $emailBody .= '<p><strong>Discount:</strong> ' . $booking['discount'] . '% (₹' . number_format($discountAmount, 2) . ')</p>';
            } else {
                $emailBody .= '<p><strong>Discount:</strong> ₹' . number_format((float)$booking['discount'], 2) . '</p>';
            }
        }
        
        $emailBody .= '
                <p><strong>Total Amount:</strong> ₹' . number_format((float)$booking['total_amount'], 2) . '</p>
            </div>
            
            <p>If you have any questions or need to make changes to your booking, please contact us at support@vizagtaxihub.com or call us at +91-9999999999.</p>
            
            <p>Thank you for choosing Vizag Taxi Hub!</p>
            
            <p>Best Regards,<br>Team Vizag Taxi Hub</p>
        </div>';
        
        $mail->Body = $emailBody;
        $mail->AltBody = strip_tags(str_replace('<br>', "\n", $emailBody));
        
        $mail->send();
        
        // Update the booking status to indicate that confirmation email was sent
        $sql = "UPDATE bookings SET email_sent = 1, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        
        echo json_encode([
            'status' => 'success', 
            'message' => 'Confirmation email sent successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Failed to send email: ' . $mail->ErrorInfo
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
