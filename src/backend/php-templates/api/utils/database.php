
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
        
        // Test connection with a simple query
        $testResult = $conn->query("SELECT 1");
        if (!$testResult) {
            throw new Exception("Connection test query failed: " . $conn->error);
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

// New function: Enhanced database connection with retry mechanism
function getDbConnectionWithRetry($maxRetries = 3) {
    $retries = 0;
    $lastError = null;
    
    while ($retries < $maxRetries) {
        try {
            $conn = getDbConnection();
            
            if ($conn && !$conn->connect_error) {
                // Successfully connected
                return $conn;
            }
            
            // Connection failed, let's retry
            $retries++;
            error_log("Database connection attempt $retries failed, retrying...");
            
            if ($retries < $maxRetries) {
                // Wait a bit before retry (exponential backoff)
                usleep(500000 * $retries); // 500ms, 1s, 1.5s
            }
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            error_log("Database connection exception on attempt $retries: " . $e->getMessage());
            
            if ($retries < $maxRetries) {
                usleep(500000 * $retries);
            }
        }
    }
    
    // If we get here, all retry attempts failed
    error_log("All database connection attempts failed after $maxRetries retries");
    
    // If there was an exception, rethrow it
    if ($lastError) {
        throw $lastError;
    }
    
    return null;
}
