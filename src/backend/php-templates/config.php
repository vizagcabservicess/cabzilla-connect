
<?php
/**
 * Main Configuration File
 * 
 * This file contains all configuration settings for the application.
 */

// Database Configuration
define('DB_HOST', 'localhost');          // Database host
define('DB_NAME', 'u644605165_db_be');   // Database name
define('DB_USER', 'u644605165_usr_be');  // Database username
define('DB_PASSWORD', 'Vizag@1213');     // Database password

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

// Log directory
define('LOG_DIR', __DIR__ . '/logs');

// Ensure log directory exists
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0777, true);
}

// Session Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
session_start();

// Define paths
define('ROOT_PATH', realpath(__DIR__));
define('API_PATH', ROOT_PATH . '/api');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

// Ensure uploads directory exists
if (!file_exists(UPLOADS_PATH)) {
    mkdir(UPLOADS_PATH, 0777, true);
}
