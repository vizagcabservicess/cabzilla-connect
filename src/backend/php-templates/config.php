
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
    $expirationTime = $issuedAt + 60 * 60 * 24; // 24 hours
    
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'user_id' => $userId,
        'email' => $email,
        'role' => $role ?? 'user'
    ];
    
    $header = base64_encode(json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT'
    ]));
    
    $payload = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = base64_encode($signature);
    
    return "$header.$payload.$signature";
}

// Helper function to verify JWT token
function verifyJwtToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($header, $payload, $signature) = $parts;
    
    $verifySignature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $verifySignature = base64_encode($verifySignature);
    
    if ($signature !== $verifySignature) {
        return false;
    }
    
    $payload = json_decode(base64_decode($payload), true);
    
    if ($payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

// Check if user is authenticated
function authenticate() {
    $headers = getallheaders();
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Authorization header missing'], 401);
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
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
