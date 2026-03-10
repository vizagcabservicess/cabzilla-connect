
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

// Template for abandoned payment - to notify admin
function generateAbandonedPaymentAdmin($booking) {
    $pickupLocation = is_array($booking['pickupLocation'] ?? null) ? ($booking['pickupLocation']['name'] ?? 'N/A') : ($booking['pickupLocation'] ?? 'N/A');
    $dropLocation = is_array($booking['dropLocation'] ?? null) ? ($booking['dropLocation']['name'] ?? 'N/A') : ($booking['dropLocation'] ?? 'N/A');
    $pickupDate = !empty($booking['pickupDate']) ? date('d M Y, h:i A', strtotime($booking['pickupDate'])) : 'N/A';
    $cabType = $booking['cabType'] ?? 'N/A';
    $totalAmount = isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A';
    $passengerName = $booking['passengerName'] ?? 'N/A';
    $passengerPhone = $booking['passengerPhone'] ?? 'N/A';
    $passengerEmail = $booking['passengerEmail'] ?? 'N/A';
    $bookingNumber = $booking['bookingNumber'] ?? 'N/A';
    $tripType = $booking['tripType'] ?? 'Standard';
    $tripMode = $booking['trip_mode'] ?? $booking['tripMode'] ?? '';
    $formattedTripType = ucfirst($tripType);
    if (!empty($tripMode)) {
        $formattedTripMode = str_replace('-', ' ', $tripMode);
        $formattedTripType .= ' (' . ucwords($formattedTripMode) . ')';
    }
    $msg = "⚠️ *Customer Left Without Payment*\n\n";
    $msg .= "Booking #$bookingNumber - Customer entered details, clicked Proceed to Payment, but did not complete.\n\n";
    $msg .= "*Customer:*\n$passengerName\n📱 $passengerPhone\n📧 $passengerEmail\n\n";
    $msg .= "*Trip:*\n📍 From: $pickupLocation\n📍 To: $dropLocation\n";
    $msg .= "📅 $pickupDate\n🚗 $cabType ($formattedTripType)\n";
    $msg .= "💰 Amount: ₹$totalAmount\n\n";
    $msg .= "Follow up: https://vizagtaxihub.com/admin";
    return $msg;
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

        case 'abandoned_payment_admin':
            $message = generateAbandonedPaymentAdmin($messageData);
            break;
            
        default:
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid message type'], 400);
            break;
    }
    
    logMessage("WhatsApp message prepared", [
        'phone' => $phone,
        'type' => $messageType,
        'message' => $message
    ]);
    
    // Send via Meta WhatsApp Cloud API
    $phoneNumberId = defined('WHATSAPP_PHONE_NUMBER_ID') ? WHATSAPP_PHONE_NUMBER_ID : null;
    $accessToken = defined('WHATSAPP_ACCESS_TOKEN') ? WHATSAPP_ACCESS_TOKEN : null;
    
    if (empty($phoneNumberId) || empty($accessToken)) {
        logMessage("WhatsApp Cloud API credentials not configured", [
            'has_phone_id' => !empty($phoneNumberId),
            'has_token' => !empty($accessToken)
        ]);
        sendJsonResponse([
            'status' => 'error',
            'message' => 'WhatsApp Cloud API credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env'
        ], 500);
    }
    
    $apiUrl = "https://graph.facebook.com/v22.0/{$phoneNumberId}/messages";
    
    // For abandoned_payment_admin: use template (required for business-initiated messages)
    // Set WHATSAPP_TEMPLATE_NAME in .env - use "hello_world" for quick test, or create "abandoned_payment_alert"
    $templateName = defined('WHATSAPP_TEMPLATE_NAME') && WHATSAPP_TEMPLATE_NAME ? WHATSAPP_TEMPLATE_NAME : null;
    
    if ($messageType === 'abandoned_payment_admin' && $templateName) {
        if ($templateName === 'hello_world') {
            $payload = json_encode([
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => ['name' => 'hello_world', 'language' => ['code' => 'en_US']]
            ]);
        } else {
            $booking = $messageData ?? [];
            $pickupLocation = is_array($booking['pickupLocation'] ?? null) ? ($booking['pickupLocation']['name'] ?? 'N/A') : ($booking['pickupLocation'] ?? 'N/A');
            $dropLocation = is_array($booking['dropLocation'] ?? null) ? ($booking['dropLocation']['name'] ?? 'N/A') : ($booking['dropLocation'] ?? 'N/A');
            $pickupDate = !empty($booking['pickupDate']) ? date('d M Y, h:i A', strtotime($booking['pickupDate'])) : 'N/A';
            $formattedTripType = ucfirst($booking['tripType'] ?? 'Standard');
            if (!empty($booking['trip_mode'] ?? $booking['tripMode'] ?? '')) {
                $formattedTripType .= ' (' . ucwords(str_replace('-', ' ', $booking['trip_mode'] ?? $booking['tripMode'] ?? '')) . ')';
            }
            // Template: Header 1 var + Body 4 vars
            // Header: {{1}} = Booking number
            // Body: {{1}} Passenger, {{2}} Contact, {{3}} Trip, {{4}} Amount (body vars are 1-indexed separately)
            $contact = trim(($booking['passengerPhone'] ?? '') . ' | ' . ($booking['passengerEmail'] ?? ''));
            if ($contact === '|' || trim(str_replace('|', '', $contact)) === '') $contact = 'N/A';
            $tripDetails = $pickupLocation . ' → ' . $dropLocation . ' | ' . $pickupDate . ' | ' . ($booking['cabType'] ?? 'N/A') . ' (' . $formattedTripType . ')';
            $payload = json_encode([
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => (defined('WHATSAPP_TEMPLATE_LANGUAGE') ? WHATSAPP_TEMPLATE_LANGUAGE : 'en')],
                    'components' => [
                        ['type' => 'header', 'parameters' => [
                            ['type' => 'text', 'text' => $booking['bookingNumber'] ?? 'N/A']
                        ]],
                        ['type' => 'body', 'parameters' => [
                            ['type' => 'text', 'text' => $booking['passengerName'] ?? 'N/A'],
                            ['type' => 'text', 'text' => $contact],
                            ['type' => 'text', 'text' => $tripDetails],
                            ['type' => 'text', 'text' => '₹' . (isset($booking['totalAmount']) ? number_format($booking['totalAmount'], 2) : 'N/A')]
                        ]]
                    ]
                ]
            ]);
        }
    } else {
        $payload = json_encode([
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'text',
            'text' => ['body' => $message]
        ]);
    }
    
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $accessToken
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $responseData = json_decode($response, true);
    
    logMessage("WhatsApp Cloud API response", [
        'http_code' => $httpCode,
        'response' => $responseData,
        'curl_error' => $curlError ?: null
    ]);
    
    if ($httpCode >= 200 && $httpCode < 300 && isset($responseData['messages'][0]['id'])) {
        sendJsonResponse([
            'status' => 'success',
            'message' => 'WhatsApp message sent successfully',
            'data' => [
                'phone' => $phone,
                'messageType' => $messageType,
                'whatsapp_message_id' => $responseData['messages'][0]['id']
            ]
        ]);
    } else {
        $errorMsg = $responseData['error']['message'] ?? $curlError ?: 'Unknown error';
        logMessage("WhatsApp send failed", ['error' => $errorMsg, 'http_code' => $httpCode]);
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Failed to send WhatsApp message: ' . $errorMsg,
            'data' => ['http_code' => $httpCode]
        ], 500);
    }
    
} catch (Exception $e) {
    logMessage("WhatsApp message error", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Error sending WhatsApp message: ' . $e->getMessage()], 500);
}
