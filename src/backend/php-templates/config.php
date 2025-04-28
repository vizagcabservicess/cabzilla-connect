
<?php
/**
 * Global Configuration File
 */

// Application Configuration
define('APP_NAME', 'Vizag Cab Services');
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
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set proper charset and collation
        $conn->set_charset("utf8mb4");
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        // Set session timeouts - increased for stability
        $conn->query("SET session wait_timeout=180");
        $conn->query("SET session interactive_timeout=180");
        
        return $conn;
    } catch (Exception $e) {
        // Log error with timestamp
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] Database connection error: " . $e->getMessage() . "\n";
        file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', $logMessage, FILE_APPEND);
        
        return null;
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

// JWT Token Generation
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
        
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode($payload));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", 'your_secret_key', true));
        
        return "$header.$payload.$signature";
    }
}
