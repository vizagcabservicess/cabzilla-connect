
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
            // Try to use config if available
            if (file_exists(dirname(__FILE__) . '/../../config.php')) {
                require_once dirname(__FILE__) . '/../../config.php';
                $conn = getDbConnection();
                if ($conn) return $conn;
            }
            
            // If config not available or connection failed, use hardcoded credentials
            $dbHost = 'localhost';
            $dbName = 'u64460565_db_be';
            $dbUser = 'u64460565_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            // Set proper charset
            $conn->set_charset("utf8mb4");
            
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            
            if ($retries < $maxRetries) {
                sleep(1); // Delay before retry
            }
        }
    }
    
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
        
        if ($isConnected) {
            // Get database version
            $versionResult = $conn->query("SELECT VERSION() as version");
            if ($versionResult && $row = $versionResult->fetch_assoc()) {
                $version = $row['version'];
            }
            
            $conn->close();
        }
        
        return [
            'status' => $isConnected ? 'success' : 'error',
            'connection' => $isConnected,
            'version' => $version,
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
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $logFile);
}
