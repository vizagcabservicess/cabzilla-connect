
<?php
/**
 * Database utility functions for establishing connections
 */

// Include configuration file to get consistent collation settings
require_once __DIR__ . '/../../config.php';

// Get database connection
function getDbConnection() {
    // Use values from config file if available
    $dbHost = defined('DB_HOST') ? DB_HOST : 'localhost';
    $dbName = defined('DB_NAME') ? DB_NAME : 'u644605165_db_be';
    $dbUser = defined('DB_USER') ? DB_USER : 'u644605165_usr_be';
    $dbPass = defined('DB_PASS') ? DB_PASS : 'Vizag@1213';
    $dbCharset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';
    $dbCollation = defined('DB_COLLATION') ? DB_COLLATION : 'utf8mb4_unicode_ci';
    
    try {
        // Create connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset
        $conn->set_charset($dbCharset);
        
        // Ensure consistent collation for this session
        $conn->query("SET NAMES $dbCharset COLLATE $dbCollation");
        
        return $conn;
    } catch (Exception $e) {
        // Log error
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        
        return null;
    }
}

// Function to safely escape a value for database queries
function dbEscape($conn, $value) {
    if ($conn) {
        return $conn->real_escape_string($value);
    }
    
    // Fallback if no connection
    return str_replace(["'", "\""], ["\'", "\\\""], $value);
}

// Function to safely prepare a query if prepared statements are available
function safePrepare($conn, $query, $params = [], $types = '') {
    if (!$conn) {
        return false;
    }
    
    if (empty($params)) {
        return $conn->query($query);
    }
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }
    
    if (!empty($params)) {
        if (empty($types)) {
            // Auto-generate types string
            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } else if (is_float($param) || is_double($param)) {
                    $types .= 'd';
                } else if (is_string($param)) {
                    $types .= 's';
                } else {
                    $types .= 's'; // Default to string
                }
            }
        }
        
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    return $stmt;
}
