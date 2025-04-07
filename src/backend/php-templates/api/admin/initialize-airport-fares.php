
<?php
/**
 * Initialize Airport Fares Tables Endpoint
 * 
 * Creates and initializes airport_transfer_fares table and syncs data with vehicle_pricing
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
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

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/initialize_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the initialization
file_put_contents($logFile, "[$timestamp] Initializing airport fares tables\n", FILE_APPEND);

// Function to safely output response
function outputInitResponse($status, $message, $data = []) {
    global $logFile, $timestamp;
    
    // Log the response
    file_put_contents($logFile, "[$timestamp] Response: $status - $message\n", FILE_APPEND);
    
    // Clear any buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    
    // Output JSON
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for the entire connection
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    $conn->query("SET CHARACTER SET utf8mb4");
    
    file_put_contents($logFile, "[$timestamp] Database connection established\n", FILE_APPEND);
    
    // Step 1: Fix collation on existing tables if needed
    $tables = ['vehicles', 'vehicle_pricing', 'airport_transfer_fares', 'vehicle_types'];
    
    foreach ($tables as $table) {
        try {
            // Check if table exists
            $result = $conn->query("SHOW TABLES LIKE '$table'");
            
            if ($result && $result->num_rows > 0) {
                // Fix table character set and collation
                $conn->query("ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                file_put_contents($logFile, "[$timestamp] Fixed collation for table: $table\n", FILE_APPEND);
                
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
            }
        } catch (Exception $tableError) {
            file_put_contents($logFile, "[$timestamp] Warning: Could not fix collation for $table: " . $tableError->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Step 2: Create missing tables
    // Check and create airport_transfer_fares table
    $createAirportFaresTable = "
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
    
    $result = $conn->query($createAirportFaresTable);
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to create airport_transfer_fares table: " . $conn->error . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Airport transfer fares table created or already exists\n", FILE_APPEND);
    }
    
    // Check and create vehicles table
    $createVehiclesTable = "
        CREATE TABLE IF NOT EXISTS `vehicles` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
          `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `capacity` int(11) DEFAULT 4,
          `luggage_capacity` int(11) DEFAULT 2,
          `ac` tinyint(1) DEFAULT 1,
          `is_active` tinyint(1) DEFAULT 1,
          `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `base_price` decimal(10,2) DEFAULT 0.00,
          `price_per_km` decimal(10,2) DEFAULT 0.00,
          `night_halt_charge` decimal(10,2) DEFAULT 0.00,
          `driver_allowance` decimal(10,2) DEFAULT 0.00,
          `amenities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $result = $conn->query($createVehiclesTable);
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to create vehicles table: " . $conn->error . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Vehicles table created or already exists\n", FILE_APPEND);
    }
    
    // Check and create vehicle_pricing table
    $createVehiclePricingTable = "
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
    
    $result = $conn->query($createVehiclePricingTable);
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to create vehicle_pricing table: " . $conn->error . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Vehicle pricing table created or already exists\n", FILE_APPEND);
    }
    
    // Step 3: Sync data between tables
    // Sync airport_transfer_fares to vehicle_pricing
    $syncToVehiclePricing = "
        INSERT INTO vehicle_pricing (
            vehicle_id, trip_type, 
            airport_base_price, airport_price_per_km, airport_pickup_price, 
            airport_drop_price, airport_tier1_price, airport_tier2_price, 
            airport_tier3_price, airport_tier4_price, airport_extra_km_charge
        )
        SELECT 
            atf.vehicle_id, 'airport',
            IFNULL(atf.base_price, 0), IFNULL(atf.price_per_km, 0), IFNULL(atf.pickup_price, 0),
            IFNULL(atf.drop_price, 0), IFNULL(atf.tier1_price, 0), IFNULL(atf.tier2_price, 0),
            IFNULL(atf.tier3_price, 0), IFNULL(atf.tier4_price, 0), IFNULL(atf.extra_km_charge, 0)
        FROM airport_transfer_fares atf
        LEFT JOIN vehicle_pricing vp ON vp.vehicle_id = atf.vehicle_id AND vp.trip_type = 'airport'
        WHERE vp.id IS NULL
        ON DUPLICATE KEY UPDATE
            airport_base_price = IFNULL(VALUES(airport_base_price), 0),
            airport_price_per_km = IFNULL(VALUES(airport_price_per_km), 0),
            airport_pickup_price = IFNULL(VALUES(airport_pickup_price), 0),
            airport_drop_price = IFNULL(VALUES(airport_drop_price), 0),
            airport_tier1_price = IFNULL(VALUES(airport_tier1_price), 0),
            airport_tier2_price = IFNULL(VALUES(airport_tier2_price), 0),
            airport_tier3_price = IFNULL(VALUES(airport_tier3_price), 0),
            airport_tier4_price = IFNULL(VALUES(airport_tier4_price), 0),
            airport_extra_km_charge = IFNULL(VALUES(airport_extra_km_charge), 0)
    ";
    
    try {
        $result = $conn->query($syncToVehiclePricing);
        if (!$result) {
            file_put_contents($logFile, "[$timestamp] Warning: Failed to sync airport_transfer_fares to vehicle_pricing: " . $conn->error . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] Synced airport_transfer_fares to vehicle_pricing\n", FILE_APPEND);
        }
    } catch (Exception $syncError) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to sync tables: " . $syncError->getMessage() . "\n", FILE_APPEND);
    }
    
    // Sync vehicle_pricing to airport_transfer_fares (in case some are missing)
    $syncToAirportFares = "
        INSERT INTO airport_transfer_fares (
            vehicle_id, base_price, price_per_km, pickup_price, 
            drop_price, tier1_price, tier2_price, tier3_price, 
            tier4_price, extra_km_charge
        )
        SELECT 
            vp.vehicle_id, 
            IFNULL(vp.airport_base_price, 0), 
            IFNULL(vp.airport_price_per_km, 0), 
            IFNULL(vp.airport_pickup_price, 0),
            IFNULL(vp.airport_drop_price, 0), 
            IFNULL(vp.airport_tier1_price, 0), 
            IFNULL(vp.airport_tier2_price, 0), 
            IFNULL(vp.airport_tier3_price, 0),
            IFNULL(vp.airport_tier4_price, 0), 
            IFNULL(vp.airport_extra_km_charge, 0)
        FROM vehicle_pricing vp
        LEFT JOIN airport_transfer_fares atf ON atf.vehicle_id = vp.vehicle_id
        WHERE vp.trip_type = 'airport' AND atf.id IS NULL
        ON DUPLICATE KEY UPDATE
            base_price = IFNULL(VALUES(base_price), 0),
            price_per_km = IFNULL(VALUES(price_per_km), 0),
            pickup_price = IFNULL(VALUES(pickup_price), 0),
            drop_price = IFNULL(VALUES(drop_price), 0),
            tier1_price = IFNULL(VALUES(tier1_price), 0),
            tier2_price = IFNULL(VALUES(tier2_price), 0),
            tier3_price = IFNULL(VALUES(tier3_price), 0),
            tier4_price = IFNULL(VALUES(tier4_price), 0),
            extra_km_charge = IFNULL(VALUES(extra_km_charge), 0)
    ";
    
    try {
        $result = $conn->query($syncToAirportFares);
        if (!$result) {
            file_put_contents($logFile, "[$timestamp] Warning: Failed to sync vehicle_pricing to airport_transfer_fares: " . $conn->error . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] Synced vehicle_pricing to airport_transfer_fares\n", FILE_APPEND);
        }
    } catch (Exception $syncError) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to sync tables: " . $syncError->getMessage() . "\n", FILE_APPEND);
    }
    
    // Step 4: Add fare entries for vehicles that don't have them
    $createDefaultFares = "
        INSERT INTO airport_transfer_fares (
            vehicle_id, base_price, price_per_km, pickup_price, 
            drop_price, tier1_price, tier2_price, tier3_price, 
            tier4_price, extra_km_charge
        )
        SELECT 
            v.vehicle_id, 0, 0, 0, 0, 0, 0, 0, 0, 0
        FROM vehicles v
        LEFT JOIN airport_transfer_fares atf ON atf.vehicle_id = v.vehicle_id
        WHERE atf.id IS NULL
        ON DUPLICATE KEY UPDATE
            vehicle_id = v.vehicle_id
    ";
    
    try {
        $result = $conn->query($createDefaultFares);
        if (!$result) {
            file_put_contents($logFile, "[$timestamp] Warning: Failed to create default fares: " . $conn->error . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] Created default fares for vehicles without fare entries\n", FILE_APPEND);
        }
    } catch (Exception $defaultFareError) {
        file_put_contents($logFile, "[$timestamp] Warning: Failed to create default fares: " . $defaultFareError->getMessage() . "\n", FILE_APPEND);
    }
    
    // Return a success response
    outputInitResponse('success', 'Airport fares tables initialized successfully', [
        'tablesCreated' => $tables,
        'initialized' => true
    ]);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    outputInitResponse('error', 'Failed to initialize airport fares tables: ' . $e->getMessage());
}
