
<?php
/**
 * fix-vehicle-tables.php - Comprehensive vehicle table synchronization
 * This script ensures consistent data across all vehicle-related tables
 */

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, *');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.0.3');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful'
    ]);
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
        $response = [
            'status' => 'success',
            'message' => 'Vehicle tables synchronized successfully',
            'details' => [
                'tables_checked' => [],
                'tables_fixed' => [],
                'vehicles_synced' => [],
                'errors' => []
            ]
        ];
        
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
        $response['details']['tables_checked'][] = 'vehicles';
        
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
        $response['details']['tables_checked'][] = 'vehicle_types';
        
        // 3. Create outstation_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                roundtrip_price_per_km DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        $response['details']['tables_checked'][] = 'outstation_fares';
        
        // 4. Create local_package_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                price_4hrs_40km DECIMAL(10,2) DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) DEFAULT 0,
                price_extra_km DECIMAL(10,2) DEFAULT 0,
                price_extra_hour DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        $response['details']['tables_checked'][] = 'local_package_fares';
        
        // 5. Create airport_transfer_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                pickup_price DECIMAL(10,2) DEFAULT 0,
                drop_price DECIMAL(10,2) DEFAULT 0,
                tier1_price DECIMAL(10,2) DEFAULT 0,
                tier2_price DECIMAL(10,2) DEFAULT 0,
                tier3_price DECIMAL(10,2) DEFAULT 0,
                tier4_price DECIMAL(10,2) DEFAULT 0,
                extra_km_charge DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        $response['details']['tables_checked'][] = 'airport_transfer_fares';
        
        // 6. Create vehicle_pricing table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(50) DEFAULT 'outstation',
                base_fare DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                base_price DECIMAL(10,2) DEFAULT 0,
                extra_km_charge DECIMAL(10,2) DEFAULT 0,
                extra_hour_charge DECIMAL(10,2) DEFAULT 0,
                local_package_4hr DECIMAL(10,2) DEFAULT 0,
                local_package_8hr DECIMAL(10,2) DEFAULT 0,
                local_package_10hr DECIMAL(10,2) DEFAULT 0,
                airport_base_price DECIMAL(10,2) DEFAULT 0,
                airport_price_per_km DECIMAL(10,2) DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) DEFAULT 0,
                airport_drop_price DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            )
        ");
        $response['details']['tables_checked'][] = 'vehicle_pricing';
        
        // 7. Collect and merge data from all sources to find all vehicle_ids
        $allVehicleIds = [];
        
        // From vehicle_types
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM vehicle_types");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // From vehicles
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM vehicles");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // From outstation_fares
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM outstation_fares");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // From local_package_fares
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM local_package_fares");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // From airport_transfer_fares
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM airport_transfer_fares");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // From vehicle_pricing
        $result = $conn->query("SELECT DISTINCT vehicle_id FROM vehicle_pricing");
        while ($row = $result->fetch_assoc()) {
            $allVehicleIds[$row['vehicle_id']] = true;
        }
        
        // 8. For each vehicle_id, ensure it exists in all tables
        foreach (array_keys($allVehicleIds) as $vehicleId) {
            // First get the best available data for this vehicle
            $vehicleData = [
                'name' => ucfirst(str_replace('_', ' ', $vehicleId)), // Default name
                'capacity' => 4,
                'luggage_capacity' => 2,
                'base_price' => 0,
                'price_per_km' => 0,
                'night_halt_charge' => 700,
                'driver_allowance' => 250,
                'ac' => 1,
                'image' => '/cars/sedan.png',
                'amenities' => '["AC"]',
                'description' => '',
                'is_active' => 1
            ];
            
            // Check if exists in vehicle_types and get data
            $stmt = $conn->prepare("SELECT * FROM vehicle_types WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $vehicleData['name'] = $row['name'];
                $vehicleData['capacity'] = $row['capacity'];
                $vehicleData['luggage_capacity'] = $row['luggage_capacity'];
                $vehicleData['base_price'] = $row['base_price'];
                $vehicleData['price_per_km'] = $row['price_per_km'];
                $vehicleData['night_halt_charge'] = $row['night_halt_charge'];
                $vehicleData['driver_allowance'] = $row['driver_allowance'];
                $vehicleData['ac'] = $row['ac'];
                $vehicleData['image'] = $row['image'];
                $vehicleData['amenities'] = $row['amenities'];
                $vehicleData['description'] = $row['description'];
                $vehicleData['is_active'] = $row['is_active'];
            } else {
                // If not in vehicle_types, check vehicles table
                $stmt = $conn->prepare("SELECT * FROM vehicles WHERE vehicle_id = ?");
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result->num_rows > 0) {
                    $row = $result->fetch_assoc();
                    $vehicleData['name'] = $row['name'];
                    $vehicleData['capacity'] = $row['capacity'];
                    $vehicleData['luggage_capacity'] = $row['luggage_capacity'];
                    $vehicleData['base_price'] = $row['base_price'];
                    $vehicleData['price_per_km'] = $row['price_per_km'];
                    $vehicleData['night_halt_charge'] = $row['night_halt_charge'];
                    $vehicleData['driver_allowance'] = $row['driver_allowance'];
                    $vehicleData['ac'] = $row['ac'];
                    $vehicleData['image'] = $row['image'];
                    $vehicleData['amenities'] = $row['amenities'];
                    $vehicleData['description'] = $row['description'];
                    $vehicleData['is_active'] = $row['is_active'];
                }
            }
            
            // Check if pricing data exists in outstation_fares
            $stmt = $conn->prepare("SELECT * FROM outstation_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                // Only update pricing if not already set
                if ($vehicleData['base_price'] == 0) {
                    $vehicleData['base_price'] = $row['base_price'];
                }
                if ($vehicleData['price_per_km'] == 0) {
                    $vehicleData['price_per_km'] = $row['price_per_km'];
                }
                if ($vehicleData['night_halt_charge'] == 0) {
                    $vehicleData['night_halt_charge'] = $row['night_halt_charge'];
                }
                if ($vehicleData['driver_allowance'] == 0) {
                    $vehicleData['driver_allowance'] = $row['driver_allowance'];
                }
                
                $outstation_fares_exists = true;
                $outstation_base_price = $row['base_price'];
                $outstation_price_per_km = $row['price_per_km'];
                $outstation_night_halt = $row['night_halt_charge'];
                $outstation_driver_allowance = $row['driver_allowance'];
                $roundtrip_base_price = $row['roundtrip_base_price'];
                $roundtrip_price_per_km = $row['roundtrip_price_per_km'];
            } else {
                $outstation_fares_exists = false;
                // Default outstation pricing based on vehicle data
                $outstation_base_price = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] : 3000;
                $outstation_price_per_km = $vehicleData['price_per_km'] > 0 ? $vehicleData['price_per_km'] : 15;
                $outstation_night_halt = $vehicleData['night_halt_charge'];
                $outstation_driver_allowance = $vehicleData['driver_allowance'];
                $roundtrip_base_price = $outstation_base_price * 0.95; // 5% discount
                $roundtrip_price_per_km = $outstation_price_per_km * 0.9; // 10% discount
            }
            
            // Check if pricing data exists in local_package_fares
            $stmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $local_fares_exists = true;
                $price_4hrs_40km = $row['price_4hrs_40km'];
                $price_8hrs_80km = $row['price_8hrs_80km'];
                $price_10hrs_100km = $row['price_10hrs_100km'];
                $price_extra_km = $row['price_extra_km'];
                $price_extra_hour = $row['price_extra_hour'];
            } else {
                $local_fares_exists = false;
                // Default local package pricing based on vehicle data
                $price_4hrs_40km = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] * 0.4 : 1200;
                $price_8hrs_80km = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] * 0.7 : 2200;
                $price_10hrs_100km = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] * 0.9 : 2500;
                $price_extra_km = $vehicleData['price_per_km'] > 0 ? $vehicleData['price_per_km'] : 14;
                $price_extra_hour = $vehicleData['driver_allowance'] > 0 ? $vehicleData['driver_allowance'] : 250;
            }
            
            // Check if pricing data exists in airport_transfer_fares
            $stmt = $conn->prepare("SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $airport_fares_exists = true;
                $airport_base_price = $row['base_price'];
                $airport_price_per_km = $row['price_per_km'];
                $airport_pickup_price = $row['pickup_price'];
                $airport_drop_price = $row['drop_price'];
                $airport_tier1_price = $row['tier1_price'];
                $airport_tier2_price = $row['tier2_price'];
                $airport_tier3_price = $row['tier3_price'];
                $airport_tier4_price = $row['tier4_price'];
                $airport_extra_km_charge = $row['extra_km_charge'];
            } else {
                $airport_fares_exists = false;
                // Default airport pricing based on vehicle data
                $airport_base_price = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] * 1.2 : 3000;
                $airport_price_per_km = $vehicleData['price_per_km'] > 0 ? $vehicleData['price_per_km'] * 1.1 : 18;
                $airport_pickup_price = $vehicleData['base_price'] > 0 ? $vehicleData['base_price'] * 0.25 : 800;
                $airport_drop_price = $airport_pickup_price;
                $airport_tier1_price = $airport_pickup_price * 0.75;
                $airport_tier2_price = $airport_pickup_price;
                $airport_tier3_price = $airport_pickup_price * 1.25;
                $airport_tier4_price = $airport_pickup_price * 1.5;
                $airport_extra_km_charge = $vehicleData['price_per_km'] > 0 ? $vehicleData['price_per_km'] : 15;
            }
            
            // Now ensure the vehicle exists in all tables
            
            // 1. Ensure it exists in vehicle_types
            $stmt = $conn->prepare("
                INSERT INTO vehicle_types (
                    vehicle_id, name, capacity, luggage_capacity, 
                    base_price, price_per_km, night_halt_charge, driver_allowance,
                    ac, image, amenities, description, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    capacity = VALUES(capacity),
                    luggage_capacity = VALUES(luggage_capacity),
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    ac = VALUES(ac),
                    image = VALUES(image),
                    amenities = VALUES(amenities),
                    description = VALUES(description),
                    is_active = VALUES(is_active),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param(
                "ssiiddddisss", 
                $vehicleId, 
                $vehicleData['name'],
                $vehicleData['capacity'],
                $vehicleData['luggage_capacity'],
                $vehicleData['base_price'],
                $vehicleData['price_per_km'],
                $vehicleData['night_halt_charge'],
                $vehicleData['driver_allowance'],
                $vehicleData['ac'],
                $vehicleData['image'],
                $vehicleData['amenities'],
                $vehicleData['description'],
                $vehicleData['is_active']
            );
            $stmt->execute();
            
            // 2. Also ensure it exists in vehicles table
            $stmt = $conn->prepare("
                INSERT INTO vehicles (
                    vehicle_id, name, capacity, luggage_capacity, 
                    base_price, price_per_km, night_halt_charge, driver_allowance,
                    ac, image, amenities, description, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    capacity = VALUES(capacity),
                    luggage_capacity = VALUES(luggage_capacity),
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    ac = VALUES(ac),
                    image = VALUES(image),
                    amenities = VALUES(amenities),
                    description = VALUES(description),
                    is_active = VALUES(is_active),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param(
                "ssiiddddisss", 
                $vehicleId, 
                $vehicleData['name'],
                $vehicleData['capacity'],
                $vehicleData['luggage_capacity'],
                $vehicleData['base_price'],
                $vehicleData['price_per_km'],
                $vehicleData['night_halt_charge'],
                $vehicleData['driver_allowance'],
                $vehicleData['ac'],
                $vehicleData['image'],
                $vehicleData['amenities'],
                $vehicleData['description'],
                $vehicleData['is_active']
            );
            $stmt->execute();
            
            // 3. Ensure it exists in outstation_fares
            $stmt = $conn->prepare("
                INSERT INTO outstation_fares (
                    vehicle_id, base_price, price_per_km, 
                    night_halt_charge, driver_allowance,
                    roundtrip_base_price, roundtrip_price_per_km
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    roundtrip_base_price = VALUES(roundtrip_base_price),
                    roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param(
                "sdddddd", 
                $vehicleId, 
                $outstation_base_price,
                $outstation_price_per_km,
                $outstation_night_halt,
                $outstation_driver_allowance,
                $roundtrip_base_price,
                $roundtrip_price_per_km
            );
            $stmt->execute();
            
            // 4. Ensure it exists in local_package_fares
            $stmt = $conn->prepare("
                INSERT INTO local_package_fares (
                    vehicle_id, price_4hrs_40km, price_8hrs_80km, 
                    price_10hrs_100km, price_extra_km, price_extra_hour
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    price_4hrs_40km = VALUES(price_4hrs_40km),
                    price_8hrs_80km = VALUES(price_8hrs_80km),
                    price_10hrs_100km = VALUES(price_10hrs_100km),
                    price_extra_km = VALUES(price_extra_km),
                    price_extra_hour = VALUES(price_extra_hour),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param(
                "sddddd", 
                $vehicleId, 
                $price_4hrs_40km,
                $price_8hrs_80km,
                $price_10hrs_100km,
                $price_extra_km,
                $price_extra_hour
            );
            $stmt->execute();
            
            // 5. Ensure it exists in airport_transfer_fares
            $stmt = $conn->prepare("
                INSERT INTO airport_transfer_fares (
                    vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    pickup_price = VALUES(pickup_price),
                    drop_price = VALUES(drop_price),
                    tier1_price = VALUES(tier1_price),
                    tier2_price = VALUES(tier2_price),
                    tier3_price = VALUES(tier3_price),
                    tier4_price = VALUES(tier4_price),
                    extra_km_charge = VALUES(extra_km_charge),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param(
                "sddddddddd", 
                $vehicleId, 
                $airport_base_price,
                $airport_price_per_km,
                $airport_pickup_price,
                $airport_drop_price,
                $airport_tier1_price,
                $airport_tier2_price,
                $airport_tier3_price,
                $airport_tier4_price,
                $airport_extra_km_charge
            );
            $stmt->execute();
            
            // 6. Ensure entries in vehicle_pricing for each trip type
            $tripTypes = ['outstation', 'local', 'airport'];
            
            foreach ($tripTypes as $tripType) {
                $basePrice = 0;
                $pricePerKm = 0;
                $nightHalt = $vehicleData['night_halt_charge'];
                $driverAllowance = $vehicleData['driver_allowance'];
                $extraKmCharge = 0;
                $extraHourCharge = 0;
                $localPackage4hr = 0;
                $localPackage8hr = 0;
                $localPackage10hr = 0;
                $airportBasePrice = 0;
                
                if ($tripType === 'outstation') {
                    $basePrice = $outstation_base_price;
                    $pricePerKm = $outstation_price_per_km;
                } else if ($tripType === 'local') {
                    $basePrice = $price_10hrs_100km;
                    $pricePerKm = $price_extra_km;
                    $extraKmCharge = $price_extra_km;
                    $extraHourCharge = $price_extra_hour;
                    $localPackage4hr = $price_4hrs_40km;
                    $localPackage8hr = $price_8hrs_80km;
                    $localPackage10hr = $price_10hrs_100km;
                } else if ($tripType === 'airport') {
                    $basePrice = $airport_base_price;
                    $pricePerKm = $airport_price_per_km;
                    $airportBasePrice = $airport_base_price;
                }
                
                $stmt = $conn->prepare("
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, 
                        night_halt_charge, driver_allowance, base_price,
                        extra_km_charge, extra_hour_charge, 
                        local_package_4hr, local_package_8hr, local_package_10hr,
                        airport_base_price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        base_fare = VALUES(base_fare),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance),
                        base_price = VALUES(base_price),
                        extra_km_charge = VALUES(extra_km_charge),
                        extra_hour_charge = VALUES(extra_hour_charge),
                        local_package_4hr = VALUES(local_package_4hr),
                        local_package_8hr = VALUES(local_package_8hr),
                        local_package_10hr = VALUES(local_package_10hr),
                        airport_base_price = VALUES(airport_base_price),
                        updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->bind_param(
                    "ssdddddddddd", 
                    $vehicleId,
                    $tripType,
                    $basePrice,
                    $pricePerKm,
                    $nightHalt,
                    $driverAllowance,
                    $basePrice,
                    $extraKmCharge,
                    $extraHourCharge,
                    $localPackage4hr,
                    $localPackage8hr,
                    $localPackage10hr,
                    $airportBasePrice
                );
                $stmt->execute();
            }
            
            $response['details']['vehicles_synced'][] = $vehicleId;
        }
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode($response);
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
} catch (Exception $e) {
    // Log error
    error_log("Error fixing database: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
