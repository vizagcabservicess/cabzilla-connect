
<?php
// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include configuration
require_once '../../config.php';

// Logging function
function logMessage($message) {
    $logFile = __DIR__ . '/../../logs/fix-tables-' . date('Y-m-d') . '.log';
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

try {
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    logMessage('Starting database table fixes...');
    
    // Check and fix vehicles table
    $checkVehiclesTable = $conn->query("SHOW TABLES LIKE 'vehicles'");
    if ($checkVehiclesTable->num_rows > 0) {
        logMessage('Checking vehicles table for missing columns...');
        
        // Check if night_halt_charge exists
        $checkNightHalt = $conn->query("SHOW COLUMNS FROM `vehicles` LIKE 'night_halt_charge'");
        if ($checkNightHalt->num_rows === 0) {
            logMessage('Adding night_halt_charge column to vehicles table');
            $conn->query("ALTER TABLE `vehicles` ADD COLUMN `night_halt_charge` DECIMAL(10,2) NOT NULL DEFAULT 700");
        }
        
        // Check if driver_allowance exists
        $checkDriverAllowance = $conn->query("SHOW COLUMNS FROM `vehicles` LIKE 'driver_allowance'");
        if ($checkDriverAllowance->num_rows === 0) {
            logMessage('Adding driver_allowance column to vehicles table');
            $conn->query("ALTER TABLE `vehicles` ADD COLUMN `driver_allowance` DECIMAL(10,2) NOT NULL DEFAULT 300");
        }
        
        // Check if base_price exists
        $checkBasePrice = $conn->query("SHOW COLUMNS FROM `vehicles` LIKE 'base_price'");
        if ($checkBasePrice->num_rows === 0) {
            logMessage('Adding base_price column to vehicles table');
            $conn->query("ALTER TABLE `vehicles` ADD COLUMN `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0");
        }
        
        // Check if price_per_km exists
        $checkPricePerKm = $conn->query("SHOW COLUMNS FROM `vehicles` LIKE 'price_per_km'");
        if ($checkPricePerKm->num_rows === 0) {
            logMessage('Adding price_per_km column to vehicles table');
            $conn->query("ALTER TABLE `vehicles` ADD COLUMN `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0");
        }
    }
    
    // Check and fix vehicle_types table
    $checkVehicleTypesTable = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
    if ($checkVehicleTypesTable->num_rows > 0) {
        logMessage('Checking vehicle_types table for missing columns...');
        
        // Check if night_halt_charge exists
        $checkNightHalt = $conn->query("SHOW COLUMNS FROM `vehicle_types` LIKE 'night_halt_charge'");
        if ($checkNightHalt->num_rows === 0) {
            logMessage('Adding night_halt_charge column to vehicle_types table');
            $conn->query("ALTER TABLE `vehicle_types` ADD COLUMN `night_halt_charge` DECIMAL(10,2) NOT NULL DEFAULT 700");
        }
        
        // Check if driver_allowance exists
        $checkDriverAllowance = $conn->query("SHOW COLUMNS FROM `vehicle_types` LIKE 'driver_allowance'");
        if ($checkDriverAllowance->num_rows === 0) {
            logMessage('Adding driver_allowance column to vehicle_types table');
            $conn->query("ALTER TABLE `vehicle_types` ADD COLUMN `driver_allowance` DECIMAL(10,2) NOT NULL DEFAULT 300");
        }
        
        // Check if base_price exists
        $checkBasePrice = $conn->query("SHOW COLUMNS FROM `vehicle_types` LIKE 'base_price'");
        if ($checkBasePrice->num_rows === 0) {
            logMessage('Adding base_price column to vehicle_types table');
            $conn->query("ALTER TABLE `vehicle_types` ADD COLUMN `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0");
        }
        
        // Check if price_per_km exists
        $checkPricePerKm = $conn->query("SHOW COLUMNS FROM `vehicle_types` LIKE 'price_per_km'");
        if ($checkPricePerKm->num_rows === 0) {
            logMessage('Adding price_per_km column to vehicle_types table');
            $conn->query("ALTER TABLE `vehicle_types` ADD COLUMN `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0");
        }
    }
    
    // Sync data from vehicles to vehicle_types and vice versa to ensure consistency
    $syncQuery = "
    INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, 
                             base_price, price_per_km, night_halt_charge, driver_allowance)
    SELECT v.vehicle_id, v.name, v.capacity, v.luggage_capacity, v.ac, v.image, v.amenities, v.description, v.is_active,
           v.base_price, v.price_per_km, v.night_halt_charge, v.driver_allowance
    FROM vehicles v
    LEFT JOIN vehicle_types vt ON v.vehicle_id = vt.vehicle_id
    WHERE vt.vehicle_id IS NULL
    ON DUPLICATE KEY UPDATE
        name = v.name,
        capacity = v.capacity, 
        luggage_capacity = v.luggage_capacity,
        ac = v.ac,
        image = v.image,
        amenities = v.amenities, 
        description = v.description,
        is_active = v.is_active,
        base_price = v.base_price,
        price_per_km = v.price_per_km,
        night_halt_charge = v.night_halt_charge,
        driver_allowance = v.driver_allowance
    ";
    
    if ($conn->query($syncQuery)) {
        logMessage('Synchronized data from vehicles to vehicle_types');
    } else {
        logMessage('Error syncing vehicles to vehicle_types: ' . $conn->error);
    }
    
    $reverseSync = "
    INSERT INTO vehicles (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active,
                        base_price, price_per_km, night_halt_charge, driver_allowance)
    SELECT vt.vehicle_id, vt.name, vt.capacity, vt.luggage_capacity, vt.ac, vt.image, vt.amenities, vt.description, vt.is_active,
           vt.base_price, vt.price_per_km, vt.night_halt_charge, vt.driver_allowance
    FROM vehicle_types vt
    LEFT JOIN vehicles v ON vt.vehicle_id = v.vehicle_id
    WHERE v.vehicle_id IS NULL
    ON DUPLICATE KEY UPDATE
        name = vt.name,
        capacity = vt.capacity, 
        luggage_capacity = vt.luggage_capacity,
        ac = vt.ac,
        image = vt.image,
        amenities = vt.amenities, 
        description = vt.description,
        is_active = vt.is_active,
        base_price = vt.base_price,
        price_per_km = vt.price_per_km,
        night_halt_charge = vt.night_halt_charge,
        driver_allowance = vt.driver_allowance
    ";
    
    if ($conn->query($reverseSync)) {
        logMessage('Synchronized data from vehicle_types to vehicles');
    } else {
        logMessage('Error syncing vehicle_types to vehicles: ' . $conn->error);
    }
    
    // Also update vehicle_pricing table from vehicles
    $updatePricing = "
    INSERT INTO vehicle_pricing (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
    SELECT v.vehicle_id, 'outstation', v.base_price, v.price_per_km, v.night_halt_charge, v.driver_allowance
    FROM vehicles v
    LEFT JOIN vehicle_pricing vp ON v.vehicle_id = vp.vehicle_id AND vp.trip_type = 'outstation'
    WHERE vp.id IS NULL
    ON DUPLICATE KEY UPDATE
        base_fare = v.base_price,
        price_per_km = v.price_per_km,
        night_halt_charge = v.night_halt_charge,
        driver_allowance = v.driver_allowance
    ";
    
    if ($conn->query($updatePricing)) {
        logMessage('Updated vehicle_pricing from vehicles data');
    } else {
        logMessage('Error updating vehicle_pricing: ' . $conn->error);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables fixed and synchronized successfully',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    logMessage('Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
