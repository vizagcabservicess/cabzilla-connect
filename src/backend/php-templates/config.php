
<?php
// Turn on error reporting for debugging - remove in production
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create a log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Ensure all responses are JSON
header('Content-Type: application/json');

// Database configuration - use correct database credentials from the hosting account
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'u644605165_bookinguser');  // Database username
define('DB_PASSWORD', 'BookingPass123#');         // Database password
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
    // Set HTTP response code
    http_response_code($statusCode);
    
    // Set cache control headers to prevent caching
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Make sure we're sending JSON
    if (!headers_sent()) {
        header('Content-Type: application/json');
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

// Helper function to generate JWT token with longer expiration
function generateJwtToken($userId, $email, $role) {
    $issuedAt = time();
    $expirationTime = $issuedAt + 60 * 60 * 24 * 30; // 30 days - increased for better user experience
    
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
    
    $base64UrlHeader = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $base64UrlPayload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    
    $signature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
    $base64UrlSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    
    logError("Generated new token", [
        'user_id' => $userId,
        'expiration' => date('Y-m-d H:i:s', $expirationTime),
        'token_length' => strlen("$base64UrlHeader.$base64UrlPayload.$base64UrlSignature")
    ]);
    
    return "$base64UrlHeader.$base64UrlPayload.$base64UrlSignature";
}

// Helper function to verify JWT token - improved version
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
        
        // Decode header and payload - handling base64url format correctly
        $header = json_decode(base64_decode(strtr($base64UrlHeader, '-_', '+/') . str_repeat('=', 4 - (strlen($base64UrlHeader) % 4))), true);
        $payload = json_decode(base64_decode(strtr($base64UrlPayload, '-_', '+/') . str_repeat('=', 4 - (strlen($base64UrlPayload) % 4))), true);
        
        if (!$header || !$payload) {
            logError("Failed to decode header or payload", [
                'header_decoded' => $header !== null,
                'payload_decoded' => $payload !== null
            ]);
            return false;
        }
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
        $actualSignature = base64_decode(strtr($base64UrlSignature, '-_', '+/') . str_repeat('=', 4 - (strlen($base64UrlSignature) % 4)));
        
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
                'diff_seconds' => isset($payload['exp']) ? $payload['exp'] - time() : 'N/A'
            ]);
            return false;
        }
        
        logError("Token verified successfully", [
            'user_id' => $payload['user_id'],
            'expiration' => date('Y-m-d H:i:s', $payload['exp'])
        ]);
        return $payload;
        
    } catch (Exception $e) {
        logError("Exception in token verification: " . $e->getMessage());
        return false;
    }
}

// Check if user is authenticated
function authenticate() {
    $headers = getAllHeaders();
    
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

// Log errors to file for debugging
function logError($message, $data = []) {
    $logFile = __DIR__ . '/logs/error_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message " . json_encode($data) . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// Helper function to get all headers (case-insensitive)
function getAllHeaders() {
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (substr($key, 0, 5) === 'HTTP_') {
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
            $headers[$header] = $value;
        } else if ($key === 'CONTENT_TYPE' || $key === 'CONTENT_LENGTH') {
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower($key))));
            $headers[$header] = $value;
        }
    }
    
    // Also check for specific Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
    } else if (isset($_SERVER['Authorization'])) {
        $headers['Authorization'] = $_SERVER['Authorization'];
    } else if (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) {
            $headers['Authorization'] = $requestHeaders['Authorization'];
        }
    }
    
    return $headers;
}

// Set error handler to catch PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logError("PHP Error [$errno]: $errstr in $errfile on line $errline");
    if (error_reporting() & $errno) {
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
}, E_ALL);

// Set exception handler
set_exception_handler(function($exception) {
    logError("Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Server error occurred: ' . $exception->getMessage()], 500);
});

// Make sure we're handling fatal errors too
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        logError("Fatal Error: " . $error['message'], [
            'file' => $error['file'],
            'line' => $error['line']
        ]);
        if (!headers_sent()) {
            sendJsonResponse(['status' => 'error', 'message' => 'A fatal error occurred on the server'], 500);
        }
    }
});
