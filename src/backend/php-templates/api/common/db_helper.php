
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
            
            // Define database connection with consistent credentials across all endpoints
            // Use the same credentials that work for the vehicle check
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            // Log database connection attempt
            logMessage("Attempting database connection (attempt $attempts) to $dbHost/$dbName as $dbUser", 'db_connection.log');
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if ($conn->connect_error) {
                throw new Exception("Connection failed: " . $conn->connect_error);
            }
            
            // Test the connection with a simple query
            $testResult = $conn->query("SELECT 1");
            if (!$testResult) {
                throw new Exception("Test query failed: " . $conn->error);
            }
            
            // Set connection timeout and character set
            $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 30);
            $conn->set_charset('utf8mb4');
            $conn->query("SET SESSION wait_timeout=300"); // 5 minutes
            $conn->query("SET SESSION interactive_timeout=300"); // 5 minutes
            
            // Log successful connection
            logMessage("Database connection established successfully", 'db_connection.log');
            
            // Success - return the connection
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            logMessage("Connection attempt {$attempts} failed: " . $e->getMessage(), 'db_connection.log');
            
            // Wait before retry with increasing delay
            if ($attempts < $maxRetries) {
                usleep(500000 * $attempts); // Increase wait time with each attempt
            }
        }
    }
    
    // All attempts failed
    logMessage("Failed to connect to database after {$maxRetries} attempts: " . $lastError->getMessage(), 'db_connection.log');
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
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Check database connection and return status
 * 
 * @return array Connection status information
 */
function checkDatabaseConnection() {
    try {
        $conn = getDbConnectionWithRetry(2);
        
        // Check if vehicles table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
        $vehiclesTableExists = $tableCheckResult->num_rows > 0;
        
        // Get row count if table exists
        $vehicleCount = 0;
        if ($vehiclesTableExists) {
            $countResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
            if ($countResult) {
                $vehicleCount = $countResult->fetch_assoc()['count'];
            }
        }
        
        // Close connection
        $conn->close();
        
        return [
            'status' => 'success',
            'connection' => true,
            'tables' => [
                'vehicles' => [
                    'exists' => $vehiclesTableExists,
                    'count' => $vehicleCount
                ]
            ],
            'timestamp' => time()
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => $e->getMessage(),
            'connection' => false,
            'timestamp' => time()
        ];
    }
}
