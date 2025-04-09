
<?php
/**
 * CRITICAL API ENDPOINT: Creates new bookings
 */

// CRITICAL: Set all headers upfront before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable output buffering completely - critical to prevent HTML contamination
if (ob_get_level()) ob_end_clean();
if (ob_get_length()) ob_clean();
if (ob_get_level()) ob_end_clean();

// Enable error reporting but don't display errors to client
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Create logs directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Define booking log function
function logBooking($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/booking_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } else {
            $logEntry .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Send JSON response function to ensure proper output
function sendJsonResponse($data, $statusCode = 200) {
    // Clean any previous output
    while (ob_get_level()) ob_end_clean();
    
    // Set status code
    http_response_code($statusCode);
    
    // Ensure content type is set again
    header('Content-Type: application/json');
    
    // Convert to JSON and output directly
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logBooking("Method not allowed", $_SERVER['REQUEST_METHOD']);
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log the start of booking request
logBooking("Booking request started", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

// Extract user ID from JWT token if available
$userId = null;
$headers = getallheaders();

logBooking("Request headers", $headers);

// Check for Authorization header
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    logBooking("Found auth token", ['token' => substr($token, 0, 10) . '...']);
    
    // Basic JWT token parsing (simple implementation)
    $tokenParts = explode('.', $token);
    if (count($tokenParts) === 3) {
        try {
            $payload = json_decode(base64_decode($tokenParts[1]), true);
            if (isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                logBooking("Extracted user_id from token", ['user_id' => $userId]);
            }
        } catch (Exception $e) {
            logBooking("Error decoding token", ['error' => $e->getMessage()]);
        }
    }
}

try {
    // Read and parse the request body
    $requestBody = file_get_contents('php://input');
    logBooking("Received request body", ['length' => strlen($requestBody), 'content' => $requestBody]);
    
    // Check for empty request
    if (empty($requestBody)) {
        throw new Exception("Empty request body");
    }
    
    // Parse JSON data with error handling
    $data = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data: " . json_last_error_msg());
    }
    
    // Log parsed data (without sensitive information)
    $logData = $data;
    if (isset($logData['passengerPhone'])) {
        $logData['passengerPhone'] = substr($logData['passengerPhone'], 0, 3) . '****' . substr($logData['passengerPhone'], -3);
    }
    if (isset($logData['passengerEmail'])) {
        $logData['passengerEmail'] = substr($logData['passengerEmail'], 0, 3) . '****' . strstr($logData['passengerEmail'], '@');
    }
    logBooking("Parsed booking data", $logData);
    
    // Validate required fields
    $requiredFields = [
        'pickupLocation', 'cabType', 'tripType', 'tripMode', 
        'totalAmount', 'passengerName', 'passengerPhone', 'passengerEmail', 'pickupDate'
    ];
    
    // For non-local trips, require drop location
    if (!isset($data['tripType']) || $data['tripType'] !== 'local') {
        $requiredFields[] = 'dropLocation';
    }
    
    // Validate all required fields
    $missingFields = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        throw new Exception("Missing required fields: " . implode(', ', $missingFields));
    }

    // Create a booking response (in production, this would save to DB)
    $mockBookingId = time() . rand(1000, 9999);
    $mockBookingNumber = 'CB' . $mockBookingId;
    
    $mockBooking = [
        'id' => (int)$mockBookingId,
        'userId' => $userId ? (int)$userId : null,
        'bookingNumber' => $mockBookingNumber,
        'pickupLocation' => $data['pickupLocation'],
        'dropLocation' => $data['dropLocation'] ?? '',
        'pickupDate' => $data['pickupDate'],
        'returnDate' => $data['returnDate'] ?? null,
        'cabType' => $data['cabType'],
        'distance' => (float)($data['distance'] ?? 0),
        'tripType' => $data['tripType'],
        'tripMode' => $data['tripMode'],
        'totalAmount' => (float)$data['totalAmount'],
        'status' => 'pending',
        'passengerName' => $data['passengerName'],
        'passengerPhone' => $data['passengerPhone'],
        'passengerEmail' => $data['passengerEmail'],
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    logBooking("Created booking response", $mockBooking);
    
    // Try to send confirmation email
    try {
        require_once __DIR__ . '/utils/mailer.php';
        
        // Prepare email content
        $subject = "Booking Confirmation: " . $mockBookingNumber;
        $htmlBody = "<h2>Your booking is confirmed!</h2>";
        $htmlBody .= "<p>Booking Number: <strong>" . $mockBookingNumber . "</strong></p>";
        $htmlBody .= "<p>Pickup Location: " . $data['pickupLocation'] . "</p>";
        $htmlBody .= "<p>Cab Type: " . $data['cabType'] . "</p>";
        $htmlBody .= "<p>Pickup Date: " . date('Y-m-d H:i', strtotime($data['pickupDate'])) . "</p>";
        $htmlBody .= "<p>Total Amount: ₹" . number_format($data['totalAmount'], 2) . "</p>";
        
        // Send email with PHPMailer
        $emailResult = sendEmailWithPHPMailer($data['passengerEmail'], $subject, $htmlBody);
        logBooking("PHPMailer email result", ['success' => $emailResult ? 'yes' : 'no']);
        
        // If PHPMailer fails, try the legacy method
        if (!$emailResult) {
            if (function_exists('sendEmail')) {
                $legacyResult = sendEmail($data['passengerEmail'], $subject, $htmlBody);
                logBooking("Legacy email result", ['success' => $legacyResult ? 'yes' : 'no']);
            }
        }
        
    } catch (Exception $emailError) {
        logBooking("Email sending failed", ['error' => $emailError->getMessage()]);
        // Continue with booking process even if email fails
    }
    
    // Send success response - make sure this is the ONLY output from the script
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $mockBooking
    ];
    
    logBooking("Sending success response", ['booking_id' => $mockBookingId]);
    sendJsonResponse($response);
    
} catch (Exception $e) {
    logBooking("ERROR: Booking creation failed", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Send error response
    $response = [
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ];
    
    sendJsonResponse($response, 500);
}
