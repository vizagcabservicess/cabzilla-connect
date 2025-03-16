
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
    // Add no-cache headers to all responses
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");
    header("Expires: 0");
    
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
    $expirationTime = $issuedAt + 60 * 60 * 24 * 14; // 14 days - increased from 7 days
    
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
    
    $token = "$base64UrlHeader.$base64UrlPayload.$base64UrlSignature";
    
    // Log token length to help debug truncation issues
    logError("Generated token", ['length' => strlen($token), 'user_id' => $userId]);
    
    return $token;
}

// Helper function to verify JWT token with improved debugging
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
        
        // Base64 URL decode the header and payload
        $headerJson = base64_decode(strtr($base64UrlHeader, '-_', '+/'));
        $payloadJson = base64_decode(strtr($base64UrlPayload, '-_', '+/'));
        
        if (!$headerJson || !$payloadJson) {
            logError("Failed to decode header or payload", [
                'header_length' => strlen($headerJson), 
                'payload_length' => strlen($payloadJson)
            ]);
            return false;
        }
        
        $header = json_decode($headerJson, true);
        $payload = json_decode($payloadJson, true);
        
        if (!$header || !$payload) {
            logError("Failed to parse header or payload JSON", [
                'header_decoded' => $header !== null,
                'payload_decoded' => $payload !== null,
                'header_json' => substr($headerJson, 0, 30),
                'payload_json' => substr($payloadJson, 0, 30)
            ]);
            return false;
        }
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
        $actualSignature = base64_decode(strtr($base64UrlSignature, '-_', '+/'));
        
        // Use hash_equals for timing attack protection
        if (!hash_equals($expectedSignature, $actualSignature)) {
            logError("Signature verification failed");
            return false;
        }
        
        // Check if token is expired
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            logError("Token expired or missing expiration", [
                'has_exp' => isset($payload['exp']),
                'current_time' => time(),
                'exp_time' => $payload['exp'] ?? 'missing',
                'diff' => isset($payload['exp']) ? ($payload['exp'] - time()) : 'N/A'
            ]);
            return false;
        }
        
        logError("Token verified successfully", [
            'user_id' => $payload['user_id'],
            'exp' => date('Y-m-d H:i:s', $payload['exp'])
        ]);
        
        return $payload;
        
    } catch (Exception $e) {
        logError("Exception in token verification: " . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

// Check if user is authenticated
function authenticate() {
    $headers = getallheaders();
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("Authorization header missing", ['headers' => array_keys($headers)]);
        sendJsonResponse(['status' => 'error', 'message' => 'Authorization header missing'], 401);
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    logError("Auth header", ['header' => substr($authHeader, 0, 30) . '...']);
    
    // Extract token from "Bearer <token>"
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    } else {
        $token = $authHeader; // Try using the header value directly if "Bearer " prefix is missing
    }
    
    // Log token length for debugging truncation issues
    logError("Token for authentication", [
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
