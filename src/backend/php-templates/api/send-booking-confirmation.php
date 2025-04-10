
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

// Include required utilities
require_once __DIR__ . '/utils/mailer.php';
if (file_exists(__DIR__ . '/utils/email.php')) {
    require_once __DIR__ . '/utils/email.php';
}

// Helper function to log errors with enhanced details
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

// Prevent output before sending headers
ob_start();

// Get booking data from request body
$requestData = null;
$requestBody = file_get_contents('php://input');

// Log start of process
logEmailError("Email confirmation process started", [
    'content_length' => isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'raw_body_length' => strlen($requestBody)
]);

// Clear any unintended output
ob_end_clean();

// Safety check for empty request
if (empty($requestBody)) {
    logEmailError("Empty request body received");
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
    logEmailError("Invalid JSON in request", ['error' => $e->getMessage(), 'body' => substr($requestBody, 0, 500)]);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON: ' . $e->getMessage()]);
    exit;
}

if (!$requestData) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request data']);
    exit;
}

logEmailError("Received booking confirmation request", [
    'booking_number' => $requestData['bookingNumber'] ?? 'Unknown',
    'email' => isset($requestData['passengerEmail']) ? substr($requestData['passengerEmail'], 0, 3) . '***' : 'Missing',
    'data_keys' => array_keys($requestData)
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
    logEmailError("Missing required fields", ['missing' => $missingFields, 'data' => $requestData]);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Missing required fields: ' . implode(', ', $missingFields)
    ]);
    exit;
}

try {
    // Prepare email content for customer
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
    
    // Try to use template if available
    if (function_exists('generateBookingConfirmationEmail')) {
        $htmlBody = generateBookingConfirmationEmail($requestData);
        logEmailError("Using template email for confirmation");
    }
    
    // Track email results
    $customerEmailSent = false;
    $adminEmailSent = false;
    
    // Try all available email sending methods for customer email
    logEmailError("Attempting to send customer confirmation email", [
        'email' => substr($requestData['passengerEmail'], 0, 3) . '***' . substr($requestData['passengerEmail'], -3),
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // 1. Try enhanced booking email function if available
    if (function_exists('sendBookingConfirmationEmail')) {
        logEmailError("Using enhanced sendBookingConfirmationEmail function");
        $customerEmailSent = sendBookingConfirmationEmail($requestData);
        logEmailError("Enhanced email function result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 2. If enhanced function fails or doesn't exist, try PHPMailer
    if (!$customerEmailSent && function_exists('sendEmailWithPHPMailer')) {
        logEmailError("Trying PHPMailer");
        $customerEmailSent = sendEmailWithPHPMailer($requestData['passengerEmail'], $subject, $htmlBody);
        logEmailError("PHPMailer result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 3. If PHPMailer fails, try the sendEmailAllMethods function
    if (!$customerEmailSent && function_exists('sendEmailAllMethods')) {
        logEmailError("Trying sendEmailAllMethods");
        $customerEmailSent = sendEmailAllMethods($requestData['passengerEmail'], $subject, $htmlBody);
        logEmailError("sendEmailAllMethods result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 4. If all above methods fail, try simple mail function as final fallback
    if (!$customerEmailSent) {
        logEmailError("Trying direct PHP mail() as last resort");
        
        // Basic email headers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: info@vizagtaxihub.com' . "\r\n";
        $headers .= 'Reply-To: info@vizagtaxihub.com' . "\r\n";
        
        $customerEmailSent = mail($requestData['passengerEmail'], $subject, $htmlBody, $headers);
        logEmailError("Direct PHP mail() result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // Now send admin notification email
    $adminEmail = 'info@vizagtaxihub.com'; // Change this to the actual admin email
    $adminSubject = "New Booking: " . $requestData['bookingNumber'];
    $adminHtmlBody = "<h2>New booking received!</h2>";
    $adminHtmlBody .= "<p>Booking Number: <strong>" . $requestData['bookingNumber'] . "</strong></p>";
    $adminHtmlBody .= "<p>Passenger: " . $requestData['passengerName'] . "</p>";
    $adminHtmlBody .= "<p>Phone: " . $requestData['passengerPhone'] . "</p>";
    $adminHtmlBody .= "<p>Email: " . $requestData['passengerEmail'] . "</p>";
    $adminHtmlBody .= "<p>Pickup Location: " . $requestData['pickupLocation'] . "</p>";
    if (isset($requestData['dropLocation']) && !empty($requestData['dropLocation'])) {
        $adminHtmlBody .= "<p>Drop Location: " . $requestData['dropLocation'] . "</p>";
    }
    $adminHtmlBody .= "<p>Cab Type: " . $requestData['cabType'] . "</p>";
    $adminHtmlBody .= "<p>Pickup Date: " . date('Y-m-d H:i', strtotime($requestData['pickupDate'])) . "</p>";
    $adminHtmlBody .= "<p>Total Amount: ₹" . number_format($requestData['totalAmount'], 2) . "</p>";
    
    // Try to use template if available
    if (function_exists('generateAdminNotificationEmail')) {
        $adminHtmlBody = generateAdminNotificationEmail($requestData);
        logEmailError("Using template email for admin notification");
    }
    
    // Try all available methods for admin email
    logEmailError("Attempting to send admin notification email", [
        'email' => $adminEmail,
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // 1. Try enhanced admin notification function if available
    if (function_exists('sendAdminNotificationEmail')) {
        logEmailError("Using enhanced sendAdminNotificationEmail function");
        $adminEmailSent = sendAdminNotificationEmail($requestData);
        logEmailError("Enhanced admin email function result", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 2. If enhanced function fails or doesn't exist, try PHPMailer
    if (!$adminEmailSent && function_exists('sendEmailWithPHPMailer')) {
        logEmailError("Trying PHPMailer for admin email");
        $adminEmailSent = sendEmailWithPHPMailer($adminEmail, $adminSubject, $adminHtmlBody);
        logEmailError("PHPMailer result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 3. If PHPMailer fails, try the sendEmailAllMethods function
    if (!$adminEmailSent && function_exists('sendEmailAllMethods')) {
        logEmailError("Trying sendEmailAllMethods for admin email");
        $adminEmailSent = sendEmailAllMethods($adminEmail, $adminSubject, $adminHtmlBody);
        logEmailError("sendEmailAllMethods result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 4. If all above methods fail, try simple mail function as final fallback
    if (!$adminEmailSent) {
        logEmailError("Trying direct PHP mail() for admin email as last resort");
        
        // Basic email headers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: bookings@vizagtaxihub.com' . "\r\n";
        $headers .= 'Reply-To: ' . $requestData['passengerEmail'] . "\r\n";
        
        $adminEmailSent = mail($adminEmail, $adminSubject, $adminHtmlBody, $headers);
        logEmailError("Direct PHP mail() result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // Return appropriate JSON response based on results
    logEmailError("Email sending completed", [
        'customer_email_sent' => $customerEmailSent ? 'yes' : 'no',
        'admin_email_sent' => $adminEmailSent ? 'yes' : 'no',
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    if ($customerEmailSent || $adminEmailSent) {
        // At least one email was sent
        echo json_encode([
            'status' => 'success',
            'message' => 'Email confirmation sent successfully',
            'details' => [
                'customer_email_sent' => $customerEmailSent,
                'admin_email_sent' => $adminEmailSent,
                'booking_number' => $requestData['bookingNumber']
            ]
        ]);
    } else {
        // No emails could be sent
        echo json_encode([
            'status' => 'partial',
            'message' => 'Booking created successfully but emails could not be sent',
            'details' => [
                'booking_created' => true,
                'email_sent' => false,
                'booking_number' => $requestData['bookingNumber']
            ]
        ]);
    }
    
} catch (Exception $e) {
    logEmailError("Email sending failed with exception", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send confirmation emails: ' . $e->getMessage()
    ]);
}
