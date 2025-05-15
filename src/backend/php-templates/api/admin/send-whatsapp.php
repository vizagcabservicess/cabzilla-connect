
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Helper function to log messages
function logMessage($message, $data = []) {
    $logFile = __DIR__ . '/../../logs/whatsapp_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logData = "[$timestamp] $message: " . json_encode($data) . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}

// Get JSON data from request
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['phone']) || !isset($data['messageType'])) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
}

// Format the phone number for WhatsApp API
function formatPhone($phone) {
    // Remove any non-numeric characters
    $cleaned = preg_replace('/\D/', '', $phone);
    
    // Handle Indian phone numbers specifically
    if (strlen($cleaned) === 10) {
        // Add India country code if it's a 10-digit number
        $cleaned = '91' . $cleaned;
    } else if (substr($cleaned, 0, 1) === '0') {
        // Remove leading zero and add India code
        $cleaned = '91' . substr($cleaned, 1);
    }
    
    return $cleaned;
}

// Extract data from request
$phone = formatPhone($data['phone']);
$messageType = $data['messageType'];
$messageData = $data['data'] ?? [];

// Template for booking confirmation
function generateBookingConfirmation($booking) {
    $pickupDate = date('Y-m-d H:i', strtotime($booking['pickupDate']));
    
    $message = "🚕 *Booking Confirmed* 🚕\n\n";
    $message .= "Your booking with VizagUp has been confirmed.\n\n";
    $message .= "*Booking Details:*\n";
    $message .= "Booking #: " . $booking['bookingNumber'] . "\n";
    $message .= "Passenger: " . $booking['passengerName'] . "\n";
    $message .= "Pickup: " . $booking['pickupLocation'] . "\n";
    
    if (!empty($booking['dropLocation'])) {
        $message .= "Drop: " . $booking['dropLocation'] . "\n";
    }
    
    $message .= "Date/Time: " . $pickupDate . "\n";
    $message .= "Vehicle: " . $booking['cabType'] . "\n";
    $message .= "Trip Type: " . $booking['tripType'] . "\n\n";
    $message .= "*Amount:* ₹" . number_format($booking['totalAmount'], 2) . "\n\n";
    $message .= "Track your booking status online.\n\n";
    $message .= "Thank you for choosing our service!";
    
    return $message;
}

// Template for driver assignment
function generateDriverAssignment($booking) {
    $pickupDate = date('Y-m-d H:i', strtotime($booking['pickupDate']));
    
    $message = "🚕 *Driver Assigned* 🚕\n\n";
    $message .= "Good news! A driver has been assigned to your booking.\n\n";
    $message .= "*Booking Details:*\n";
    $message .= "Booking #: " . $booking['bookingNumber'] . "\n";
    $message .= "Date/Time: " . $pickupDate . "\n\n";
    $message .= "*Driver Details:*\n";
    $message .= "Name: " . $booking['driverName'] . "\n";
    $message .= "Phone: " . $booking['driverPhone'] . "\n";
    $message .= "Vehicle #: " . $booking['vehicleNumber'] . "\n\n";
    $message .= "You can contact your driver directly for any immediate assistance.\n\n";
    $message .= "Thank you for choosing our service!";
    
    return $message;
}

// Template for invoice
function generateInvoice($booking, $invoiceUrl = '') {
    $isPaid = isset($booking['payment_status']) && $booking['payment_status'] === 'payment_received';
    $pickupDate = date('Y-m-d', strtotime($booking['pickupDate']));
    
    $message = "💰 *Invoice for Booking #" . $booking['bookingNumber'] . "* 💰\n\n";
    $message .= "*Trip Details:*\n";
    $message .= "Date: " . $pickupDate . "\n";
    $message .= "From: " . $booking['pickupLocation'] . "\n";
    
    if (!empty($booking['dropLocation'])) {
        $message .= "To: " . $booking['dropLocation'] . "\n";
    }
    
    $message .= "Vehicle: " . $booking['cabType'] . "\n\n";
    $message .= "*Amount:* ₹" . number_format($booking['totalAmount'], 2) . "\n";
    $message .= "*Status:* " . ($isPaid ? '✅ Paid' : '⏳ Payment Pending') . "\n";
    
    if (!empty($booking['payment_method'])) {
        $message .= "Payment Method: " . $booking['payment_method'] . "\n";
    }
    
    if (!empty($invoiceUrl)) {
        $message .= "\nView your invoice: " . $invoiceUrl . "\n";
    }
    
    $message .= "\nThank you for choosing our service!";
    
    return $message;
}

// Template for quotation
function generateQuotation($tripDetails, $fare) {
    $date = date('Y-m-d', strtotime($tripDetails['date']));
    
    $message = "💵 *Fare Quotation* 💵\n\n";
    $message .= "We're pleased to provide you with the following fare quote:\n\n";
    $message .= "*Trip Details:*\n";
    $message .= "Date: " . $date . "\n";
    $message .= "From: " . $tripDetails['pickup'] . "\n";
    
    if (!empty($tripDetails['dropoff'])) {
        $message .= "To: " . $tripDetails['dropoff'] . "\n";
    }
    
    $message .= "Vehicle Type: " . $tripDetails['cabType'] . "\n";
    $message .= "Trip Type: " . $tripDetails['tripType'] . "\n\n";
    $message .= "*Estimated Fare:* ₹" . number_format($fare, 2) . "\n\n";
    $message .= "This quote is valid for 24 hours. To book this trip, please visit our website or reply to this message.\n\n";
    $message .= "Thank you for your interest in our service!";
    
    return $message;
}

// Draft a message based on the message type
$message = '';

try {
    switch ($messageType) {
        case 'booking_confirmation':
            $message = generateBookingConfirmation($messageData);
            break;
            
        case 'driver_assignment':
            $message = generateDriverAssignment($messageData);
            break;
            
        case 'invoice':
            $invoiceUrl = $messageData['invoiceUrl'] ?? '';
            $message = generateInvoice($messageData, $invoiceUrl);
            break;
            
        case 'quotation':
            $fare = $messageData['fare'] ?? 0;
            $message = generateQuotation($messageData, $fare);
            break;
            
        default:
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid message type'], 400);
            break;
    }
    
    // Log the message being sent
    logMessage("WhatsApp message prepared", [
        'phone' => $phone,
        'type' => $messageType,
        'message' => $message
    ]);
    
    /*
     * This is where you would integrate with WhatsApp Business API
     * For example, using Twilio, MessageBird, etc.
     * 
     * For now, we'll simulate success since actual integration
     * requires WhatsApp Business account approval
     */
    
    // Example of what the Twilio API call would look like:
    /*
    $twilioAccountSid = 'YOUR_TWILIO_ACCOUNT_SID';
    $twilioAuthToken = 'YOUR_TWILIO_AUTH_TOKEN';
    $twilioWhatsAppNumber = 'whatsapp:+14155238886'; // Your Twilio WhatsApp number
    
    $client = new Client($twilioAccountSid, $twilioAuthToken);
    $result = $client->messages->create(
        'whatsapp:+' . $phone,
        [
            'from' => $twilioWhatsAppNumber,
            'body' => $message
        ]
    );
    */
    
    // For now, simulate success
    sendJsonResponse([
        'status' => 'success',
        'message' => 'WhatsApp message prepared successfully',
        'data' => [
            'phone' => $phone,
            'messageType' => $messageType,
            'messagePreview' => substr($message, 0, 100) . '...'
        ]
    ]);
    
} catch (Exception $e) {
    logMessage("WhatsApp message error", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Error sending WhatsApp message: ' . $e->getMessage()], 500);
}
