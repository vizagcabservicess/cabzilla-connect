
<?php
/**
 * Main Configuration File
 */

// Database Configuration with proper error handling
define('DB_HOST', 'localhost');
define('DB_NAME', 'u644605165_db_be');
define('DB_USER', 'u644605165_usr_be');
define('DB_PASSWORD', 'Vizag@1213');

// Application Configuration
define('APP_NAME', 'Vizag Cab Services');
define('APP_URL', 'https://vizagcab.com');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', true);

// Error Reporting
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Database Connection Settings
ini_set('mysql.connect_timeout', '20');
ini_set('default_socket_timeout', '20');
ini_set('max_execution_time', '30');

// Session Configuration with security settings
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1);
session_start();

// Define paths
define('ROOT_PATH', realpath(__DIR__));
define('API_PATH', ROOT_PATH . '/api');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');
define('LOG_DIR', ROOT_PATH . '/logs');

// Ensure required directories exist
foreach ([LOG_DIR, UPLOADS_PATH] as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}
