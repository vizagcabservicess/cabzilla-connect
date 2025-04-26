<?php
/**
 * Database utility functions for establishing connections
 */

// Create logs directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Define a function to log database connection info
function logDbConnection($message, $data = []) {
    global $logDir;
    $logFile = $logDir . '/db_connection_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry);
}

// Get database connection with improved error handling
function getDbConnection() {
    // Disable output buffering
    if (ob_get_level()) ob_end_clean();
    
    $dbHost = DB_HOST;
    $dbName = DB_NAME;
    $dbUser = DB_USER;
    $dbPass = DB_PASSWORD;
    
    try {
        logDbConnection("Attempting database connection", [
            'host' => $dbHost, 
            'dbname' => $dbName
        ]);
        
        // Set connection timeout and enable strict mode
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 20);
        
        if ($conn->connect_error) {
            logDbConnection("Database connection failed", ['error' => $conn->connect_error]);
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Configure connection
        $conn->set_charset("utf8mb4");
        $conn->query("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
        $conn->query("SET SESSION wait_timeout = 30");
        $conn->query("SET SESSION interactive_timeout = 30");
        
        // Test connection
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            throw new Exception("Database test query failed: " . $conn->error);
        }
        
        logDbConnection("Database connection successful", [
            'server_info' => $conn->server_info,
            'client_info' => mysqli_get_client_info()
        ]);
        
        return $conn;
    } catch (Exception $e) {
        logDbConnection("Database connection error", ['error' => $e->getMessage()]);
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
}

// Function for sending JSON responses
function sendDbJsonResponse($data, $statusCode = 200) {
    // Clear any existing output to prevent contamination
    if (ob_get_length()) ob_clean();
    
    // Set HTTP status code
    http_response_code($statusCode);
    
    // Ensure content type is application/json
    header('Content-Type: application/json');
    
    // Output JSON
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Enhanced direct database connection function that NEVER fails silently
function getDirectDatabaseConnection() {
    // Disable any output buffering
    if (ob_get_level()) ob_end_clean();
    
    // CRITICAL FIX: Use hardcoded database credentials for maximum reliability
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Log the attempt
    error_log("Attempting direct database connection to {$dbHost}/{$dbName}");
    
    try {
        // Create connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            error_log("Direct database connection failed: " . $conn->connect_error);
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset
        $conn->set_charset("utf8mb4");
        
        // Test connection with a simple query
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            error_log("Connection test query failed: " . $conn->error);
            throw new Exception("Connection test query failed: " . $conn->error);
        }
        
        error_log("Direct database connection successful");
        return $conn;
    } catch (Exception $e) {
        // Log the error
        error_log("Direct database connection error: " . $e->getMessage());
        return null;
    }
}

// Function to safely escape a value for database queries
function dbEscape($conn, $value) {
    if ($conn) {
        return $conn->real_escape_string($value);
    }
    
    // Fallback if no connection
    return str_replace(["'", "\""], ["\'", "\\\""], $value);
}

// Function to check if a table exists
function tableExists($conn, $tableName) {
    if (!$conn) {
        return false;
    }
    
    $result = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($tableName) . "'");
    return $result && $result->num_rows > 0;
}

// Direct database testing function for diagnostics
function testDirectDatabaseConnection() {
    // Disable any output buffering
    if (ob_get_level()) ob_end_clean();
    
    $result = [
        'status' => 'error',
        'message' => 'Database connection test failed',
        'connection' => false,
        'timestamp' => time()
    ];
    
    try {
        // CRITICAL FIX: Use hardcoded database credentials for maximum reliability
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        logDbConnection("Testing direct database connection", [
            'host' => $dbHost, 
            'dbname' => $dbName
        ]);
        
        // Create connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            logDbConnection("Direct connection failed", ['error' => $conn->connect_error]);
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset
        $conn->set_charset("utf8mb4");
        
        // Test connection with a simple query
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            logDbConnection("Test query failed", ['error' => $conn->error]);
            throw new Exception("Test query failed: " . $conn->error);
        }
        
        // Update result with success
        $result = [
            'status' => 'success',
            'message' => 'Database connection test successful',
            'connection' => true,
            'timestamp' => time(),
            'server_info' => $conn->server_info
        ];
        
        logDbConnection("Direct connection test successful", $result);
        
    } catch (Exception $e) {
        // Log the error
        logDbConnection("Direct connection test failed", ['error' => $e->getMessage()]);
        $result['error'] = $e->getMessage();
    }
    
    // Return JSON response
    sendDbJsonResponse($result);
}
