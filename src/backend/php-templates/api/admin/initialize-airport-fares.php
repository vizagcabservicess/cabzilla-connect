
<?php
/**
 * Initialize Airport Fares Tables Endpoint
 * 
 * Creates and initializes airport_transfer_fares table and syncs data with vehicle_pricing
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/db_setup.php';

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for the entire connection
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    
    // Step 1: Fix collation on existing tables if needed
    $tables = ['vehicles', 'vehicle_pricing', 'airport_transfer_fares', 'vehicle_types'];
    
    foreach ($tables as $table) {
        // Check if table exists
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result->num_rows > 0) {
            // Fix table character set and collation
            $conn->query("ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // Fix collation on all text/string columns
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
            while ($column = $columnsResult->fetch_assoc()) {
                $columnName = $column['Field'];
                $dataType = $column['Type'];
                
                // Only modify string-type columns
                if (strpos($dataType, 'varchar') !== false || strpos($dataType, 'text') !== false || 
                    strpos($dataType, 'char') !== false || strpos($dataType, 'enum') !== false) {
                    $conn->query("ALTER TABLE `$table` MODIFY COLUMN `$columnName` $dataType CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                }
            }
            
            // Add logging for diagnostics
            error_log("Fixed collation for table: $table");
        }
    }
    
    // Step 2: Create missing tables
    setupVehiclesTable($conn);
    setupVehiclePricingTable($conn);
    setupAirportTransferFaresTable($conn);
    setupVehicleTypesTable($conn);
    
    // Step 3: Sync data between tables
    syncTablesData($conn);
    
    // Return success response
    sendSuccessResponse([
        'initialized' => true,
        'tablesCreated' => $tables
    ], 'Airport fares tables initialized successfully');
    
} catch (Exception $e) {
    // Return error response
    sendErrorResponse('Failed to initialize airport fares tables: ' . $e->getMessage());
}

// Helper function to create the airport_transfer_fares table
function setupAirportTransferFaresTable($conn) {
    $createSql = "
        CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `base_price` decimal(10,2) DEFAULT 0.00,
          `price_per_km` decimal(10,2) DEFAULT 0.00,
          `pickup_price` decimal(10,2) DEFAULT 0.00,
          `drop_price` decimal(10,2) DEFAULT 0.00,
          `tier1_price` decimal(10,2) DEFAULT 0.00,
          `tier2_price` decimal(10,2) DEFAULT 0.00,
          `tier3_price` decimal(10,2) DEFAULT 0.00,
          `tier4_price` decimal(10,2) DEFAULT 0.00,
          `extra_km_charge` decimal(10,2) DEFAULT 0.00,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if (!$conn->query($createSql)) {
        throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
    }
    
    return true;
}

// Helper function to create the vehicles table
function setupVehiclesTable($conn) {
    $createSql = "
        CREATE TABLE IF NOT EXISTS `vehicles` (
          `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `capacity` int(11) DEFAULT 4,
          `luggage_capacity` int(11) DEFAULT 2,
          `ac` tinyint(1) DEFAULT 1,
          `is_active` tinyint(1) DEFAULT 1,
          `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if (!$conn->query($createSql)) {
        throw new Exception("Failed to create vehicles table: " . $conn->error);
    }
    
    return true;
}

// Helper function to create the vehicle_pricing table
function setupVehiclePricingTable($conn) {
    $createSql = "
        CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `trip_type` enum('local','outstation','airport') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
          `base_price` decimal(10,2) DEFAULT 0.00,
          `price_per_km` decimal(10,2) DEFAULT 0.00,
          `airport_base_price` decimal(10,2) DEFAULT 0.00,
          `airport_price_per_km` decimal(10,2) DEFAULT 0.00,
          `airport_pickup_price` decimal(10,2) DEFAULT 0.00,
          `airport_drop_price` decimal(10,2) DEFAULT 0.00,
          `airport_tier1_price` decimal(10,2) DEFAULT 0.00,
          `airport_tier2_price` decimal(10,2) DEFAULT 0.00,
          `airport_tier3_price` decimal(10,2) DEFAULT 0.00,
          `airport_tier4_price` decimal(10,2) DEFAULT 0.00,
          `airport_extra_km_charge` decimal(10,2) DEFAULT 0.00,
          `local_4hr_price` decimal(10,2) DEFAULT 0.00,
          `local_8hr_price` decimal(10,2) DEFAULT 0.00,
          `local_10hr_price` decimal(10,2) DEFAULT 0.00,
          `local_extra_km_price` decimal(10,2) DEFAULT 0.00,
          `local_extra_hr_price` decimal(10,2) DEFAULT 0.00,
          `outstation_oneway_price` decimal(10,2) DEFAULT 0.00,
          `outstation_roundtrip_price` decimal(10,2) DEFAULT 0.00,
          `outstation_driver_allowance` decimal(10,2) DEFAULT 0.00,
          `outstation_night_halt_charge` decimal(10,2) DEFAULT 0.00,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_trip_type` (`vehicle_id`,`trip_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if (!$conn->query($createSql)) {
        throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
    }
    
    return true;
}

// Helper function to create the vehicle_types table
function setupVehicleTypesTable($conn) {
    $createSql = "
        CREATE TABLE IF NOT EXISTS `vehicle_types` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `type_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `is_active` tinyint(1) DEFAULT 1,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `type_id` (`type_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if (!$conn->query($createSql)) {
        throw new Exception("Failed to create vehicle_types table: " . $conn->error);
    }
    
    return true;
}

// Helper function to sync data between tables
function syncTablesData($conn) {
    // Sync airport_transfer_fares to vehicle_pricing
    $syncSql = "
        INSERT INTO vehicle_pricing (
            vehicle_id, trip_type, 
            airport_base_price, airport_price_per_km, airport_pickup_price, 
            airport_drop_price, airport_tier1_price, airport_tier2_price, 
            airport_tier3_price, airport_tier4_price, airport_extra_km_charge
        )
        SELECT 
            atf.vehicle_id, 'airport',
            atf.base_price, atf.price_per_km, atf.pickup_price,
            atf.drop_price, atf.tier1_price, atf.tier2_price,
            atf.tier3_price, atf.tier4_price, atf.extra_km_charge
        FROM airport_transfer_fares atf
        LEFT JOIN vehicle_pricing vp ON vp.vehicle_id = atf.vehicle_id AND vp.trip_type = 'airport'
        WHERE vp.id IS NULL
        ON DUPLICATE KEY UPDATE
            airport_base_price = atf.base_price,
            airport_price_per_km = atf.price_per_km,
            airport_pickup_price = atf.pickup_price,
            airport_drop_price = atf.drop_price,
            airport_tier1_price = atf.tier1_price,
            airport_tier2_price = atf.tier2_price,
            airport_tier3_price = atf.tier3_price,
            airport_tier4_price = atf.tier4_price,
            airport_extra_km_charge = atf.extra_km_charge
    ";
    
    try {
        $conn->query($syncSql);
    } catch (Exception $e) {
        error_log("Warning: Failed to sync airport_transfer_fares to vehicle_pricing: " . $e->getMessage());
    }
    
    // Sync vehicle_pricing to airport_transfer_fares (in case some are missing)
    $syncBackSql = "
        INSERT INTO airport_transfer_fares (
            vehicle_id, base_price, price_per_km, pickup_price, 
            drop_price, tier1_price, tier2_price, tier3_price, 
            tier4_price, extra_km_charge
        )
        SELECT 
            vp.vehicle_id, vp.airport_base_price, vp.airport_price_per_km, vp.airport_pickup_price,
            vp.airport_drop_price, vp.airport_tier1_price, vp.airport_tier2_price, vp.airport_tier3_price,
            vp.airport_tier4_price, vp.airport_extra_km_charge
        FROM vehicle_pricing vp
        LEFT JOIN airport_transfer_fares atf ON atf.vehicle_id = vp.vehicle_id
        WHERE vp.trip_type = 'airport' AND atf.id IS NULL
        ON DUPLICATE KEY UPDATE
            base_price = vp.airport_base_price,
            price_per_km = vp.airport_price_per_km,
            pickup_price = vp.airport_pickup_price,
            drop_price = vp.airport_drop_price,
            tier1_price = vp.airport_tier1_price,
            tier2_price = vp.airport_tier2_price,
            tier3_price = vp.airport_tier3_price,
            tier4_price = vp.airport_tier4_price,
            extra_km_charge = vp.airport_extra_km_charge
    ";
    
    try {
        $conn->query($syncBackSql);
    } catch (Exception $e) {
        error_log("Warning: Failed to sync vehicle_pricing to airport_transfer_fares: " . $e->getMessage());
    }
    
    return true;
}
