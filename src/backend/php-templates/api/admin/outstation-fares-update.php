
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

// Get data from request
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Try multiple approaches to get the request data
$data = [];

// Try 1: Parse JSON
$jsonData = json_decode($rawInput, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
    $data = $jsonData;
    error_log("Successfully parsed JSON data: " . print_r($data, true));
} 
// Try 2: Parse form-urlencoded
else {
    parse_str($rawInput, $formData);
    if (!empty($formData)) {
        $data = $formData;
        error_log("Successfully parsed form-urlencoded data: " . print_r($data, true));
    } 
    // Try 3: Use $_POST or $_REQUEST
    else {
        if (!empty($_POST)) {
            $data = $_POST;
            error_log("Using POST data: " . print_r($data, true));
        } else if (!empty($_REQUEST)) {
            $data = $_REQUEST;
            error_log("Using REQUEST data: " . print_r($data, true));
        }
    }
}

// Final fallback: Check if no data was extracted
if (empty($data)) {
    error_log("Could not extract data from request. Using empty array.");
    $data = [];
}

// ID mappings for numeric IDs - these must be consistent across all endpoints
$numericIdMapExtended = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '103' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga'
];

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
        
        // First get the vehicle list to ensure we have complete data
        // IMPROVED: Get ALL vehicles, even those without fares, to show in the management interface
        $vehicleStmt = $conn->query("
            SELECT v.id, v.vehicle_id, v.name, v.capacity, v.luggage_capacity, v.is_active 
            FROM vehicles v
            WHERE v.is_active = 1 OR 1=1 
            ORDER BY v.name
        ");
        
        $vehicles = [];
        if ($vehicleStmt) {
            while ($vehicle = $vehicleStmt->fetch_assoc()) {
                $vehicleId = $vehicle['vehicle_id'] ?: $vehicle['id'];
                $vehicles[$vehicleId] = [
                    'id' => $vehicleId,
                    'vehicle_id' => $vehicleId,
                    'name' => $vehicle['name'],
                    'capacity' => (int)$vehicle['capacity'],
                    'luggage_capacity' => (int)$vehicle['luggage_capacity'],
                    'is_active' => (bool)$vehicle['is_active'],
                    'base_price' => 0,
                    'price_per_km' => 0,
                    'roundtrip_base_price' => 0,
                    'roundtrip_price_per_km' => 0,
                    'driver_allowance' => 250,
                    'night_halt_charge' => 700
                ];
            }
        }
        
        // Now get the outstation fares and merge with vehicle data
        $fareStmt = $conn->query("
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
            ORDER BY 
                of.vehicle_id
        ");
        
        if ($fareStmt) {
            while ($fare = $fareStmt->fetch_assoc()) {
                $vehicleId = $fare['vehicle_id'];
                
                // If we have the vehicle in our list, update its fare data
                if (isset($vehicles[$vehicleId])) {
                    $vehicles[$vehicleId]['base_price'] = (float)$fare['base_price'];
                    $vehicles[$vehicleId]['price_per_km'] = (float)$fare['price_per_km'];
                    $vehicles[$vehicleId]['roundtrip_base_price'] = (float)$fare['roundtrip_base_price'];
                    $vehicles[$vehicleId]['roundtrip_price_per_km'] = (float)$fare['roundtrip_price_per_km'];
                    $vehicles[$vehicleId]['driver_allowance'] = (float)$fare['driver_allowance'];
                    $vehicles[$vehicleId]['night_halt_charge'] = (float)$fare['night_halt_charge'];
                    $vehicles[$vehicleId]['updated_at'] = $fare['updated_at'];
                }
                // If not in our list (unusual), add it
                else {
                    $vehicles[$vehicleId] = [
                        'id' => $vehicleId,
                        'vehicle_id' => $vehicleId,
                        'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
                        'base_price' => (float)$fare['base_price'],
                        'price_per_km' => (float)$fare['price_per_km'],
                        'roundtrip_base_price' => (float)$fare['roundtrip_base_price'],
                        'roundtrip_price_per_km' => (float)$fare['roundtrip_price_per_km'],
                        'driver_allowance' => (float)$fare['driver_allowance'],
                        'night_halt_charge' => (float)$fare['night_halt_charge'],
                        'is_active' => true,
                        'updated_at' => $fare['updated_at']
                    ];
                }
            }
        }
        
        // Return the fares
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
$rawVehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';
$vehicleId = $rawVehicleId;

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// CRITICAL: Map numeric IDs to string IDs to prevent duplicate vehicles
if (is_numeric($vehicleId)) {
    if (isset($numericIdMapExtended[$vehicleId])) {
        $originalId = $vehicleId;
        $vehicleId = $numericIdMapExtended[$vehicleId];
        error_log("Mapped numeric ID $originalId to $vehicleId");
    } else {
        error_log("REJECTED: Unmapped numeric ID not allowed: " . $vehicleId);
        echo json_encode([
            'status' => 'error',
            'message' => "Cannot use numeric ID '$vehicleId'. Please use a proper vehicle ID like 'sedan', 'ertiga', etc."
        ]);
        exit;
    }
}

// FINAL CHECK: Make sure we don't have a numeric ID at this point
if (is_numeric($vehicleId)) {
    error_log("CRITICAL: Vehicle ID is still numeric after processing: $vehicleId");
    echo json_encode([
        'status' => 'error',
        'message' => "Cannot use numeric ID '$vehicleId'. This is a critical error."
    ]);
    exit;
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
                'vehicle_id' => $vehicleId,
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
