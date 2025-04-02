
<?php
/**
 * db_helper.php - Common database connection helper
 */

/**
 * Get a database connection with retry mechanism
 * 
 * @param int $maxRetries Maximum number of connection attempts
 * @return mysqli|null Database connection object or null if connection fails
 * @throws Exception If connection fails after max retries
 */
function getDbConnectionWithRetry($maxRetries = 3) {
    $attempts = 0;
    $lastError = null;
    
    while ($attempts < $maxRetries) {
        try {
            $attempts++;
            
            // Define database connection with correct credentials
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if ($conn->connect_error) {
                throw new Exception("Connection failed: " . $conn->connect_error);
            }
            
            // Test the connection
            $testResult = $conn->query("SELECT 1");
            if (!$testResult) {
                throw new Exception("Test query failed");
            }
            
            // Set connection timeout settings
            $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 30);
            $conn->query("SET SESSION wait_timeout=300"); // 5 minutes
            $conn->query("SET SESSION interactive_timeout=300"); // 5 minutes
            
            // Success - return the connection
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            
            // Wait before retry
            if ($attempts < $maxRetries) {
                usleep(500000 * $attempts); // Increase wait time with each attempt
            }
        }
    }
    
    // All attempts failed
    throw new Exception("Failed to connect to database after $maxRetries attempts: " . $lastError->getMessage());
}

/**
 * Write to application log
 * 
 * @param string $message Message to log
 * @param string $logFileName Name of log file
 * @return void
 */
function logMessage($message, $logFileName = 'application.log') {
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $logFileName);
}

/**
 * Send API response as JSON
 * 
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 * @return void
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
    exit;
}
