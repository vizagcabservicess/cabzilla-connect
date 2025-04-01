
<?php
// fix-vehicle-tables.php - Fix and repair vehicle database tables

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, *');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.0.2');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Create vehicles table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                ac TINYINT(1) DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT,
                description TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // 2. Create vehicle_types table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                ac TINYINT(1) DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT,
                description TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // 3. Create vehicle_pricing table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(50) DEFAULT 'all',
                base_fare DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                base_price DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            )
        ");
        
        // Add missing columns to vehicle tables if they don't exist
        $vehicleTables = ['vehicles', 'vehicle_types'];
        $columns = [
            'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 700',
            'driver_allowance' => 'DECIMAL(10,2) DEFAULT 250',
            'base_price' => 'DECIMAL(10,2) DEFAULT 0',
            'price_per_km' => 'DECIMAL(10,2) DEFAULT 0'
        ];
        
        foreach ($vehicleTables as $table) {
            foreach ($columns as $column => $definition) {
                // Check if column exists
                $result = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
                if (!$result || $result->num_rows === 0) {
                    $conn->query("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
                }
            }
        }
        
        // Add base_price column to vehicle_pricing if it doesn't exist
        $result = $conn->query("SHOW COLUMNS FROM `vehicle_pricing` LIKE 'base_price'");
        if (!$result || $result->num_rows === 0) {
            $conn->query("ALTER TABLE `vehicle_pricing` ADD COLUMN `base_price` DECIMAL(10,2) DEFAULT 0");
        }
        
        // Synchronize data between tables
        // First copy from vehicle_types to vehicles
        $conn->query("
            INSERT INTO vehicles (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, 
                                is_active, base_price, price_per_km, night_halt_charge, driver_allowance)
            SELECT vt.vehicle_id, vt.name, vt.capacity, vt.luggage_capacity, vt.ac, vt.image, vt.amenities, 
                  vt.description, vt.is_active, vt.base_price, vt.price_per_km, vt.night_halt_charge, vt.driver_allowance
            FROM vehicle_types vt
            LEFT JOIN vehicles v ON vt.vehicle_id = v.vehicle_id
            WHERE v.vehicle_id IS NULL
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name), 
                capacity = VALUES(capacity), 
                luggage_capacity = VALUES(luggage_capacity), 
                ac = VALUES(ac),
                image = VALUES(image),
                amenities = VALUES(amenities),
                description = VALUES(description),
                is_active = VALUES(is_active),
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance)
        ");
        
        // Then copy from vehicles to vehicle_types
        $conn->query("
            INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description,
                                    is_active, base_price, price_per_km, night_halt_charge, driver_allowance)
            SELECT v.vehicle_id, v.name, v.capacity, v.luggage_capacity, v.ac, v.image, v.amenities, 
                  v.description, v.is_active, v.base_price, v.price_per_km, v.night_halt_charge, v.driver_allowance
            FROM vehicles v
            LEFT JOIN vehicle_types vt ON v.vehicle_id = vt.vehicle_id
            WHERE vt.vehicle_id IS NULL
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name), 
                capacity = VALUES(capacity), 
                luggage_capacity = VALUES(luggage_capacity), 
                ac = VALUES(ac),
                image = VALUES(image),
                amenities = VALUES(amenities),
                description = VALUES(description),
                is_active = VALUES(is_active),
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance)
        ");
        
        // Make sure each vehicle has entries in vehicle_pricing table
        $result = $conn->query("SELECT vehicle_id FROM vehicle_types");
        $vehicleIds = [];
        while ($row = $result->fetch_assoc()) {
            $vehicleIds[] = $row['vehicle_id'];
        }
        
        // For each vehicle ID, ensure it has entries for different trip types
        $tripTypes = ['outstation', 'local', 'airport'];
        foreach ($vehicleIds as $vehicleId) {
            foreach ($tripTypes as $tripType) {
                $stmt = $conn->prepare("
                    SELECT id FROM vehicle_pricing 
                    WHERE vehicle_id = ? AND trip_type = ?
                ");
                $stmt->bind_param("ss", $vehicleId, $tripType);
                $stmt->execute();
                $result = $stmt->get_result();
                
                // If no entry exists, create it
                if ($result->num_rows === 0) {
                    // Get vehicle base price and other details
                    $vStmt = $conn->prepare("
                        SELECT base_price, price_per_km, night_halt_charge, driver_allowance 
                        FROM vehicle_types 
                        WHERE vehicle_id = ?
                    ");
                    $vStmt->bind_param("s", $vehicleId);
                    $vStmt->execute();
                    $vResult = $vStmt->get_result();
                    $vehicle = $vResult->fetch_assoc();
                    
                    // Use default values if not found
                    if (!$vehicle) {
                        $vehicle = [
                            'base_price' => 0,
                            'price_per_km' => 0,
                            'night_halt_charge' => 700,
                            'driver_allowance' => 250
                        ];
                    }
                    
                    $insertStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $insertStmt->bind_param(
                        "ssddddd", 
                        $vehicleId, 
                        $tripType, 
                        $vehicle['base_price'], 
                        $vehicle['price_per_km'], 
                        $vehicle['night_halt_charge'], 
                        $vehicle['driver_allowance'],
                        $vehicle['base_price']
                    );
                    $insertStmt->execute();
                }
            }
        }
        
        // Create outstation_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
                roundtrip_base_price DECIMAL(10,2) DEFAULT NULL,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            )
        ");
        
        // Create local_package_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            )
        ");
        
        // Create airport_transfer_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            )
        ");
        
        // Sync vehicle data to outstation_fares
        foreach ($vehicleIds as $vehicleId) {
            $stmt = $conn->prepare("
                SELECT id FROM outstation_fares
                WHERE vehicle_id = ?
            ");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // If no entry exists, create it
            if ($result->num_rows === 0) {
                // Get vehicle details
                $vStmt = $conn->prepare("
                    SELECT base_price, price_per_km, night_halt_charge, driver_allowance
                    FROM vehicle_types
                    WHERE vehicle_id = ?
                ");
                $vStmt->bind_param("s", $vehicleId);
                $vStmt->execute();
                $vResult = $vStmt->get_result();
                $vehicle = $vResult->fetch_assoc();
                
                // Use default values if not found
                if (!$vehicle) {
                    $vehicle = [
                        'base_price' => 0,
                        'price_per_km' => 0,
                        'night_halt_charge' => 700,
                        'driver_allowance' => 250
                    ];
                }
                
                $insertStmt = $conn->prepare("
                    INSERT INTO outstation_fares 
                    (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                     roundtrip_base_price, roundtrip_price_per_km) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $roundtripBasePrice = $vehicle['base_price'] * 0.95;
                $roundtripPricePerKm = $vehicle['price_per_km'] * 0.9;
                $insertStmt->bind_param(
                    "sdddddd", 
                    $vehicleId, 
                    $vehicle['base_price'], 
                    $vehicle['price_per_km'], 
                    $vehicle['night_halt_charge'], 
                    $vehicle['driver_allowance'],
                    $roundtripBasePrice,
                    $roundtripPricePerKm
                );
                $insertStmt->execute();
            }
        }
        
        // Sync vehicle data to local_package_fares
        foreach ($vehicleIds as $vehicleId) {
            $stmt = $conn->prepare("
                SELECT id FROM local_package_fares
                WHERE vehicle_id = ?
            ");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // If no entry exists, create it
            if ($result->num_rows === 0) {
                // Get vehicle details
                $vStmt = $conn->prepare("
                    SELECT base_price, price_per_km
                    FROM vehicle_types
                    WHERE vehicle_id = ?
                ");
                $vStmt->bind_param("s", $vehicleId);
                $vStmt->execute();
                $vResult = $vStmt->get_result();
                $vehicle = $vResult->fetch_assoc();
                
                // Use default values if not found
                if (!$vehicle) {
                    $vehicle = [
                        'base_price' => 0,
                        'price_per_km' => 0
                    ];
                }
                
                $price4hrs40km = $vehicle['base_price'] > 0 ? $vehicle['base_price'] * 0.5 : 1200;
                $price8hrs80km = $vehicle['base_price'] > 0 ? $vehicle['base_price'] * 0.8 : 2200;
                $price10hrs100km = $vehicle['base_price'] > 0 ? $vehicle['base_price'] : 2500;
                $priceExtraKm = $vehicle['price_per_km'] > 0 ? $vehicle['price_per_km'] : 14;
                $priceExtraHour = 250;
                
                $insertStmt = $conn->prepare("
                    INSERT INTO local_package_fares
                    (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $insertStmt->bind_param(
                    "sddddd",
                    $vehicleId,
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour
                );
                $insertStmt->execute();
            }
        }
        
        // Sync vehicle data to airport_transfer_fares
        foreach ($vehicleIds as $vehicleId) {
            $stmt = $conn->prepare("
                SELECT id FROM airport_transfer_fares
                WHERE vehicle_id = ?
            ");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // If no entry exists, create it
            if ($result->num_rows === 0) {
                // Get vehicle details
                $vStmt = $conn->prepare("
                    SELECT base_price, price_per_km
                    FROM vehicle_types
                    WHERE vehicle_id = ?
                ");
                $vStmt->bind_param("s", $vehicleId);
                $vStmt->execute();
                $vResult = $vStmt->get_result();
                $vehicle = $vResult->fetch_assoc();
                
                // Use default values if not found
                if (!$vehicle) {
                    $vehicle = [
                        'base_price' => 0,
                        'price_per_km' => 0
                    ];
                }
                
                $airportBasePrice = $vehicle['base_price'] > 0 ? $vehicle['base_price'] * 0.7 : 3000;
                $airportPricePerKm = $vehicle['price_per_km'] > 0 ? $vehicle['price_per_km'] : 15;
                $pickupPrice = $vehicle['base_price'] > 0 ? $vehicle['base_price'] * 0.2 : 800;
                $dropPrice = $pickupPrice;
                $tier1Price = $pickupPrice * 0.75;
                $tier2Price = $pickupPrice;
                $tier3Price = $pickupPrice * 1.25;
                $tier4Price = $pickupPrice * 1.5;
                $extraKmCharge = $airportPricePerKm;
                
                $insertStmt = $conn->prepare("
                    INSERT INTO airport_transfer_fares
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $insertStmt->bind_param(
                    "sddddddddd",
                    $vehicleId,
                    $airportBasePrice,
                    $airportPricePerKm,
                    $pickupPrice,
                    $dropPrice,
                    $tier1Price,
                    $tier2Price,
                    $tier3Price,
                    $tier4Price,
                    $extraKmCharge
                );
                $insertStmt->execute();
            }
        }
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle tables created and fixed successfully',
            'tables_created' => ['vehicles', 'vehicle_types', 'vehicle_pricing', 'outstation_fares', 'local_package_fares', 'airport_transfer_fares'],
            'columns_added' => $columns,
            'vehicles_synced' => $vehicleIds
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log and return error response
    error_log("Error fixing vehicle tables: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fix vehicle tables: ' . $e->getMessage()
    ]);
}
