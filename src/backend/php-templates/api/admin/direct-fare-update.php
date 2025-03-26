
<?php
// direct-fare-update.php - Universal fare update endpoint for all trip types
// This is a failsafe endpoint that handles all fare update types

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Load database config
require_once __DIR__ . '/../../config.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request for debugging
$timestamp = date('Y-m-d H:i:s');
$logMessage = "[$timestamp] DIRECT fare update request received: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI'] . "\n";
error_log($logMessage, 3, __DIR__ . '/../logs/direct-fares.log');

// Log raw input
$rawInput = file_get_contents('php://input');
error_log("Raw input: $rawInput", 3, __DIR__ . '/../logs/direct-fares.log');

// Collect data from all possible sources
$data = [];

// Try JSON input
if (!empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Using JSON data", 3, __DIR__ . '/../logs/direct-fares.log');
    } else {
        // Try form-urlencoded
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Using form-urlencoded data", 3, __DIR__ . '/../logs/direct-fares.log');
        }
    }
}

// Merge with POST and GET data
if (!empty($_POST)) {
    $data = array_merge($data, $_POST);
}
if (!empty($_GET)) {
    $data = array_merge($data, $_GET);
}

// Extract vehicle ID from multiple possible keys
$vehicleId = '';
$possibleIdKeys = ['vehicleId', 'vehicle_id', 'id', 'vehicleType', 'car', 'cab', 'cabType'];
foreach ($possibleIdKeys as $key) {
    if (!empty($data[$key])) {
        $vehicleId = $data[$key];
        break;
    }
}

// Clean vehicle ID
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Detect trip type
$tripType = $data['tripType'] ?? $data['trip_type'] ?? '';
if (empty($tripType)) {
    // Try to guess from request
    if (isset($data['oneWayBasePrice']) || isset($data['roundTripBasePrice'])) {
        $tripType = 'outstation';
    } elseif (isset($data['package4hr40km']) || isset($data['package8hr80km'])) {
        $tripType = 'local';
    } elseif (isset($data['pickupPrice']) || isset($data['dropPrice'])) {
        $tripType = 'airport';
    }
}

// If still empty, default to outstation
if (empty($tripType)) {
    $tripType = 'outstation';
}

// Validate vehicle ID
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'receivedData' => $data,
        'detectedTripType' => $tripType
    ]);
    exit;
}

// Log detected trip type and vehicle ID
error_log("Detected trip type: $tripType, Vehicle ID: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure vehicle exists in vehicles table
    $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicles 
            (vehicle_id, name, is_active, created_at, updated_at) 
            VALUES (?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        ");
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("Created new vehicle: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    }
    
    // Process based on trip type
    switch (strtolower($tripType)) {
        case 'outstation':
            // Extract outstation pricing data
            $basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? $data['baseFare'] ?? $data['base_fare'] ?? $data['oneWayBasePrice'] ?? 0);
            $pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? $data['oneWayPricePerKm'] ?? 0);
            $roundtripBasePrice = floatval($data['roundTripBasePrice'] ?? $data['roundtrip_base_price'] ?? 0);
            $roundtripPricePerKm = floatval($data['roundTripPricePerKm'] ?? $data['roundtrip_price_per_km'] ?? 0);
            $driverAllowance = floatval($data['driverAllowance'] ?? $data['driver_allowance'] ?? 250);
            $nightHaltCharge = floatval($data['nightHalt'] ?? $data['nightHaltCharge'] ?? $data['night_halt_charge'] ?? 700);
            
            // Ensure outstation_fares table exists
            $conn->query("
                CREATE TABLE IF NOT EXISTS outstation_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            
            // Update outstation_fares
            $conn->begin_transaction();
            
            try {
                // Update outstation_fares
                $upsertFaresStmt = $conn->prepare("
                    INSERT INTO outstation_fares 
                    (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    roundtrip_base_price = VALUES(roundtrip_base_price),
                    roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                    driver_allowance = VALUES(driver_allowance),
                    night_halt_charge = VALUES(night_halt_charge),
                    updated_at = NOW()
                ");
                
                $upsertFaresStmt->bind_param("sdddddd", 
                    $vehicleId, 
                    $basePrice, 
                    $pricePerKm, 
                    $roundtripBasePrice, 
                    $roundtripPricePerKm,
                    $driverAllowance,
                    $nightHaltCharge
                );
                
                $upsertFaresStmt->execute();
                
                // Also update vehicle_pricing for one-way
                $tripTypeOneWay = 'outstation';
                $upsertOneWayStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, driver_allowance, night_halt_charge, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    driver_allowance = VALUES(driver_allowance),
                    night_halt_charge = VALUES(night_halt_charge),
                    updated_at = NOW()
                ");
                
                $upsertOneWayStmt->bind_param("ssdddd", 
                    $vehicleId, 
                    $tripTypeOneWay, 
                    $basePrice, 
                    $pricePerKm,
                    $driverAllowance,
                    $nightHaltCharge
                );
                
                $upsertOneWayStmt->execute();
                
                $conn->commit();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Outstation fares updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'roundTripBasePrice' => $roundtripBasePrice,
                        'roundTripPricePerKm' => $roundtripPricePerKm,
                        'driverAllowance' => $driverAllowance,
                        'nightHalt' => $nightHaltCharge
                    ]
                ]);
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            break;
            
        case 'local':
            // Extract local pricing data
            $package4hr = floatval($data['package4hr40km'] ?? $data['price4hrs40km'] ?? $data['local_package_4hr'] ?? 0);
            $package8hr = floatval($data['package8hr80km'] ?? $data['price8hrs80km'] ?? $data['local_package_8hr'] ?? 0);
            $package10hr = floatval($data['package10hr100km'] ?? $data['price10hrs100km'] ?? $data['local_package_10hr'] ?? 0);
            $extraKmRate = floatval($data['extraKmRate'] ?? $data['price_extra_km'] ?? $data['extra_km_charge'] ?? 0);
            $extraHourRate = floatval($data['extraHourRate'] ?? $data['price_extra_hour'] ?? $data['extra_hour_charge'] ?? 0);
            
            // Ensure local_package_fares table exists
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            
            // Update local_package_fares
            $conn->begin_transaction();
            
            try {
                // Update local_package_fares
                $upsertFaresStmt = $conn->prepare("
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
                
                $upsertFaresStmt->bind_param("sddddd", 
                    $vehicleId, 
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                );
                
                $upsertFaresStmt->execute();
                
                // Also update vehicle_pricing
                $tripTypeLocal = 'local';
                $upsertVpStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    local_package_4hr = VALUES(local_package_4hr),
                    local_package_8hr = VALUES(local_package_8hr),
                    local_package_10hr = VALUES(local_package_10hr),
                    extra_km_charge = VALUES(extra_km_charge),
                    extra_hour_charge = VALUES(extra_hour_charge),
                    updated_at = NOW()
                ");
                
                $upsertVpStmt->bind_param("ssddddd", 
                    $vehicleId, 
                    $tripTypeLocal,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                );
                
                $upsertVpStmt->execute();
                
                $conn->commit();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Local package fares updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'package4hr40km' => $package4hr,
                        'package8hr80km' => $package8hr,
                        'package10hr100km' => $package10hr,
                        'extraKmRate' => $extraKmRate,
                        'extraHourRate' => $extraHourRate
                    ]
                ]);
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            break;
            
        case 'airport':
            // Extract airport pricing data
            $basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? $data['airport_base_price'] ?? 0);
            $pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? $data['airport_price_per_km'] ?? 0);
            $pickupPrice = floatval($data['pickupPrice'] ?? $data['pickup_price'] ?? $data['airport_pickup_price'] ?? 0);
            $dropPrice = floatval($data['dropPrice'] ?? $data['drop_price'] ?? $data['airport_drop_price'] ?? 0);
            $tier1Price = floatval($data['tier1Price'] ?? $data['tier1_price'] ?? $data['airport_tier1_price'] ?? 0);
            $tier2Price = floatval($data['tier2Price'] ?? $data['tier2_price'] ?? $data['airport_tier2_price'] ?? 0);
            $tier3Price = floatval($data['tier3Price'] ?? $data['tier3_price'] ?? $data['airport_tier3_price'] ?? 0);
            $tier4Price = floatval($data['tier4Price'] ?? $data['tier4_price'] ?? $data['airport_tier4_price'] ?? 0);
            $extraKmCharge = floatval($data['extraKmCharge'] ?? $data['extra_km_charge'] ?? $data['airport_extra_km_charge'] ?? 0);
            
            // Ensure airport_transfer_fares table exists
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            
            // Update airport_transfer_fares
            $conn->begin_transaction();
            
            try {
                // Update airport_transfer_fares
                $upsertFaresStmt = $conn->prepare("
                    INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
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
                
                $upsertFaresStmt->bind_param("sddddddddd", 
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
                
                $upsertFaresStmt->execute();
                
                // Also update vehicle_pricing
                $tripTypeAirport = 'airport';
                $upsertVpStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price, 
                     airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, airport_extra_km_charge, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    airport_base_price = VALUES(airport_base_price),
                    airport_price_per_km = VALUES(airport_price_per_km),
                    airport_pickup_price = VALUES(airport_pickup_price),
                    airport_drop_price = VALUES(airport_drop_price),
                    airport_tier1_price = VALUES(airport_tier1_price),
                    airport_tier2_price = VALUES(airport_tier2_price),
                    airport_tier3_price = VALUES(airport_tier3_price),
                    airport_tier4_price = VALUES(airport_tier4_price),
                    airport_extra_km_charge = VALUES(airport_extra_km_charge),
                    updated_at = NOW()
                ");
                
                $upsertVpStmt->bind_param("ssdddddddd", 
                    $vehicleId, 
                    $tripTypeAirport,
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
                
                $upsertVpStmt->execute();
                
                $conn->commit();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Airport transfer fares updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'pickupPrice' => $pickupPrice,
                        'dropPrice' => $dropPrice,
                        'tier1Price' => $tier1Price,
                        'tier2Price' => $tier2Price,
                        'tier3Price' => $tier3Price,
                        'tier4Price' => $tier4Price,
                        'extraKmCharge' => $extraKmCharge
                    ]
                ]);
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            break;
            
        default:
            throw new Exception("Invalid trip type: $tripType");
    }
    
} catch (Exception $e) {
    error_log("Error updating fares: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to update fares: ' . $e->getMessage(),
        'type' => $tripType,
        'vehicleId' => $vehicleId
    ]);
}
