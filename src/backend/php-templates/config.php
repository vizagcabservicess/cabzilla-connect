
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

// Increase timeout values for better stability
ini_set('mysql.connect_timeout', '120');  // Increased from 60
ini_set('default_socket_timeout', '120'); // Increased from 60
ini_set('max_execution_time', '300');    // Increased from 120

// Force errors to be logged, not displayed
error_reporting(E_ALL);
ini_set('display_errors', 0);  // Never display PHP errors in API response
ini_set('log_errors', 1);      // Always log errors

// Session Security Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.gc_maxlifetime', 7200); // 2 hours session timeout
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

// Enhanced database connection function with retry mechanism and better error handling
function getDbConnection($retries = 5) {
    $attempt = 0;
    $lastError = null;
    
    // Log connection attempt
    $logMessage = "Attempting database connection to " . DB_HOST . ", database: " . DB_NAME;
    error_log($logMessage);
    
    while ($attempt < $retries) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if (!$conn->connect_error) {
                $conn->set_charset("utf8mb4");
                $conn->query("SET session wait_timeout=1200");  // 20 minutes
                $conn->query("SET session interactive_timeout=1200");
                
                // Test connection with simple query
                $testResult = $conn->query("SELECT 1");
                if ($testResult === false) {
                    throw new Exception("Database connection test query failed: " . $conn->error);
                }
                
                return $conn;
            }
            
            $lastError = $conn->connect_error;
        } catch (Exception $e) {
            $lastError = $e->getMessage();
        }
        
        error_log("Database connection attempt " . ($attempt + 1) . " failed: " . $lastError);
        
        $attempt++;
        if ($attempt < $retries) {
            sleep(1 * $attempt);  // Exponential backoff: wait longer with each retry
        }
    }
    
    // Log the failure with details
    $errorMessage = "Database connection failed after $retries attempts. Last error: $lastError";
    error_log($errorMessage);
    
    throw new Exception($errorMessage);
}

// Standardized JSON Response Helper with better error handling
function sendJsonResponse($data, $statusCode = 200) {
    // Clear any output buffers to prevent contamination
    while (ob_get_level()) ob_end_clean();
    
    // CRITICAL: Set essential headers
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    http_response_code($statusCode);
    
    // Ensure proper JSON encoding with error handling
    try {
        $jsonOutput = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($jsonOutput === false) {
            throw new Exception("Failed to encode response as JSON: " . json_last_error_msg());
        }
        echo $jsonOutput;
    } catch (Exception $e) {
        error_log("JSON encoding error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Internal server error: Failed to encode response'
        ]);
    }
    exit;
}

// Enhanced Error Logging
function logError($message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($context)) {
        // Only encode context if it's not already a string
        if (is_array($context) || is_object($context)) {
            $logEntry .= " Context: " . json_encode($context, JSON_UNESCAPED_UNICODE);
        } else {
            $logEntry .= " Context: " . (string)$context;
        }
    }
    
    $logEntry .= "\n";
    $logFile = LOG_DIR . '/api_error_' . date('Y-m-d') . '.log';
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Also log to PHP error log
    error_log($message . (is_array($context) ? " - " . json_encode($context, JSON_UNESCAPED_UNICODE) : ""));
}

// Function to verify JWT token (placeholder implementation)
function verifyJwtToken($token) {
    // This is a placeholder - in a real application you would verify the token properly
    if (empty($token)) {
        return false;
    }
    
    // For demo purposes, we'll accept any token and return dummy user data
    // Replace this with actual JWT verification in production
    return [
        'user_id' => 1,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'role' => 'admin'
    ];
}
