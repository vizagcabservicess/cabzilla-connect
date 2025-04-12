
<?php
/**
 * Database helper functions for consistent database access
 */

/**
 * Get a database connection with retry logic
 * 
 * @param int $maxRetries Maximum number of retries
 * @return mysqli|null Database connection or null on failure
 */
function getDbConnectionWithRetry($maxRetries = 1) {
    $retries = 0;
    $error = null;
    
    error_log("Attempting database connection with $maxRetries retries...");
    
    while ($retries <= $maxRetries) {
        try {
            $conn = getDbConnection();
            if ($conn) {
                error_log("Database connection successful on attempt " . ($retries + 1));
                return $conn;
            }
        } catch (Exception $e) {
            $error = $e;
            error_log("Database connection attempt " . ($retries + 1) . " failed: " . $e->getMessage());
        }
        
        $retries++;
        if ($retries <= $maxRetries) {
            // Wait before retrying
            usleep(500000); // 500ms
            error_log("Retrying database connection, attempt $retries of $maxRetries");
        }
    }
    
    error_log("All database connection attempts failed");
    throw new Exception("Failed to connect to database after $maxRetries retries: " . 
        ($error ? $error->getMessage() : 'Unknown error'));
}

/**
 * Get a database connection
 * 
 * @return mysqli Database connection
 * @throws Exception If connection fails
 */
function getDbConnection() {
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    error_log("Connecting to database: $dbName on $dbHost");
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        error_log("Database connection failed: " . $conn->connect_error);
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Set charset
    $conn->set_charset("utf8mb4");
    
    // Test the connection
    if (!$conn->ping()) {
        error_log("Database connection is not active");
        throw new Exception("Database connection is not active");
    }
    
    error_log("Database connection successful");
    return $conn;
}

/**
 * Execute a database query with error handling
 * 
 * @param mysqli $conn Database connection
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return mysqli_result|bool Query result
 * @throws Exception If query fails
 */
function executeQuery($conn, $sql, $params = []) {
    error_log("Executing query: " . $sql);
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        error_log("Query preparation failed: " . $conn->error);
        throw new Exception("Query preparation failed: " . $conn->error);
    }
    
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
        
        error_log("Binding parameters with types: " . $types);
        
        $bindParams = array_merge([$types], $bindParams);
        $bindParamsRefs = [];
        
        // Create references to $bindParams
        foreach ($bindParams as $key => $value) {
            $bindParamsRefs[$key] = &$bindParams[$key];
        }
        
        call_user_func_array([$stmt, 'bind_param'], $bindParamsRefs);
    }
    
    if (!$stmt->execute()) {
        error_log("Query execution failed: " . $stmt->error);
        throw new Exception("Query execution failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $stmt->close();
    
    if ($result !== false) {
        error_log("Query execution successful, returned " . ($result->num_rows ?? 'unknown') . " rows");
    } else {
        error_log("Query execution successful (non-select query)");
    }
    
    return $result !== false ? $result : true;
}

/**
 * Check if a table exists in the database
 * 
 * @param mysqli $conn Database connection
 * @param string $tableName Table name to check
 * @return bool True if table exists, false otherwise
 */
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return $result && $result->num_rows > 0;
}
