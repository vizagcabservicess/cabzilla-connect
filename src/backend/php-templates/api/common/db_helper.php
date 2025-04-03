
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
            
            // CRITICAL FIX: Make sure database credentials are consistent across all endpoints
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            // Log database connection attempt
            $logDir = dirname(__FILE__) . '/../../logs';
            if (!file_exists($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            error_log("Attempting database connection (attempt $attempts) to $dbHost/$dbName as $dbUser", 3, $logDir . '/db_connection.log');
            
            // IMPROVEMENT: Set connection options before connecting
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
            error_log("Database connection established successfully", 3, $logDir . '/db_connection.log');
            
            // Success - return the connection
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            
            $logDir = dirname(__FILE__) . '/../../logs';
            if (!file_exists($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            error_log("Connection attempt {$attempts} failed: " . $e->getMessage(), 3, $logDir . '/db_connection.log');
            
            // Wait before retry with increasing delay
            if ($attempts < $maxRetries) {
                usleep(500000 * $attempts); // Increase wait time with each attempt
            }
        }
    }
    
    // All attempts failed
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    error_log("Failed to connect to database after {$maxRetries} attempts: " . $lastError->getMessage(), 3, $logDir . '/db_connection.log');
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

/**
 * Check if local_package_fares table exists, create if it doesn't
 * Ensures consistent column naming across the application
 * 
 * @param mysqli $conn Database connection
 * @return bool Success status
 */
function ensureLocalPackageFaresTable($conn) {
    try {
        // Check if the table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        $tableExists = ($tableCheckResult && $tableCheckResult->num_rows > 0);
        
        if (!$tableExists) {
            // Create the table with standardized column names
            $createTableQuery = "
                CREATE TABLE `local_package_fares` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `vehicle_id` varchar(50) NOT NULL,
                  `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0.00,
                  `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0.00,
                  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `vehicle_id` (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            
            $result = $conn->query($createTableQuery);
            if (!$result) {
                logMessage("Failed to create local_package_fares table: " . $conn->error, 'db_helper.log');
                return false;
            }
            
            logMessage("Created local_package_fares table successfully", 'db_helper.log');
            return true;
        }
        
        // Table exists, check if column names need standardization
        $checkColumnsQuery = "DESCRIBE local_package_fares";
        $columnResult = $conn->query($checkColumnsQuery);
        
        if ($columnResult) {
            $needsUpdate = false;
            $columns = [];
            
            while ($column = $columnResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
            
            // Log all columns for debugging
            logMessage("Current columns in local_package_fares: " . implode(", ", $columns), 'db_helper.log');
            
            // Check for old column naming patterns
            if (in_array('price_4hr_40km', $columns)) {
                $needsUpdate = true;
                logMessage("Found old column name 'price_4hr_40km', needs update", 'db_helper.log');
            }
            
            if ($needsUpdate) {
                // Update column names to add 's' after hr
                try {
                    $conn->query("ALTER TABLE local_package_fares CHANGE `price_4hr_40km` `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0.00");
                    $conn->query("ALTER TABLE local_package_fares CHANGE `price_8hr_80km` `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0.00");
                    $conn->query("ALTER TABLE local_package_fares CHANGE `price_10hr_100km` `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0.00");
                    
                    logMessage("Updated column names in local_package_fares table", 'db_helper.log');
                } catch (Exception $e) {
                    logMessage("Error updating column names: " . $e->getMessage(), 'db_helper.log');
                }
            }
            
            // Check for missing columns and add if necessary
            if (!in_array('price_4hrs_40km', $columns) && !in_array('price_4hr_40km', $columns)) {
                $conn->query("ALTER TABLE local_package_fares ADD `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0.00");
                logMessage("Added missing column price_4hrs_40km", 'db_helper.log');
            }
            
            if (!in_array('price_8hrs_80km', $columns) && !in_array('price_8hr_80km', $columns)) {
                $conn->query("ALTER TABLE local_package_fares ADD `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0.00");
                logMessage("Added missing column price_8hrs_80km", 'db_helper.log');
            }
            
            if (!in_array('price_10hrs_100km', $columns) && !in_array('price_10hr_100km', $columns)) {
                $conn->query("ALTER TABLE local_package_fares ADD `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0.00");
                logMessage("Added missing column price_10hrs_100km", 'db_helper.log');
            }
            
            if (!in_array('price_extra_km', $columns)) {
                $conn->query("ALTER TABLE local_package_fares ADD `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0.00");
                logMessage("Added missing column price_extra_km", 'db_helper.log');
            }
            
            if (!in_array('price_extra_hour', $columns)) {
                $conn->query("ALTER TABLE local_package_fares ADD `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0.00");
                logMessage("Added missing column price_extra_hour", 'db_helper.log');
            }
        }
        
        return true;
    } catch (Exception $e) {
        logMessage("Error in ensureLocalPackageFaresTable: " . $e->getMessage(), 'db_helper.log');
        return false;
    }
}

// Fix for missing functions
if (!function_exists('getApiUrl')) {
    function getApiUrl($path) {
        $apiBaseUrl = defined('API_BASE_URL') ? API_BASE_URL : 'https://vizagup.com';
        return $apiBaseUrl . $path;
    }
}
