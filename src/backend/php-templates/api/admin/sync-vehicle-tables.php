
<?php
// sync-vehicle-tables.php - Synchronizes vehicle data across multiple database tables

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_log("[" . date("Y-m-d H:i:s") . "] Starting sync-vehicle-tables.php script", 3, __DIR__ . '/../../error.log');

// Include database configuration
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    error_log("[" . date("Y-m-d H:i:s") . "] Database connection successful", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction to ensure consistency
    $conn->begin_transaction();
    
    // 1. Check if tables exist
    $tables = ['vehicle_types', 'vehicles', 'vehicle_pricing'];
    $tableExists = array();
    $issues = array();
    
    foreach ($tables as $table) {
        $checkResult = $conn->query("SHOW TABLES LIKE '$table'");
        $tableExists[$table] = $checkResult->num_rows > 0;
        
        if (!$tableExists[$table]) {
            $issues[] = "Table '$table' does not exist";
        }
    }
    
    error_log("[" . date("Y-m-d H:i:s") . "] Tables check completed: " . 
        implode(", ", array_map(function($t, $e) { return "$t=" . ($e ? "exists" : "missing"); }, 
            array_keys($tableExists), array_values($tableExists))), 3, __DIR__ . '/../../error.log');
    
    // 2. Create tables if they don't exist
    if (!$tableExists['vehicle_types']) {
        $conn->query("
            CREATE TABLE vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("[" . date("Y-m-d H:i:s") . "] Created vehicle_types table", 3, __DIR__ . '/../../error.log');
        $tableExists['vehicle_types'] = true;
    }
    
    if (!$tableExists['vehicles']) {
        $conn->query("
            CREATE TABLE vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("[" . date("Y-m-d H:i:s") . "] Created vehicles table", 3, __DIR__ . '/../../error.log');
        $tableExists['vehicles'] = true;
    }
    
    if (!$tableExists['vehicle_pricing']) {
        $conn->query("
            CREATE TABLE vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                vehicle_type VARCHAR(50) NOT NULL,
                trip_type ENUM('local', 'outstation', 'airport') NOT NULL DEFAULT 'outstation',
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                local_package_4hr DECIMAL(10,2) NOT NULL DEFAULT 0,
                local_package_8hr DECIMAL(10,2) NOT NULL DEFAULT 0,
                local_package_10hr DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                extra_hour_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("[" . date("Y-m-d H:i:s") . "] Created vehicle_pricing table", 3, __DIR__ . '/../../error.log');
        $tableExists['vehicle_pricing'] = true;
    }
    
    // 3. Fix any null or empty vehicle_id fields
    $conn->query("DELETE FROM vehicle_types WHERE vehicle_id = '' OR vehicle_id IS NULL");
    $conn->query("DELETE FROM vehicles WHERE vehicle_id = '' OR vehicle_id IS NULL");
    $conn->query("DELETE FROM vehicle_pricing WHERE vehicle_id = '' OR vehicle_id IS NULL");
    
    // 4. Get all vehicles from vehicle_types as the master source
    $vehicles = array();
    $result = $conn->query("SELECT id, vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active FROM vehicle_types WHERE vehicle_id != '' AND vehicle_id IS NOT NULL");
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $vehicles[$row['vehicle_id']] = $row;
        }
    }
    
    error_log("[" . date("Y-m-d H:i:s") . "] Retrieved " . count($vehicles) . " vehicles from vehicle_types", 3, __DIR__ . '/../../error.log');
    
    if (empty($vehicles)) {
        // If no vehicles found, create default ones
        $defaultVehicles = [
            [
                'vehicle_id' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggage_capacity' => 2,
                'ac' => 1,
                'image' => '/cars/sedan.png',
                'amenities' => json_encode(['AC', 'Bottle Water', 'Music System']),
                'description' => 'Comfortable sedan suitable for 4 passengers.',
                'is_active' => 1
            ],
            [
                'vehicle_id' => 'ertiga',
                'name' => 'Ertiga',
                'capacity' => 6,
                'luggage_capacity' => 3,
                'ac' => 1,
                'image' => '/cars/ertiga.png',
                'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom']),
                'description' => 'Spacious SUV suitable for 6 passengers.',
                'is_active' => 1
            ],
            [
                'vehicle_id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'capacity' => 7,
                'luggage_capacity' => 4,
                'ac' => 1,
                'image' => '/cars/innova.png',
                'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point']),
                'description' => 'Premium SUV with ample space for 7 passengers.',
                'is_active' => 1
            ],
            [
                'vehicle_id' => 'tempo',
                'name' => 'Tempo Traveller',
                'capacity' => 12,
                'luggage_capacity' => 8,
                'ac' => 1,
                'image' => '/cars/tempo.png',
                'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point']),
                'description' => 'Spacious van suitable for group travel of up to 12 passengers.',
                'is_active' => 1
            ],
            [
                'vehicle_id' => 'luxury',
                'name' => 'Luxury Sedan',
                'capacity' => 4,
                'luggage_capacity' => 3,
                'ac' => 1,
                'image' => '/cars/luxury.png',
                'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Premium Leather Seats']),
                'description' => 'Premium luxury sedan with high-end amenities for a comfortable journey.',
                'is_active' => 1
            ]
        ];
        
        $stmt = $conn->prepare("
            INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($defaultVehicles as $vehicle) {
            $stmt->bind_param(
                'ssiisissi',
                $vehicle['vehicle_id'],
                $vehicle['name'],
                $vehicle['capacity'],
                $vehicle['luggage_capacity'],
                $vehicle['ac'],
                $vehicle['image'],
                $vehicle['amenities'],
                $vehicle['description'],
                $vehicle['is_active']
            );
            $stmt->execute();
            $vehicles[$vehicle['vehicle_id']] = $vehicle;
        }
        
        error_log("[" . date("Y-m-d H:i:s") . "] Added " . count($defaultVehicles) . " default vehicles", 3, __DIR__ . '/../../error.log');
    }
    
    // 5. Sync vehicles from vehicle_types to vehicles table
    $syncedCount = 0;
    
    foreach ($vehicles as $vehicleId => $vehicle) {
        // Check if vehicle exists in the vehicles table
        $checkStmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Insert into vehicles table
            $insertStmt = $conn->prepare("
                INSERT INTO vehicles (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $amenities = is_string($vehicle['amenities']) ? $vehicle['amenities'] : json_encode([]);
            
            $insertStmt->bind_param(
                'ssiisissi',
                $vehicleId,
                $vehicle['name'],
                $vehicle['capacity'],
                $vehicle['luggage_capacity'],
                $vehicle['ac'],
                $vehicle['image'],
                $amenities,
                $vehicle['description'],
                $vehicle['is_active']
            );
            
            $insertStmt->execute();
            $syncedCount++;
        } else {
            // Update vehicles table
            $updateStmt = $conn->prepare("
                UPDATE vehicles
                SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, image = ?, amenities = ?, description = ?, is_active = ?
                WHERE vehicle_id = ?
            ");
            
            $amenities = is_string($vehicle['amenities']) ? $vehicle['amenities'] : json_encode([]);
            
            $updateStmt->bind_param(
                'siisissis',
                $vehicle['name'],
                $vehicle['capacity'],
                $vehicle['luggage_capacity'],
                $vehicle['ac'],
                $vehicle['image'],
                $amenities,
                $vehicle['description'],
                $vehicle['is_active'],
                $vehicleId
            );
            
            $updateStmt->execute();
        }
    }
    
    error_log("[" . date("Y-m-d H:i:s") . "] Synced $syncedCount vehicles to vehicles table", 3, __DIR__ . '/../../error.log');
    
    // 6. Sync vehicles to vehicle_pricing table for each trip type
    $tripTypes = ['outstation', 'local', 'airport'];
    $pricingSyncedCount = 0;
    
    foreach ($vehicles as $vehicleId => $vehicle) {
        foreach ($tripTypes as $tripType) {
            // Check if pricing exists for this vehicle and trip type
            $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?");
            $checkStmt->bind_param('ss', $vehicleId, $tripType);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Insert default pricing
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing (
                        vehicle_id, vehicle_type, trip_type, base_fare, price_per_km,
                        driver_allowance, night_halt_charge
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                // Set default values based on vehicle type
                $baseFare = 0;
                $pricePerKm = 0;
                $driverAllowance = 250;
                $nightHaltCharge = 700;
                
                // Default pricing by vehicle type
                switch ($vehicleId) {
                    case 'sedan':
                    case 'sedan_etios':
                        $baseFare = 2500;
                        $pricePerKm = 14;
                        break;
                    case 'ertiga':
                        $baseFare = 3200;
                        $pricePerKm = 18;
                        break;
                    case 'innova':
                    case 'innova_crysta':
                        $baseFare = 3800;
                        $pricePerKm = 20;
                        $nightHaltCharge = 1000;
                        break;
                    case 'tempo':
                        $baseFare = 5500;
                        $pricePerKm = 22;
                        $nightHaltCharge = 1200;
                        break;
                    case 'luxury':
                        $baseFare = 4500;
                        $pricePerKm = 25;
                        $nightHaltCharge = 1000;
                        break;
                    default:
                        $baseFare = 3000;
                        $pricePerKm = 16;
                }
                
                $insertStmt->bind_param(
                    'sssdddd',
                    $vehicleId,
                    $vehicleId,  // vehicle_type field gets same value as vehicle_id
                    $tripType,
                    $baseFare,
                    $pricePerKm,
                    $driverAllowance,
                    $nightHaltCharge
                );
                
                $insertStmt->execute();
                $pricingSyncedCount++;
            } else {
                // Update the vehicle_type field to make sure it matches vehicle_id
                // This is critical as some code may be looking for vehicle_type instead of vehicle_id
                $updateStmt = $conn->prepare("
                    UPDATE vehicle_pricing
                    SET vehicle_type = ?
                    WHERE vehicle_id = ? AND trip_type = ?
                ");
                
                $updateStmt->bind_param('sss', $vehicleId, $vehicleId, $tripType);
                $updateStmt->execute();
            }
        }
    }
    
    error_log("[" . date("Y-m-d H:i:s") . "] Created $pricingSyncedCount new pricing entries", 3, __DIR__ . '/../../error.log');
    
    // 7. Fix any remaining issues
    // Ensure no empty vehicle_id or vehicle_type fields
    $conn->query("DELETE FROM vehicle_pricing WHERE vehicle_id = '' OR vehicle_id IS NULL OR vehicle_type = '' OR vehicle_type IS NULL");
    
    // Ensure all vehicle_type fields match vehicle_id fields
    $conn->query("UPDATE vehicle_pricing SET vehicle_type = vehicle_id WHERE vehicle_type != vehicle_id");
    
    // Commit transaction
    $conn->commit();
    
    $response = [
        'status' => 'success',
        'message' => 'Vehicle tables synchronized successfully',
        'details' => [
            'vehicles_synced' => count($vehicles),
            'pricing_entries_created' => $pricingSyncedCount
        ]
    ];
    
    echo json_encode($response);
    error_log("[" . date("Y-m-d H:i:s") . "] Sync completed successfully", 3, __DIR__ . '/../../error.log');
    
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    $errorMessage = $e->getMessage();
    error_log("[" . date("Y-m-d H:i:s") . "] Error syncing tables: $errorMessage", 3, __DIR__ . '/../../error.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage,
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
