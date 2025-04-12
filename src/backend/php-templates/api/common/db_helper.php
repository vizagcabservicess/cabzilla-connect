
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
    
    while ($retries <= $maxRetries) {
        try {
            $conn = getDbConnection();
            if ($conn) {
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
        
        $bindParams = array_merge([$types], $bindParams);
        call_user_func_array([$stmt, 'bind_param'], $bindParams);
    }
    
    if (!$stmt->execute()) {
        error_log("Query execution failed: " . $stmt->error);
        throw new Exception("Query execution failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $stmt->close();
    
    return $result !== false ? $result : true;
}
