
<?php
/**
 * Database Helper Functions
 * Provides reliable database connectivity functions
 */

// Function to get a database connection with retry logic
function getDbConnectionWithRetry($maxRetries = 3, $retryDelayMs = 500) {
    $attempts = 0;
    $lastError = null;
    
    while ($attempts < $maxRetries) {
        try {
            // Use the getDbConnection from config.php instead of declaring it again
            $conn = getDbConnection();
            if ($conn && $conn->ping()) {
                return $conn; // Successful connection
            }
        } catch (Exception $e) {
            $lastError = $e;
            error_log("Database connection attempt " . ($attempts + 1) . " failed: " . $e->getMessage());
        }
        
        $attempts++;
        
        if ($attempts < $maxRetries) {
            // Wait before retrying (increasing delay with each attempt)
            usleep($retryDelayMs * 1000 * $attempts);
        }
    }
    
    // All retries failed
    throw new Exception("Failed to connect to database after $maxRetries attempts. Last error: " . 
        ($lastError ? $lastError->getMessage() : "Unknown error"));
}

// REMOVED: The duplicate getDbConnection() function has been removed
// Use the function from config.php instead

// Function to execute a query with error handling
function executeQuery($sql, $params = [], $types = "") {
    $conn = getDbConnectionWithRetry();
    
    try {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Query preparation failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Query execution failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $stmt->close();
        
        return $result;
    } catch (Exception $e) {
        error_log("DB query error: " . $e->getMessage() . " - SQL: " . $sql);
        throw $e;
    }
}

// Function to fetch a single row
function fetchOne($sql, $params = [], $types = "") {
    $result = executeQuery($sql, $params, $types);
    $row = $result->fetch_assoc();
    $result->free();
    return $row;
}

// Function to fetch multiple rows
function fetchAll($sql, $params = [], $types = "") {
    $result = executeQuery($sql, $params, $types);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $result->free();
    return $rows;
}

// Function to insert data and return insert ID
function insertData($sql, $params = [], $types = "") {
    $conn = getDbConnectionWithRetry();
    
    try {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Insert preparation failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Insert execution failed: " . $stmt->error);
        }
        
        $insertId = $conn->insert_id;
        $stmt->close();
        
        return $insertId;
    } catch (Exception $e) {
        error_log("DB insert error: " . $e->getMessage() . " - SQL: " . $sql);
        throw $e;
    }
}

// Function to update data and return affected rows
function updateData($sql, $params = [], $types = "") {
    $conn = getDbConnectionWithRetry();
    
    try {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Update preparation failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Update execution failed: " . $stmt->error);
        }
        
        $affectedRows = $stmt->affected_rows;
        $stmt->close();
        
        return $affectedRows;
    } catch (Exception $e) {
        error_log("DB update error: " . $e->getMessage() . " - SQL: " . $sql);
        throw $e;
    }
}
