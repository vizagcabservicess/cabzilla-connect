<?php
// Load environment variables first
require_once __DIR__ . '/env-loader.php';

// NOTE: Headers are set by individual API files to avoid "headers already sent" errors
// Do NOT set headers here as env-loader.php may output content
// Each API file (book.php, etc.) sets its own headers

/**
 * Global Configuration File
 */

// Application Configuration
define('APP_NAME', 'Vizag Taxi Hub');
define('APP_URL', 'https://vizagtaxihub.com');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', false); // Set to false for production

// Database Configuration - CRITICAL: Use environment variables only
define('DB_HOST', $_ENV['DB_HOST'] ?? null);
define('DB_NAME', $_ENV['DB_NAME'] ?? null);
define('DB_USER', $_ENV['DB_USER'] ?? null);
define('DB_PASS', $_ENV['DB_PASS'] ?? null);

// JWT Configuration - CRITICAL: Use environment variable only
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? null);

// WhatsApp Cloud API Configuration (Meta Graph API)
// One access token per Meta app; two “from” numbers → two phone number IDs.
// Trip line (+91 93919…): WHATSAPP_PHONE_NUMBER_ID_TRIP | Payment line (+91 85006…): WHATSAPP_PHONE_NUMBER_ID_PAYMENT
// Legacy: WHATSAPP_PHONE_NUMBER_ID used if TRIP/PAYMENT not set.
define('WHATSAPP_GRAPH_API_VERSION', $_ENV['WHATSAPP_GRAPH_API_VERSION'] ?? '22.0');
define('WHATSAPP_PHONE_NUMBER_ID_TRIP', $_ENV['WHATSAPP_PHONE_NUMBER_ID_TRIP'] ?? $_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? null);
define('WHATSAPP_PHONE_NUMBER_ID_PAYMENT', $_ENV['WHATSAPP_PHONE_NUMBER_ID_PAYMENT'] ?? null);
define('WHATSAPP_PHONE_NUMBER_ID', $_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? null);
define('WHATSAPP_ACCESS_TOKEN', $_ENV['WHATSAPP_ACCESS_TOKEN'] ?? null);
define('WHATSAPP_ADMIN_PHONE', $_ENV['WHATSAPP_ADMIN_PHONE'] ?? '919966363662');
/** Comma-separated E.164 digits (e.g. 9198...,9180...). Falls back to WHATSAPP_ADMIN_PHONE when empty. */
define('WHATSAPP_ADMIN_PHONES', $_ENV['WHATSAPP_ADMIN_PHONES'] ?? '');
define('WHATSAPP_TEMPLATE_NAME', $_ENV['WHATSAPP_TEMPLATE_NAME'] ?? 'abandoned_payment_alert');
define('WHATSAPP_TEMPLATE_LANGUAGE', $_ENV['WHATSAPP_TEMPLATE_LANGUAGE'] ?? 'en');

/** Shared secret for cron URLs (e.g. admin tomorrow reminder). Optional; if unset, cron endpoint rejects requests. */
define('ADMIN_CRON_SECRET', $_ENV['ADMIN_CRON_SECRET'] ?? '');

// SECURITY: Fail if critical credentials not configured
if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASS || !JWT_SECRET) {
    error_log('CRITICAL: Database or JWT credentials not configured in environment');
    http_response_code(500);
    die('Configuration error: Missing required environment variables');
}

// Database Connection Settings - Increased timeouts for stability
ini_set('mysql.connect_timeout', '30');
ini_set('default_socket_timeout', '30');
ini_set('max_execution_time', '60');

// CRITICAL: Set timezone to IST for all date/time operations
date_default_timezone_set('Asia/Kolkata');
ini_set('date.timezone', 'Asia/Kolkata');

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

// str_starts_with polyfill for PHP < 8.0
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return $needle === '' || substr($haystack, 0, strlen($needle)) === $needle;
    }
}

// str_contains polyfill for PHP < 8.0 (ocr-extractor and other API code)
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

// mb_substr fallback when ext-mbstring is missing (shared hosts)
if (!function_exists('mb_substr')) {
    function mb_substr($str, $start, $length = null) {
        if ($str === null || $str === '') {
            return '';
        }
        return $length === null ? substr($str, $start) : substr($str, $start, $length);
    }
}

// getallheaders polyfill for nginx/php-fpm (Apache provides it natively)
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) === 'HTTP_') {
                $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$key] = $value;
            }
        }
        return $headers;
    }
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

// Enhanced database connection function
if (!function_exists('getDbConnection')) {
    function getDbConnection() {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception('Connection failed: ' . $conn->connect_error);
        }
        $conn->set_charset("utf8mb4");
        
        // CRITICAL: Set database session timezone to IST
        $conn->query("SET time_zone = '+05:30';");
        
        return $conn;
    }
}

// PDO connection - same DB as getDbConnection, for endpoints that require PDO (e.g. direct-outstation-fares)
if (!function_exists('getPdoConnection')) {
    function getPdoConnection() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $conn = new PDO($dsn, DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->exec("SET time_zone = '+05:30'");
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
        header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : ''));
        header('Access-Control-Allow-Credentials: true');
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
        $signature = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
        
        return "$header.$payload.$signature";
    }
}

