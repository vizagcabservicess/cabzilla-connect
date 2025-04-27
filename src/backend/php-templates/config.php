<?php
/**
 * Global configuration file
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u644605165_db_be');
define('DB_USER', 'u644605165_usr_be');
define('DB_PASS', 'Vizag@1213');

// API settings
define('API_DEBUG', true);

// Application Configuration
define('APP_NAME', 'Vizag Cab Services');
define('APP_URL', 'https://vizagcab.com');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', true);  // Set to false in production

// Email Configuration
define('EMAIL_FROM', 'noreply@vizagcab.com');
define('EMAIL_NAME', 'Vizag Cab Services');

// Payment Gateway Configuration
define('PAYMENT_MODE', 'test'); // 'test' or 'live'
define('RAZORPAY_KEY_ID', 'rzp_test_key');
define('RAZORPAY_KEY_SECRET', 'rzp_test_secret');

// Time zone setting
date_default_timezone_set('Asia/Kolkata');

// Error Reporting
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Directory settings
define('LOG_DIR', __DIR__ . '/logs');
define('CACHE_DIR', __DIR__ . '/cache');
define('DATA_DIR', __DIR__ . '/data');
define('ROOT_PATH', realpath(__DIR__));
define('API_PATH', ROOT_PATH . '/api');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

// Create necessary directories if they don't exist
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0777, true);
}

if (!file_exists(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0777, true);
}

if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0777, true);
}

if (!file_exists(UPLOADS_PATH)) {
    mkdir(UPLOADS_PATH, 0777, true);
}

// Session Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
session_start();

// Function to get database connection
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        $conn->set_charset("utf8mb4");
        
        // Set collation to ensure consistency
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        return $conn;
    } catch (Exception $e) {
        // Log error
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', "[$timestamp] " . $e->getMessage() . "\n", FILE_APPEND);
        return null;
    }
}

// Essential response functions
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($data, $statusCode = 200) {
        header('Content-Type: application/json');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
}

// Define logging function if it doesn't exist
if (!function_exists('logError')) {
    function logError($message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $message";
        
        if (!empty($context)) {
            $logEntry .= " - " . json_encode($context);
        }
        
        $logEntry .= "\n";
        
        $logFile = LOG_DIR . '/api_error_' . date('Y-m-d') . '.log';
        file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
}

// JWT token generation function
if (!function_exists('generateJwtToken')) {
    function generateJwtToken($userId, $email, $role) {
        $issuedAt = time();
        $expire = $issuedAt + 30 * 24 * 60 * 60; // 30 days
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'userId' => $userId,
            'email' => $email,
            'role' => $role
        ];
        
        // Simple JWT implementation (for production, use a proper JWT library)
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode($payload));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", 'your_secret_key', true));
        
        return "$header.$payload.$signature";
    }
}
