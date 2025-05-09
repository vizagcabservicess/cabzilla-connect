
<?php
/**
 * Database utility functions
 */

// Connect to the MySQL database
function connectToDatabase() {
    $db_host = getenv('DB_HOST') ?: 'localhost';
    $db_user = getenv('DB_USER') ?: 'vizagtaxiuser';
    $db_pass = getenv('DB_PASS') ?: 'vizagtaxipassword';
    $db_name = getenv('DB_NAME') ?: 'vizagtaxidb';
    
    // Create a new mysqli connection
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    // Check for connection errors
    if ($mysqli->connect_error) {
        die("Database connection failed: " . $mysqli->connect_error);
    }
    
    // Set character set to UTF-8
    $mysqli->set_charset("utf8mb4");
    
    return $mysqli;
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
