
<?php
/**
 * Database connection utility functions
 */

// Function to get the database connection
function getDbConnection() {
    // Load environment variables if available
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
    
    // First check environment variables
    $dbHost = getenv('DB_HOST') ?: 'localhost';
    $dbUser = getenv('DB_USER') ?: 'root';
    $dbPass = getenv('DB_PASS') ?: '';
    $dbName = getenv('DB_NAME') ?: 'cabzilla';
    
    // Create connection with improved error handling
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        error_log("Database connection failed: " . $conn->connect_error);
        return null;
    }
    
    // Set character set
    $conn->set_charset("utf8mb4");
    
    // Return connection
    return $conn;
}

// Function to check database table exists
function checkTableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return ($result && $result->num_rows > 0);
}

// Function to get database version
function getDatabaseVersion($conn) {
    $result = $conn->query("SELECT version() as version");
    if ($result && $row = $result->fetch_assoc()) {
        return $row['version'];
    }
    return 'Unknown';
}

// Function to create the airport_transfer_fares table if it doesn't exist
function ensureAirportFaresTable($conn) {
    $tableName = 'airport_transfer_fares';
    
    if (!checkTableExists($conn, $tableName)) {
        $sql = "CREATE TABLE $tableName (
            id INT(11) NOT NULL AUTO_INCREMENT,
            vehicle_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$conn->query($sql)) {
            return false;
        }
    }
    
    return true;
}

// Function to create the vehicles table if it doesn't exist
function ensureVehiclesTable($conn) {
    $tableName = 'vehicles';
    
    if (!checkTableExists($conn, $tableName)) {
        $sql = "CREATE TABLE $tableName (
            id VARCHAR(50) PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT DEFAULT 4,
            luggage_capacity INT DEFAULT 2,
            price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            image VARCHAR(255),
            description TEXT,
            ac TINYINT(1) DEFAULT 1,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$conn->query($sql)) {
            return false;
        }
    }
    
    return true;
}
