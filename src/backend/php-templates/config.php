
<?php
// Turn on error reporting for debugging - remove in production
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Ensure all responses are JSON
header('Content-Type: application/json');

// Database configuration - use correct database credentials from the hosting account
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'u644605165_bookinguser');  // Updated database username
define('DB_PASSWORD', 'BookingPass123#');         // Updated database password
define('DB_DATABASE', 'u644605165_db_booking');

// JWT Secret Key for authentication - should be a strong secure key
define('JWT_SECRET', 'hJ8iP2qR5sT7vZ9xB4nM6cF3jL1oA0eD');  // Secure JWT secret

// Admin email for notifications
define('ADMIN_EMAIL', 'admin@cabzilla.com');
define('NOTIFICATION_FROM_EMAIL', 'bookings@cabzilla.com');

// Connect to database with improved error reporting
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
        
        if ($conn->connect_error) {
            logError("Database connection failed", [
                'error' => $conn->connect_error,
                'host' => DB_HOST,
                'database' => DB_DATABASE
            ]);
            throw new Exception('Database connection failed: ' . $conn->connect_error);
        }
        
        // Set charset to ensure proper encoding
        $conn->set_charset("utf8mb4");
        return $conn;
    } catch (Exception $e) {
        logError("Exception in database connection", [
            'message' => $e->getMessage()
        ]);
        throw $e;
    }
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Make sure we're sending JSON
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code($statusCode);
    }
    
    // Ensure consistent response format
    if (!is_array($data)) {
        $data = ['status' => 'error', 'message' => 'Invalid response data'];
    } else if (!isset($data['status'])) {
        // If status is not set, set it based on the status code
        $data['status'] = $statusCode < 400 ? 'success' : 'error';
    }
    
    echo json_encode($data);
    exit;
}

// Helper function to generate JWT token
function generateJwtToken($userId, $email, $role) {
    $issuedAt = time();
    $expirationTime = $issuedAt + 60 * 60 * 24 * 7; // 7 days - increased from 24 hours
    
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'user_id' => $userId,
        'email' => $email,
        'role' => $role ?? 'user'
    ];
    
    $header = json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT'
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    $signature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return "$base64UrlHeader.$base64UrlPayload.$base64UrlSignature";
}

// Helper function to verify JWT token - improved for better base64 handling
function verifyJwtToken($token) {
    try {
        // Log token verification attempt for debugging
        logError("Verifying token", ['token_length' => strlen($token)]);
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            logError("Invalid token format", ['parts_count' => count($parts)]);
            return false;
        }
        
        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
        
        // Add padding to base64 strings if needed
        $base64UrlHeader = addBase64Padding($base64UrlHeader);
        $base64UrlPayload = addBase64Padding($base64UrlPayload);
        $base64UrlSignature = addBase64Padding($base64UrlSignature);
        
        // Decode header and payload
        $header = json_decode(base64_decode(strtr($base64UrlHeader, '-_', '+/')), true);
        $payload = json_decode(base64_decode(strtr($base64UrlPayload, '-_', '+/')), true);
        
        if (!$header || !$payload) {
            logError("Failed to decode header or payload", [
                'header_decoded' => $header !== null,
                'payload_decoded' => $payload !== null
            ]);
            return false;
        }
        
        // Verify signature
        $signature = base64_decode(strtr($base64UrlSignature, '-_', '+/'));
        $expectedSignature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            logError("Signature verification failed");
            return false;
        }
        
        // Check if token is expired
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            logError("Token expired or missing expiration", [
                'has_exp' => isset($payload['exp']),
                'current_time' => time(),
                'exp_time' => $payload['exp'] ?? 'missing'
            ]);
            return false;
        }
        
        logError("Token verified successfully", ['user_id' => $payload['user_id']]);
        return $payload;
        
    } catch (Exception $e) {
        logError("Exception in token verification: " . $e->getMessage());
        return false;
    }
}

// Helper function to add padding to base64 strings
function addBase64Padding($input) {
    $padLength = 4 - (strlen($input) % 4);
    if ($padLength < 4) {
        $input .= str_repeat('=', $padLength);
    }
    return $input;
}

// Check if user is authenticated
function authenticate() {
    $headers = getallheaders();
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("Authorization header missing", ['headers' => array_keys($headers)]);
        sendJsonResponse(['status' => 'error', 'message' => 'Authorization header missing'], 401);
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    logError("Auth header", ['header' => $authHeader]);
    
    // Extract token from "Bearer <token>"
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    } else {
        $token = $authHeader; // Try using the header value directly if "Bearer " prefix is missing
    }
    
    // Additional logging for token verification
    logError("Token before verification", [
        'token_length' => strlen($token),
        'token_parts' => count(explode('.', $token))
    ]);
    
    $payload = verifyJwtToken($token);
    if (!$payload) {
        logError("Token verification failed", ['token' => substr($token, 0, 20) . '...']);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    }
    
    logError("Authentication successful", [
        'user_id' => $payload['user_id'],
        'email' => $payload['email']
    ]);
    
    return $payload;
}

// Check if user is admin
function checkAdmin($userData) {
    if (!isset($userData['role']) || $userData['role'] !== 'admin') {
        sendJsonResponse(['status' => 'error', 'message' => 'Access denied. Admin privileges required'], 403);
    }
    
    return true;
}

// Generate a unique booking number
function generateBookingNumber() {
    $prefix = 'CB';
    $timestamp = time();
    $random = rand(1000, 9999);
    return $prefix . $timestamp . $random;
}

// Function to send email notifications for new bookings
function sendBookingEmailNotification($bookingData) {
    try {
        // Format the date more nicely
        $pickupDateTime = new DateTime($bookingData['pickupDate']);
        $formattedPickupDate = $pickupDateTime->format('F j, Y \a\t g:i A');
        
        // Prepare customer email
        $customerSubject = "Your Booking Confirmation - " . $bookingData['bookingNumber'];
        $customerBody = "
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #3b82f6; color: white; padding: 10px 20px; text-align: center; }
                    .content { padding: 20px; }
                    .booking-details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .footer { font-size: 12px; text-align: center; margin-top: 30px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h2>Booking Confirmation</h2>
                    </div>
                    <div class='content'>
                        <p>Dear " . htmlspecialchars($bookingData['passengerName']) . ",</p>
                        <p>Thank you for booking with CabZilla. Your booking has been confirmed.</p>
                        
                        <div class='booking-details'>
                            <h3>Booking Details</h3>
                            <p><strong>Booking Reference:</strong> " . $bookingData['bookingNumber'] . "</p>
                            <p><strong>Pickup Location:</strong> " . htmlspecialchars($bookingData['pickupLocation']) . "</p>";
        
        if (!empty($bookingData['dropLocation'])) {
            $customerBody .= "<p><strong>Drop Location:</strong> " . htmlspecialchars($bookingData['dropLocation']) . "</p>";
        }
        
        $customerBody .= "
                            <p><strong>Pickup Date & Time:</strong> " . $formattedPickupDate . "</p>
                            <p><strong>Vehicle Type:</strong> " . htmlspecialchars($bookingData['cabType']) . "</p>
                            <p><strong>Trip Type:</strong> " . ucfirst($bookingData['tripType']) . " (" . ucfirst($bookingData['tripMode']) . ")</p>
                            <p><strong>Amount:</strong> ₹" . number_format($bookingData['totalAmount'], 2) . "</p>
                        </div>
                        
                        <p>A driver will be assigned to your booking soon. You will receive driver details before your trip.</p>
                        <p>If you need to make any changes to your booking, please contact our customer service.</p>
                        <p>We wish you a pleasant journey!</p>
                        <p>Best regards,<br>CabZilla Team</p>
                    </div>
                    <div class='footer'>
                        <p>© " . date('Y') . " CabZilla. All rights reserved.</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        ";
        
        // Prepare admin email
        $adminSubject = "New Booking Alert - " . $bookingData['bookingNumber'];
        $adminBody = "
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #3b82f6; color: white; padding: 10px 20px; text-align: center; }
                    .content { padding: 20px; }
                    .booking-details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .footer { font-size: 12px; text-align: center; margin-top: 30px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h2>New Booking Alert</h2>
                    </div>
                    <div class='content'>
                        <p>A new booking has been created in the system.</p>
                        
                        <div class='booking-details'>
                            <h3>Booking Details</h3>
                            <p><strong>Booking Reference:</strong> " . $bookingData['bookingNumber'] . "</p>
                            <p><strong>Customer Name:</strong> " . htmlspecialchars($bookingData['passengerName']) . "</p>
                            <p><strong>Customer Phone:</strong> " . htmlspecialchars($bookingData['passengerPhone']) . "</p>
                            <p><strong>Customer Email:</strong> " . htmlspecialchars($bookingData['passengerEmail']) . "</p>
                            <p><strong>Pickup Location:</strong> " . htmlspecialchars($bookingData['pickupLocation']) . "</p>";
        
        if (!empty($bookingData['dropLocation'])) {
            $adminBody .= "<p><strong>Drop Location:</strong> " . htmlspecialchars($bookingData['dropLocation']) . "</p>";
        }
        
        $adminBody .= "
                            <p><strong>Pickup Date & Time:</strong> " . $formattedPickupDate . "</p>
                            <p><strong>Vehicle Type:</strong> " . htmlspecialchars($bookingData['cabType']) . "</p>
                            <p><strong>Trip Type:</strong> " . ucfirst($bookingData['tripType']) . " (" . ucfirst($bookingData['tripMode']) . ")</p>
                            <p><strong>Distance:</strong> " . $bookingData['distance'] . " km</p>
                            <p><strong>Amount:</strong> ₹" . number_format($bookingData['totalAmount'], 2) . "</p>
                            <p><strong>Status:</strong> " . ucfirst($bookingData['status']) . "</p>
                        </div>
                        
                        <p>Please assign a driver to this booking.</p>
                    </div>
                    <div class='footer'>
                        <p>© " . date('Y') . " CabZilla Admin System</p>
                    </div>
                </div>
            </body>
            </html>
        ";
        
        // Set headers for HTML email
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: " . NOTIFICATION_FROM_EMAIL . "\r\n";
        
        // Send emails
        $customerEmailSent = mail($bookingData['passengerEmail'], $customerSubject, $customerBody, $headers);
        $adminEmailSent = mail(ADMIN_EMAIL, $adminSubject, $adminBody, $headers);
        
        logError("Email notification attempt", [
            'customer_email' => $bookingData['passengerEmail'],
            'admin_email' => ADMIN_EMAIL,
            'customer_email_sent' => $customerEmailSent ? 'yes' : 'no',
            'admin_email_sent' => $adminEmailSent ? 'yes' : 'no'
        ]);
        
        return $customerEmailSent && $adminEmailSent;
    } catch (Exception $e) {
        logError("Error sending email notification", [
            'error' => $e->getMessage(),
            'booking_number' => $bookingData['bookingNumber']
        ]);
        return false;
    }
}

// Log errors to file for debugging
function logError($message, $data = []) {
    $logFile = __DIR__ . '/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message " . json_encode($data) . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// Set error handler to catch PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logError("PHP Error [$errno]: $errstr in $errfile on line $errline");
    sendJsonResponse(['status' => 'error', 'message' => 'Server error occurred'], 500);
});

// Set exception handler
set_exception_handler(function($exception) {
    logError("Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Server error occurred'], 500);
});
