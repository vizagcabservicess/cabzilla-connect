
<?php
/**
 * Global configuration file
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u644605165_db_be');
define('DB_USER', 'u644605165_usr_be');
define('DB_PASS', 'Vizag@1213');

// API settings
define('API_DEBUG', true);

// Directory settings
define('LOG_DIR', __DIR__ . '/logs');
define('CACHE_DIR', __DIR__ . '/cache');
define('DATA_DIR', __DIR__ . '/data');

// Create necessary directories if they don't exist
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0777, true);
}

if (!file_exists(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0777, true);
}

if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0777, true);
}

// Function to get database connection
function getDbConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset - CRITICAL: This must be utf8mb4 with collation utf8mb4_unicode_ci
        $conn->set_charset("utf8mb4");
        
        // Set collation explicitly to ensure consistency
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        return $conn;
    } catch (Exception $e) {
        // Log error
        $timestamp = date('Y-m-d H:i:s');
        $logFile = LOG_DIR . '/db_error_' . date('Y-m-d') . '.log';
        file_put_contents($logFile, "[$timestamp] " . $e->getMessage() . "\n", FILE_APPEND);
        return null;
    }
}

/**
 * Function to ensure all required tables exist with proper collation
 */
function ensureDatabaseTables() {
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        // First fix any collation inconsistencies in existing tables
        $tables = [
            'vehicles', 
            'vehicle_pricing', 
            'airport_transfer_fares',
            'vehicle_types'
        ];
        
        foreach ($tables as $table) {
            // Check if table exists first
            $checkResult = $conn->query("SHOW TABLES LIKE '$table'");
            if ($checkResult->num_rows > 0) {
                // Fix table collation
                $conn->query("ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
        }
        
        // Create or update airport_transfer_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` VARCHAR(50) NOT NULL,
                `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `pickup_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `drop_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `tier1_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `tier2_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `tier3_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `tier4_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `extra_km_charge` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create or update vehicles table
        $conn->query("
            CREATE TABLE IF NOT EXISTS `vehicles` (
                `id` VARCHAR(50) NOT NULL,
                `vehicle_id` VARCHAR(50) NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `capacity` INT NOT NULL DEFAULT 4,
                `luggage_capacity` INT NOT NULL DEFAULT 2,
                `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `image` VARCHAR(255),
                `amenities` TEXT,
                `description` TEXT,
                `ac` TINYINT(1) NOT NULL DEFAULT 1,
                `night_halt_charge` DECIMAL(10,2) NOT NULL DEFAULT 700,
                `driver_allowance` DECIMAL(10,2) NOT NULL DEFAULT 250,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create or update vehicle_pricing table for compatibility
        $conn->query("
            CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` VARCHAR(50) NOT NULL,
                `trip_type` VARCHAR(50) NOT NULL,
                `base_fare` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `airport_base_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `airport_pickup_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_drop_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_tier1_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_tier2_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_tier3_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_tier4_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `airport_extra_km_charge` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_trip_type` (`vehicle_id`, `trip_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring database tables: " . $e->getMessage());
        return false;
    } finally {
        $conn->close();
    }
}
