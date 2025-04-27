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
ini_set('mysql.connect_timeout', '60');  // Increased from 30
ini_set('default_socket_timeout', '60'); // Increased from 30
ini_set('max_execution_time', '120');    // Increased from 60

// Error Reporting Configuration
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);  // Changed to 0 to prevent HTML in JSON responses
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Session Security Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.gc_maxlifetime', 7200); // 2 hours session timeout
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

// Enhanced database connection function with retry mechanism
function getDbConnection($retries = 3) {
    $attempt = 0;
    $lastError = null;
    
    while ($attempt < $retries) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if (!$conn->connect_error) {
                $conn->set_charset("utf8mb4");
                $conn->query("SET session wait_timeout=600");  // 10 minutes
                $conn->query("SET session interactive_timeout=600");
                return $conn;
            }
            
            $lastError = $conn->connect_error;
        } catch (Exception $e) {
            $lastError = $e->getMessage();
        }
        
        $attempt++;
        if ($attempt < $retries) {
            sleep(1);  // Wait 1 second before retrying
        }
    }
    
    throw new Exception("Database connection failed after $retries attempts. Last error: $lastError");
}

// Standardized JSON Response Helper
function sendJsonResponse($data, $statusCode = 200) {
    // Clear any output buffers
    while (ob_get_level()) ob_end_clean();
    
    // Set essential headers
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Enhanced Error Logging
function logError($message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($context)) {
        $logEntry .= " Context: " . json_encode($context, JSON_UNESCAPED_UNICODE);
    }
    
    $logEntry .= "\n";
    $logFile = LOG_DIR . '/api_error_' . date('Y-m-d') . '.log';
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    if (APP_DEBUG) {
        error_log($logEntry);
    }
}
