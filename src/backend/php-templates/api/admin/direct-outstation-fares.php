
<?php
/**
 * This API endpoint updates outstation fares for a vehicle
 * It handles the update in both outstation_fares and vehicle_pricing tables for backward compatibility
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.4');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log function
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] $message\n", 3, __DIR__ . '/../../logs/direct-outstation-fares.log');
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// CRITICAL: Numeric ID mapping
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

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Handle GET request to retrieve all outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && (isset($_GET['getAllFares']) || isset($_GET['sync']))) {
        logMessage("GET request received for all outstation fares");
        
        // Determine if inactive vehicles should be included
        $includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
        $isAdminMode = isset($_GET['isAdminMode']) && ($_GET['isAdminMode'] === 'true' || $_GET['isAdminMode'] === '1');
        
        // First get all vehicles from the vehicles table
        $vehicleQuery = "
            SELECT v.id, v.vehicle_id, v.name, v.is_active 
            FROM vehicles v
            WHERE v.is_active = 1 OR :includeInactive = 1
            ORDER BY v.name
        ";
        
        $vehicleStmt = $conn->prepare($vehicleQuery);
        $includeInactiveParam = $includeInactive ? 1 : 0;
        $vehicleStmt->bindParam(':includeInactive', $includeInactiveParam, PDO::PARAM_INT);
        $vehicleStmt->execute();
        $vehicles = $vehicleStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Now get all outstation fares
        $fareQuery = "SELECT * FROM outstation_fares";
        $fareStmt = $conn->query($fareQuery);
        $fareRows = $fareStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create a map of vehicle_id to fares for quick lookups
        $fareMap = [];
        foreach ($fareRows as $fare) {
            if (isset($fare['vehicle_id'])) {
                $fareMap[$fare['vehicle_id']] = $fare;
            }
        }
        
        // Build the response with all vehicles and their fares
        $result = [];
        foreach ($vehicles as $vehicle) {
            $vehicleId = $vehicle['vehicle_id'] ?? $vehicle['id'];
            
            // Get the fares for this vehicle, if they exist
            $fareData = isset($fareMap[$vehicleId]) ? $fareMap[$vehicleId] : null;
            
            // Build the fare object for this vehicle
            $result[$vehicleId] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $vehicle['name'] ?? '',
                'basePrice' => $fareData ? floatval($fareData['base_price']) : 0,
                'pricePerKm' => $fareData ? floatval($fareData['price_per_km']) : 0,
                'nightHaltCharge' => $fareData ? floatval($fareData['night_halt_charge']) : 700,
                'driverAllowance' => $fareData ? floatval($fareData['driver_allowance']) : 300,
                'roundTripBasePrice' => $fareData ? floatval($fareData['roundtrip_base_price']) : 0,
                'roundTripPricePerKm' => $fareData ? floatval($fareData['roundtrip_price_per_km']) : 0,
                'isActive' => $vehicle['is_active'] == 1
            ];
        }
        
        logMessage("Returning " . count($result) . " outstation fare records");
        
        echo json_encode([
            'status' => 'success',
            'fares' => $result,
            'count' => count($result),
            'includeInactive' => $includeInactive,
            'isAdminMode' => $isAdminMode,
            'source' => 'database',
            'timestamp' => time()
        ]);
        exit;
    }

    // Handle POST requests to update fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get POST data with multiple field name fallbacks
        $rawVehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
        $basePrice = isset($_POST['basePrice']) ? floatval($_POST['basePrice']) : (isset($_POST['base_price']) ? floatval($_POST['base_price']) : 0);
        $pricePerKm = isset($_POST['pricePerKm']) ? floatval($_POST['pricePerKm']) : (isset($_POST['price_per_km']) ? floatval($_POST['price_per_km']) : 0);
        $nightHalt = isset($_POST['nightHalt']) ? floatval($_POST['nightHalt']) : (isset($_POST['nightHaltCharge']) ? floatval($_POST['nightHaltCharge']) : (isset($_POST['night_halt_charge']) ? floatval($_POST['night_halt_charge']) : 0));
        $driverAllowance = isset($_POST['driverAllowance']) ? floatval($_POST['driverAllowance']) : (isset($_POST['driver_allowance']) ? floatval($_POST['driver_allowance']) : 0);
        $roundTripBasePrice = isset($_POST['roundTripBasePrice']) ? floatval($_POST['roundTripBasePrice']) : (isset($_POST['roundtrip_base_price']) ? floatval($_POST['roundtrip_base_price']) : 0);
        $roundTripPricePerKm = isset($_POST['roundTripPricePerKm']) ? floatval($_POST['roundTripPricePerKm']) : (isset($_POST['roundtrip_price_per_km']) ? floatval($_POST['roundtrip_price_per_km']) : 0);
        
        logMessage("Original vehicle ID received: " . $rawVehicleId);
        
        // Process and normalize vehicle ID
        $vehicleId = $rawVehicleId;
        
        // Remove 'item-' prefix if it exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            logMessage("Removed 'item-' prefix: " . $vehicleId);
        }
        
        // Handle numeric IDs by mapping to proper vehicle_id
        if (is_numeric($vehicleId)) {
            if (isset($numericIdMapExtended[$vehicleId])) {
                $originalId = $vehicleId;
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped numeric ID $originalId to vehicle_id: $vehicleId");
            } else {
                logMessage("REJECTED: Unmapped numeric ID not allowed: " . $vehicleId);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id like 'sedan', 'ertiga', etc."
                ]);
                exit;
            }
        }
        
        // Final check for numeric IDs
        if (is_numeric($vehicleId)) {
            logMessage("FINAL REJECTION: ID is still numeric after processing: " . $vehicleId);
            echo json_encode([
                'status' => 'error', 
                'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id."
            ]);
            exit;
        }

        // If round trip values are not provided, use one-way values with a small discount
        if ($roundTripBasePrice <= 0 && $basePrice > 0) {
            $roundTripBasePrice = $basePrice * 0.95; // 5% discount on base price for round trip
        }
        
        if ($roundTripPricePerKm <= 0 && $pricePerKm > 0) {
            $roundTripPricePerKm = $pricePerKm * 0.85; // 15% discount on per km for round trip
        }

        // Validate required fields
        if (!$vehicleId) {
            throw new Exception('Vehicle ID is required');
        }

        // Log the request details
        logMessage("Updating outstation fares for vehicle $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, nightHalt=$nightHalt, driverAllowance=$driverAllowance, roundTripBasePrice=$roundTripBasePrice, roundTripPricePerKm=$roundTripPricePerKm");

        // Begin transaction
        $conn->begin_transaction();

        // First check if the tables exist, if not create them
        $checkTableQueries = [
            "outstation_fares" => "SHOW TABLES LIKE 'outstation_fares'",
            "vehicle_pricing" => "SHOW TABLES LIKE 'vehicle_pricing'"
        ];
        
        foreach ($checkTableQueries as $table => $query) {
            $result = $conn->query($query);
            if ($result && $result->num_rows === 0) {
                // Table doesn't exist, create it
                if ($table === "outstation_fares") {
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
                    
                    if (!$conn->query($createTableSql)) {
                        throw new Exception("Failed to create outstation_fares table: " . $conn->error);
                    }
                    
                    logMessage("Created outstation_fares table");
                } else if ($table === "vehicle_pricing") {
                    $createVehiclePricingSQL = "
                        CREATE TABLE IF NOT EXISTS vehicle_pricing (
                            id INT(11) NOT NULL AUTO_INCREMENT,
                            vehicle_id VARCHAR(50) NOT NULL,
                            trip_type VARCHAR(50) NOT NULL,
                            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                            driver_allowance DECIMAL(10,2) DEFAULT 0,
                            night_halt_charge DECIMAL(10,2) DEFAULT 0,
                            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                    ";
                    
                    if (!$conn->query($createVehiclePricingSQL)) {
                        throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
                    }
                    
                    logMessage("Created vehicle_pricing table");
                }
            }
        }

        // First ensure vehicle exists in vehicles table - ALWAYS USE vehicle_id
        $checkVehicleQuery = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id = ?";
        $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
        $checkVehicleStmt->execute([$vehicleId]);
        $vehicleExists = $checkVehicleStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$vehicleExists) {
            // Vehicle doesn't exist, create it
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            
            $insertVehicleQuery = "
                INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 1, NOW(), NOW())
            ";
            
            $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
            $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName]);
            
            logMessage("Created new vehicle: " . $vehicleId);
        } else {
            logMessage("Vehicle exists: " . print_r($vehicleExists, true));
        }

        // ALWAYS update outstation_fares table first - it's our primary source
        // Check if the vehicle already exists in the specialized table
        $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateQuery = "
                UPDATE outstation_fares
                SET base_price = ?,
                    price_per_km = ?,
                    night_halt_charge = ?,
                    driver_allowance = ?,
                    roundtrip_base_price = ?,
                    roundtrip_price_per_km = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param('dddddds', $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm, $vehicleId);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update outstation_fares: " . $conn->error);
            }
            
            logMessage("Updated existing record in outstation_fares for $vehicleId");
        } else {
            // Insert new record
            $insertQuery = "
                INSERT INTO outstation_fares (
                    vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param('sdddddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm);
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert into outstation_fares: " . $conn->error);
            }
            
            logMessage("Inserted new record in outstation_fares for $vehicleId");
        }

        // Now sync this data to vehicle_pricing for backward compatibility
        $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
        $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
        $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

        if ($vehiclePricingExists) {
            // First sync the one-way fares
            $syncOneWayQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
                ) VALUES (?, 'outstation', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE 
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            $syncOneWayStmt = $conn->prepare($syncOneWayQuery);
            $syncOneWayStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance);
            
            if (!$syncOneWayStmt->execute()) {
                throw new Exception("Failed to sync to vehicle_pricing outstation: " . $conn->error);
            }
            
            // Also for outstation-one-way type
            $syncOneWayTypeQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
                ) VALUES (?, 'outstation-one-way', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE 
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            $syncOneWayTypeStmt = $conn->prepare($syncOneWayTypeQuery);
            $syncOneWayTypeStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance);
            
            if (!$syncOneWayTypeStmt->execute()) {
                throw new Exception("Failed to sync to vehicle_pricing one-way: " . $conn->error);
            }
            
            logMessage("Synced one-way fares to vehicle_pricing for $vehicleId");
            
            // Now sync the round-trip fares
            $syncRoundTripQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
                ) VALUES (?, 'outstation-round-trip', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE 
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            $syncRoundTripStmt = $conn->prepare($syncRoundTripQuery);
            $syncRoundTripStmt->bind_param('sdddd', $vehicleId, $roundTripBasePrice, $roundTripPricePerKm, $nightHalt, $driverAllowance);
            
            if (!$syncRoundTripStmt->execute()) {
                throw new Exception("Failed to sync to vehicle_pricing round-trip: " . $conn->error);
            }
            
            logMessage("Synced round-trip fares to vehicle_pricing for $vehicleId");
        }

        // Commit transaction
        $conn->commit();
        
        // Explicitly set the force refresh flag for the client-side
        $_SESSION['force_fare_refresh'] = true;
        
        // Create a debug object for response
        $debug = [
            'post_data' => $_POST,
            'request_method' => $_SERVER['REQUEST_METHOD'],
            'request_params' => [
                'tripType' => 'outstation',
                'vehicleId' => $vehicleId, 
                'vehicle_id' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'timestamp' => date('Y-m-d H:i:s')
            ],
            'vehicle_created' => true
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => "Successfully updated outstation fares for $vehicleId",
            'details' => [
                'vehicle_id' => $vehicleId,
                'base_price' => $basePrice,
                'price_per_km' => $pricePerKm,
                'night_halt_charge' => $nightHalt,
                'driver_allowance' => $driverAllowance,
                'roundtrip_base_price' => $roundTripBasePrice,
                'roundtrip_price_per_km' => $roundTripPricePerKm,
                'vehicle_created' => true,
                'synced_to_vehicle_pricing' => true
            ],
            'debug' => $debug
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid request method'
        ]);
    }
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    logMessage("ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
