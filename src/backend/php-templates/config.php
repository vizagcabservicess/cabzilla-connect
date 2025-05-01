
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
ini_set('mysql.connect_timeout', '60');
ini_set('default_socket_timeout', '60');
ini_set('max_execution_time', '120');

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
            // Log the original error
            $timestamp = date('Y-m-d H:i:s');
            $logMessage = "[$timestamp] Primary database connection failed: " . $conn->connect_error . "\n";
            file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', $logMessage, FILE_APPEND);
            
            // Try alternative credentials if primary fails
            $altUser = 'u644605165_usr_be';
            $altPass = 'Vizag@1213';
            
            if (DB_USER !== $altUser) {
                $logMessage = "[$timestamp] Trying alternative credentials\n";
                file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', $logMessage, FILE_APPEND);
                
                $altConn = new mysqli(DB_HOST, $altUser, $altPass, DB_NAME);
                if (!$altConn->connect_error) {
                    $logMessage = "[$timestamp] Connected successfully with alternative credentials\n";
                    file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', $logMessage, FILE_APPEND);
                    
                    $altConn->set_charset("utf8mb4");
                    $altConn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
                    $altConn->query("SET session wait_timeout=300");
                    $altConn->query("SET session interactive_timeout=300");
                    return $altConn;
                } else {
                    $logMessage = "[$timestamp] Alternative credentials also failed: " . $altConn->connect_error . "\n";
                    file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', $logMessage, FILE_APPEND);
                }
            }
            
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set proper charset and collation
        $conn->set_charset("utf8mb4");
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        // Set session timeouts - increased for stability
        $conn->query("SET session wait_timeout=300");
        $conn->query("SET session interactive_timeout=300");
        
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

// Database connection with retry mechanism
if (!function_exists('getDbConnectionWithRetry')) {
    function getDbConnectionWithRetry($maxRetries = 5, $retryDelayMs = 1000) {
        $attempts = 0;
        $lastError = null;
        
        while ($attempts < $maxRetries) {
            try {
                $conn = getDbConnection();
                if ($conn && $conn->ping()) {
                    return $conn; // Successful connection
                }
            } catch (Exception $e) {
                $lastError = $e;
                logError("Database connection attempt " . ($attempts + 1) . " failed: " . $e->getMessage());
            }
            
            $attempts++;
            
            if ($attempts < $maxRetries) {
                // Wait before retrying (increasing delay with each attempt)
                usleep($retryDelayMs * 1000 * $attempts);
            }
        }
        
        // All retries failed
        throw new Exception("Failed to connect to database after $maxRetries attempts. Last error: " . 
            ($lastError ? $lastError->getMessage() : "Unknown error"));
    }
}
