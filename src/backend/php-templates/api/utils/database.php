
<?php
/**
 * Database utility functions for establishing connections
 */

// Get database connection with improved error handling
function getDbConnection() {
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        // Create connection with error reporting
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error);
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset to prevent encoding issues
        $conn->set_charset("utf8mb4");
        
        // Test connection with a simple query to ensure it's working
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            throw new Exception("Database connection test query failed: " . $conn->error);
        }
        
        return $conn;
    } catch (Exception $e) {
        // Log error to both custom log and PHP error log
        error_log("Database connection error: " . $e->getMessage());
        
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        
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
    
    $requiredTables = ['users', 'bookings', 'vehicles', 'local_fares', 'outstation_fares', 'airport_fares'];
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

// Enhanced database connection with retry mechanism
function getDbConnectionWithRetry($maxRetries = 3) {
    $retries = 0;
    $lastError = null;
    
    while ($retries < $maxRetries) {
        try {
            // Database credentials
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
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
            
            // Ensure the connection is properly established
            if (!$conn->ping()) {
                throw new Exception("Connection ping failed: " . $conn->error);
            }
            
            error_log("Database connection successful");
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            error_log("Database connection attempt $retries failed: " . $e->getMessage());
            
            if ($retries < $maxRetries) {
                // Wait a bit before retry (exponential backoff)
                usleep(500000 * $retries); // 500ms, 1s, 1.5s
            }
        }
    }
    
    // If we get here, all retry attempts failed
    error_log("All database connection attempts failed after $maxRetries retries");
    
    if ($lastError) {
        // Log the last error
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] All connection attempts failed: " . $lastError->getMessage() . "\n", FILE_APPEND);
    }
    
    return null;
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
            throw new Exception("Test query failed: " . $conn->error);
        }
        
        // Check if bookings table exists
        $bookingsTableExists = tableExists($conn, 'bookings');
        
        // Get bookings columns if table exists
        $bookingsColumns = [];
        $bookingsCount = 0;
        
        if ($bookingsTableExists) {
            $columnsResult = $conn->query("SHOW COLUMNS FROM bookings");
            while ($column = $columnsResult->fetch_assoc()) {
                $bookingsColumns[] = $column['Field'];
            }
            
            // Count bookings
            $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
            $countRow = $countResult->fetch_assoc();
            $bookingsCount = $countRow['count'];
        }
        
        // Try simple insert and delete on bookings table
        $testInsertSuccess = false;
        
        if ($bookingsTableExists) {
            // Generate test booking number
            $testBookingNumber = 'TEST' . time() . rand(1000, 9999);
            
            // Try insert
            $testInsertSql = "INSERT INTO bookings (booking_number, pickup_location, status) VALUES ('$testBookingNumber', 'Test connection', 'test')";
            $testInsertResult = $conn->query($testInsertSql);
            
            $testInsertSuccess = $testInsertResult !== false;
            
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
            'bookings_columns' => $bookingsColumns,
            'bookings_column_count' => count($bookingsColumns),
            'bookings_count' => $bookingsCount,
            'test_insert_success' => $testInsertSuccess
        ];
        
        // Close connection
        $conn->close();
        
    } catch (Exception $e) {
        // Log error and build error response
        error_log("Direct database connection test failed: " . $e->getMessage());
        
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
