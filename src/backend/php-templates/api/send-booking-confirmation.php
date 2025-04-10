
<?php
// CORS headers first to ensure proper handling of preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Critical debugging - log all errors, don't display them
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Disable output buffering completely - critical to prevent HTML contamination
while (ob_get_level()) ob_end_clean();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Preflight OK']);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Include required utilities
if (file_exists(__DIR__ . '/utils/mailer.php')) {
    require_once __DIR__ . '/utils/mailer.php';
} else {
    error_log("ERROR: mailer.php not found at: " . __DIR__ . '/utils/mailer.php');
}

if (file_exists(__DIR__ . '/utils/email.php')) {
    require_once __DIR__ . '/utils/email.php';
} else {
    error_log("ERROR: email.php not found at: " . __DIR__ . '/utils/email.php');
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

// Function to send JSON response with proper headers - SIMPLIFIED FOR RELIABILITY
function sendEmailJsonResponse($data, $statusCode = 200) {
    // Clean any previous output
    while (ob_get_level()) ob_end_clean();
    
    // Set status code
    http_response_code($statusCode);
    
    // Set content type again to ensure it's not overwritten
    header('Content-Type: application/json');
    
    // Output JSON response - direct echo approach for maximum reliability
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit; // Exit immediately after sending response
}

// Log start of process
logEmailError("Email confirmation process started", [
    'content_length' => isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI']
]);

// Get booking data from request body
$requestData = null;
$requestBody = file_get_contents('php://input');

// Safety check for empty request
if (empty($requestBody)) {
    logEmailError("Empty request body received");
    sendEmailJsonResponse(['status' => 'error', 'message' => 'Empty request body'], 400);
}

// Safely parse JSON with error handling
try {
    $requestData = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON parse error: " . json_last_error_msg());
    }
} catch (Exception $e) {
    logEmailError("Invalid JSON in request", ['error' => $e->getMessage(), 'body' => substr($requestBody, 0, 500)]);
    sendEmailJsonResponse(['status' => 'error', 'message' => 'Invalid JSON: ' . $e->getMessage()], 400);
}

if (!$requestData) {
    sendEmailJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
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
    sendEmailJsonResponse([
        'status' => 'error', 
        'message' => 'Missing required fields: ' . implode(', ', $missingFields)
    ], 400);
}

try {
    // Mail diagnostics - get server config before sending
    $mailDiagnostics = [];
    if (function_exists('getMailServerDiagnostics')) {
        $mailDiagnostics = getMailServerDiagnostics();
        logEmailError("Mail server diagnostics", $mailDiagnostics);
    }
    
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
    $emailAttempts = [];
    
    // Try all available email sending methods for customer email
    logEmailError("Attempting to send customer confirmation email", [
        'email' => substr($requestData['passengerEmail'], 0, 3) . '***' . substr($requestData['passengerEmail'], -3),
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // 1. Try test direct mail first - most reliable with detailed logging
    if (function_exists('testDirectMailFunction')) {
        logEmailError("Using testDirectMailFunction for customer email");
        $customerEmailSent = testDirectMailFunction($requestData['passengerEmail'], $subject, $htmlBody);
        $emailAttempts[] = ['method' => 'testDirectMailFunction', 'success' => $customerEmailSent];
        logEmailError("testDirectMailFunction result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 2. Try enhanced booking email function if available and previous attempt failed
    if (!$customerEmailSent && function_exists('sendBookingConfirmationEmail')) {
        logEmailError("Using enhanced sendBookingConfirmationEmail function");
        $customerEmailSent = sendBookingConfirmationEmail($requestData);
        $emailAttempts[] = ['method' => 'sendBookingConfirmationEmail', 'success' => $customerEmailSent];
        logEmailError("Enhanced email function result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 3. If previous methods fail, try PHPMailer
    if (!$customerEmailSent && function_exists('sendEmailWithPHPMailer')) {
        logEmailError("Trying PHPMailer");
        $customerEmailSent = sendEmailWithPHPMailer($requestData['passengerEmail'], $subject, $htmlBody);
        $emailAttempts[] = ['method' => 'PHPMailer', 'success' => $customerEmailSent];
        logEmailError("PHPMailer result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 4. If PHPMailer fails, try the sendEmailAllMethods function
    if (!$customerEmailSent && function_exists('sendEmailAllMethods')) {
        logEmailError("Trying sendEmailAllMethods");
        $customerEmailSent = sendEmailAllMethods($requestData['passengerEmail'], $subject, $htmlBody);
        $emailAttempts[] = ['method' => 'sendEmailAllMethods', 'success' => $customerEmailSent];
        logEmailError("sendEmailAllMethods result", ['success' => $customerEmailSent ? 'yes' : 'no']);
    }
    
    // 5. If all above methods fail, try simple mail function as final fallback
    if (!$customerEmailSent) {
        logEmailError("Trying direct PHP mail() as last resort");
        
        // Basic email headers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: noreply@vizagup.com' . "\r\n"; // Try generic from address
        $headers .= 'Reply-To: info@vizagup.com' . "\r\n";
        
        // Get initial error state
        $lastError = error_get_last();
        
        $customerEmailSent = @mail($requestData['passengerEmail'], $subject, $htmlBody, $headers);
        
        // Check for new errors
        $newError = error_get_last();
        $errorMessage = ($newError !== $lastError) ? $newError['message'] : 'No specific error';
        
        $emailAttempts[] = [
            'method' => 'PHP mail()', 
            'success' => $customerEmailSent,
            'error' => $customerEmailSent ? 'none' : $errorMessage
        ];
        
        logEmailError("Direct PHP mail() result", [
            'success' => $customerEmailSent ? 'yes' : 'no',
            'error' => $customerEmailSent ? 'none' : $errorMessage
        ]);
    }
    
    // Now send admin notification email
    $adminEmail = 'info@vizagup.com'; // Admin email
    $adminSubject = "New Booking: " . $requestData['bookingNumber'];
    $adminHtmlBody = "<h2>New booking received!</h2>";
    $adminHtmlBody .= "<p>Booking Number: <strong>" . $requestData['bookingNumber'] . "</strong></p>";
    $adminHtmlBody .= "<p>Passenger: " . $requestData['passengerName'] . "</p>";
    $adminHtmlBody .= "<p>Phone: " . ($requestData['passengerPhone'] ?? 'N/A') . "</p>";
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
    
    $adminEmailAttempts = [];
    
    // Try all available methods for admin email
    logEmailError("Attempting to send admin notification email", [
        'email' => $adminEmail,
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // 1. Try test direct mail first - most reliable with detailed logging
    if (function_exists('testDirectMailFunction')) {
        logEmailError("Using testDirectMailFunction for admin email");
        $adminEmailSent = testDirectMailFunction($adminEmail, $adminSubject, $adminHtmlBody);
        $adminEmailAttempts[] = ['method' => 'testDirectMailFunction', 'success' => $adminEmailSent];
        logEmailError("testDirectMailFunction result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 2. Try enhanced admin notification function if available
    if (!$adminEmailSent && function_exists('sendAdminNotificationEmail')) {
        logEmailError("Using enhanced sendAdminNotificationEmail function");
        $adminEmailSent = sendAdminNotificationEmail($requestData);
        $adminEmailAttempts[] = ['method' => 'sendAdminNotificationEmail', 'success' => $adminEmailSent];
        logEmailError("Enhanced admin email function result", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 3. If enhanced function fails or doesn't exist, try PHPMailer
    if (!$adminEmailSent && function_exists('sendEmailWithPHPMailer')) {
        logEmailError("Trying PHPMailer for admin email");
        $adminEmailSent = sendEmailWithPHPMailer($adminEmail, $adminSubject, $adminHtmlBody);
        $adminEmailAttempts[] = ['method' => 'PHPMailer', 'success' => $adminEmailSent];
        logEmailError("PHPMailer result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 4. If PHPMailer fails, try the sendEmailAllMethods function
    if (!$adminEmailSent && function_exists('sendEmailAllMethods')) {
        logEmailError("Trying sendEmailAllMethods for admin email");
        $adminEmailSent = sendEmailAllMethods($adminEmail, $adminSubject, $adminHtmlBody);
        $adminEmailAttempts[] = ['method' => 'sendEmailAllMethods', 'success' => $adminEmailSent];
        logEmailError("sendEmailAllMethods result for admin email", ['success' => $adminEmailSent ? 'yes' : 'no']);
    }
    
    // 5. If all above methods fail, try simple mail function as final fallback
    if (!$adminEmailSent) {
        logEmailError("Trying direct PHP mail() for admin email as last resort");
        
        // Basic email headers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: bookings@vizagup.com' . "\r\n";
        $headers .= 'Reply-To: ' . $requestData['passengerEmail'] . "\r\n";
        
        // Get initial error state
        $lastError = error_get_last();
        
        $adminEmailSent = @mail($adminEmail, $adminSubject, $adminHtmlBody, $headers);
        
        // Check for new errors
        $newError = error_get_last();
        $errorMessage = ($newError !== $lastError) ? $newError['message'] : 'No specific error';
        
        $adminEmailAttempts[] = [
            'method' => 'PHP mail()', 
            'success' => $adminEmailSent,
            'error' => $adminEmailSent ? 'none' : $errorMessage
        ];
        
        logEmailError("Direct PHP mail() result for admin email", [
            'success' => $adminEmailSent ? 'yes' : 'no',
            'error' => $adminEmailSent ? 'none' : $errorMessage
        ]);
    }
    
    // Return appropriate JSON response based on results
    logEmailError("Email sending completed", [
        'customer_email_sent' => $customerEmailSent ? 'yes' : 'no',
        'admin_email_sent' => $adminEmailSent ? 'yes' : 'no',
        'booking_number' => $requestData['bookingNumber'],
        'attempts' => [
            'customer' => $emailAttempts,
            'admin' => $adminEmailAttempts
        ]
    ]);
    
    // CRITICAL FIX - Ensure we ALWAYS return a valid JSON response
    sendEmailJsonResponse([
        'status' => ($customerEmailSent || $adminEmailSent) ? 'success' : 'error',
        'message' => ($customerEmailSent || $adminEmailSent) ? 
                    'Email confirmation sent successfully' : 
                    'Failed to send confirmation emails',
        'booking_number' => $requestData['bookingNumber'],
        'customer_email_sent' => $customerEmailSent,
        'admin_email_sent' => $adminEmailSent,
        'server_info' => [
            'php_version' => phpversion(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]
    ]);
    
} catch (Exception $e) {
    logEmailError("Email sending failed with exception", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // CRITICAL FIX - Ensure we always return a clean JSON response
    sendEmailJsonResponse([
        'status' => 'error',
        'message' => 'Failed to send confirmation emails: ' . $e->getMessage(),
        'error_details' => $e->getMessage()
    ]);
}
