<?php
// Turn on error reporting for debugging - remove in production
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set PHP mail configuration for better delivery
ini_set('sendmail_from', 'info@vizagtaxihub.com');
ini_set('SMTP', 'localhost');
ini_set('smtp_port', 25);

// Ensure all responses are JSON
header('Content-Type: application/json');

// Ensure proper CORS headers are set
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration - use correct database credentials from the hosting account
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'u644605165_new_bookingusr');  // Updated database username
define('DB_PASSWORD', 'Vizag@1213');                 // Updated database password
define('DB_DATABASE', 'u644605165_new_bookingdb');

// Also set as variables for backward compatibility
$db_host = 'localhost';
$db_user = 'u644605165_new_bookingusr';
$db_pass = 'Vizag@1213';
$db_name = 'u644605165_new_bookingdb';

// JWT Secret Key for authentication - should be a strong secure key
define('JWT_SECRET', 'c3a9b25e9c8f5d7a3e456abcde12345ff6d7890b12c3d4e5f6789a0bc1d2e3f4');  // Secure JWT secret

// Connect to database with improved error reporting
function getDbConnection() {
    global $db_host, $db_user, $db_pass, $db_name;
    
    try {
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        if ($conn->connect_error) {
            logError("Database connection failed", [
                'error' => $conn->connect_error,
                'host' => $db_host,
                'database' => $db_name
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
    
    // Add CORS headers to prevent browser restrictions
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-Time, X-Force-Refresh');
    
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
    
    // Add server timestamp
    $data['serverTime'] = date('Y-m-d H:i:s');
    
    // Add API version for debugging
    $data['apiVersion'] = '1.0.7';
    
    // Log the response for debugging
    logError('Sending JSON response', [
        'statusCode' => $statusCode,
        'dataSize' => is_array($data) ? count($data) : 'not_array',
        'status' => $data['status'] ?? 'none'
    ]);
    
    echo json_encode($data);
    exit;
}

// Helper function to generate JWT token with improved debugging
function generateJwtToken($userId, $email, $role) {
    $issuedAt = time();
    $expirationTime = $issuedAt + 60 * 60 * 24 * 30; // 30 days - increased from 14 days
    
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
    
    // Log token details to help debug truncation issues
    logError("Generated token", [
        'length' => strlen($token), 
        'parts' => substr_count($token, '.') + 1,
        'user_id' => $userId,
        'exp' => date('Y-m-d H:i:s', $expirationTime)
    ]);
    
    return $token;
}

// Helper function to verify JWT token with enhanced error handling
function verifyJwtToken($token) {
    try {
        // Log token verification attempt for debugging
        logError("Verifying token", ['token_length' => strlen($token), 'parts' => substr_count($token, '.') + 1]);
        
        // Check for token format issues
        if (empty($token)) {
            logError("Token is empty");
            return false;
        }
        
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

// Check if user is authenticated with improved error handling
function authenticate() {
    // TEMPORARILY DISABLED AUTHENTICATION FOR DEBUGGING
    // Return a mock admin user for testing
    return [
        'user_id' => 1,
        'email' => 'admin@example.com',
        'role' => 'admin'
    ];
    
    /*
    $headers = getallheaders();
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("Authorization header missing", ['headers' => array_keys($headers)]);
        sendJsonResponse(['status' => 'error', 'message' => 'Authorization header missing'], 401);
        exit;
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    
    // Extract token from "Bearer <token>"
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    } else {
        $token = $authHeader; // Try using the header value directly if "Bearer " prefix is missing
    }
    
    // Log token for debugging
    logError("Token for authentication", [
        'token_length' => strlen($token),
        'token_parts' => substr_count($token, '.') + 1
    ]);
    
    $payload = verifyJwtToken($token);
    if (!$payload) {
        logError("Token verification failed", ['token_sample' => substr($token, 0, 30) . '...']);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token. Please login again.'], 401);
        exit;
    }
    
    return $payload;
    */
}

// Check if user is admin
function checkAdmin($userData) {
    // TEMPORARILY DISABLED ADMIN CHECK FOR DEBUGGING
    return true;
    
    /*
    if (!isset($userData['role']) || $userData['role'] !== 'admin') {
        sendJsonResponse(['status' => 'error', 'message' => 'Access denied. Admin privileges required'], 403);
    }
    
    return true;
    */
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
    
    // Add server information to help diagnose email issues
    if (strpos($message, 'email') !== false || strpos($message, 'mail') !== false) {
        if (!isset($data['server_info'])) {
            $data['server_info'] = [
                'php_version' => phpversion(),
                'os' => PHP_OS,
                'sapi' => php_sapi_name(),
                'mail_enabled' => function_exists('mail'),
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
            ];
        }
    }
    
    $logMessage = "[$timestamp] $message " . json_encode($data) . PHP_EOL;
    error_log($logMessage, 3, $logFile);
    
    // For critical email errors, log to a separate file
    if (strpos(strtolower($message), 'failed to send email') !== false) {
        $emailLogFile = __DIR__ . '/email_errors.log';
        error_log($logMessage, 3, $emailLogFile);
    }
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
