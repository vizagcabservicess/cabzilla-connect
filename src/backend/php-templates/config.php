<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Global Configuration File
 */

// Application Configuration
define('APP_NAME', 'Vizag Taxi Hub');
define('APP_URL', 'https://vizagup.com');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', true);

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u644605165_db_be');
define('DB_USER', 'u644605165_usr_be');
define('DB_PASS', 'Vizag@1213');

// Database Connection Settings - Increased timeouts for stability
ini_set('mysql.connect_timeout', '30');
ini_set('default_socket_timeout', '30');
ini_set('max_execution_time', '60');

// Error Reporting Configuration
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Session Security Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
// Only set secure if HTTPS
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}
session_start();

// Directory Settings
define('ROOT_PATH', realpath(__DIR__));
define('API_PATH', ROOT_PATH . '/api');
define('LOG_DIR', ROOT_PATH . '/logs');
define('CACHE_DIR', ROOT_PATH . '/cache');
define('DATA_DIR', ROOT_PATH . '/data');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

// Create necessary directories
$directories = [LOG_DIR, CACHE_DIR, DATA_DIR, UPLOADS_PATH];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}

// Enhanced database connection function
if (!function_exists('getDbConnection')) {
    function getDbConnection() {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception('Connection failed: ' . $conn->connect_error);
        }
        $conn->set_charset("utf8mb4");
        return $conn;
    }
}

// JSON Response Helper with CORS headers
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($data, $statusCode = 200) {
        // Clear output buffer to prevent content contamination
        if (ob_get_level()) ob_end_clean();
        
        // Set essential headers
        header('Content-Type: application/json');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        
        http_response_code($statusCode);
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }
}

// Enhanced Error Logging
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

// Add base64url_encode helper function
if (!function_exists('base64url_encode')) {
    function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
// JWT Token Generation
if (!function_exists('generateJwtToken')) {
    function generateJwtToken($userId, $email, $role) {
        $issuedAt = time();
        $expire = $issuedAt + 30 * 24 * 60 * 60; // 30 days
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'userId' => $userId,
            'user_id' => $userId, // Add snake_case for compatibility
            'email' => $email,
            'role' => $role
        ];
        
        $header = base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64url_encode(json_encode($payload));
        $signature = base64url_encode(hash_hmac('sha256', "$header.$payload", 'cabzilla_secret_key_2024', true));
        
        return "$header.$payload.$signature";
    }
}

