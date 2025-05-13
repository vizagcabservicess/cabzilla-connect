
<?php
/**
 * Database Helper Functions
 * Provides reliable database connectivity functions
 */

if (!function_exists('getDbConnectionWithRetry')) {
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
}

// REMOVED: The duplicate getDbConnection() function has been removed
// Use the function from config.php instead

if (!function_exists('executeQuery')) {
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
}

if (!function_exists('fetchOne')) {
function fetchOne($sql, $params = [], $types = "") {
    $result = executeQuery($sql, $params, $types);
    $row = $result->fetch_assoc();
    $result->free();
    return $row;
}
}

if (!function_exists('fetchAll')) {
function fetchAll($sql, $params = [], $types = "") {
    $result = executeQuery($sql, $params, $types);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $result->free();
    return $rows;
}
}

if (!function_exists('insertData')) {
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
}

if (!function_exists('updateData')) {
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
}

// Function to ensure the bookings table exists with the admin discount fields
if (!function_exists('ensureBookingsTableExists')) {
function ensureBookingsTableExists($conn) {
    try {
        // Check if table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
        if ($tableCheck->num_rows === 0) {
            // Create the bookings table
            $createTableSql = "
            CREATE TABLE bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                booking_number VARCHAR(50) NOT NULL UNIQUE,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                cab_type VARCHAR(50) NOT NULL,
                distance DECIMAL(10,2),
                trip_type VARCHAR(20) NOT NULL,
                trip_mode VARCHAR(20) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                passenger_name VARCHAR(100) NOT NULL,
                passenger_phone VARCHAR(20) NOT NULL,
                passenger_email VARCHAR(100) NOT NULL,
                hourly_package VARCHAR(50),
                tour_id VARCHAR(50),
                driver_name VARCHAR(100),
                driver_phone VARCHAR(20),
                vehicle_number VARCHAR(20),
                admin_notes TEXT,
                notes TEXT,
                extra_charges TEXT,
                billing_address TEXT,
                created_by_admin TINYINT(1) DEFAULT 0,
                discount DECIMAL(10,2) DEFAULT 0,
                discount_type VARCHAR(20),
                original_amount DECIMAL(10,2),
                email_sent TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            
            $result = $conn->query($createTableSql);
            if (!$result) {
                throw new Exception("Failed to create bookings table: " . $conn->error);
            }
            error_log("Created bookings table with admin discount fields");
            return true;
        } else {
            // Table exists, check if it has the admin discount fields
            $columnsCheck = $conn->query("SHOW COLUMNS FROM bookings LIKE 'discount'");
            if ($columnsCheck->num_rows === 0) {
                // Add the admin discount fields
                $alterTableSql = "
                ALTER TABLE bookings 
                ADD COLUMN created_by_admin TINYINT(1) DEFAULT 0,
                ADD COLUMN discount DECIMAL(10,2) DEFAULT 0,
                ADD COLUMN discount_type VARCHAR(20),
                ADD COLUMN original_amount DECIMAL(10,2),
                ADD COLUMN notes TEXT,
                ADD COLUMN email_sent TINYINT(1) DEFAULT 0
                ";
                
                $result = $conn->query($alterTableSql);
                if (!$result) {
                    throw new Exception("Failed to alter bookings table: " . $conn->error);
                }
                error_log("Added admin discount fields to bookings table");
            }
            return true;
        }
    } catch (Exception $e) {
        error_log("Error ensuring bookings table: " . $e->getMessage());
        return false;
    }
}
}
