
<?php
/**
 * Database utility functions for establishing connections
 */

// Define a function to log database connection info
function logDbConnection($message, $data = []) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
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
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        logDbConnection("Attempting database connection", [
            'host' => $dbHost, 
            'dbname' => $dbName,
            'user' => $dbUser
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

// Direct database testing function for diagnostics
function testDirectDatabaseConnection() {
    $result = [
        'status' => 'error',
        'message' => 'Database connection test failed',
        'connection' => false,
        'timestamp' => time()
    ];
    
    try {
        // Database credentials
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
            
            // Try insert
            $testInsertSql = "INSERT INTO bookings (booking_number, pickup_location, status) VALUES ('$testBookingNumber', 'Test connection', 'test')";
            $testInsertResult = $conn->query($testInsertSql);
            
            $testInsertSuccess = $testInsertResult !== false;
            logDbConnection("Test insert result", [
                'success' => $testInsertSuccess, 
                'error' => $testInsertSuccess ? null : $conn->error
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

// Enhanced direct database connection function
function getDirectDatabaseConnection() {
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        // Create connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset
        $conn->set_charset("utf8mb4");
        
        // Test connection with a simple query
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            throw new Exception("Connection test query failed: " . $conn->error);
        }
        
        return $conn;
    } catch (Exception $e) {
        // Log the error
        error_log("Direct database connection error: " . $e->getMessage());
        return null;
    }
}
