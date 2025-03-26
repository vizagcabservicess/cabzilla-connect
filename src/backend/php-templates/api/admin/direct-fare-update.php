
<?php
// direct-fare-update.php - Universal endpoint for all fare updates with database creation fallbacks

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

// Check if database config is included
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

// Get raw input
$raw_input = file_get_contents('php://input');
error_log("Raw input for direct fare update: $raw_input", 3, __DIR__ . '/../../error.log');

// Function to ensure tables exist
function ensureTablesExist($conn) {
    // Check if vehicle_types table exists
    $checkVehicleTypes = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
    if ($checkVehicleTypes->num_rows === 0) {
        // Create vehicle_types table
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_types (
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
        error_log("Created vehicle_types table");
    }

    // Check if outstation_fares table exists
    $checkOutstation = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkOutstation->num_rows === 0) {
        // Create outstation_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created outstation_fares table");
    }

    // Check if local_package_fares table exists
    $checkLocal = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($checkLocal->num_rows === 0) {
        // Create local_package_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created local_package_fares table");
    }

    // Check if airport_transfer_fares table exists
    $checkAirport = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    if ($checkAirport->num_rows === 0) {
        // Create airport_transfer_fares table
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
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created airport_transfer_fares table");
    }

    return true;
}

// Determine the trip type from URL or parameters
$tripType = isset($_GET['tripType']) ? $_GET['tripType'] : 'outstation';

// Determine URL parameters
if (strpos($_SERVER['REQUEST_URI'], 'outstation') !== false) {
    $tripType = 'outstation';
} elseif (strpos($_SERVER['REQUEST_URI'], 'local') !== false) {
    $tripType = 'local';
} elseif (strpos($_SERVER['REQUEST_URI'], 'airport') !== false) {
    $tripType = 'airport';
}

// Try to extract request data from multiple sources
$data = [];
$json_data = json_decode($raw_input, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
} else {
    parse_str($raw_input, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
    } else {
        $data = $_POST ?: $_REQUEST ?: [];
    }
}

// Log the request data
error_log("Request data: " . print_r($data, true), 3, __DIR__ . '/../../error.log');
error_log("Trip type detected: $tripType", 3, __DIR__ . '/../../error.log');

// Establish database connection
try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure necessary tables exist
    ensureTablesExist($conn);
    
    // Extract vehicle ID from various possible fields
    $vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? $data['cabType'] ?? '';
    
    // Normalize the vehicle ID (remove any prefix)
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Create vehicle if it doesn't exist
    $checkVehicleStmt = $conn->prepare("SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Format vehicle name from ID
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicle_types (vehicle_id, name, is_active) 
            VALUES (?, ?, 1)
        ");
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("Created new vehicle: $vehicleId");
    }
    
    // Process based on trip type
    switch ($tripType) {
        case 'outstation':
            handleOutstationFares($conn, $data, $vehicleId);
            break;
        case 'local':
            handleLocalFares($conn, $data, $vehicleId);
            break;
        case 'airport':
            handleAirportFares($conn, $data, $vehicleId);
            break;
        default:
            // If type is unknown, try to determine from data
            if (isset($data['package4hr40km']) || isset($data['price_4hrs_40km']) || isset($data['package4hr']) || isset($data['price4hrs40km'])) {
                handleLocalFares($conn, $data, $vehicleId);
            } elseif (isset($data['pickupPrice']) || isset($data['dropPrice']) || isset($data['pickup_price']) || isset($data['tier1Price'])) {
                handleAirportFares($conn, $data, $vehicleId);
            } else {
                // Default to outstation
                handleOutstationFares($conn, $data, $vehicleId);
            }
            break;
    }
    
    echo json_encode([
        "status" => "success",
        "message" => "Fare updated successfully",
        "vehicleId" => $vehicleId,
        "tripType" => $tripType
    ]);
    
} catch (Exception $e) {
    error_log("Error in direct fare update: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
}

// Function to handle outstation fares
function handleOutstationFares($conn, $data, $vehicleId) {
    // Extract values with multiple field name possibilities
    $basePrice = floatval($data['oneWayBasePrice'] ?? $data['baseFare'] ?? $data['basePrice'] ?? $data['base_price'] ?? 0);
    $pricePerKm = floatval($data['oneWayPricePerKm'] ?? $data['pricePerKm'] ?? $data['price_per_km'] ?? 0);
    $roundTripBasePrice = floatval($data['roundTripBasePrice'] ?? $data['roundTripBaseFare'] ?? $data['roundtrip_base_price'] ?? 0);
    $roundTripPricePerKm = floatval($data['roundTripPricePerKm'] ?? $data['roundTripPrice'] ?? $data['roundtrip_price_per_km'] ?? 0);
    $driverAllowance = floatval($data['driverAllowance'] ?? $data['driver_allowance'] ?? 250);
    // Handle both nightHalt and nightHaltCharge field names
    $nightHaltCharge = floatval($data['nightHaltCharge'] ?? $data['nightHalt'] ?? $data['night_halt_charge'] ?? 700);
    
    error_log("Outstation fare update for $vehicleId: Base=$basePrice, PerKm=$pricePerKm, RTBase=$roundTripBasePrice, RTPerKm=$roundTripPricePerKm", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Update outstation_fares table
        $stmt = $conn->prepare("
            INSERT INTO outstation_fares 
            (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge),
            driver_allowance = VALUES(driver_allowance),
            roundtrip_base_price = VALUES(roundtrip_base_price),
            roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("sdddddd", 
            $vehicleId,
            $basePrice,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $roundTripBasePrice,
            $roundTripPricePerKm
        );
        
        $stmt->execute();
        $stmt->close();
        
        // 2. Update vehicle_pricing table for ONE-WAY trips (for backward compatibility)
        $tripTypeOneWay = 'outstation-one-way';
        $stmt = $conn->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            base_fare = VALUES(base_fare),
            price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge),
            driver_allowance = VALUES(driver_allowance),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("ssdddd", 
            $vehicleId,
            $tripTypeOneWay,
            $basePrice,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance
        );
        
        $stmt->execute();
        $stmt->close();
        
        // 3. Update vehicle_pricing table for ROUND-TRIP trips (for backward compatibility)
        $tripTypeRoundTrip = 'outstation-round-trip';
        $stmt = $conn->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            base_fare = VALUES(base_fare),
            price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge),
            driver_allowance = VALUES(driver_allowance),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("ssdddd", 
            $vehicleId,
            $tripTypeRoundTrip,
            $roundTripBasePrice,
            $roundTripPricePerKm,
            $nightHaltCharge,
            $driverAllowance
        );
        
        $stmt->execute();
        $stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        error_log("Outstation fare update successful for vehicle $vehicleId", 3, __DIR__ . '/../../error.log');
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
}

// Function to handle local fares
function handleLocalFares($conn, $data, $vehicleId) {
    // Extract values with multiple field name possibilities
    $package4hr40km = floatval($data['package4hr40km'] ?? $data['price_4hrs_40km'] ?? $data['package4hr'] ?? $data['price4hrs40km'] ?? 0);
    $package8hr80km = floatval($data['package8hr80km'] ?? $data['price_8hrs_80km'] ?? $data['package8hr'] ?? $data['price8hrs80km'] ?? 0);
    $package10hr100km = floatval($data['package10hr100km'] ?? $data['price_10hrs_100km'] ?? $data['package10hr'] ?? $data['price10hrs100km'] ?? 0);
    $extraKmRate = floatval($data['extraKmRate'] ?? $data['price_extra_km'] ?? $data['extra_km_charge'] ?? $data['priceExtraKm'] ?? 15);
    $extraHourRate = floatval($data['extraHourRate'] ?? $data['price_extra_hour'] ?? $data['extra_hour_charge'] ?? $data['priceExtraHour'] ?? 150);
    
    error_log("Local fare update for $vehicleId: 4hr=$package4hr40km, 8hr=$package8hr80km, 10hr=$package10hr100km", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Update local_package_fares table
        $stmt = $conn->prepare("
            INSERT INTO local_package_fares 
            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            price_4hrs_40km = VALUES(price_4hrs_40km),
            price_8hrs_80km = VALUES(price_8hrs_80km),
            price_10hrs_100km = VALUES(price_10hrs_100km),
            price_extra_km = VALUES(price_extra_km),
            price_extra_hour = VALUES(price_extra_hour),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("sddddd", 
            $vehicleId,
            $package4hr40km,
            $package8hr80km,
            $package10hr100km,
            $extraKmRate,
            $extraHourRate
        );
        
        $stmt->execute();
        $stmt->close();
        
        // 2. Update vehicle_pricing table for LOCAL trips (for backward compatibility)
        $tripType = 'local';
        $stmt = $conn->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr,
             price_per_km, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            local_package_4hr = VALUES(local_package_4hr),
            local_package_8hr = VALUES(local_package_8hr),
            local_package_10hr = VALUES(local_package_10hr),
            price_per_km = VALUES(price_per_km),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("ssdddd", 
            $vehicleId,
            $tripType,
            $package4hr40km,
            $package8hr80km,
            $package10hr100km,
            $extraKmRate
        );
        
        $stmt->execute();
        $stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        error_log("Local fare update successful for vehicle $vehicleId", 3, __DIR__ . '/../../error.log');
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
}

// Function to handle airport fares
function handleAirportFares($conn, $data, $vehicleId) {
    // Extract values with multiple field name possibilities
    $basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? 0);
    $pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? 0);
    $pickupPrice = floatval($data['pickupPrice'] ?? $data['pickup_price'] ?? 0);
    $dropPrice = floatval($data['dropPrice'] ?? $data['drop_price'] ?? 0);
    $tier1Price = floatval($data['tier1Price'] ?? $data['tier1_price'] ?? 0);
    $tier2Price = floatval($data['tier2Price'] ?? $data['tier2_price'] ?? 0);
    $tier3Price = floatval($data['tier3Price'] ?? $data['tier3_price'] ?? 0);
    $tier4Price = floatval($data['tier4Price'] ?? $data['tier4_price'] ?? 0);
    $extraKmCharge = floatval($data['extraKmCharge'] ?? $data['extra_km_charge'] ?? 0);
    
    error_log("Airport fare update for $vehicleId: Base=$basePrice, PerKm=$pricePerKm, Pickup=$pickupPrice, Drop=$dropPrice", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Update airport_transfer_fares table
        $stmt = $conn->prepare("
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
             tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
            updated_at = NOW()
        ");
        
        $stmt->bind_param("sddddddddd", 
            $vehicleId,
            $basePrice,
            $pricePerKm,
            $pickupPrice,
            $dropPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge
        );
        
        $stmt->execute();
        $stmt->close();
        
        // 2. Update vehicle_pricing table for AIRPORT trips (for backward compatibility)
        $tripType = 'airport';
        $stmt = $conn->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, base_fare, price_per_km, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            base_fare = VALUES(base_fare),
            price_per_km = VALUES(price_per_km),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("ssdd", 
            $vehicleId,
            $tripType,
            $basePrice,
            $pricePerKm
        );
        
        $stmt->execute();
        $stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        error_log("Airport fare update successful for vehicle $vehicleId", 3, __DIR__ . '/../../error.log');
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
}
