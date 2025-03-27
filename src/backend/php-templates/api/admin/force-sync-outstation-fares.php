
<?php
/**
 * This API endpoint forces a sync between outstation_fares and vehicle_pricing tables
 * in both directions to ensure data consistency
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: force-sync-outstation-fares.php');
header('X-API-Version: 1.0.1');
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
    
    // Get additional parameters
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the operation start
    error_log("Starting force sync operation" . ($vehicleId ? " for vehicle $vehicleId" : "") . " at " . date('Y-m-d H:i:s'));
    
    // First check if tables exist
    $tableChecks = [
        'outstation_fares' => $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0,
        'vehicle_pricing' => $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0
    ];
    
    // Create missing tables if needed
    if (!$tableChecks['outstation_fares']) {
        $createOutstationFaresSQL = "
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
        
        if (!$conn->query($createOutstationFaresSQL)) {
            throw new Exception("Failed to create outstation_fares table: " . $conn->error);
        }
        
        $tableChecks['outstation_fares'] = true;
        error_log("Created outstation_fares table");
    }
    
    if (!$tableChecks['vehicle_pricing']) {
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
        
        $tableChecks['vehicle_pricing'] = true;
        error_log("Created vehicle_pricing table");
    }
    
    // Perform two-way sync
    $results = [];
    
    // STEP 1: First sync from outstation_fares to vehicle_pricing
    if ($tableChecks['outstation_fares'] && $tableChecks['vehicle_pricing']) {
        $conn->begin_transaction();
        
        try {
            // Insert any missing entries in vehicle_pricing from outstation_fares
            $onewayQuery = "
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
                $onewayQuery .= " AND of.vehicle_id = '$vehicleId'";
            }
            
            $onewayResult = $conn->query($onewayQuery);
            $onewayInserted = $conn->affected_rows;
            
            // Generic outstation type
            $genericQuery = "
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
                $genericQuery .= " AND of.vehicle_id = '$vehicleId'";
            }
            
            $genericResult = $conn->query($genericQuery);
            $genericInserted = $conn->affected_rows;
            
            // Round trip
            $roundtripQuery = "
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
                $roundtripQuery .= " AND of.vehicle_id = '$vehicleId'";
            }
            
            $roundtripResult = $conn->query($roundtripQuery);
            $roundtripInserted = $conn->affected_rows;
            
            // Update existing entries
            $updateOneWayQuery = "
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
                $updateOneWayQuery .= " AND vp.vehicle_id = '$vehicleId'";
            }
            
            $updateOneWayResult = $conn->query($updateOneWayQuery);
            $onewayUpdated = $conn->affected_rows;
            
            $updateRoundTripQuery = "
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
                $updateRoundTripQuery .= " AND vp.vehicle_id = '$vehicleId'";
            }
            
            $updateRoundTripResult = $conn->query($updateRoundTripQuery);
            $roundtripUpdated = $conn->affected_rows;
            
            $conn->commit();
            
            $results['outstation_to_vehicle'] = [
                'inserted' => [
                    'one_way' => $onewayInserted,
                    'generic' => $genericInserted,
                    'round_trip' => $roundtripInserted
                ],
                'updated' => [
                    'one_way' => $onewayUpdated,
                    'round_trip' => $roundtripUpdated
                ]
            ];
            
            error_log("Synced from outstation_fares to vehicle_pricing - inserted: " . 
                      ($onewayInserted + $genericInserted + $roundtripInserted) . 
                      ", updated: " . ($onewayUpdated + $roundtripUpdated));
        } catch (Exception $e) {
            $conn->rollback();
            error_log("Error syncing from outstation_fares to vehicle_pricing: " . $e->getMessage());
            $results['outstation_to_vehicle'] = [
                'error' => $e->getMessage()
            ];
        }
    }
    
    // STEP 2: Then sync from vehicle_pricing to outstation_fares
    if ($tableChecks['outstation_fares'] && $tableChecks['vehicle_pricing']) {
        $conn->begin_transaction();
        
        try {
            // Get vehicles with outstation pricing
            $getVehiclesQuery = "
                SELECT DISTINCT vehicle_id 
                FROM vehicle_pricing 
                WHERE trip_type LIKE 'outstation%'
            ";
            
            if ($vehicleId) {
                $getVehiclesQuery .= " AND vehicle_id = '$vehicleId'";
            }
            
            $vehiclesResult = $conn->query($getVehiclesQuery);
            $vehiclesUpdated = 0;
            $vehiclesInserted = 0;
            
            while ($vehicle = $vehiclesResult->fetch_assoc()) {
                $vId = $vehicle['vehicle_id'];
                
                // Get one-way price data
                $onewayQuery = "
                    SELECT base_fare, price_per_km, night_halt_charge, driver_allowance
                    FROM vehicle_pricing 
                    WHERE vehicle_id = '$vId' AND (trip_type = 'outstation-one-way' OR trip_type = 'outstation')
                    ORDER BY CASE 
                        WHEN trip_type = 'outstation-one-way' THEN 1
                        WHEN trip_type = 'outstation' THEN 2
                        ELSE 3
                    END
                    LIMIT 1
                ";
                
                $onewayResult = $conn->query($onewayQuery);
                
                if ($onewayResult && $onewayResult->num_rows > 0) {
                    $onewayData = $onewayResult->fetch_assoc();
                    
                    // Get round trip price data
                    $roundtripQuery = "
                        SELECT base_fare, price_per_km
                        FROM vehicle_pricing 
                        WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
                        LIMIT 1
                    ";
                    
                    $roundtripResult = $conn->query($roundtripQuery);
                    $roundtripData = null;
                    
                    if ($roundtripResult && $roundtripResult->num_rows > 0) {
                        $roundtripData = $roundtripResult->fetch_assoc();
                    }
                    
                    // Check if vehicle exists in outstation_fares
                    $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '$vId'";
                    $checkResult = $conn->query($checkQuery);
                    
                    if ($checkResult && $checkResult->num_rows > 0) {
                        // Update existing record
                        $updateQuery = "
                            UPDATE outstation_fares SET 
                                base_price = ?,
                                price_per_km = ?,
                                night_halt_charge = ?,
                                driver_allowance = ?,
                                roundtrip_base_price = ?,
                                roundtrip_price_per_km = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE vehicle_id = ?
                        ";
                        
                        $basePrice = $onewayData['base_fare'];
                        $pricePerKm = $onewayData['price_per_km'];
                        $nightHaltCharge = $onewayData['night_halt_charge'];
                        $driverAllowance = $onewayData['driver_allowance'];
                        
                        // Use roundtrip data if available, otherwise calculate it
                        $roundtripBasePrice = $roundtripData ? $roundtripData['base_fare'] : ($basePrice * 0.95);
                        $roundtripPricePerKm = $roundtripData ? $roundtripData['price_per_km'] : ($pricePerKm * 0.85);
                        
                        $stmt = $conn->prepare($updateQuery);
                        $stmt->bind_param(
                            'dddddds',
                            $basePrice,
                            $pricePerKm,
                            $nightHaltCharge,
                            $driverAllowance,
                            $roundtripBasePrice,
                            $roundtripPricePerKm,
                            $vId
                        );
                        
                        if ($stmt->execute()) {
                            $vehiclesUpdated++;
                        }
                    } else {
                        // Insert new record
                        $insertQuery = "
                            INSERT INTO outstation_fares (
                                vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                                roundtrip_base_price, roundtrip_price_per_km
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ";
                        
                        $basePrice = $onewayData['base_fare'];
                        $pricePerKm = $onewayData['price_per_km'];
                        $nightHaltCharge = $onewayData['night_halt_charge'];
                        $driverAllowance = $onewayData['driver_allowance'];
                        
                        // Use roundtrip data if available, otherwise calculate it
                        $roundtripBasePrice = $roundtripData ? $roundtripData['base_fare'] : ($basePrice * 0.95);
                        $roundtripPricePerKm = $roundtripData ? $roundtripData['price_per_km'] : ($pricePerKm * 0.85);
                        
                        $stmt = $conn->prepare($insertQuery);
                        $stmt->bind_param(
                            'sdddddd',
                            $vId,
                            $basePrice,
                            $pricePerKm,
                            $nightHaltCharge,
                            $driverAllowance,
                            $roundtripBasePrice,
                            $roundtripPricePerKm
                        );
                        
                        if ($stmt->execute()) {
                            $vehiclesInserted++;
                        }
                    }
                }
            }
            
            $conn->commit();
            
            $results['vehicle_to_outstation'] = [
                'inserted' => $vehiclesInserted,
                'updated' => $vehiclesUpdated
            ];
            
            error_log("Synced from vehicle_pricing to outstation_fares - inserted: $vehiclesInserted, updated: $vehiclesUpdated");
        } catch (Exception $e) {
            $conn->rollback();
            error_log("Error syncing from vehicle_pricing to outstation_fares: " . $e->getMessage());
            $results['vehicle_to_outstation'] = [
                'error' => $e->getMessage()
            ];
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Force sync completed successfully',
        'results' => $results,
        'timestamp' => time(),
        'vehicle_id' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in force-sync-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => 'force-sync-outstation-fares.php',
        'trace' => $e->getTraceAsString()
    ]);
}
