
<?php
// direct-fare-update.php - Universal endpoint for all fare types
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Log all requests for debugging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$rawInput = file_get_contents('php://input');

error_log("[$timestamp] DIRECT FARE UPDATE REQUEST: $requestMethod $requestUri\n", 3, $logsDir . '/fare-updates.log');
error_log("Raw input: $rawInput\n", 3, $logsDir . '/fare-updates.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get data from all possible sources for maximum compatibility
function getAllRequestData() {
    $data = [];
    
    // Try JSON input
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $data = array_merge($data, $jsonData);
        } else {
            // Try form-urlencoded
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
            }
        }
    }
    
    // Add POST data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    
    // Add GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
    }
    
    return $data;
}

// Database connection
function getDbConnection() {
    try {
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error, 3, __DIR__ . '/../logs/fare-updates.log');
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection exception: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Ensure all necessary tables exist
function ensureTablesExist($conn) {
    try {
        // 1. Create outstation_fares table if it doesn't exist
        $outstationTableSql = "
        CREATE TABLE IF NOT EXISTS `outstation_fares` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) NOT NULL,
          `base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0.00,
          `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
          `roundtrip_base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `roundtrip_price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($outstationTableSql);
        
        // 2. Create airport_transfer_fares table if it doesn't exist
        $airportTableSql = "
        CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) NOT NULL,
          `base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `pickup_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `drop_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `tier1_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `tier2_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `tier3_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `tier4_price` decimal(10,2) NOT NULL DEFAULT 0.00,
          `extra_km_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($airportTableSql);
        
        // 3. Create local_package_fares table if it doesn't exist
        $localTableSql = "
        CREATE TABLE IF NOT EXISTS `local_package_fares` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) NOT NULL,
          `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_extra_km` decimal(10,2) NOT NULL DEFAULT 0.00,
          `price_extra_hour` decimal(10,2) NOT NULL DEFAULT 0.00,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($localTableSql);
        
        // 4. Create vehicles table if it doesn't exist
        $vehiclesTableSql = "
        CREATE TABLE IF NOT EXISTS `vehicles` (
          `id` varchar(50) NOT NULL,
          `name` varchar(100) NOT NULL,
          `vehicle_id` varchar(50) DEFAULT NULL,
          `is_active` tinyint(1) NOT NULL DEFAULT 1,
          `vehicle_type` varchar(50) DEFAULT NULL,
          `image_url` varchar(255) DEFAULT NULL,
          `capacity` int(11) DEFAULT 4,
          `luggage_capacity` int(11) DEFAULT 3,
          `description` text DEFAULT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($vehiclesTableSql);
        
        // 5. Create legacy vehicle_pricing table for backward compatibility
        $legacyTableSql = "
        CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `vehicle_id` varchar(50) NOT NULL,
          `vehicle_type` varchar(50) DEFAULT NULL,
          `trip_type` varchar(50) DEFAULT 'local',
          `base_fare` decimal(10,2) DEFAULT 0.00,
          `price_per_km` decimal(5,2) DEFAULT 0.00,
          `driver_allowance` decimal(10,2) DEFAULT 250.00,
          `night_halt_charge` decimal(10,2) DEFAULT 700.00,
          `local_package_4hr` decimal(10,2) DEFAULT NULL,
          `local_package_8hr` decimal(10,2) DEFAULT NULL,
          `local_package_10hr` decimal(10,2) DEFAULT NULL,
          `extra_km_charge` decimal(5,2) DEFAULT NULL,
          `extra_hour_charge` decimal(5,2) DEFAULT NULL,
          `airport_base_price` decimal(10,2) DEFAULT NULL,
          `airport_price_per_km` decimal(10,2) DEFAULT NULL,
          `airport_drop_price` decimal(10,2) DEFAULT NULL,
          `airport_pickup_price` decimal(10,2) DEFAULT NULL,
          `airport_tier1_price` decimal(10,2) DEFAULT NULL,
          `airport_tier2_price` decimal(10,2) DEFAULT NULL,
          `airport_tier3_price` decimal(10,2) DEFAULT NULL,
          `airport_tier4_price` decimal(10,2) DEFAULT NULL,
          `airport_extra_km_charge` decimal(10,2) DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `vehicle_trip_type` (`vehicle_id`,`trip_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($legacyTableSql);
        
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring tables exist: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Ensure vehicle exists in database
function ensureVehicleExists($conn, $vehicleId) {
    try {
        // Check if vehicle exists
        $checkSql = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
        $stmt = $conn->prepare($checkSql);
        $stmt->bind_param("ss", $vehicleId, $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Vehicle doesn't exist, create it
            $name = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            $createSql = "INSERT INTO vehicles (id, vehicle_id, name, is_active) VALUES (?, ?, ?, 1)";
            $createStmt = $conn->prepare($createSql);
            $createStmt->bind_param("sss", $vehicleId, $vehicleId, $name);
            $createStmt->execute();
            error_log("Created new vehicle: $vehicleId", 3, __DIR__ . '/../logs/fare-updates.log');
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring vehicle exists: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Update outstation fares
function updateOutstationFares($conn, $data) {
    try {
        // Extract vehicle ID
        $vehicleId = null;
        foreach (['vehicleId', 'vehicle_id', 'id', 'cabType'] as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $vehicleId = $data[$field];
                break;
            }
        }
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Clean vehicle ID
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Extract pricing data
        $basePrice = 0;
        foreach (['basePrice', 'baseFare', 'base_price', 'oneWayBasePrice'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $basePrice = floatval($data[$field]);
                break;
            }
        }
        
        $pricePerKm = 0;
        foreach (['pricePerKm', 'price_per_km', 'oneWayPricePerKm'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pricePerKm = floatval($data[$field]);
                break;
            }
        }
        
        $roundtripBasePrice = 0;
        foreach (['roundTripBasePrice', 'roundtripBasePrice', 'round_trip_base_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $roundtripBasePrice = floatval($data[$field]);
                break;
            }
        }
        
        $roundtripPricePerKm = 0;
        foreach (['roundTripPricePerKm', 'roundtripPricePerKm', 'round_trip_price_per_km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $roundtripPricePerKm = floatval($data[$field]);
                break;
            }
        }
        
        $driverAllowance = 250; // Default value
        foreach (['driverAllowance', 'driver_allowance'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $driverAllowance = floatval($data[$field]);
                break;
            }
        }
        
        $nightHalt = 700; // Default value
        foreach (['nightHalt', 'nightHaltCharge', 'night_halt_charge'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $nightHalt = floatval($data[$field]);
                break;
            }
        }
        
        // Ensure vehicle exists
        ensureVehicleExists($conn, $vehicleId);
        
        // Update outstation_fares table
        $checkSql = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "UPDATE outstation_fares 
                         SET base_price = ?, price_per_km = ?, driver_allowance = ?, 
                         night_halt_charge = ?, roundtrip_base_price = ?, roundtrip_price_per_km = ?
                         WHERE vehicle_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("dddddds", $basePrice, $pricePerKm, $driverAllowance, 
                                 $nightHalt, $roundtripBasePrice, $roundtripPricePerKm, $vehicleId);
            $updateStmt->execute();
        } else {
            // Insert new record
            $insertSql = "INSERT INTO outstation_fares 
                          (vehicle_id, base_price, price_per_km, driver_allowance, 
                           night_halt_charge, roundtrip_base_price, roundtrip_price_per_km)
                          VALUES (?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("sdddddd", $vehicleId, $basePrice, $pricePerKm, $driverAllowance, 
                                  $nightHalt, $roundtripBasePrice, $roundtripPricePerKm);
            $insertStmt->execute();
        }
        
        // Also update vehicle_pricing table for compatibility
        // First for one-way trip type
        $checkVpSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation-one-way'";
        $checkVpStmt = $conn->prepare($checkVpSql);
        $checkVpStmt->bind_param("s", $vehicleId);
        $checkVpStmt->execute();
        $vpResult = $checkVpStmt->get_result();
        
        if ($vpResult->num_rows > 0) {
            $updateVpSql = "UPDATE vehicle_pricing 
                            SET base_fare = ?, price_per_km = ?, driver_allowance = ?, night_halt_charge = ? 
                            WHERE vehicle_id = ? AND trip_type = 'outstation-one-way'";
            $updateVpStmt = $conn->prepare($updateVpSql);
            $updateVpStmt->bind_param("dddds", $basePrice, $pricePerKm, $driverAllowance, $nightHalt, $vehicleId);
            $updateVpStmt->execute();
        } else {
            $insertVpSql = "INSERT INTO vehicle_pricing 
                            (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km, driver_allowance, night_halt_charge)
                            VALUES (?, ?, 'outstation-one-way', ?, ?, ?, ?)";
            $insertVpStmt = $conn->prepare($insertVpSql);
            $insertVpStmt->bind_param("ssdddd", $vehicleId, $vehicleId, $basePrice, $pricePerKm, $driverAllowance, $nightHalt);
            $insertVpStmt->execute();
        }
        
        // Then for round-trip trip type
        $checkVpRtSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'";
        $checkVpRtStmt = $conn->prepare($checkVpRtSql);
        $checkVpRtStmt->bind_param("s", $vehicleId);
        $checkVpRtStmt->execute();
        $vpRtResult = $checkVpRtStmt->get_result();
        
        if ($vpRtResult->num_rows > 0) {
            $updateVpRtSql = "UPDATE vehicle_pricing 
                              SET base_fare = ?, price_per_km = ?, driver_allowance = ?, night_halt_charge = ? 
                              WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'";
            $updateVpRtStmt = $conn->prepare($updateVpRtSql);
            $updateVpRtStmt->bind_param("dddds", $roundtripBasePrice, $roundtripPricePerKm, $driverAllowance, $nightHalt, $vehicleId);
            $updateVpRtStmt->execute();
        } else {
            $insertVpRtSql = "INSERT INTO vehicle_pricing 
                              (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km, driver_allowance, night_halt_charge)
                              VALUES (?, ?, 'outstation-round-trip', ?, ?, ?, ?)";
            $insertVpRtStmt = $conn->prepare($insertVpRtSql);
            $insertVpRtStmt->bind_param("ssdddd", $vehicleId, $vehicleId, $roundtripBasePrice, $roundtripPricePerKm, $driverAllowance, $nightHalt);
            $insertVpRtStmt->execute();
        }
        
        return [
            'status' => 'success',
            'message' => 'Outstation fares updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'roundTripBasePrice' => $roundtripBasePrice,
                'roundTripPricePerKm' => $roundtripPricePerKm,
                'driverAllowance' => $driverAllowance,
                'nightHalt' => $nightHalt
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Error updating outstation fares: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Update airport fares
function updateAirportFares($conn, $data) {
    try {
        // Extract vehicle ID
        $vehicleId = null;
        foreach (['vehicleId', 'vehicle_id', 'id', 'cabType'] as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $vehicleId = $data[$field];
                break;
            }
        }
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Clean vehicle ID
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Extract pricing data
        $basePrice = 0;
        foreach (['basePrice', 'base_price', 'baseFare'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $basePrice = floatval($data[$field]);
                break;
            }
        }
        
        $pricePerKm = 0;
        foreach (['pricePerKm', 'price_per_km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pricePerKm = floatval($data[$field]);
                break;
            }
        }
        
        $dropPrice = 0;
        foreach (['dropPrice', 'drop_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $dropPrice = floatval($data[$field]);
                break;
            }
        }
        
        $pickupPrice = 0;
        foreach (['pickupPrice', 'pickup_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pickupPrice = floatval($data[$field]);
                break;
            }
        }
        
        $tier1Price = 0;
        foreach (['tier1Price', 'tier_1_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier1Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier2Price = 0;
        foreach (['tier2Price', 'tier_2_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier2Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier3Price = 0;
        foreach (['tier3Price', 'tier_3_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier3Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier4Price = 0;
        foreach (['tier4Price', 'tier_4_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier4Price = floatval($data[$field]);
                break;
            }
        }
        
        $extraKmCharge = 0;
        foreach (['extraKmCharge', 'extra_km_charge'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraKmCharge = floatval($data[$field]);
                break;
            }
        }
        
        // Ensure vehicle exists
        ensureVehicleExists($conn, $vehicleId);
        
        // Update airport_transfer_fares table
        $checkSql = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "UPDATE airport_transfer_fares 
                          SET base_price = ?, price_per_km = ?, pickup_price = ?, drop_price = ?,
                          tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?,
                          extra_km_charge = ?
                          WHERE vehicle_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("ddddddddds", $basePrice, $pricePerKm, $pickupPrice, $dropPrice,
                                    $tier1Price, $tier2Price, $tier3Price, $tier4Price,
                                    $extraKmCharge, $vehicleId);
            $updateStmt->execute();
        } else {
            // Insert new record
            $insertSql = "INSERT INTO airport_transfer_fares 
                          (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                           tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("sddddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice,
                                    $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
            $insertStmt->execute();
        }
        
        // Also update vehicle_pricing table for compatibility
        $checkVpSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
        $checkVpStmt = $conn->prepare($checkVpSql);
        $checkVpStmt->bind_param("s", $vehicleId);
        $checkVpStmt->execute();
        $vpResult = $checkVpStmt->get_result();
        
        if ($vpResult->num_rows > 0) {
            $updateVpSql = "UPDATE vehicle_pricing 
                            SET airport_base_price = ?, airport_price_per_km = ?, 
                                airport_pickup_price = ?, airport_drop_price = ?,
                                airport_tier1_price = ?, airport_tier2_price = ?, 
                                airport_tier3_price = ?, airport_tier4_price = ?,
                                airport_extra_km_charge = ?
                            WHERE vehicle_id = ? AND trip_type = 'airport'";
            $updateVpStmt = $conn->prepare($updateVpSql);
            $updateVpStmt->bind_param("ddddddddds", $basePrice, $pricePerKm, $pickupPrice, $dropPrice,
                                   $tier1Price, $tier2Price, $tier3Price, $tier4Price,
                                   $extraKmCharge, $vehicleId);
            $updateVpStmt->execute();
        } else {
            $insertVpSql = "INSERT INTO vehicle_pricing 
                            (vehicle_id, vehicle_type, trip_type, 
                             airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                             airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price,
                             airport_extra_km_charge)
                            VALUES (?, ?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $insertVpStmt = $conn->prepare($insertVpSql);
            $insertVpStmt->bind_param("ssddddddddd", $vehicleId, $vehicleId, $basePrice, $pricePerKm, 
                                    $pickupPrice, $dropPrice, $tier1Price, $tier2Price, 
                                    $tier3Price, $tier4Price, $extraKmCharge);
            $insertVpStmt->execute();
        }
        
        return [
            'status' => 'success',
            'message' => 'Airport fares updated successfully',
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
        ];
        
    } catch (Exception $e) {
        error_log("Error updating airport fares: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Update local package fares
function updateLocalFares($conn, $data) {
    try {
        // Extract vehicle ID
        $vehicleId = null;
        foreach (['vehicleId', 'vehicle_id', 'id', 'cabType'] as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $vehicleId = $data[$field];
                break;
            }
        }
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Clean vehicle ID
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Extract pricing data
        $package4hr = 0;
        foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package4hr = floatval($data[$field]);
                break;
            }
        }
        
        $package8hr = 0;
        foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package8hr = floatval($data[$field]);
                break;
            }
        }
        
        $package10hr = 0;
        foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package10hr = floatval($data[$field]);
                break;
            }
        }
        
        $extraKmRate = 0;
        foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'price_extra_km', 'extra_km_charge'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraKmRate = floatval($data[$field]);
                break;
            }
        }
        
        $extraHourRate = 0;
        foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'price_extra_hour', 'extra_hour_charge'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraHourRate = floatval($data[$field]);
                break;
            }
        }
        
        // Ensure vehicle exists
        ensureVehicleExists($conn, $vehicleId);
        
        // Update local_package_fares table
        $checkSql = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "UPDATE local_package_fares 
                          SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?,
                              price_extra_km = ?, price_extra_hour = ?
                          WHERE vehicle_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("ddddds", $package4hr, $package8hr, $package10hr, 
                                  $extraKmRate, $extraHourRate, $vehicleId);
            $updateStmt->execute();
        } else {
            // Insert new record
            $insertSql = "INSERT INTO local_package_fares 
                          (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km,
                           price_extra_km, price_extra_hour)
                          VALUES (?, ?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("sddddd", $vehicleId, $package4hr, $package8hr, $package10hr,
                                   $extraKmRate, $extraHourRate);
            $insertStmt->execute();
        }
        
        // Also update vehicle_pricing table for compatibility
        $checkVpSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
        $checkVpStmt = $conn->prepare($checkVpSql);
        $checkVpStmt->bind_param("s", $vehicleId);
        $checkVpStmt->execute();
        $vpResult = $checkVpStmt->get_result();
        
        if ($vpResult->num_rows > 0) {
            $updateVpSql = "UPDATE vehicle_pricing 
                            SET local_package_4hr = ?, local_package_8hr = ?, local_package_10hr = ?,
                                extra_km_charge = ?, extra_hour_charge = ?
                            WHERE vehicle_id = ? AND trip_type = 'local'";
            $updateVpStmt = $conn->prepare($updateVpSql);
            $updateVpStmt->bind_param("ddddds", $package4hr, $package8hr, $package10hr,
                                   $extraKmRate, $extraHourRate, $vehicleId);
            $updateVpStmt->execute();
        } else {
            $insertVpSql = "INSERT INTO vehicle_pricing 
                            (vehicle_id, vehicle_type, trip_type, 
                             local_package_4hr, local_package_8hr, local_package_10hr,
                             extra_km_charge, extra_hour_charge)
                            VALUES (?, ?, 'local', ?, ?, ?, ?, ?)";
            $insertVpStmt = $conn->prepare($insertVpSql);
            $insertVpStmt->bind_param("ssdddd", $vehicleId, $vehicleId, $package4hr, $package8hr,
                                    $package10hr, $extraKmRate, $extraHourRate);
            $insertVpStmt->execute();
        }
        
        return [
            'status' => 'success',
            'message' => 'Local package fares updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'packages' => [
                    '4hrs-40km' => $package4hr,
                    '8hrs-80km' => $package8hr,
                    '10hrs-100km' => $package10hr,
                    'extra-km' => $extraKmRate,
                    'extra-hour' => $extraHourRate
                ]
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Error updating local fares: " . $e->getMessage(), 3, __DIR__ . '/../logs/fare-updates.log');
        throw $e;
    }
}

// Main execution flow
try {
    // Get all request data
    $requestData = getAllRequestData();
    error_log("Parsed request data: " . json_encode($requestData), 3, $logsDir . '/fare-updates.log');
    
    // Get database connection
    $conn = getDbConnection();
    
    // Ensure all tables exist
    ensureTablesExist($conn);
    
    // Determine trip type from request
    $tripType = '';
    if (isset($requestData['tripType'])) {
        $tripType = strtolower($requestData['tripType']);
    } else if (isset($requestData['trip_type'])) {
        $tripType = strtolower($requestData['trip_type']);
    }
    
    // If URL contains keywords, use them as trip type
    $requestUrl = strtolower($_SERVER['REQUEST_URI']);
    if (strpos($requestUrl, 'outstation') !== false) {
        $tripType = 'outstation';
    } else if (strpos($requestUrl, 'airport') !== false) {
        $tripType = 'airport';
    } else if (strpos($requestUrl, 'local') !== false) {
        $tripType = 'local';
    }
    
    // If no trip type found, try to determine from request data
    if (empty($tripType)) {
        // Check if it's outstation
        if (isset($requestData['roundTripBasePrice']) || isset($requestData['roundtripBasePrice'])) {
            $tripType = 'outstation';
        }
        // Check if it's airport
        else if (isset($requestData['dropPrice']) || isset($requestData['pickupPrice']) || 
                isset($requestData['tier1Price'])) {
            $tripType = 'airport';
        }
        // Check if it's local
        else if (isset($requestData['package4hr40km']) || isset($requestData['price4hrs40km']) || 
                isset($requestData['package8hr80km']) || isset($requestData['hr8km80Price'])) {
            $tripType = 'local';
        }
        // Default to outstation
        else {
            $tripType = 'outstation';
        }
    }
    
    // Process based on trip type
    $response = null;
    switch ($tripType) {
        case 'outstation':
            $response = updateOutstationFares($conn, $requestData);
            break;
            
        case 'airport':
            $response = updateAirportFares($conn, $requestData);
            break;
            
        case 'local':
            $response = updateLocalFares($conn, $requestData);
            break;
            
        default:
            // Try all updates
            try {
                $outstationResponse = updateOutstationFares($conn, $requestData);
                $response = $outstationResponse;
            } catch (Exception $e) {
                error_log("Failed outstation update: " . $e->getMessage(), 3, $logsDir . '/fare-updates.log');
            }
            break;
    }
    
    // If we have a response, return it
    if ($response) {
        echo json_encode($response);
    } else {
        // No response means all updates failed
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'All fare updates failed',
            'requestData' => $requestData
        ]);
    }
    
} catch (Exception $e) {
    error_log("Critical error in direct-fare-update.php: " . $e->getMessage(), 3, $logsDir . '/fare-updates.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

