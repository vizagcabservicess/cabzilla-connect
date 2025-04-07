<?php
/**
 * Database utility functions
 * Handles database connections and common operations
 */

// Include configuration file
if (file_exists(dirname(__FILE__) . '/../../config.php')) {
    require_once dirname(__FILE__) . '/../../config.php';
}

/**
 * Get a database connection
 * Uses configuration from config.php or falls back to hardcoded credentials
 * 
 * @return mysqli|null Database connection or null on failure
 */
function getDbConnection() {
    try {
        // First try to use the function from config.php if available
        if (function_exists('getDbConnection') && !defined('DB_UTILS_INTERNAL')) {
            define('DB_UTILS_INTERNAL', true);
            $conn = \getDbConnection();
            if ($conn instanceof mysqli && !$conn->connect_error) {
                // Success, return the connection
                return $conn;
            }
        }

        // If we reach here, we need to establish the connection ourselves
        $dbHost = defined('DB_HOST') ? DB_HOST : 'localhost';
        $dbName = defined('DB_NAME') ? DB_NAME : 'u644605165_db_be';
        $dbUser = defined('DB_USER') ? DB_USER : 'u644605165_usr_be';
        $dbPass = defined('DB_PASS') ? DB_PASS : 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set charset and collation explicitly to ensure consistency
        $conn->set_charset("utf8mb4");
        $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        $conn->query("SET CHARACTER SET utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
}

/**
 * Check if a table exists in the database
 * 
 * @param mysqli $conn Database connection
 * @param string $tableName Table name to check
 * @return bool True if table exists, false otherwise
 */
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($tableName) . "'");
    return $result && $result->num_rows > 0;
}

/**
 * Fix collation for a table and its columns
 * 
 * @param mysqli $conn Database connection
 * @param string $tableName Table name to fix
 * @return bool True if successful, false otherwise
 */
function fixTableCollation($conn, $tableName) {
    try {
        // First fix the table itself
        $conn->query("ALTER TABLE `" . $conn->real_escape_string($tableName) . "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // Then fix all string columns
        $columnsResult = $conn->query("SHOW COLUMNS FROM `" . $conn->real_escape_string($tableName) . "`");
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                $columnName = $column['Field'];
                $dataType = $column['Type'];
                
                // Only modify string-type columns
                if (strpos($dataType, 'varchar') !== false || strpos($dataType, 'text') !== false || 
                    strpos($dataType, 'char') !== false || strpos($dataType, 'enum') !== false) {
                    $conn->query("ALTER TABLE `" . $conn->real_escape_string($tableName) . "` 
                        MODIFY COLUMN `" . $conn->real_escape_string($columnName) . "` $dataType 
                        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                }
            }
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error fixing table collation: " . $e->getMessage());
        return false;
    }
}

/**
 * Ensure that all required tables exist
 * 
 * @return bool True if successful, false otherwise
 */
function ensureDatabaseTables() {
    // If the function exists in config.php, use that
    if (function_exists('ensureDatabaseTables') && !defined('DB_UTILS_ENSURE_TABLES')) {
        define('DB_UTILS_ENSURE_TABLES', true);
        return \ensureDatabaseTables();
    }
    
    // Otherwise, do a minimal check
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        // Check airport_transfer_fares table
        if (!tableExists($conn, 'airport_transfer_fares')) {
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
        } else {
            fixTableCollation($conn, 'airport_transfer_fares');
        }
        
        // Check vehicles table
        if (!tableExists($conn, 'vehicles')) {
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
        } else {
            fixTableCollation($conn, 'vehicles');
        }
        
        // Check vehicle_pricing table
        if (!tableExists($conn, 'vehicle_pricing')) {
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
        } else {
            fixTableCollation($conn, 'vehicle_pricing');
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring database tables: " . $e->getMessage());
        return false;
    } finally {
        $conn->close();
    }
}

/**
 * Function to safely escape a value for database queries
 * 
 * @param mysqli $conn Database connection
 * @param mixed $value Value to escape
 * @return mixed Escaped value
 */
function dbEscape($conn, $value) {
    if ($conn) {
        return $conn->real_escape_string($value);
    }
    
    // Fallback if no connection
    return str_replace(["'", "\""], ["\'", "\\\""], $value);
}

/**
 * Function to safely prepare a query if prepared statements are available
 * 
 * @param mysqli $conn Database connection
 * @param string $query Query to prepare
 * @param array $params Parameters for the query
 * @param string $types Type string for prepared statement
 * @return bool|mysqli_stmt Prepared statement or false on failure
 */
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

/**
 * Function to synchronize airport fares between tables
 * This ensures data is consistent between airport_transfer_fares and vehicle_pricing
 */
function syncAirportFaresTables() {
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        // First ensure tables exist
        $tables = ['airport_transfer_fares', 'vehicle_pricing', 'vehicles'];
        foreach ($tables as $table) {
            $result = $conn->query("SHOW TABLES LIKE '$table'");
            if ($result->num_rows === 0) {
                // Table doesn't exist, call the global function
                require_once __DIR__ . '/../../config.php';
                ensureDatabaseTables();
                break;
            }
        }
        
        // Get all vehicles
        $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
        $vehiclesResult = $conn->query($vehiclesQuery);
        
        if (!$vehiclesResult) {
            throw new Exception("Failed to fetch vehicles: " . $conn->error);
        }
        
        $vehicles = [];
        while ($row = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $row['vehicle_id'];
            $vehicles[$vehicleId] = $row;
        }
        
        // For each vehicle, make sure it exists in airport_transfer_fares
        foreach ($vehicles as $vehicleId => $vehicle) {
            // Check if it exists in airport_transfer_fares
            $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Not in airport_transfer_fares, insert with defaults
                $insertStmt = $conn->prepare("
                    INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ");
                
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
            }
            
            // Check if it exists in vehicle_pricing with trip_type='airport'
            $stmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Not in vehicle_pricing, insert with defaults
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km,
                    airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                    airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                    airport_extra_km_charge)
                    VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ");
                
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
            }
        }
        
        // Now sync data from airport_transfer_fares to vehicle_pricing
        $syncFromAirportTransferQuery = "
            UPDATE vehicle_pricing vp
            JOIN airport_transfer_fares atf ON vp.vehicle_id = atf.vehicle_id
            SET 
                vp.airport_base_price = atf.base_price,
                vp.airport_price_per_km = atf.price_per_km,
                vp.airport_pickup_price = atf.pickup_price,
                vp.airport_drop_price = atf.drop_price,
                vp.airport_tier1_price = atf.tier1_price,
                vp.airport_tier2_price = atf.tier2_price,
                vp.airport_tier3_price = atf.tier3_price,
                vp.airport_tier4_price = atf.tier4_price,
                vp.airport_extra_km_charge = atf.extra_km_charge,
                vp.updated_at = NOW()
            WHERE vp.trip_type = 'airport'
        ";
        
        $conn->query($syncFromAirportTransferQuery);
        
        // Also sync from vehicle_pricing to airport_transfer_fares for any missing entries
        $syncFromVehiclePricingQuery = "
            UPDATE airport_transfer_fares atf
            JOIN vehicle_pricing vp ON atf.vehicle_id = vp.vehicle_id
            SET 
                atf.base_price = CASE WHEN atf.base_price = 0 THEN vp.airport_base_price ELSE atf.base_price END,
                atf.price_per_km = CASE WHEN atf.price_per_km = 0 THEN vp.airport_price_per_km ELSE atf.price_per_km END,
                atf.pickup_price = CASE WHEN atf.pickup_price = 0 THEN vp.airport_pickup_price ELSE atf.pickup_price END,
                atf.drop_price = CASE WHEN atf.drop_price = 0 THEN vp.airport_drop_price ELSE atf.drop_price END,
                atf.tier1_price = CASE WHEN atf.tier1_price = 0 THEN vp.airport_tier1_price ELSE atf.tier1_price END,
                atf.tier2_price = CASE WHEN atf.tier2_price = 0 THEN vp.airport_tier2_price ELSE atf.tier2_price END,
                atf.tier3_price = CASE WHEN atf.tier3_price = 0 THEN vp.airport_tier3_price ELSE atf.tier3_price END,
                atf.tier4_price = CASE WHEN atf.tier4_price = 0 THEN vp.airport_tier4_price ELSE atf.tier4_price END,
                atf.extra_km_charge = CASE WHEN atf.extra_km_charge = 0 THEN vp.airport_extra_km_charge ELSE atf.extra_km_charge END,
                atf.updated_at = NOW()
            WHERE vp.trip_type = 'airport'
        ";
        
        $conn->query($syncFromVehiclePricingQuery);
        
        return true;
    } catch (Exception $e) {
        error_log("Failed to sync airport fares tables: " . $e->getMessage());
        return false;
    } finally {
        if ($conn) {
            $conn->close();
        }
    }
}
