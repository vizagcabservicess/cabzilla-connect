<?php
/**
 * Database utility functions
 */

/**
 * Get database connection
 *
 * @return mysqli Database connection
 * @throws Exception If connection fails
 */
function getDbConnection() {
    global $config;
    
    if (!isset($config) || !isset($config['db'])) {
        // If config is not available, try to load it
        if (file_exists(__DIR__ . '/../../config.php')) {
            require_once __DIR__ . '/../../config.php';
        } else {
            throw new Exception("Database configuration not found");
        }
    }
    
    // Try to create a new connection with error logging and retry
    $maxRetries = 3;
    $retryCount = 0;
    $lastError = null;
    
    while ($retryCount < $maxRetries) {
        try {
            $conn = new mysqli(
                $config['db']['host'] ?? 'localhost',
                $config['db']['username'] ?? 'root',
                $config['db']['password'] ?? '',
                $config['db']['database'] ?? 'cab_booking'
            );
            
            // Check connection
            if ($conn->connect_error) {
                throw new Exception("Connection failed: " . $conn->connect_error);
            }
            
            // Set charset
            $conn->set_charset("utf8mb4");
            
            // Return successful connection
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $retryCount++;
            error_log("Database connection attempt $retryCount failed: " . $e->getMessage());
            
            // Wait a bit before retrying
            if ($retryCount < $maxRetries) {
                usleep(500000); // 500ms delay between retries
            }
        }
    }
    
    // Log the final failure and throw exception
    error_log("All database connection attempts failed. Last error: " . $lastError->getMessage());
    throw new Exception("Failed to connect to database after $maxRetries attempts: " . $lastError->getMessage());
}

/**
 * Close database connection
 *
 * @param mysqli $conn Database connection
 * @return void
 */
function closeDbConnection($conn) {
    if ($conn && $conn instanceof mysqli) {
        $conn->close();
    }
}

/**
 * Execute query and fetch all results
 *
 * @param mysqli $conn Database connection
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @param string $types Parameter types (i.e. 'ssi' for string, string, integer)
 * @return array|null Array of results or null on error
 */
function executeQuery($conn, $sql, $params = [], $types = '') {
    try {
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
            return null;
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            error_log("Failed to execute query: " . $stmt->error);
            return null;
        }
        
        $result = $stmt->get_result();
        $data = [];
        
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $stmt->close();
        
        return $data;
    } catch (Exception $e) {
        error_log("Exception in executeQuery: " . $e->getMessage());
        return null;
    }
}

/**
 * Execute query and return the ID of the last inserted row
 *
 * @param mysqli $conn Database connection
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @param string $types Parameter types (i.e. 'ssi' for string, string, integer)
 * @return int|null ID of the last inserted row or null on error
 */
function executeInsert($conn, $sql, $params = [], $types = '') {
    try {
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
            return null;
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            error_log("Failed to execute insert: " . $stmt->error);
            return null;
        }
        
        $insertId = $stmt->insert_id;
        
        $stmt->close();
        
        return $insertId;
    } catch (Exception $e) {
        error_log("Exception in executeInsert: " . $e->getMessage());
        return null;
    }
}

/**
 * Execute update query and return number of affected rows
 *
 * @param mysqli $conn Database connection
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @param string $types Parameter types (i.e. 'ssi' for string, string, integer)
 * @return int|null Number of affected rows or null on error
 */
function executeUpdate($conn, $sql, $params = [], $types = '') {
    try {
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
            return null;
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            error_log("Failed to execute update: " . $stmt->error);
            return null;
        }
        
        $affectedRows = $stmt->affected_rows;
        
        $stmt->close();
        
        return $affectedRows;
    } catch (Exception $e) {
        error_log("Exception in executeUpdate: " . $e->getMessage());
        return null;
    }
}

/**
 * Check if a table exists in the database
 *
 * @param mysqli $conn Database connection
 * @param string $tableName Table name
 * @return bool True if table exists, false otherwise
 */
function tableExists($conn, $tableName) {
    try {
        $result = $conn->query("SHOW TABLES LIKE '$tableName'");
        return $result && $result->num_rows > 0;
    } catch (Exception $e) {
        error_log("Exception in tableExists for '$tableName': " . $e->getMessage());
        return false;
    }
}

/**
 * Check if a column exists in a table
 *
 * @param mysqli $conn Database connection
 * @param string $tableName Table name
 * @param string $columnName Column name
 * @return bool True if column exists, false otherwise
 */
function columnExists($conn, $tableName, $columnName) {
    try {
        if (!tableExists($conn, $tableName)) {
            return false;
        }
        $result = $conn->query("SHOW COLUMNS FROM `$tableName` LIKE '$columnName'");
        return $result && $result->num_rows > 0;
    } catch (Exception $e) {
        error_log("Exception in columnExists for '$tableName.$columnName': " . $e->getMessage());
        return false;
    }
}

/**
 * Get column names for a table
 *
 * @param mysqli $conn Database connection
 * @param string $tableName Table name
 * @return array Array of column names
 */
function getTableColumns($conn, $tableName) {
    $columns = [];
    try {
        if (!tableExists($conn, $tableName)) {
            return $columns;
        }
        $result = $conn->query("SHOW COLUMNS FROM `$tableName`");
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $columns[] = $row['Field'];
            }
        }
    } catch (Exception $e) {
        error_log("Exception in getTableColumns for '$tableName': " . $e->getMessage());
    }
    
    return $columns;
}

/**
 * Create database tables from schema if they don't exist
 * 
 * @param mysqli $conn Database connection
 * @return bool True if successful, false on error
 */
function ensureDatabaseTables($conn) {
    try {
        // Path to the database schema file
        $schemaPath = __DIR__ . '/../../database.sql';
        
        if (!file_exists($schemaPath)) {
            error_log("Database schema file not found at: $schemaPath");
            return false;
        }
        
        // Read the schema file
        $schema = file_get_contents($schemaPath);
        
        // Split into individual statements (assumes statements are separated by semicolons)
        $statements = array_filter(array_map('trim', explode(';', $schema)));
        
        // Execute each statement
        foreach ($statements as $statement) {
            if (empty($statement)) continue;
            
            // Skip comments
            if (strpos($statement, '--') === 0) continue;
            
            // Execute the statement
            if (!$conn->query($statement)) {
                error_log("Error executing schema statement: " . $conn->error);
                error_log("Statement: " . $statement);
                // Continue anyway to try other statements
            }
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Exception in ensureDatabaseTables: " . $e->getMessage());
        return false;
    }
}

/**
 * Diagnostic function to check database health
 * 
 * @return array Diagnostic information
 */
function checkDatabaseHealth() {
    $diagnostics = [
        'status' => 'unknown',
        'connection' => false,
        'tables' => [],
        'errors' => [],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    try {
        // Try to connect to the database
        $conn = getDbConnection();
        
        if ($conn) {
            $diagnostics['connection'] = true;
            
            // Get list of tables
            $tablesResult = $conn->query("SHOW TABLES");
            if ($tablesResult) {
                while ($table = $tablesResult->fetch_array(MYSQLI_NUM)) {
                    $tableName = $table[0];
                    $rowCount = 0;
                    
                    // Get row count for each table
                    $countResult = $conn->query("SELECT COUNT(*) as count FROM `$tableName`");
                    if ($countResult && $row = $countResult->fetch_assoc()) {
                        $rowCount = $row['count'];
                    }
                    
                    $diagnostics['tables'][$tableName] = [
                        'rows' => $rowCount,
                        'columns' => getTableColumns($conn, $tableName)
                    ];
                }
            }
            
            // Check if critical tables exist
            $criticalTables = ['vehicle_types', 'outstation_fares', 'local_package_fares', 'airport_transfer_fares'];
            $missingTables = [];
            
            foreach ($criticalTables as $table) {
                if (!isset($diagnostics['tables'][$table])) {
                    $missingTables[] = $table;
                }
            }
            
            if (empty($missingTables)) {
                $diagnostics['status'] = 'healthy';
            } else {
                $diagnostics['status'] = 'missing_tables';
                $diagnostics['errors'][] = "Missing critical tables: " . implode(", ", $missingTables);
            }
            
            // Close the connection
            $conn->close();
        } else {
            $diagnostics['status'] = 'connection_failed';
            $diagnostics['errors'][] = "Failed to connect to database";
        }
    } catch (Exception $e) {
        $diagnostics['status'] = 'error';
        $diagnostics['errors'][] = $e->getMessage();
    }
    
    return $diagnostics;
}

/**
 * Debug SQL query with parameters
 * 
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @param string $types Parameter types
 * @param bool $logToFile Whether to log to file
 * @return string Formatted query
 */
function debugSqlQuery($sql, $params = [], $types = '', $logToFile = false) {
    $formattedQuery = $sql;
    
    // Replace question marks with parameter values
    if (!empty($params)) {
        $paramIndex = 0;
        $formattedQuery = preg_replace_callback('/\?/', function($matches) use ($params, &$paramIndex) {
            $param = $params[$paramIndex];
            $paramIndex++;
            
            if (is_string($param)) {
                return "'" . addslashes($param) . "'";
            } elseif (is_null($param)) {
                return 'NULL';
            } elseif (is_bool($param)) {
                return $param ? '1' : '0';
            } else {
                return $param;
            }
        }, $sql);
    }
    
    // Log to file if requested
    if ($logToFile) {
        error_log("SQL Query: " . $formattedQuery);
    }
    
    return $formattedQuery;
}

/**
 * Safely get a value with a default fallback if NULL
 * 
 * @param mixed $value The value to check
 * @param mixed $default Default value if $value is NULL
 * @return mixed The original value or the default
 */
function safeValue($value, $default) {
    return $value !== NULL ? $value : $default;
}
