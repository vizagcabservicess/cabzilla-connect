
<?php
/**
 * Common database helper functions
 */

// Function to get a database connection with retry
function getDbConnectionWithRetry($maxRetries = 3) {
    $retries = 0;
    $conn = null;
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
            $dbName = 'u644605165_new_bookingdb';
            $dbUser = 'u644605165_new_bookingusr';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            // Add a small delay before retry
            if ($retries < $maxRetries) {
                sleep(1);
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

// Log message to a file
function logMessage($message, $logFile = 'api.log') {
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $logFile);
}
