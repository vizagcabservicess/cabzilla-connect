
<?php
/**
 * Database setup script to ensure all required tables exist with correct structure
 * This is included by various API endpoints to ensure database tables exist
 */

// Don't output any headers as this file is meant to be included
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/db_setup_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database configuration
if (file_exists(__DIR__ . '/../../config.php')) {
    require_once __DIR__ . '/../../config.php';
}

// Define consistent database charset and collation
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}

if (!defined('DB_COLLATION')) {
    define('DB_COLLATION', 'utf8mb4_unicode_ci');
}

// Get database connection
if (!function_exists('getDbConnection')) {
    function getDbConnection() {
        global $logFile, $timestamp;
        
        try {
            if (defined('DB_HOST') && defined('DB_USER') && defined('DB_PASS') && defined('DB_NAME')) {
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            } else {
                // Fallback to hardcoded values if config not available
                $conn = new mysqli('localhost', 'u644605165_usr_be', 'Vizag@1213', 'u644605165_db_be');
            }
            
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            // Set charset and collation
            $conn->set_charset(DB_CHARSET);
            $conn->query("SET NAMES " . DB_CHARSET . " COLLATE " . DB_COLLATION);
            
            file_put_contents($logFile, "[$timestamp] Database connection successful in db_setup\n", FILE_APPEND);
            return $conn;
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Database connection error in db_setup: " . $e->getMessage() . "\n", FILE_APPEND);
            return null;
        }
    }
}

// Main setup function
function setupDatabase() {
    global $logFile, $timestamp;
    
    $conn = getDbConnection();
    if (!$conn) {
        file_put_contents($logFile, "[$timestamp] Failed to connect to database in setupDatabase\n", FILE_APPEND);
        return false;
    }
    
    $tablesCreated = [];
    
    // Create vehicles table if it doesn't exist
    $vehiclesTable = "
        CREATE TABLE IF NOT EXISTS `vehicles` (
            `id` VARCHAR(50) NOT NULL,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `name` VARCHAR(100) NOT NULL,
            `category` VARCHAR(50) DEFAULT 'Standard',
            `capacity` INT(11) DEFAULT 4,
            `luggage_capacity` INT(11) DEFAULT 2,
            `base_price` DECIMAL(10,2) DEFAULT 0.00,
            `price_per_km` DECIMAL(5,2) DEFAULT 0.00,
            `image` VARCHAR(255) DEFAULT '',
            `description` TEXT,
            `amenities` TEXT,
            `ac` TINYINT(1) DEFAULT 1,
            `is_active` TINYINT(1) DEFAULT 1,
            `night_halt_charge` DECIMAL(10,2) DEFAULT 0.00,
            `driver_allowance` DECIMAL(10,2) DEFAULT 0.00,
            `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=" . DB_CHARSET . " COLLATE=" . DB_COLLATION;
    
    if ($conn->query($vehiclesTable)) {
        $tablesCreated[] = 'vehicles';
        file_put_contents($logFile, "[$timestamp] Created or verified vehicles table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Error creating vehicles table: " . $conn->error . "\n", FILE_APPEND);
    }
    
    // Create airport_transfer_fares table if it doesn't exist
    $airportFaresTable = "
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
        ) ENGINE=InnoDB DEFAULT CHARSET=" . DB_CHARSET . " COLLATE=" . DB_COLLATION;
    
    if ($conn->query($airportFaresTable)) {
        $tablesCreated[] = 'airport_transfer_fares';
        file_put_contents($logFile, "[$timestamp] Created or verified airport_transfer_fares table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Error creating airport_transfer_fares table: " . $conn->error . "\n", FILE_APPEND);
    }
    
    // Create vehicle_pricing table if it doesn't exist
    $vehiclePricingTable = "
        CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `trip_type` VARCHAR(20) NOT NULL,
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
        ) ENGINE=InnoDB DEFAULT CHARSET=" . DB_CHARSET . " COLLATE=" . DB_COLLATION;
    
    if ($conn->query($vehiclePricingTable)) {
        $tablesCreated[] = 'vehicle_pricing';
        file_put_contents($logFile, "[$timestamp] Created or verified vehicle_pricing table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Error creating vehicle_pricing table: " . $conn->error . "\n", FILE_APPEND);
    }
    
    // Fix collation if needed
    $fixCollationQuery = "SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = DATABASE() 
                        AND table_collation != '" . DB_COLLATION . "'";
    
    $collationResult = $conn->query($fixCollationQuery);
    
    if ($collationResult && $collationResult->num_rows > 0) {
        file_put_contents($logFile, "[$timestamp] Found tables with inconsistent collation, fixing...\n", FILE_APPEND);
        
        while ($row = $collationResult->fetch_assoc()) {
            $tableName = $row['table_name'];
            $fixQuery = "ALTER TABLE `$tableName` CONVERT TO CHARACTER SET " . DB_CHARSET . " COLLATE " . DB_COLLATION;
            
            if ($conn->query($fixQuery)) {
                file_put_contents($logFile, "[$timestamp] Fixed collation for table $tableName\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Error fixing collation for table $tableName: " . $conn->error . "\n", FILE_APPEND);
            }
        }
    }
    
    $conn->close();
    return true;
}

// Run the setup
setupDatabase();
