
<?php
// CORS headers first to ensure proper handling of preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable output buffering completely - critical to prevent HTML contamination
if (ob_get_level()) ob_end_clean();
if (ob_get_length()) ob_clean();
if (ob_get_level()) ob_end_clean();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Include PHPMailer and email utilities
require_once __DIR__ . '/utils/email.php';

// Helper function to log errors
function logEmailError($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_confirmation_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Get booking data from request body
$requestData = null;
$requestBody = file_get_contents('php://input');

// Log start of process
logEmailError("Email confirmation process started", [
    'content_length' => isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI']
]);

// Safety check for empty request
if (empty($requestBody)) {
    logEmailError("Empty request body received");
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Empty request body']);
    exit;
}

// Safely parse JSON with error handling
try {
    $requestData = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON parse error: " . json_last_error_msg());
    }
} catch (Exception $e) {
    logEmailError("Invalid JSON in request", ['error' => $e->getMessage(), 'body' => $requestBody]);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON: ' . $e->getMessage()]);
    exit;
}

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request data']);
    exit;
}

logEmailError("Received booking confirmation request", [
    'booking_number' => $requestData['bookingNumber'] ?? 'Unknown',
    'email' => isset($requestData['passengerEmail']) ? substr($requestData['passengerEmail'], 0, 3) . '***' : 'Missing'
]);

// Validate required fields
$requiredFields = [
    'bookingNumber', 'pickupLocation', 'pickupDate', 
    'cabType', 'totalAmount', 'passengerName', 'passengerEmail'
];

$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($requestData[$field]) || empty($requestData[$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    logEmailError("Missing required fields", ['missing' => $missingFields]);
    http_response_code(400);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Missing required fields: ' . implode(', ', $missingFields)
    ]);
    exit;
}

try {
    // Include the mail functionality directly in case it wasn't included properly
    require_once __DIR__ . '/utils/mailer.php';
    
    // Prepare email content
    $subject = "Booking Confirmation: " . $requestData['bookingNumber'];
    $htmlBody = "<h2>Your booking is confirmed!</h2>";
    $htmlBody .= "<p>Booking Number: <strong>" . $requestData['bookingNumber'] . "</strong></p>";
    $htmlBody .= "<p>Pickup Location: " . $requestData['pickupLocation'] . "</p>";
    if (isset($requestData['dropLocation']) && !empty($requestData['dropLocation'])) {
        $htmlBody .= "<p>Drop Location: " . $requestData['dropLocation'] . "</p>";
    }
    $htmlBody .= "<p>Cab Type: " . $requestData['cabType'] . "</p>";
    $htmlBody .= "<p>Pickup Date: " . date('Y-m-d H:i', strtotime($requestData['pickupDate'])) . "</p>";
    $htmlBody .= "<p>Total Amount: ₹" . number_format($requestData['totalAmount'], 2) . "</p>";
    $htmlBody .= "<p>Thank you for choosing our service!</p>";
    
    // Try all available email sending methods
    $customerEmailResult = false;
    
    // 1. Try PHPMailer first
    if (function_exists('sendEmailWithPHPMailer')) {
        $customerEmailResult = sendEmailWithPHPMailer($requestData['passengerEmail'], $subject, $htmlBody);
        logEmailError("PHPMailer attempt result", ['success' => $customerEmailResult ? 'yes' : 'no']);
    }
    
    // 2. If PHPMailer fails, try the legacy method
    if (!$customerEmailResult && function_exists('sendEmail')) {
        $customerEmailResult = sendEmail($requestData['passengerEmail'], $subject, $htmlBody);
        logEmailError("Legacy email attempt result", ['success' => $customerEmailResult ? 'yes' : 'no']);
    }
    
    // 3. If all methods fail, try direct PHP mail function
    if (!$customerEmailResult) {
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: info@vizagtaxihub.com' . "\r\n";
        
        $directMailResult = mail($requestData['passengerEmail'], $subject, $htmlBody, $headers);
        logEmailError("Direct PHP mail() attempt result", ['success' => $directMailResult ? 'yes' : 'no']);
        $customerEmailResult = $directMailResult;
    }
    
    // Log results
    logEmailError("Email sending final results", [
        'customer_email_sent' => $customerEmailResult ? 'yes' : 'no',
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // Return appropriate response
    if ($customerEmailResult) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Booking confirmation email sent successfully',
            'details' => [
                'recipient' => $requestData['passengerEmail'],
                'booking_number' => $requestData['bookingNumber']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send confirmation email. We will contact you shortly.',
            'details' => [
                'booking_number' => $requestData['bookingNumber']
            ]
        ]);
    }
} catch (Exception $e) {
    logEmailError("Email sending failed with exception", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send confirmation emails: ' . $e->getMessage()
    ]);
}
