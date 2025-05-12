
<?php
/**
 * Payment reminder API endpoint
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/database.php';

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
    
    // Get booking details
    $stmt = $db->prepare("
        SELECT 
            id, 
            bookingNumber,
            passengerName,
            passengerEmail,
            passengerPhone,
            totalAmount
        FROM bookings
        WHERE id = ?
    ");
    
    $stmt->bind_param("i", $data['payment_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendErrorResponse('Booking not found', 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Create reminder message
    $reminderMessage = '';
    switch ($data['reminder_type']) {
        case 'initial':
            $reminderMessage = "Dear {$booking['passengerName']}, this is a friendly reminder that your payment of Rs. {$booking['totalAmount']} for booking #{$booking['bookingNumber']} is due.";
            break;
        case 'followup':
            $reminderMessage = "Dear {$booking['passengerName']}, we would like to remind you that your payment of Rs. {$booking['totalAmount']} for booking #{$booking['bookingNumber']} is still pending.";
            break;
        case 'final':
            $reminderMessage = "Dear {$booking['passengerName']}, this is our final reminder regarding your pending payment of Rs. {$booking['totalAmount']} for booking #{$booking['bookingNumber']}.";
            break;
    }
    
    // Use custom message if provided
    if (isset($data['custom_message']) && !empty($data['custom_message'])) {
        $reminderMessage = $data['custom_message'];
    }
    
    // Save reminder to database
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
            message,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 'sent', ?, NOW(), NOW())
    ");
    
    $bookingId = $booking['id'];
    $bookingNumber = $booking['bookingNumber'];
    $customerName = $booking['passengerName'];
    $customerEmail = $booking['passengerEmail'];
    $customerPhone = $booking['passengerPhone'];
    $amount = $booking['totalAmount'];
    $reminderType = $data['reminder_type'];
    
    $stmt->bind_param("issssiss", $bookingId, $bookingNumber, $customerName, $customerEmail, $customerPhone, $amount, $reminderType, $reminderMessage);
    $stmt->execute();
    
    // In a real-world scenario, you would send an actual email or SMS here
    // For now, we'll just simulate sending a reminder
    
    // Success response
    sendSuccessResponse([
        'message' => 'Payment reminder sent successfully',
        'recipient' => [
            'name' => $booking['passengerName'],
            'email' => $booking['passengerEmail'],
            'phone' => $booking['passengerPhone']
        ],
        'reminderType' => $data['reminder_type']
    ], 'Payment reminder sent successfully');
    
} catch (Exception $e) {
    // Log error
    error_log('Error sending payment reminder: ' . $e->getMessage());
    
    // Send error response
    sendErrorResponse('Failed to send payment reminder: ' . $e->getMessage(), 500);
}
