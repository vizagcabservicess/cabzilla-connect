
<?php
/**
 * Common database helper functions
 * Production-ready database helpers for vizagup.com
 */

/**
 * Get a database connection with retry mechanism
 * 
 * @param int $maxRetries Maximum number of connection attempts
 * @return mysqli Database connection
 * @throws Exception If all connection attempts fail
 */
function getDbConnectionWithRetry($maxRetries = 3) {
    $retries = 0;
    $lastError = null;
    
    while ($retries < $maxRetries) {
        try {
            // Database credentials - ensure these match with database.php
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
            
            // Set proper charset
            $conn->set_charset("utf8mb4");
            
            // Test connection with a simple query
            $testResult = $conn->query("SELECT 1");
            if (!$testResult) {
                throw new Exception("Connection test query failed: " . $conn->error);
            }
            
            error_log("Database connection successful using db_helper");
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            error_log("Database connection attempt $retries failed: " . $e->getMessage());
            
            if ($retries < $maxRetries) {
                sleep(1); // Delay before retry
            }
        }
    }
    
    // Log the error details
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/db_connection_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] All connection attempts failed: " . ($lastError ? $lastError->getMessage() : 'Unknown error') . "\n", FILE_APPEND);
    
    // If we've exhausted all retries, throw the last error
    if ($lastError) {
        throw $lastError;
    } else {
        throw new Exception("Failed to connect to database after {$maxRetries} attempts");
    }
}

/**
 * Check database connection and return status
 *
 * @return array Connection status information
 */
function checkDatabaseConnection() {
    try {
        $conn = getDbConnectionWithRetry(2);
        
        $isConnected = ($conn instanceof mysqli && !$conn->connect_error);
        $version = null;
        $tables = [];
        
        if ($isConnected) {
            // Get database version
            $versionResult = $conn->query("SELECT VERSION() as version");
            if ($versionResult && $row = $versionResult->fetch_assoc()) {
                $version = $row['version'];
            }
            
            // Get list of tables
            $tablesResult = $conn->query("SHOW TABLES");
            if ($tablesResult) {
                while ($row = $tablesResult->fetch_array()) {
                    $tables[] = $row[0];
                }
            }
            
            $conn->close();
        }
        
        return [
            'status' => $isConnected ? 'success' : 'error',
            'connection' => $isConnected,
            'version' => $version,
            'tables' => $tables,
            'timestamp' => time()
        ];
    } catch (Exception $e) {
        error_log("Database connection check failed: " . $e->getMessage());
        return [
            'status' => 'error',
            'connection' => false,
            'message' => $e->getMessage(),
            'timestamp' => time()
        ];
    }
}

/**
 * Log message to a file with timestamp
 * 
 * @param string $message Message to log
 * @param string $logFile Log file name
 * @return void
 */
function logMessage($message, $logFile = 'api.log') {
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logDir . '/' . $logFile, "[$timestamp] " . $message . "\n", FILE_APPEND);
}

/**
 * Ensure the bookings table exists
 * 
 * @param mysqli $conn Database connection
 * @return bool True if table exists or was created successfully
 */
function ensureBookingsTableExists($conn) {
    // Check if the bookings table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableResult->num_rows === 0) {
        // Create the bookings table if it doesn't exist
        $createTableSql = "
        CREATE TABLE bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            booking_number VARCHAR(50) NOT NULL UNIQUE,
            pickup_location TEXT NOT NULL,
            drop_location TEXT,
            pickup_date DATETIME NOT NULL,
            return_date DATETIME,
            cab_type VARCHAR(50) NOT NULL,
            distance DECIMAL(10,2),
            trip_type VARCHAR(20) NOT NULL,
            trip_mode VARCHAR(20) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            passenger_name VARCHAR(100) NOT NULL,
            passenger_phone VARCHAR(20) NOT NULL,
            passenger_email VARCHAR(100) NOT NULL,
            hourly_package VARCHAR(50),
            tour_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $tableCreationResult = $conn->query($createTableSql);
        
        if (!$tableCreationResult) {
            error_log("Failed to create bookings table: " . $conn->error);
            return false;
        }
        
        error_log("Created bookings table successfully");
    }
    
    return true;
}
