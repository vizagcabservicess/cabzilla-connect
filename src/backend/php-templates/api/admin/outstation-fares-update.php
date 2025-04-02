<?php
// outstation-fares-update.php - Dedicated endpoint for updating outstation fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
header('X-API-Version: 1.0.3');

// Include database configuration
require_once __DIR__ . '/../../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Outstation fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../../error.log');

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . $_SERVER['CONTENT_TYPE'] ?? 'not set');
error_log("ALL HEADERS: " . json_encode(getallheaders()));

// Handle GET request for retrieving all fares
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }
        
        // Check if outstation_fares table exists
        $checkTableStmt = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($checkTableStmt->num_rows === 0) {
            // Table doesn't exist, create it
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS outstation_fares (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    vehicle_id VARCHAR(50) NOT NULL,
                    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            $conn->query($createTableSql);
        }
        
        // CRITICAL CHANGE: First get the vehicle list to ensure we have ALL vehicles 
        // regardless of whether they have entries in outstation_fares
        $vehicleStmt = $conn->query("
            SELECT v.id, v.vehicle_id, v.name, v.capacity, v.luggage_capacity, v.is_active,
                   v.base_price, v.price_per_km, v.night_halt_charge, v.driver_allowance
            FROM vehicles v
            ORDER BY v.name
        ");
        
        $vehicles = [];
        $vehicleIds = [];
        if ($vehicleStmt) {
            while ($vehicle = $vehicleStmt->fetch_assoc()) {
                $vehicleId = $vehicle['id'] ?: $vehicle['vehicle_id'];
                $vehicles[$vehicleId] = [
                    'vehicle_id' => $vehicleId, 
                    'name' => $vehicle['name'],
                    'capacity' => (int)$vehicle['capacity'],
                    'luggage_capacity' => (int)$vehicle['luggage_capacity'],
                    'is_active' => (bool)$vehicle['is_active'],
                    'base_price' => (float)$vehicle['base_price'],
                    'price_per_km' => (float)$vehicle['price_per_km'],
                    'night_halt_charge' => (float)$vehicle['night_halt_charge'],
                    'driver_allowance' => (float)$vehicle['driver_allowance'],
                    'roundtrip_base_price' => (float)$vehicle['base_price'] * 0.95, // Default to 95% of one-way
                    'roundtrip_price_per_km' => (float)$vehicle['price_per_km'] * 0.85, // Default to 85% of one-way
                ];
                $vehicleIds[] = $vehicleId;
            }
        }
        
        // Now get the outstation fares for vehicles that have entries
        $placeholders = str_repeat('?,', count($vehicleIds) - 1) . '?';
        $fareQuery = "
            SELECT 
                of.vehicle_id,
                of.base_price,
                of.price_per_km,
                of.roundtrip_base_price,
                of.roundtrip_price_per_km,
                of.driver_allowance,
                of.night_halt_charge,
                of.updated_at
            FROM 
                outstation_fares of
            WHERE 
                of.vehicle_id IN ($placeholders)
            ORDER BY 
                of.vehicle_id
        ";
        
        $fareStmt = $conn->prepare($fareQuery);
        
        // Only bind and execute if we have vehicles
        if (!empty($vehicleIds)) {
            $types = str_repeat('s', count($vehicleIds));
            $fareStmt->bind_param($types, ...$vehicleIds);
            $fareStmt->execute();
            $fareResult = $fareStmt->get_result();
            
            // Override default values with actual outstation fare data where available
            if ($fareResult) {
                while ($fare = $fareResult->fetch_assoc()) {
                    $vehicleId = $fare['vehicle_id'];
                    if (isset($vehicles[$vehicleId])) {
                        // Override with outstation specific values
                        $vehicles[$vehicleId]['base_price'] = (float)$fare['base_price'];
                        $vehicles[$vehicleId]['price_per_km'] = (float)$fare['price_per_km'];
                        $vehicles[$vehicleId]['roundtrip_base_price'] = (float)$fare['roundtrip_base_price'];
                        $vehicles[$vehicleId]['roundtrip_price_per_km'] = (float)$fare['roundtrip_price_per_km'];
                        $vehicles[$vehicleId]['driver_allowance'] = (float)$fare['driver_allowance'];
                        $vehicles[$vehicleId]['night_halt_charge'] = (float)$fare['night_halt_charge'];
                    }
                }
            }
        }
        
        // Return ALL vehicles with their fares (actual or default values)
        echo json_encode([
            'status' => 'success',
            'fares' => $vehicles,
            'count' => count($vehicles),
            'includeInactive' => true,
            'isAdminMode' => true,
            'timestamp' => time()
        ]);
        exit;
    } catch (Exception $e) {
        error_log("Error retrieving outstation fares: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to retrieve outstation fares: ' . $e->getMessage()
        ]);
        exit;
    }
}

// Log received data for debugging
error_log('Final outstation fares update data: ' . print_r($data, true));

// Check if data is valid
if (empty($data) || (!isset($data['vehicleId']) && !isset($data['vehicle_id']) && !isset($data['vehicleType']))) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID',
        'receivedData' => $data
    ]);
    exit;
}

// Extract vehicle ID and normalize
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple possible field names
$oneWayBasePrice = floatval($data['oneWayBasePrice'] ?? $data['baseFare'] ?? $data['basePrice'] ?? 0);
$oneWayPricePerKm = floatval($data['oneWayPricePerKm'] ?? $data['pricePerKm'] ?? 0);

$roundTripBasePrice = floatval($data['roundTripBasePrice'] ?? $data['roundTripBaseFare'] ?? $data['round_trip_base_price'] ?? 0);
$roundTripPricePerKm = floatval($data['roundTripPricePerKm'] ?? $data['roundTripPricePerKm'] ?? $data['round_trip_price_per_km'] ?? 0);

// Extract driver allowance and night halt charges
$driverAllowance = floatval($data['driverAllowance'] ?? $data['driver_allowance'] ?? 250);
$nightHaltCharge = floatval($data['nightHalt'] ?? $data['nightHaltCharge'] ?? $data['night_halt_charge'] ?? 700);

// Log extracted fields
error_log("Extracted fields: vehicleId=$vehicleId, oneWayBasePrice=$oneWayBasePrice, oneWayPricePerKm=$oneWayPricePerKm, roundTripBasePrice=$roundTripBasePrice, roundTripPricePerKm=$roundTripPricePerKm");

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    error_log("Database connection successful");
    
    // Check if vehicle exists in vehicles table
    $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    $checkVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicles 
            (id, vehicle_id, name, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        ");
        $insertVehicleStmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("Created new vehicle: $vehicleId");
    }
    
    // First check if outstation_fares table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkTableStmt->num_rows === 0) {
        // Table doesn't exist, create it
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($createTableSql);
        error_log("Created outstation_fares table");
    }
    
    // Use a transaction to ensure both inserts/updates happen atomically
    $conn->begin_transaction();
    
    try {
        // FIRST always update outstation_fares table - this is our primary source of truth
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
            $oneWayBasePrice, 
            $oneWayPricePerKm, 
            $roundTripBasePrice, 
            $roundTripPricePerKm,
            $driverAllowance,
            $nightHaltCharge
        );
        
        $upsertFaresStmt->execute();
        error_log("Updated outstation_fares table for vehicle: $vehicleId with these values: base_price=$oneWayBasePrice, price_per_km=$oneWayPricePerKm");
        
        // Also update vehicle_pricing table for compatibility - BUT this is now secondary
        $oneWayTripType = 'outstation-one-way';
        $roundTripTripType = 'outstation-round-trip';
        $outstationTripType = 'outstation';
        
        // Update one-way pricing
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
        
        // Update for outstation-one-way
        $upsertOneWayStmt->bind_param("ssdddd", 
            $vehicleId, 
            $oneWayTripType, 
            $oneWayBasePrice, 
            $oneWayPricePerKm,
            $driverAllowance,
            $nightHaltCharge
        );
        
        $upsertOneWayStmt->execute();
        error_log("Updated vehicle_pricing table for one-way trips: $vehicleId with base_fare=$oneWayBasePrice");
        
        // Update for generic outstation
        $upsertOneWayStmt->bind_param("ssdddd", 
            $vehicleId, 
            $outstationTripType, 
            $oneWayBasePrice, 
            $oneWayPricePerKm,
            $driverAllowance,
            $nightHaltCharge
        );
        
        $upsertOneWayStmt->execute();
        error_log("Updated vehicle_pricing table for generic outstation: $vehicleId with base_fare=$oneWayBasePrice");
        
        // Update round-trip pricing
        $upsertRoundTripStmt = $conn->prepare("
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
        
        $upsertRoundTripStmt->bind_param("ssdddd", 
            $vehicleId, 
            $roundTripTripType, 
            $roundTripBasePrice, 
            $roundTripPricePerKm,
            $driverAllowance,
            $nightHaltCharge
        );
        
        $upsertRoundTripStmt->execute();
        error_log("Updated vehicle_pricing table for round-trip: $vehicleId with base_fare=$roundTripBasePrice");
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => "Successfully updated outstation fares for $vehicleId",
            'data' => [
                'vehicleId' => $vehicleId,
                'oneWayBasePrice' => $oneWayBasePrice,
                'oneWayPricePerKm' => $oneWayPricePerKm,
                'roundTripBasePrice' => $roundTripBasePrice,
                'roundTripPricePerKm' => $roundTripPricePerKm,
                'driverAllowance' => $driverAllowance,
                'nightHaltCharge' => $nightHaltCharge
            ]
        ]);
    } catch (Exception $e) {
        // Rollback transaction if anything fails
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error updating outstation fares: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to update outstation fares: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
