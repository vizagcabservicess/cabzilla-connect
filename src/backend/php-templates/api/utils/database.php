
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
    
    // Create a new connection
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
    
    return $conn;
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
}

/**
 * Check if a table exists in the database
 *
 * @param mysqli $conn Database connection
 * @param string $tableName Table name
 * @return bool True if table exists, false otherwise
 */
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return $result && $result->num_rows > 0;
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
    $result = $conn->query("SHOW COLUMNS FROM `$tableName` LIKE '$columnName'");
    return $result && $result->num_rows > 0;
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
    $result = $conn->query("SHOW COLUMNS FROM `$tableName`");
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
    }
    
    return $columns;
}
