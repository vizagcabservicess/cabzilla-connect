
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: outstation-fares.php');
header('X-API-Version: 1.0.4');
header('X-Timestamp: ' . time());

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
    error_log("Outstation fares request: " . json_encode([
        'origin' => $origin,
        'destination' => $destination,
        'vehicle_id' => $vehicleId,
        'force_sync' => $forceSync
    ]));
    
    // Check if outstation_fares table exists, if not create it
    $checkOutstationFaresTable = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkOutstationFaresTable->num_rows === 0) {
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
    }
    
    // Sync outstation_fares to vehicle_pricing if needed
    if (isset($_GET['sync']) && $_GET['sync'] === 'true' || $forceSync) {
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
            
            $conn->query($syncQuery);
            
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
            
            $conn->query($syncRtQuery);
            
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
    
    // Only use outstation_fares table - no more conditional fallback
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
    
    error_log("Using outstation_fares table with query: $query");
    
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
    
    // If no outstation_fares were found or we have a sync param, check if we need to sync from vehicle_pricing
    if ((count($fares) === 0 || isset($_GET['check_sync'])) && !isset($_GET['sync'])) {
        error_log("No fares found in outstation_fares, checking if we need to sync from vehicle_pricing");
        
        // First check if vehicle_pricing table exists
        $checkVPTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkVPTable->num_rows === 0) {
            error_log("vehicle_pricing table doesn't exist, skipping sync check");
        } else {
            // Check if there are any rows in vehicle_pricing that need to be synced
            $checkQuery = "
                SELECT 
                    vp.vehicle_id,
                    vp.base_fare,
                    vp.price_per_km,
                    vp.night_halt_charge,
                    vp.driver_allowance
                FROM 
                    vehicle_pricing vp
                LEFT JOIN
                    outstation_fares of ON vp.vehicle_id = of.vehicle_id
                WHERE 
                    (vp.trip_type = 'outstation' OR vp.trip_type = 'outstation-one-way')
            ";
            
            // Add vehicle filter if specified
            if ($vehicleId) {
                $checkQuery .= " AND vp.vehicle_id = '$vehicleId'";
            }
            
            $checkQuery .= " AND of.id IS NULL";
            
            $checkResult = $conn->query($checkQuery);
            
            if ($checkResult && $checkResult->num_rows > 0) {
                error_log("Found " . $checkResult->num_rows . " vehicles in vehicle_pricing that need to be synced to outstation_fares");
                
                // Import data from vehicle_pricing to outstation_fares
                while ($row = $checkResult->fetch_assoc()) {
                    $vId = $row['vehicle_id'];
                    $baseFare = $row['base_fare'];
                    $pricePerKm = $row['price_per_km'];
                    $nightHaltCharge = $row['night_halt_charge'];
                    $driverAllowance = $row['driver_allowance'];
                    
                    error_log("Syncing vehicle $vId from vehicle_pricing to outstation_fares");
                    
                    // Get roundtrip values if available
                    $rtQuery = "
                        SELECT base_fare, price_per_km 
                        FROM vehicle_pricing 
                        WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
                    ";
                    
                    $rtResult = $conn->query($rtQuery);
                    $rtBaseFare = 0;
                    $rtPricePerKm = 0;
                    
                    if ($rtResult && $rtResult->num_rows > 0) {
                        $rtRow = $rtResult->fetch_assoc();
                        $rtBaseFare = $rtRow['base_fare'];
                        $rtPricePerKm = $rtRow['price_per_km'];
                    }
                    
                    // Insert into outstation_fares
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '$vId', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance,
                            $rtBaseFare, $rtPricePerKm
                        )
                    ";
                    
                    if ($conn->query($insertQuery)) {
                        error_log("Successfully synced vehicle $vId to outstation_fares");
                    } else {
                        error_log("Failed to sync vehicle $vId to outstation_fares: " . $conn->error);
                    }
                }
                
                // Now try to query again from outstation_fares
                $result = $conn->query($query);
                
                if ($result) {
                    $fares = [];
                    while ($row = $result->fetch_assoc()) {
                        $id = $row['vehicle_id'] ?? null;
                        
                        if (!$id) continue;
                        
                        $nightHaltCharge = floatval($row['nightHaltCharge'] ?? 0);
                        
                        $fares[$id] = [
                            'basePrice' => floatval($row['basePrice'] ?? 0),
                            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
                            'nightHaltCharge' => $nightHaltCharge,
                            'driverAllowance' => floatval($row['driverAllowance'] ?? 0),
                            'roundTripBasePrice' => floatval($row['roundTripBasePrice'] ?? 0),
                            'roundTripPricePerKm' => floatval($row['roundTripPricePerKm'] ?? 0),
                            'nightHalt' => $nightHaltCharge
                        ];
                    }
                    
                    error_log("After sync, found " . count($fares) . " outstation fares");
                }
            }
        }
    }
    
    // Return response with debug information
    echo json_encode([
        'fares' => $fares,
        'origin' => $origin,
        'destination' => $destination,
        'timestamp' => time(),
        'sourceTable' => 'outstation_fares',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
