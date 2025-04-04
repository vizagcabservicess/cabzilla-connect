
<?php
/**
 * Main configuration file for Vizag Taxi Hub backend
 * Contains database credentials and global settings
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u644605165_db_be');
define('DB_USER', 'u644605165_usr_be');
define('DB_PASS', 'Vizag@1213');

// API configuration
define('API_DEBUG_MODE', true);
define('API_LOG_REQUESTS', true);
define('API_ALLOW_CORS', true);

// Cache configuration
define('CACHE_ENABLED', true);
define('CACHE_LIFETIME', 3600); // Default cache lifetime in seconds (1 hour)
define('CACHE_DIR', __DIR__ . '/cache');

// File paths
define('LOG_DIR', __DIR__ . '/logs');
define('UPLOAD_DIR', __DIR__ . '/uploads');

// Ensure log directory exists
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

// Ensure cache directory exists
if (!file_exists(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0755, true);
}

// Ensure upload directory exists
if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

/**
 * Get database connection using the configured credentials
 *
 * @return mysqli|null Database connection or null on failure
 */
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            logToFile('Database connection failed: ' . $conn->connect_error, 'db_error.log');
            return null;
        }
        
        // Set proper charset
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        logToFile('Database connection exception: ' . $e->getMessage(), 'db_error.log');
        return null;
    }
}

/**
 * Log message to file
 * 
 * @param string $message Message to log
 * @param string $filename Filename to log to
 * @return void
 */
function logToFile($message, $filename = 'general.log') {
    $timestamp = date('Y-m-d H:i:s');
    $logFile = LOG_DIR . '/' . $filename;
    
    file_put_contents(
        $logFile, 
        "[$timestamp] $message" . PHP_EOL, 
        FILE_APPEND
    );
}

/**
 * Send JSON response and exit
 * 
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 * @return void
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
