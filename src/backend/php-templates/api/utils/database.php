
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
    // Disable any output buffering
    if (ob_get_level()) ob_end_clean();
    
    // Database credentials - CRITICAL: DIRECT HARD-CODED VALUES FOR RELIABILITY
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        logDbConnection("Attempting database connection", [
            'host' => $dbHost, 
            'dbname' => $dbName
        ]);
        
        // Create connection with error reporting
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            logDbConnection("Database connection failed", ['error' => $conn->connect_error]);
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset to prevent encoding issues
        $conn->set_charset("utf8mb4");
        
        // Test connection with a simple query to ensure it's working
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            logDbConnection("Database test query failed", ['error' => $conn->error]);
            throw new Exception("Database connection test query failed: " . $conn->error);
        }
        
        logDbConnection("Database connection successful", ['server_info' => $conn->server_info]);
        return $conn;
    } catch (Exception $e) {
        // Log error to both custom log and PHP error log
        logDbConnection("Database connection error", ['error' => $e->getMessage()]);
        error_log("Database connection error: " . $e->getMessage());
        
        return null;
    }
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
        
        // Check if bookings table exists
        $bookingsTableExists = tableExists($conn, 'bookings');
        
        // Try simple insert and delete on bookings table
        $testInsertSuccess = false;
        
        if ($bookingsTableExists) {
            // Generate test booking number
            $testBookingNumber = 'TEST' . time() . rand(1000, 9999);
            
            // Try insert with MINIMUM required fields only
            $testInsertSql = "INSERT INTO bookings (booking_number, pickup_location, pickup_date, cab_type, trip_type, trip_mode, total_amount, passenger_name, passenger_phone, passenger_email) 
                             VALUES ('$testBookingNumber', 'Test connection', NOW(), 'Test', 'test', 'test', 100, 'Test User', '1234567890', 'test@example.com')";
            $testInsertResult = $conn->query($testInsertSql);
            
            $testInsertSuccess = $testInsertResult !== false;
            logDbConnection("Test insert result", [
                'success' => $testInsertSuccess, 
                'error' => $testInsertSuccess ? null : $conn->error,
                'sql' => $testInsertSql
            ]);
            
            // Delete test record
            if ($testInsertSuccess) {
                $conn->query("DELETE FROM bookings WHERE booking_number = '$testBookingNumber'");
            }
        }
        
        // Build success response
        $result = [
            'status' => 'success',
            'message' => 'Database connection and query test successful',
            'connection' => true,
            'timestamp' => time(),
            'server' => $conn->server_info ?? 'unknown',
            'php_version' => phpversion(),
            'bookings_table_exists' => $bookingsTableExists,
            'test_insert_success' => $testInsertSuccess
        ];
        
        logDbConnection("Direct test successful", ['result' => $result]);
        
        // Close connection
        $conn->close();
        
    } catch (Exception $e) {
        // Log error and build error response
        logDbConnection("Direct database connection test failed", ['error' => $e->getMessage()]);
        
        $result = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'connection' => false,
            'timestamp' => time(),
            'php_version' => phpversion(),
            'mysql_client_version' => mysqli_get_client_info()
        ];
    }
    
    return $result;
}

// Function to verify database integrity
function verifyDatabaseIntegrity($conn) {
    if (!$conn) {
        return ['status' => 'error', 'message' => 'No database connection'];
    }
    
    $requiredTables = ['bookings'];
    $missingTables = [];
    
    foreach ($requiredTables as $table) {
        if (!tableExists($conn, $table)) {
            $missingTables[] = $table;
        }
    }
    
    if (count($missingTables) > 0) {
        return [
            'status' => 'warning', 
            'message' => 'Missing required tables', 
            'missing_tables' => $missingTables
        ];
    }
    
    return ['status' => 'success', 'message' => 'Database integrity verified'];
}
