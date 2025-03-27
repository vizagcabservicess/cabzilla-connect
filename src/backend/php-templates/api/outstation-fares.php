
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: outstation-fares.php');
header('X-API-Version: 1.0.5');
header('X-Timestamp: ' . time());

// Log all request information
error_log("Outstation Fares Request - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);
error_log("Query string: " . $_SERVER['QUERY_STRING']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get origin and destination parameters if present
    $origin = isset($_GET['origin']) ? $_GET['origin'] : null;
    $destination = isset($_GET['destination']) ? $_GET['destination'] : null;
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $forceSync = isset($_GET['force_sync']) && $_GET['force_sync'] === 'true';
    
    // Log the request parameters
    error_log("Outstation fares request parameters: " . json_encode([
        'origin' => $origin,
        'destination' => $destination,
        'vehicle_id' => $vehicleId,
        'force_sync' => $forceSync,
        'sync' => isset($_GET['sync']) ? $_GET['sync'] : 'false',
        'check_sync' => isset($_GET['check_sync']) ? $_GET['check_sync'] : 'false',
        'force' => isset($_GET['force']) ? $_GET['force'] : 'false',
        'timestamp' => isset($_GET['_t']) ? $_GET['_t'] : 'none'
    ]));
    
    // Check if outstation_fares table exists, if not create it
    $checkOutstationFaresTable = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkOutstationFaresTable->num_rows === 0) {
        error_log("outstation_fares table does not exist, creating it");
        $createOutstationFaresTable = "
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
        
        if (!$conn->query($createOutstationFaresTable)) {
            throw new Exception("Failed to create outstation_fares table: " . $conn->error);
        }
        
        error_log("Created outstation_fares table");
    } else {
        error_log("outstation_fares table exists");
    }
    
    // Ensure we have some default entries for common vehicle types
    $defaultVehicles = ['sedan', 'ertiga', 'innova_crysta', 'innova', 'tempo_traveller'];
    
    foreach ($defaultVehicles as $defaultVehicle) {
        $checkVehicleQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkVehicleQuery);
        $stmt->bind_param("s", $defaultVehicle);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            error_log("Default vehicle $defaultVehicle not found in outstation_fares, adding it");
            
            // Add default entry
            $insertQuery = "
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES (?, 2000, 15, 1800, 12, 250, 700)";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param("s", $defaultVehicle);
            
            if (!$insertStmt->execute()) {
                error_log("Failed to insert default values for $defaultVehicle: " . $insertStmt->error);
            } else {
                error_log("Added default entry for $defaultVehicle");
            }
        }
    }
    
    // Sync outstation_fares to vehicle_pricing if needed
    if (isset($_GET['sync']) && $_GET['sync'] === 'true' || $forceSync) {
        error_log("Syncing tables due to sync parameter");
        $checkVehiclePricing = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        
        if ($checkVehiclePricing->num_rows > 0) {
            // Sync one-way fares to vehicle_pricing
            $syncQuery = "
                UPDATE vehicle_pricing vp
                JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
                SET 
                    vp.base_fare = of.base_price,
                    vp.price_per_km = of.price_per_km,
                    vp.night_halt_charge = of.night_halt_charge,
                    vp.driver_allowance = of.driver_allowance,
                    vp.updated_at = CURRENT_TIMESTAMP
                WHERE vp.trip_type IN ('outstation', 'outstation-one-way')
            ";
            
            // Add vehicle filter if specified
            if ($vehicleId) {
                $syncQuery .= " AND vp.vehicle_id = '$vehicleId'";
            }
            
            $syncResult = $conn->query($syncQuery);
            error_log("Sync one-way result: " . ($syncResult ? "Success" : "Failed: " . $conn->error));
            
            // Sync round-trip fares to vehicle_pricing
            $syncRtQuery = "
                UPDATE vehicle_pricing vp
                JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
                SET 
                    vp.base_fare = of.roundtrip_base_price,
                    vp.price_per_km = of.roundtrip_price_per_km,
                    vp.night_halt_charge = of.night_halt_charge,
                    vp.driver_allowance = of.driver_allowance,
                    vp.updated_at = CURRENT_TIMESTAMP
                WHERE vp.trip_type = 'outstation-round-trip'
            ";
            
            // Add vehicle filter if specified
            if ($vehicleId) {
                $syncRtQuery .= " AND vp.vehicle_id = '$vehicleId'";
            }
            
            $syncRtResult = $conn->query($syncRtQuery);
            error_log("Sync round-trip result: " . ($syncRtResult ? "Success" : "Failed: " . $conn->error));
            
            error_log("Synced outstation_fares to vehicle_pricing" . ($vehicleId ? " for vehicle $vehicleId" : ""));
            
            // Check for missing entries in vehicle_pricing
            $checkMissingQuery = "
                SELECT 
                    of.vehicle_id,
                    of.base_price,
                    of.price_per_km,
                    of.roundtrip_base_price,
                    of.roundtrip_price_per_km,
                    of.night_halt_charge,
                    of.driver_allowance
                FROM 
                    outstation_fares of
                LEFT JOIN 
                    vehicle_pricing vp_oneway ON of.vehicle_id = vp_oneway.vehicle_id AND vp_oneway.trip_type IN ('outstation', 'outstation-one-way')
                LEFT JOIN 
                    vehicle_pricing vp_roundtrip ON of.vehicle_id = vp_roundtrip.vehicle_id AND vp_roundtrip.trip_type = 'outstation-round-trip'
                WHERE 
                    vp_oneway.id IS NULL OR vp_roundtrip.id IS NULL
            ";
            
            // Add vehicle filter if specified
            if ($vehicleId) {
                $checkMissingQuery .= " AND of.vehicle_id = '$vehicleId'";
            }
            
            $missingResult = $conn->query($checkMissingQuery);
            
            if ($missingResult && $missingResult->num_rows > 0) {
                error_log("Found " . $missingResult->num_rows . " vehicles with missing entries in vehicle_pricing");
                
                // Process missing entries
                while ($row = $missingResult->fetch_assoc()) {
                    $vId = $row['vehicle_id'];
                    $baseFare = $row['base_price'];
                    $pricePerKm = $row['price_per_km'];
                    $rtBaseFare = $row['roundtrip_base_price'];
                    $rtPricePerKm = $row['roundtrip_price_per_km'];
                    $nightHaltCharge = $row['night_halt_charge'];
                    $driverAllowance = $row['driver_allowance'];
                    
                    error_log("Found missing vehicle_pricing entries for vehicle $vId");
                    
                    // Insert one-way pricing if missing
                    $oneWayTypes = ['outstation', 'outstation-one-way'];
                    foreach ($oneWayTypes as $tripType) {
                        $checkOnewayQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = '$vId' AND trip_type = '$tripType'";
                        $onewayExists = $conn->query($checkOnewayQuery)->num_rows > 0;
                        
                        if (!$onewayExists) {
                            $insertOneWayQuery = "
                                INSERT INTO vehicle_pricing 
                                (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                                VALUES 
                                ('$vId', '$tripType', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance)
                            ";
                            
                            if ($conn->query($insertOneWayQuery)) {
                                error_log("Inserted $tripType entry for $vId");
                            } else {
                                error_log("Failed to insert $tripType entry for $vId: " . $conn->error);
                            }
                        }
                    }
                    
                    // Insert round-trip pricing if missing
                    $checkRtQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'";
                    $rtExists = $conn->query($checkRtQuery)->num_rows > 0;
                    
                    if (!$rtExists) {
                        $insertRtQuery = "
                            INSERT INTO vehicle_pricing 
                            (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                            VALUES 
                            ('$vId', 'outstation-round-trip', $rtBaseFare, $rtPricePerKm, $nightHaltCharge, $driverAllowance)
                        ";
                        
                        if ($conn->query($insertRtQuery)) {
                            error_log("Inserted round-trip entry for $vId");
                        } else {
                            error_log("Failed to insert round-trip entry for $vId: " . $conn->error);
                        }
                    }
                }
            }
        } else {
            error_log("vehicle_pricing table doesn't exist, skipping sync");
        }
    }
    
    // Now query outstation_fares directly - construct the base query
    $query = "
        SELECT 
            of.id,
            of.vehicle_id,
            of.base_price AS basePrice,
            of.price_per_km AS pricePerKm,
            of.night_halt_charge AS nightHaltCharge,
            of.driver_allowance AS driverAllowance,
            of.roundtrip_base_price AS roundTripBasePrice,
            of.roundtrip_price_per_km AS roundTripPricePerKm
        FROM 
            outstation_fares of
    ";
    
    // If vehicle_id parameter is provided, filter by it
    if ($vehicleId) {
        $query .= " WHERE of.vehicle_id = '$vehicleId'";
    }
    
    error_log("Executing query: $query");
    
    // Execute the query with error handling
    $result = $conn->query($query);
    
    if (!$result) {
        error_log("Query failed: " . $conn->error);
        throw new Exception("Failed to query outstation_fares: " . $conn->error);
    }
    
    // Process and structure the data
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $id = $row['vehicle_id'] ?? null;
        
        // Skip entries with null ID
        if (!$id) continue;
        
        error_log("Processing row for vehicle: $id");

        // Add nightHalt as an alias for nightHaltCharge
        $nightHaltCharge = floatval($row['nightHaltCharge'] ?? 0);

        // Map to standardized properties
        $fares[$id] = [
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => floatval($row['driverAllowance'] ?? 0),
            'roundTripBasePrice' => floatval($row['roundTripBasePrice'] ?? 0),
            'roundTripPricePerKm' => floatval($row['roundTripPricePerKm'] ?? 0),
            // Add aliases for backward compatibility
            'nightHalt' => $nightHaltCharge
        ];
        
        error_log("Fare data for $id: " . json_encode($fares[$id]));
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response with debug information
    echo json_encode([
        'status' => 'success',
        'fares' => $fares,
        'origin' => $origin,
        'destination' => $destination,
        'timestamp' => time(),
        'sourceTable' => 'outstation_fares',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId,
        'requestParams' => [
            'sync' => isset($_GET['sync']) ? $_GET['sync'] : null,
            'check_sync' => isset($_GET['check_sync']) ? $_GET['check_sync'] : null,
            'force' => isset($_GET['force']) ? $_GET['force'] : null,
            't' => isset($_GET['_t']) ? $_GET['_t'] : null
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'timestamp' => time(),
        'file' => 'outstation-fares.php',
        'trace' => $e->getTraceAsString()
    ]);
}
