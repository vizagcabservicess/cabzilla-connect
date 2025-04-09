
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
                if (function_exists('getDbConnection')) {
                    $conn = getDbConnection();
                    if ($conn && !$conn->connect_error) {
                        error_log("Database connection successful using getDbConnection()");
                        return $conn;
                    }
                }
            }
            
            // If config not available or connection failed, use hardcoded credentials
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
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
            
            error_log("Database connection successful using direct credentials");
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
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $logFile);
}

/**
 * Execute query with better error handling
 * 
 * @param mysqli $conn Database connection
 * @param string $sql SQL query
 * @param array $params Optional parameters for prepared statement
 * @return array Query result
 * @throws Exception If query fails
 */
function executeQuery($conn, $sql, $params = []) {
    try {
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare query: " . $conn->error);
        }
        
        // Bind parameters if any
        if (!empty($params)) {
            $types = '';
            $bindParams = [];
            
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } elseif (is_float($param)) {
                    $types .= 'd';
                } elseif (is_string($param)) {
                    $types .= 's';
                } else {
                    $types .= 'b';
                }
                $bindParams[] = $param;
            }
            
            array_unshift($bindParams, $types);
            call_user_func_array([$stmt, 'bind_param'], $bindParams);
        }
        
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to execute query: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        if ($result === false && $stmt->errno !== 0) {
            throw new Exception("Failed to get result: " . $stmt->error);
        }
        
        // For SELECT queries
        if ($result) {
            $data = [];
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
            return [
                'success' => true,
                'data' => $data,
                'affected_rows' => 0,
                'insert_id' => 0
            ];
        }
        
        // For INSERT/UPDATE/DELETE queries
        return [
            'success' => true,
            'data' => [],
            'affected_rows' => $stmt->affected_rows,
            'insert_id' => $stmt->insert_id
        ];
    } catch (Exception $e) {
        throw $e;
    }
}
