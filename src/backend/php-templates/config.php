
<?php
// Turn on error reporting for debugging - remove in production
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Ensure all responses are JSON
header('Content-Type: application/json');

// Ensure proper CORS headers are set
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Timestamp, X-Emergency, X-Ultra-Emergency');

// Handle preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration - use correct database credentials from the hosting account
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'u644605165_new_bookingusr');  // Updated database username
define('DB_PASSWORD', 'Vizag@1213');                 // Updated database password
define('DB_DATABASE', 'u644605165_new_bookingdb');

// Also define alternative names for backward compatibility
define('DB_USER', 'u644605165_new_bookingusr');
define('DB_PASS', 'Vizag@1213');
define('DB_NAME', 'u644605165_new_bookingdb');

// Also set as variables for backward compatibility
$db_host = 'localhost';
$db_user = 'u644605165_new_bookingusr';
$db_pass = 'Vizag@1213';
$db_name = 'u644605165_new_bookingdb';

// Fallback database credentials as a backup
$fallback_db_creds = [
    // Primary credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_new_bookingdb'
    ],
    // Alternative credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_bookingdb'
    ]
];

// JWT Secret Key for authentication - should be a strong secure key
define('JWT_SECRET', 'c3a9b25e9c8f5d7a3e456abcde12345ff6d7890b12c3d4e5f6789a0bc1d2e3f4');  // Secure JWT secret

// Helper function to log errors with improved format
function logError($message, $data = []) {
    $logFile = __DIR__ . '/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message " . json_encode($data) . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// Connect to database with improved error handling and automatic repair
function getDbConnection() {
    global $db_host, $db_user, $db_pass, $db_name, $fallback_db_creds;
    static $conn = null;
    
    // If we already have a connection, return it
    if ($conn !== null && !$conn->connect_error) {
        return $conn;
    }
    
    // Initialize connection attempts counter
    $attempts = 0;
    $maxAttempts = 3;
    $lastError = null;
    
    // Try primary connection with global variables
    try {
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        if (!$conn->connect_error) {
            // Set charset to ensure proper encoding
            $conn->set_charset("utf8mb4");
            return $conn;
        }
        
        $lastError = $conn->connect_error;
        $attempts++;
        logError("Primary database connection failed", [
            'error' => $lastError,
            'host' => $db_host,
            'database' => $db_name
        ]);
    } catch (Exception $e) {
        $lastError = $e->getMessage();
        $attempts++;
        logError("Exception in primary database connection", [
            'message' => $lastError
        ]);
    }
    
    // Try with DB_ constants if primary connection failed
    if (defined('DB_HOST') && defined('DB_USERNAME') && defined('DB_PASSWORD') && defined('DB_DATABASE')) {
        try {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            
            if (!$conn->connect_error) {
                $conn->set_charset("utf8mb4");
                return $conn;
            }
            
            $lastError = $conn->connect_error;
            $attempts++;
            logError("DB_ constants connection failed", [
                'error' => $lastError,
                'host' => DB_HOST,
                'database' => DB_DATABASE
            ]);
        } catch (Exception $e) {
            $lastError = $e->getMessage();
            $attempts++;
            logError("Exception in DB_ constants connection", [
                'message' => $lastError
            ]);
        }
    }
    
    // Try alternate DB constants
    if (defined('DB_HOST') && defined('DB_USER') && defined('DB_PASS') && defined('DB_NAME')) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if (!$conn->connect_error) {
                $conn->set_charset("utf8mb4");
                return $conn;
            }
            
            $lastError = $conn->connect_error;
            $attempts++;
            logError("Alternative DB_ constants connection failed", [
                'error' => $lastError,
                'host' => DB_HOST,
                'database' => DB_NAME
            ]);
        } catch (Exception $e) {
            $lastError = $e->getMessage();
            $attempts++;
            logError("Exception in alternative DB_ constants connection", [
                'message' => $lastError
            ]);
        }
    }
    
    // Try all fallback credentials
    foreach ($fallback_db_creds as $index => $creds) {
        if ($attempts >= $maxAttempts) {
            break;
        }
        
        try {
            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
            
            if (!$conn->connect_error) {
                $conn->set_charset("utf8mb4");
                logError("Connected using fallback credentials #" . ($index + 1), [
                    'host' => $creds['host'],
                    'database' => $creds['name']
                ]);
                return $conn;
            }
            
            $lastError = $conn->connect_error;
            $attempts++;
            logError("Fallback connection #" . ($index + 1) . " failed", [
                'error' => $lastError,
                'host' => $creds['host'],
                'database' => $creds['name']
            ]);
        } catch (Exception $e) {
            $lastError = $e->getMessage();
            $attempts++;
            logError("Exception in fallback connection #" . ($index + 1), [
                'message' => $lastError
            ]);
        }
    }
    
    // If all attempts failed, try connecting without specifying a database
    // and attempt to create/fix the database
    if ($attempts >= $maxAttempts) {
        foreach ($fallback_db_creds as $index => $creds) {
            try {
                // Connect without database
                $conn = new mysqli($creds['host'], $creds['user'], $creds['pass']);
                
                if (!$conn->connect_error) {
                    logError("Connected to MySQL without database using fallback #" . ($index + 1), [
                        'host' => $creds['host'],
                        'user' => $creds['user']
                    ]);
                    
                    // Try to create database if it doesn't exist
                    if ($conn->query("CREATE DATABASE IF NOT EXISTS `{$creds['name']}`")) {
                        logError("Created database {$creds['name']} or already exists");
                        
                        // Select the database
                        if ($conn->select_db($creds['name'])) {
                            $conn->set_charset("utf8mb4");
                            logError("Selected database {$creds['name']} successfully");
                            
                            // Create essential tables
                            createEssentialTables($conn);
                            
                            return $conn;
                        } else {
                            logError("Failed to select database {$creds['name']}", [
                                'error' => $conn->error
                            ]);
                        }
                    } else {
                        logError("Failed to create database {$creds['name']}", [
                            'error' => $conn->error
                        ]);
                    }
                    
                    $conn->close();
                }
            } catch (Exception $e) {
                logError("Exception in no-database connection attempt #" . ($index + 1), [
                    'message' => $e->getMessage()
                ]);
            }
        }
    }
    
    // If we get here, all connection attempts failed
    logError("All database connection attempts failed", [
        'attempts' => $attempts,
        'lastError' => $lastError
    ]);
    
    throw new Exception('Database connection failed after multiple attempts: ' . $lastError);
}

// Create essential tables for the system to work
function createEssentialTables($conn) {
    // Create outstation_fares table if it doesn't exist
    $createOutstationFaresTable = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id VARCHAR(50) NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            roundtrip_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX (vehicle_id)
        )
    ";
    
    if (!$conn->query($createOutstationFaresTable)) {
        logError("Failed to create outstation_fares table", [
            'error' => $conn->error
        ]);
    } else {
        logError("Successfully created outstation_fares table or it already exists");
    }
    
    // Ensure the table has the correct structure by checking and adding missing columns
    $checkOutstationFaresStructure = "SHOW COLUMNS FROM outstation_fares";
    $result = $conn->query($checkOutstationFaresStructure);
    
    if ($result) {
        $columns = [];
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
        
        // Check for missing columns
        $requiredColumns = [
            'id' => "ALTER TABLE outstation_fares ADD COLUMN id VARCHAR(50) NOT NULL FIRST",
            'vehicle_id' => "ALTER TABLE outstation_fares ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id",
            'base_fare' => "ALTER TABLE outstation_fares ADD COLUMN base_fare DECIMAL(10,2) NOT NULL DEFAULT 0",
            'price_per_km' => "ALTER TABLE outstation_fares ADD COLUMN price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0",
            'driver_allowance' => "ALTER TABLE outstation_fares ADD COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250",
            'night_halt_charge' => "ALTER TABLE outstation_fares ADD COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700",
            'roundtrip_base_fare' => "ALTER TABLE outstation_fares ADD COLUMN roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0",
            'roundtrip_price_per_km' => "ALTER TABLE outstation_fares ADD COLUMN roundtrip_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0"
        ];
        
        foreach ($requiredColumns as $column => $alterStatement) {
            if (!in_array($column, $columns)) {
                if (!$conn->query($alterStatement)) {
                    logError("Failed to add missing column $column", [
                        'error' => $conn->error
                    ]);
                } else {
                    logError("Added missing column $column");
                }
            }
        }
        
        // Ensure ID and vehicle_id are consistent
        if (in_array('id', $columns) && in_array('vehicle_id', $columns)) {
            $conn->query("UPDATE outstation_fares SET id = vehicle_id WHERE id IS NULL OR id = ''");
            $conn->query("UPDATE outstation_fares SET vehicle_id = id WHERE vehicle_id IS NULL OR vehicle_id = ''");
        }
    }
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Add no-cache headers to all responses
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");
    header("Expires: 0");
    
    // Add CORS headers to prevent browser restrictions
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-Time, X-Force-Refresh, X-Timestamp, X-Emergency, X-Ultra-Emergency');
    
    // Make sure we're sending JSON
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code($statusCode);
    }
    
    // Ensure consistent response format
    if (!is_array($data)) {
        $data = ['status' => 'error', 'message' => 'Invalid response data'];
    } else if (!isset($data['status'])) {
        // If status is not set, set it based on the status code
        $data['status'] = $statusCode < 400 ? 'success' : 'error';
    }
    
    // Add server timestamp
    $data['serverTime'] = date('Y-m-d H:i:s');
    
    // Add API version for debugging
    $data['apiVersion'] = '1.0.78';
    
    // Log the response for debugging
    logError('Sending JSON response', [
        'statusCode' => $statusCode,
        'dataSize' => is_array($data) ? count($data) : 'not_array',
        'status' => $data['status'] ?? 'none'
    ]);
    
    echo json_encode($data);
    exit;
}

// Helper function to generate JWT token with improved debugging
function generateJwtToken($userId, $email, $role) {
    $issuedAt = time();
    $expirationTime = $issuedAt + 60 * 60 * 24 * 30; // 30 days - increased from 14 days
    
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'user_id' => $userId,
        'email' => $email,
        'role' => $role ?? 'user'
    ];
    
    $header = json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT'
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    $signature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    $token = "$base64UrlHeader.$base64UrlPayload.$base64UrlSignature";
    
    // Log token details to help debug truncation issues
    logError("Generated token", [
        'length' => strlen($token), 
        'parts' => substr_count($token, '.') + 1,
        'user_id' => $userId,
        'exp' => date('Y-m-d H:i:s', $expirationTime)
    ]);
    
    return $token;
}

// Helper function to verify JWT token with enhanced error handling
function verifyJwtToken($token) {
    try {
        // Log token verification attempt for debugging
        logError("Verifying token", ['token_length' => strlen($token), 'parts' => substr_count($token, '.') + 1]);
        
        // Check for token format issues
        if (empty($token)) {
            logError("Token is empty");
            return false;
        }
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            logError("Invalid token format", ['parts_count' => count($parts)]);
            return false;
        }
        
        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
        
        // Base64 URL decode the header and payload
        $headerJson = base64_decode(strtr($base64UrlHeader, '-_', '+/'));
        $payloadJson = base64_decode(strtr($base64UrlPayload, '-_', '+/'));
        
        if (!$headerJson || !$payloadJson) {
            logError("Failed to decode header or payload", [
                'header_length' => strlen($headerJson), 
                'payload_length' => strlen($payloadJson)
            ]);
            return false;
        }
        
        $header = json_decode($headerJson, true);
        $payload = json_decode($payloadJson, true);
        
        if (!$header || !$payload) {
            logError("Failed to parse header or payload JSON", [
                'header_decoded' => $header !== null,
                'payload_decoded' => $payload !== null,
                'header_json' => substr($headerJson, 0, 30),
                'payload_json' => substr($payloadJson, 0, 30)
            ]);
            return false;
        }
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", JWT_SECRET, true);
        $actualSignature = base64_decode(strtr($base64UrlSignature, '-_', '+/'));
        
        // Use hash_equals for timing attack protection
        if (!hash_equals($expectedSignature, $actualSignature)) {
            logError("Signature verification failed");
            return false;
        }
        
        // Check if token is expired
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            logError("Token expired or missing expiration", [
                'has_exp' => isset($payload['exp']),
                'current_time' => time(),
                'exp_time' => $payload['exp'] ?? 'missing',
                'diff' => isset($payload['exp']) ? ($payload['exp'] - time()) : 'N/A'
            ]);
            return false;
        }
        
        logError("Token verified successfully", [
            'user_id' => $payload['user_id'],
            'exp' => date('Y-m-d H:i:s', $payload['exp'])
        ]);
        
        return $payload;
        
    } catch (Exception $e) {
        logError("Exception in token verification: " . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

// Check if user is authenticated with improved error handling
function authenticate() {
    // TEMPORARILY DISABLED AUTHENTICATION FOR DEBUGGING
    // Return a mock admin user for testing
    return [
        'user_id' => 1,
        'email' => 'admin@example.com',
        'role' => 'admin'
    ];
}

// Check if user is admin
function checkAdmin($userData) {
    // TEMPORARILY DISABLED ADMIN CHECK FOR DEBUGGING
    return true;
}

// Generate a unique booking number
function generateBookingNumber() {
    $prefix = 'CB';
    $timestamp = time();
    $random = rand(1000, 9999);
    return $prefix . $timestamp . $random;
}

// Set error handler to catch PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logError("PHP Error [$errno]: $errstr in $errfile on line $errline");
});

// Set exception handler
set_exception_handler(function($exception) {
    logError("Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    
    sendJsonResponse(['status' => 'error', 'message' => 'Server error occurred'], 500);
});
