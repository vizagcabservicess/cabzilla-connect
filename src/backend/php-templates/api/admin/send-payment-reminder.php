
<?php
/**
 * Send payment reminder endpoint
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/email.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('Method not allowed', 405);
    exit;
}

try {
    // Get JSON data from request
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    // Validate required fields
    if (!isset($data['payment_id']) || empty($data['payment_id'])) {
        sendErrorResponse('Payment ID is required', 400);
        exit;
    }
    
    if (!isset($data['reminder_type']) || empty($data['reminder_type'])) {
        sendErrorResponse('Reminder type is required', 400);
        exit;
    }
    
    // Get database connection
    $db = getDbConnectionWithRetry();
    
    // Get payment details
    $stmt = $db->prepare("
        SELECT 
            b.id AS booking_id,
            b.bookingNumber,
            b.passengerName,
            b.passengerEmail,
            b.passengerPhone,
            b.totalAmount,
            b.pickupDate AS due_date,
            COALESCE(p.paid_amount, 0) AS paid_amount,
            (b.totalAmount - COALESCE(p.paid_amount, 0)) AS remaining_amount
        FROM bookings b
        LEFT JOIN (
            SELECT 
                booking_id,
                SUM(amount) AS paid_amount
            FROM payments
            WHERE status = 'confirmed'
            GROUP BY booking_id
        ) p ON p.booking_id = b.id
        WHERE b.id = ?
    ");
    
    $stmt->bind_param("i", $data['payment_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendErrorResponse('Payment not found', 404);
        exit;
    }
    
    $payment = $result->fetch_assoc();
    
    // Validate that there's an email to send to
    if (!isset($payment['passengerEmail']) || empty($payment['passengerEmail'])) {
        sendErrorResponse('Customer email not available', 400);
        exit;
    }
    
    // Create reminder message
    $reminderType = $data['reminder_type'];
    $customMessage = isset($data['custom_message']) ? $data['custom_message'] : null;
    
    $subject = '';
    $message = '';
    
    switch ($reminderType) {
        case 'initial':
            $subject = 'Payment Reminder: Your Booking #' . $payment['bookingNumber'];
            $message = "Dear " . $payment['passengerName'] . ",\n\n";
            $message .= "This is a friendly reminder that payment for your booking #" . $payment['bookingNumber'] . " is due.\n\n";
            $message .= "Booking Amount: ₹" . number_format($payment['totalAmount'], 2) . "\n";
            $message .= "Amount Paid: ₹" . number_format($payment['paid_amount'], 2) . "\n";
            $message .= "Remaining Amount: ₹" . number_format($payment['remaining_amount'], 2) . "\n";
            $message .= "Due Date: " . date('d M, Y', strtotime($payment['due_date'])) . "\n\n";
            $message .= "Please make the payment at your earliest convenience.\n\n";
            $message .= "Thank you for choosing our services.\n\n";
            $message .= "Best Regards,\nVizag UP Taxi Service";
            break;
            
        case 'followup':
            $subject = 'Second Payment Reminder: Your Booking #' . $payment['bookingNumber'];
            $message = "Dear " . $payment['passengerName'] . ",\n\n";
            $message .= "We noticed that we haven't received payment for your booking #" . $payment['bookingNumber'] . ".\n\n";
            $message .= "Booking Amount: ₹" . number_format($payment['totalAmount'], 2) . "\n";
            $message .= "Amount Paid: ₹" . number_format($payment['paid_amount'], 2) . "\n";
            $message .= "Remaining Amount: ₹" . number_format($payment['remaining_amount'], 2) . "\n";
            $message .= "Due Date: " . date('d M, Y', strtotime($payment['due_date'])) . "\n\n";
            $message .= "Please make the payment as soon as possible to avoid any inconvenience.\n\n";
            $message .= "If you have already made the payment, please disregard this reminder.\n\n";
            $message .= "Thank you for choosing our services.\n\n";
            $message .= "Best Regards,\nVizag UP Taxi Service";
            break;
            
        case 'final':
            $subject = 'Final Payment Reminder: Your Booking #' . $payment['bookingNumber'];
            $message = "Dear " . $payment['passengerName'] . ",\n\n";
            $message .= "This is a final reminder regarding the pending payment for your booking #" . $payment['bookingNumber'] . ".\n\n";
            $message .= "Booking Amount: ₹" . number_format($payment['totalAmount'], 2) . "\n";
            $message .= "Amount Paid: ₹" . number_format($payment['paid_amount'], 2) . "\n";
            $message .= "Remaining Amount: ₹" . number_format($payment['remaining_amount'], 2) . "\n";
            $message .= "Due Date: " . date('d M, Y', strtotime($payment['due_date'])) . "\n\n";
            $message .= "Please make the payment immediately to avoid any service disruption or cancellation.\n\n";
            $message .= "If you have already made the payment, please disregard this reminder.\n\n";
            $message .= "Thank you for choosing our services.\n\n";
            $message .= "Best Regards,\nVizag UP Taxi Service";
            break;
            
        default:
            $subject = 'Payment Reminder: Your Booking #' . $payment['bookingNumber'];
            $message = "Dear " . $payment['passengerName'] . ",\n\n";
            $message .= "This is a reminder regarding the pending payment for your booking #" . $payment['bookingNumber'] . ".\n\n";
            $message .= "Booking Amount: ₹" . number_format($payment['totalAmount'], 2) . "\n";
            $message .= "Amount Paid: ₹" . number_format($payment['paid_amount'], 2) . "\n";
            $message .= "Remaining Amount: ₹" . number_format($payment['remaining_amount'], 2) . "\n";
            $message .= "Due Date: " . date('d M, Y', strtotime($payment['due_date'])) . "\n\n";
            $message .= "Please make the payment at your earliest convenience.\n\n";
            $message .= "Thank you for choosing our services.\n\n";
            $message .= "Best Regards,\nVizag UP Taxi Service";
    }
    
    // Override with custom message if provided
    if ($customMessage) {
        $message = "Dear " . $payment['passengerName'] . ",\n\n" . $customMessage;
    }
    
    // Send the email
    $emailResult = sendEmail(
        $payment['passengerEmail'],
        $subject,
        $message,
        $payment['passengerName']
    );
    
    // Log the reminder
    $stmt = $db->prepare("
        INSERT INTO payment_reminders (
            booking_id,
            booking_number,
            customer_name,
            customer_email,
            customer_phone,
            amount,
            reminder_type,
            reminder_date,
            sent_date,
            status,
            message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
    ");
    
    $bookingId = $payment['booking_id'];
    $bookingNumber = $payment['bookingNumber'];
    $customerName = $payment['passengerName'];
    $customerEmail = $payment['passengerEmail'];
    $customerPhone = $payment['passengerPhone'];
    $amount = $payment['remaining_amount'];
    $status = $emailResult ? 'sent' : 'failed';
    
    $stmt->bind_param(
        "issssdss",
        $bookingId,
        $bookingNumber,
        $customerName,
        $customerEmail,
        $customerPhone,
        $amount,
        $reminderType,
        $status,
        $message
    );
    
    $stmt->execute();
    $reminderId = $stmt->insert_id;
    
    // Prepare response
    $reminderData = [
        'id' => $reminderId,
        'paymentId' => $data['payment_id'],
        'bookingId' => $bookingId,
        'bookingNumber' => $bookingNumber,
        'customerName' => $customerName,
        'customerEmail' => $customerEmail,
        'customerPhone' => $customerPhone,
        'amount' => $amount,
        'reminderType' => $reminderType,
        'reminderDate' => date('Y-m-d H:i:s'),
        'sentDate' => date('Y-m-d H:i:s'),
        'status' => $status,
        'message' => $message,
        'createdAt' => date('Y-m-d H:i:s'),
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    
    // Send success response
    sendSuccessResponse($reminderData, 'Payment reminder sent successfully');
    
} catch (Exception $e) {
    // Log error
    error_log('Error sending payment reminder: ' . $e->getMessage());
    
    // Send error response
    sendErrorResponse('Failed to send payment reminder: ' . $e->getMessage(), 500);
}
