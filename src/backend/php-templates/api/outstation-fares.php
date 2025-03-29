
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
header('X-API-Version: 1.0.6');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Save fares to JSON file for client-side caching
function saveFaresToJson($fares) {
    try {
        // Ensure the directory exists
        $dir = __DIR__ . '/../../public/data';
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true)) {
                error_log("Failed to create directory: $dir");
                return false;
            }
        }
        
        $jsonFile = $dir . '/outstation-fares.json';
        $jsonData = json_encode([
            'fares' => $fares,
            'timestamp' => time()
        ], JSON_PRETTY_PRINT);
        
        // Write to file
        if (file_put_contents($jsonFile, $jsonData)) {
            error_log("Successfully saved fares to JSON file: $jsonFile");
            return true;
        } else {
            error_log("Failed to write fares to JSON file: $jsonFile");
            return false;
        }
    } catch (Exception $e) {
        error_log("Exception saving fares to JSON: " . $e->getMessage());
        return false;
    }
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
    $checkSync = isset($_GET['check_sync']) && $_GET['check_sync'] === 'true';
    
    // Log the request parameters
    error_log("Outstation fares request: " . json_encode([
        'origin' => $origin,
        'destination' => $destination,
        'vehicle_id' => $vehicleId,
        'force_sync' => $forceSync,
        'check_sync' => $checkSync
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
    if (isset($_GET['sync']) && $_GET['sync'] === 'true' || $forceSync || $checkSync) {
        $checkVehiclePricing = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        
        if ($checkVehiclePricing->num_rows > 0) {
            // Create a transaction for sync operations
            $conn->begin_transaction();
            
            try {
                // First insert any missing entries in vehicle_pricing
                $insertMissingOneWayQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, 
                        night_halt_charge, driver_allowance
                    )
                    SELECT 
                        of.vehicle_id, 
                        'outstation-one-way', 
                        of.base_price, 
                        of.price_per_km, 
                        of.night_halt_charge, 
                        of.driver_allowance
                    FROM 
                        outstation_fares of
                    LEFT JOIN 
                        vehicle_pricing vp ON vp.vehicle_id = of.vehicle_id 
                        AND vp.trip_type = 'outstation-one-way'
                    WHERE 
                        vp.id IS NULL
                ";
                
                if ($vehicleId) {
                    $insertMissingOneWayQuery .= " AND of.vehicle_id = '$vehicleId'";
                }
                
                $conn->query($insertMissingOneWayQuery);
                
                // Also for generic 'outstation' type
                $insertMissingGenericQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, 
                        night_halt_charge, driver_allowance
                    )
                    SELECT 
                        of.vehicle_id, 
                        'outstation', 
                        of.base_price, 
                        of.price_per_km, 
                        of.night_halt_charge, 
                        of.driver_allowance
                    FROM 
                        outstation_fares of
                    LEFT JOIN 
                        vehicle_pricing vp ON vp.vehicle_id = of.vehicle_id 
                        AND vp.trip_type = 'outstation'
                    WHERE 
                        vp.id IS NULL
                ";
                
                if ($vehicleId) {
                    $insertMissingGenericQuery .= " AND of.vehicle_id = '$vehicleId'";
                }
                
                $conn->query($insertMissingGenericQuery);
                
                // Also for round trip type
                $insertMissingRoundTripQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, 
                        night_halt_charge, driver_allowance
                    )
                    SELECT 
                        of.vehicle_id, 
                        'outstation-round-trip', 
                        of.roundtrip_base_price, 
                        of.roundtrip_price_per_km, 
                        of.night_halt_charge, 
                        of.driver_allowance
                    FROM 
                        outstation_fares of
                    LEFT JOIN 
                        vehicle_pricing vp ON vp.vehicle_id = of.vehicle_id 
                        AND vp.trip_type = 'outstation-round-trip'
                    WHERE 
                        vp.id IS NULL
                ";
                
                if ($vehicleId) {
                    $insertMissingRoundTripQuery .= " AND of.vehicle_id = '$vehicleId'";
                }
                
                $conn->query($insertMissingRoundTripQuery);
                
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
                
                if ($vehicleId) {
                    $syncRtQuery .= " AND vp.vehicle_id = '$vehicleId'";
                }
                
                $conn->query($syncRtQuery);
                
                // Commit the transaction
                $conn->commit();
                
                error_log("Synced outstation_fares to vehicle_pricing" . ($vehicleId ? " for vehicle $vehicleId" : ""));
            } catch (Exception $e) {
                // Rollback on error
                $conn->rollback();
                error_log("Error during sync: " . $e->getMessage());
                // We don't throw here so we can continue with the main query
            }
        }
    }
    
    // Fetch fares from outstation_fares table
    $query = "SELECT * FROM outstation_fares WHERE 1=1";
    
    if ($vehicleId) {
        $query .= " AND vehicle_id = '$vehicleId'";
    }
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Failed to fetch outstation fares: " . $conn->error);
    }
    
    $fares = [];
    
    while ($row = $result->fetch_assoc()) {
        $fares[$row['vehicle_id']] = [
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'nightHaltCharge' => (float)$row['night_halt_charge'],
            'driverAllowance' => (float)$row['driver_allowance'],
            'roundTripBasePrice' => (float)$row['roundtrip_base_price'],
            'roundTripPricePerKm' => (float)$row['roundtrip_price_per_km']
        ];
    }
    
    // If a specific vehicle was requested but not found in outstation_fares
    if ($vehicleId && empty($fares)) {
        // Try to find it in vehicle_pricing if that table exists
        $checkVehiclePricing = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        
        if ($checkVehiclePricing->num_rows > 0) {
            $onewayQuery = "
                SELECT base_fare, price_per_km, night_halt_charge, driver_allowance
                FROM vehicle_pricing 
                WHERE vehicle_id = '$vehicleId' AND (trip_type = 'outstation' OR trip_type = 'outstation-one-way')
                ORDER BY CASE 
                    WHEN trip_type = 'outstation-one-way' THEN 1
                    WHEN trip_type = 'outstation' THEN 2
                    ELSE 3
                END
                LIMIT 1
            ";
            
            $onewayResult = $conn->query($onewayQuery);
            
            $roundtripQuery = "
                SELECT base_fare, price_per_km
                FROM vehicle_pricing 
                WHERE vehicle_id = '$vehicleId' AND trip_type = 'outstation-round-trip'
                LIMIT 1
            ";
            
            $roundtripResult = $conn->query($roundtripQuery);
            
            if ($onewayResult && $onewayResult->num_rows > 0) {
                $onewayRow = $onewayResult->fetch_assoc();
                
                $fare = [
                    'basePrice' => (float)$onewayRow['base_fare'],
                    'pricePerKm' => (float)$onewayRow['price_per_km'],
                    'nightHaltCharge' => (float)$onewayRow['night_halt_charge'],
                    'driverAllowance' => (float)$onewayRow['driver_allowance'],
                    'roundTripBasePrice' => 0,
                    'roundTripPricePerKm' => 0
                ];
                
                // Add round-trip values if available
                if ($roundtripResult && $roundtripResult->num_rows > 0) {
                    $roundtripRow = $roundtripResult->fetch_assoc();
                    $fare['roundTripBasePrice'] = (float)$roundtripRow['base_fare'];
                    $fare['roundTripPricePerKm'] = (float)$roundtripRow['price_per_km'];
                } else {
                    // Apply default calculations if round-trip values not available
                    $fare['roundTripBasePrice'] = $fare['basePrice'] * 0.95;
                    $fare['roundTripPricePerKm'] = $fare['pricePerKm'] * 0.85;
                }
                
                $fares[$vehicleId] = $fare;
                
                // Also insert this into outstation_fares for future use
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                        roundtrip_base_price, roundtrip_price_per_km
                    ) VALUES (
                        '$vehicleId', 
                        {$fare['basePrice']}, 
                        {$fare['pricePerKm']}, 
                        {$fare['nightHaltCharge']}, 
                        {$fare['driverAllowance']},
                        {$fare['roundTripBasePrice']}, 
                        {$fare['roundTripPricePerKm']}
                    )
                    ON DUPLICATE KEY UPDATE
                        base_price = VALUES(base_price),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance),
                        roundtrip_base_price = VALUES(roundtrip_base_price),
                        roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                        updated_at = CURRENT_TIMESTAMP
                ";
                
                try {
                    $conn->query($insertQuery);
                    error_log("Inserted fare data from vehicle_pricing to outstation_fares for $vehicleId");
                } catch (Exception $e) {
                    error_log("Error inserting to outstation_fares: " . $e->getMessage());
                    // Continue anyway since we already have the fare data
                }
            }
        }
    }
    
    // If we have no vehicles at all, try to pull from vehicle_types and create default fares
    if (empty($fares)) {
        $checkVehicleTypes = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        
        if ($checkVehicleTypes->num_rows > 0) {
            $vehicleQuery = "SELECT vehicle_id, name FROM vehicle_types WHERE is_active = 1";
            $vehicleResult = $conn->query($vehicleQuery);
            
            if ($vehicleResult && $vehicleResult->num_rows > 0) {
                while ($vehicleRow = $vehicleResult->fetch_assoc()) {
                    $vehicleId = $vehicleRow['vehicle_id'];
                    
                    // Create default fares based on vehicle type
                    $basePrice = 3000;
                    $pricePerKm = 15;
                    $nightHaltCharge = 800;
                    $driverAllowance = 300;
                    
                    if (stripos($vehicleRow['name'], 'sedan') !== false) {
                        $basePrice = 3000;
                        $pricePerKm = 15;
                    } elseif (stripos($vehicleRow['name'], 'ertiga') !== false || stripos($vehicleRow['name'], 'suv') !== false) {
                        $basePrice = 3500;
                        $pricePerKm = 18;
                    } elseif (stripos($vehicleRow['name'], 'innova') !== false) {
                        $basePrice = 4000;
                        $pricePerKm = 20;
                    } elseif (stripos($vehicleRow['name'], 'luxury') !== false) {
                        $basePrice = 5000;
                        $pricePerKm = 25;
                    } elseif (stripos($vehicleRow['name'], 'tempo') !== false) {
                        $basePrice = 6000;
                        $pricePerKm = 30;
                    }
                    
                    // Calculate round trip fares with a discount
                    $roundTripBasePrice = $basePrice * 0.95;
                    $roundTripPricePerKm = $pricePerKm * 0.85;
                    
                    $fare = [
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'nightHaltCharge' => $nightHaltCharge,
                        'driverAllowance' => $driverAllowance,
                        'roundTripBasePrice' => $roundTripBasePrice,
                        'roundTripPricePerKm' => $roundTripPricePerKm
                    ];
                    
                    $fares[$vehicleId] = $fare;
                    
                    // Insert default fares for this vehicle
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '$vehicleId', 
                            {$fare['basePrice']}, 
                            {$fare['pricePerKm']}, 
                            {$fare['nightHaltCharge']}, 
                            {$fare['driverAllowance']},
                            {$fare['roundTripBasePrice']}, 
                            {$fare['roundTripPricePerKm']}
                        )
                        ON DUPLICATE KEY UPDATE
                            base_price = VALUES(base_price),
                            price_per_km = VALUES(price_per_km),
                            night_halt_charge = VALUES(night_halt_charge),
                            driver_allowance = VALUES(driver_allowance),
                            roundtrip_base_price = VALUES(roundtrip_base_price),
                            roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                            updated_at = CURRENT_TIMESTAMP
                    ";
                    
                    try {
                        $conn->query($insertQuery);
                        error_log("Created default outstation fares for $vehicleId");
                    } catch (Exception $e) {
                        error_log("Error creating default fares: " . $e->getMessage());
                    }
                }
            }
        }
    }
    
    // Save fares to JSON for client-side caching
    saveFaresToJson($fares);
    
    // Determine which table was the source of the fare data
    $sourceTable = 'outstation_fares';
    if ($vehicleId && isset($fares[$vehicleId]) && !$result->num_rows) {
        $sourceTable = 'vehicle_pricing';
    }
    
    // If we're fetching a specific vehicle, log its fares for debugging
    if ($vehicleId && isset($fares[$vehicleId])) {
        error_log("Outstation fares for vehicle $vehicleId: " . json_encode($fares[$vehicleId]));
        error_log("Source table: $sourceTable");
    }
    
    // Return the fares
    echo json_encode([
        'status' => 'success',
        'fares' => $fares,
        'sourceTable' => $sourceTable,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error in outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
