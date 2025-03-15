
<?php
// Turn on error reporting for debugging - remove in production
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Ensure all responses are JSON
header('Content-Type: application/json');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'your_username');  // Change to your Hostinger database username
define('DB_PASSWORD', 'your_password');  // Change to your Hostinger database password
define('DB_DATABASE', 'u644605165_db_booking');

// JWT Secret Key for authentication
define('JWT_SECRET', 'your_jwt_secret_key');  // Change this to a secure random string

// Connect to database
function getDbConnection() {
    $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
    
    if ($conn->connect_error) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error], 500);
    }
    
    return $conn;
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
    
    $payload = verifyJwtToken($token);
    if (!$payload) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    }
    
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
