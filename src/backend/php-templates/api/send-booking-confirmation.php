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
$utilsPath = __DIR__ . '/utils/';
$mailerPath = $utilsPath . 'mailer.php';
$emailPath = $utilsPath . 'email.php';

// Check for required files
if (!file_exists($mailerPath)) {
    error_log("ERROR: mailer.php not found at: " . $mailerPath);
}

if (!file_exists($emailPath)) {
    error_log("ERROR: email.php not found at: " . $emailPath);
}

// Include utilities with proper error handling
if (file_exists($mailerPath)) {
    include_once $mailerPath;
} else {
    // If mailer.php is missing, just return a JSON response instead of failing
    echo json_encode([
        'status' => 'success', // Still return success for frontend to show booking was successful
        'message' => 'Confirmation email could not be sent (mail utilities missing)',
        'email_sent' => false,
        'debug_info' => [
            'error' => 'mailer.php not found',
            'path' => $mailerPath,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}

if (file_exists($emailPath)) {
    include_once $emailPath;
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
    // Track email results
    $customerEmailSent = false;
    $adminEmailSent = false;
    $emailAttempts = [];
    
    // Try multiple methods for customer email
    if (function_exists('testDirectMailFunction')) {
        logEmailError("Using testDirectMailFunction for customer email");
        
        // Create email content for customer
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
        
        $customerEmailSent = testDirectMailFunction($requestData['passengerEmail'], $subject, $htmlBody);
        $emailAttempts[] = ['method' => 'testDirectMailFunction', 'success' => $customerEmailSent];
    }
    
    // Try native PHP mail() function as an alternative approach
    if (!$customerEmailSent) {
        // Create email content
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
        
        // Prepare headers that work with many mail servers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: info@vizagup.com' . "\r\n"; 
        
        // Try to send - using simple approach to reduce errors
        logEmailError("Trying simple mail() function for customer email");
        $customerEmailSent = @mail($requestData['passengerEmail'], $subject, $htmlBody, $headers);
        $mailError = error_get_last();
        $emailAttempts[] = [
            'method' => 'PHP mail()', 
            'success' => $customerEmailSent,
            'error' => $mailError ? $mailError['message'] : null
        ];
        
        // Try alternative approach with fifth parameter if first attempt failed
        if (!$customerEmailSent) {
            logEmailError("Trying mail() with additional params for customer email");
            $customerEmailSent = @mail($requestData['passengerEmail'], $subject, $htmlBody, $headers, "-finfo@vizagup.com");
            $mailError = error_get_last();
            $emailAttempts[] = [
                'method' => 'PHP mail() with -f', 
                'success' => $customerEmailSent,
                'error' => $mailError ? $mailError['message'] : null
            ];
        }
    }
    
    // Now try to send admin notification
    $adminEmail = 'info@vizagup.com';
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
    
    $adminEmailAttempts = [];
    
    if (function_exists('testDirectMailFunction')) {
        $adminEmailSent = testDirectMailFunction($adminEmail, $adminSubject, $adminHtmlBody);
        $adminEmailAttempts[] = ['method' => 'testDirectMailFunction', 'success' => $adminEmailSent];
    }
    
    // If direct method fails, try native PHP mail
    if (!$adminEmailSent) {
        // Prepare headers
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: noreply@vizagup.com' . "\r\n";
        $headers .= 'Reply-To: ' . $requestData['passengerEmail'] . "\r\n";
        
        $adminEmailSent = mail($adminEmail, $adminSubject, $adminHtmlBody, $headers);
        $adminEmailAttempts[] = ['method' => 'PHP mail()', 'success' => $adminEmailSent];
    }
    
    // Log results
    logEmailError("Email sending completed", [
        'customer_email_sent' => $customerEmailSent ? 'yes' : 'no',
        'admin_email_sent' => $adminEmailSent ? 'yes' : 'no',
        'booking_number' => $requestData['bookingNumber']
    ]);
    
    // CRITICAL - Always return a valid JSON response
    sendEmailJsonResponse([
        'status' => 'success',
        'message' => 'Booking confirmed',
        'booking_number' => $requestData['bookingNumber'],
        'email_sent' => $customerEmailSent,
        'admin_email_sent' => $adminEmailSent,
        'result' => [
            'customer_email' => [
                'success' => $customerEmailSent,
                'recipient' => $requestData['passengerEmail'],
                'attempts' => $emailAttempts
            ],
            'admin_email' => [
                'success' => $adminEmailSent,
                'recipient' => 'info@vizagup.com',
                'attempts' => $adminEmailAttempts ?? []
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    logEmailError("Exception during email sending", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // ALWAYS return a valid JSON response even on error
    sendEmailJsonResponse([
        'status' => 'success', // Still return success since booking was created
        'message' => 'Booking confirmed, but email failed: ' . $e->getMessage(),
        'booking_number' => $requestData['bookingNumber'] ?? 'unknown',
        'email_sent' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
