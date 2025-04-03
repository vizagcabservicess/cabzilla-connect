
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
 * Check if a column exists in a table
 *
 * @param mysqli $conn Database connection
 * @param string $table Table name
 * @param string $column Column name
 * @return bool True if column exists, false otherwise
 */
function columnExists($conn, $table, $column) {
    try {
        $result = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
        return ($result && $result->num_rows > 0);
    } catch (Exception $e) {
        logMessage("Error checking if column exists: " . $e->getMessage(), 'db_error.log');
        return false;
    }
}

/**
 * Get the correct column name based on possible variations
 * This helps handle differences in column naming across environments
 *
 * @param mysqli $conn Database connection
 * @param string $table Table name
 * @param array $possibleNames Array of possible column names
 * @return string|null The correct column name that exists or null if none found
 */
function getCorrectColumnName($conn, $table, $possibleNames) {
    foreach ($possibleNames as $name) {
        if (columnExists($conn, $table, $name)) {
            return $name;
        }
    }
    return null;
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
        
        // Check if local_package_fares table exists
        $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        
        // Report on column naming in local_package_fares table
        $columnInfo = [];
        if ($localFaresTableExists) {
            $columns = $conn->query("SHOW COLUMNS FROM local_package_fares");
            while ($col = $columns->fetch_assoc()) {
                $columnInfo[] = $col['Field'];
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
                ],
                'local_package_fares' => [
                    'exists' => $localFaresTableExists,
                    'columns' => $columnInfo
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
 * Ensure the local_package_fares table exists with proper columns
 *
 * @param mysqli $conn Database connection
 * @return bool True if table exists or was created successfully
 */
function ensureLocalPackageFaresTable($conn) {
    try {
        // Check if table exists
        $tableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        
        if (!$tableExists) {
            // Create table with consistent column naming
            $createTableSQL = "
                CREATE TABLE IF NOT EXISTS `local_package_fares` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `vehicle_id` varchar(50) NOT NULL,
                    `price_4hr_40km` decimal(10,2) NOT NULL DEFAULT 0,
                    `price_8hr_80km` decimal(10,2) NOT NULL DEFAULT 0,
                    `price_10hr_100km` decimal(10,2) NOT NULL DEFAULT 0,
                    `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0,
                    `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0,
                    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `vehicle_id` (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            $conn->query($createTableSQL);
            logMessage("Created local_package_fares table", 'db_tables.log');
            
            // Check if table was created successfully
            $tableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        }
        
        return $tableExists;
    } catch (Exception $e) {
        logMessage("Error ensuring local_package_fares table: " . $e->getMessage(), 'db_error.log');
        return false;
    }
}

/**
 * Fix column names in local_package_fares table if needed
 * This handles the case where columns might have plural names (e.g. hrs instead of hr)
 *
 * @param mysqli $conn Database connection
 * @return bool True if fixed or no fix needed, false on error
 */
function fixLocalPackageFaresColumns($conn) {
    try {
        // Make sure the table exists
        if (!ensureLocalPackageFaresTable($conn)) {
            return false;
        }
        
        // Column mappings to check (incorrect => correct)
        $columnMappings = [
            'price_4hrs_40km' => 'price_4hr_40km',
            'price_8hrs_80km' => 'price_8hr_80km', 
            'price_10hrs_100km' => 'price_10hr_100km'
        ];
        
        // Check each column and rename if needed
        foreach ($columnMappings as $oldColumn => $newColumn) {
            // Check if old column exists but new one doesn't
            $oldExists = columnExists($conn, 'local_package_fares', $oldColumn);
            $newExists = columnExists($conn, 'local_package_fares', $newColumn);
            
            if ($oldExists && !$newExists) {
                // Rename column
                $conn->query("ALTER TABLE local_package_fares CHANGE `$oldColumn` `$newColumn` decimal(10,2) NOT NULL DEFAULT 0");
                logMessage("Renamed column $oldColumn to $newColumn in local_package_fares", 'db_fixes.log');
            } else if (!$oldExists && !$newExists) {
                // Neither column exists, add the new one
                $conn->query("ALTER TABLE local_package_fares ADD `$newColumn` decimal(10,2) NOT NULL DEFAULT 0");
                logMessage("Added missing column $newColumn to local_package_fares", 'db_fixes.log');
            }
            // If both exist or only new exists, do nothing
        }
        
        // Make sure other required columns exist
        if (!columnExists($conn, 'local_package_fares', 'extra_km_rate')) {
            $conn->query("ALTER TABLE local_package_fares ADD `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0");
        }
        
        if (!columnExists($conn, 'local_package_fares', 'extra_hour_rate')) {
            $conn->query("ALTER TABLE local_package_fares ADD `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0");
        }
        
        return true;
    } catch (Exception $e) {
        logMessage("Error fixing local_package_fares columns: " . $e->getMessage(), 'db_error.log');
        return false;
    }
}

