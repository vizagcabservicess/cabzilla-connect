
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

// Directory settings
define('LOG_DIR', __DIR__ . '/logs');
define('CACHE_DIR', __DIR__ . '/cache');
define('DATA_DIR', __DIR__ . '/data');

// Database collation - ensure consistent collation across all tables
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATION', 'utf8mb4_unicode_ci');

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

// Function to get database connection
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset consistently
        $conn->set_charset(DB_CHARSET);
        
        // Set collation at session level to ensure consistency
        $conn->query("SET NAMES " . DB_CHARSET . " COLLATE " . DB_COLLATION);
        
        return $conn;
    } catch (Exception $e) {
        // Log error
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents(LOG_DIR . '/db_error_' . date('Y-m-d') . '.log', "[$timestamp] " . $e->getMessage() . "\n", FILE_APPEND);
        
        // For debugging only
        if (API_DEBUG) {
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'debug' => true
            ]);
            exit;
        }
        
        return null;
    }
}
