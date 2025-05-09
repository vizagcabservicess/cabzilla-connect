<?php
/**
 * Database utility functions
 */

// Connect to the MySQL database
function connectToDatabase() {
    $db_host = 'localhost';
    $db_user = 'u644605165_usr_be';
    $db_pass = 'Vizag@1213';
    $db_name = 'u644605165_db_be';
    
    // Create a new mysqli connection
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    // Check for connection errors
    if ($mysqli->connect_error) {
        error_log("Database connection failed: " . $mysqli->connect_error);
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }
    
    // Set character set to UTF-8
    $mysqli->set_charset("utf8mb4");
    
    return $mysqli;
}

// Get a database connection with error handling and retry mechanism
function getDbConnection() {
    static $db = null;
    
    if ($db === null) {
        $db = connectToDatabase();
    }
    
    // Check if connection is still alive
    if (!$db->ping()) {
        // Try to reconnect
        $db->close();
        $db = connectToDatabase();
    }
    
    return $db;
}

// Get a database connection with retry
function getDbConnectionWithRetry($maxRetries = 3, $retryDelay = 1) {
    $attempts = 0;
    $lastException = null;
    
    while ($attempts < $maxRetries) {
        try {
            return getDbConnection();
        } catch (Exception $e) {
            $lastException = $e;
            $attempts++;
            error_log("Database connection attempt $attempts failed: " . $e->getMessage());
            
            if ($attempts < $maxRetries) {
                // Wait before retrying
                sleep($retryDelay);
                // Increase delay for next attempt (exponential backoff)
                $retryDelay *= 2;
            }
        }
    }
    
    // All attempts failed, throw the last exception
    throw $lastException ?: new Exception("Failed to connect to database after $maxRetries attempts");
}

// Format a date string for MySQL
function formatDateForMySQL($date) {
    if (empty($date)) return null;
    
    if (is_string($date)) {
        // If already in YYYY-MM-DD format, return as is
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $date;
        }
        
        // Try to convert the string to a timestamp
        $timestamp = strtotime($date);
        if ($timestamp === false) return null;
        
        return date('Y-m-d', $timestamp);
    }
    
    // If it's already a timestamp
    if (is_numeric($date)) {
        return date('Y-m-d', $date);
    }
    
    return null;
}

// Format a datetime string for MySQL
function formatDateTimeForMySQL($datetime) {
    if (empty($datetime)) return null;
    
    if (is_string($datetime)) {
        // If already in YYYY-MM-DD HH:MM:SS format, return as is
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $datetime)) {
            return $datetime;
        }
        
        // Try to convert the string to a timestamp
        $timestamp = strtotime($datetime);
        if ($timestamp === false) return null;
        
        return date('Y-m-d H:i:s', $timestamp);
    }
    
    // If it's already a timestamp
    if (is_numeric($datetime)) {
        return date('Y-m-d H:i:s', $datetime);
    }
    
    return null;
}

// Escape and quote a string for MySQL
function escapeString($db, $string) {
    if ($string === null) return 'NULL';
    return "'" . $db->real_escape_string($string) . "'";
}

// Execute a parameterized query with proper error handling
function executeQuery($conn, $sql, $params = [], $types = "") {
    try {
        $stmt = $conn->prepare($sql);
        
        if ($stmt === false) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        // Only bind parameters if there are any
        if (!empty($params) && !empty($types)) {
            if (strlen($types) !== count($params)) {
                $types = str_repeat("s", count($params));
            }
            
            // Create a bind_param array with references
            $bindParams = array($types);
            foreach ($params as $key => $value) {
                $bindParams[] = &$params[$key];
            }
            
            // Call bind_param with the unpacked bindParams array
            call_user_func_array(array($stmt, 'bind_param'), $bindParams);
        }
        
        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute statement: " . $stmt->error);
        }
        
        // Get the result and return it
        $result = $stmt->get_result();
        
        // If there's no result (e.g., for INSERT, UPDATE), return the affected rows and insert ID
        if ($result === false) {
            return [
                'affected_rows' => $stmt->affected_rows,
                'insert_id' => $stmt->insert_id,
                'success' => true
            ];
        }
        
        return $result;
    } catch (Exception $e) {
        error_log("Query execution error: " . $e->getMessage());
        throw $e;
    }
}
