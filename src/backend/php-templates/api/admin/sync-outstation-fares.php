
<?php
/**
 * This script syncs the outstation_fares table with vehicle_pricing table.
 * It can be run in either direction:
 * - from outstation_fares to vehicle_pricing (default)
 * - from vehicle_pricing to outstation_fares (with source=vehicle_pricing parameter)
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
header('X-Debug-File: sync-outstation-fares.php');
header('X-API-Version: 1.0.5');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Increase PHP limits for this script
    ini_set('max_execution_time', 120); // 120 seconds
    ini_set('memory_limit', '256M');     // 256 MB
    
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Determine the sync direction
    $source = isset($_GET['source']) ? $_GET['source'] : 'outstation_fares';
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $forceCreate = isset($_GET['force_create']) && $_GET['force_create'] === 'true';
    $debugMode = isset($_GET['debug']) && $_GET['debug'] === 'true';
    
    // Log the operation
    error_log("Starting sync operation with source: $source, vehicle_id: " . ($vehicleId ?: 'all') . ", force_create: " . ($forceCreate ? 'true' : 'false'));
    
    // Start transaction
    $conn->begin_transaction();
    
    // First, check if tables exist and create them if necessary
    $tables = ['outstation_fares', 'vehicle_pricing'];
    $tablesCreated = [];
    
    foreach ($tables as $table) {
        $checkTableQuery = "SHOW TABLES LIKE '$table'";
        $tableExists = $conn->query($checkTableQuery)->num_rows > 0;
        
        if (!$tableExists || $forceCreate) {
            if ($table === 'outstation_fares') {
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
                
                if ($conn->query($createTableSql)) {
                    $tablesCreated[] = $table;
                    error_log("Created table: $table");
                } else {
                    throw new Exception("Failed to create table $table: " . $conn->error);
                }
            } else if ($table === 'vehicle_pricing') {
                // vehicle_pricing table
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
                
                if ($conn->query($createVehiclePricingSQL)) {
                    $tablesCreated[] = $table;
                    error_log("Created table: $table");
                } else {
                    throw new Exception("Failed to create table $table: " . $conn->error);
                }
            }
        }
    }
    
    $updated = 0;
    $inserted = 0;
    $errors = [];
    $debugInfo = [];
    
    if ($source === 'outstation_fares') {
        // Sync from outstation_fares to vehicle_pricing
        
        // Check for empty outstation_fares table
        $checkEmptyQuery = "SELECT COUNT(*) as count FROM outstation_fares";
        $emptyResult = $conn->query($checkEmptyQuery);
        $emptyRow = $emptyResult->fetch_assoc();
        $isEmptyTable = $emptyRow['count'] == 0;
        
        if ($isEmptyTable) {
            error_log("outstation_fares table is empty. Checking vehicle_pricing for potential data to import first.");
            
            // Try to populate outstation_fares from vehicle_pricing first
            $getOutstationPricingQuery = "
                SELECT 
                    vp.vehicle_id, 
                    MAX(CASE WHEN vp.trip_type IN ('outstation', 'outstation-one-way') THEN vp.base_fare ELSE 0 END) as base_price,
                    MAX(CASE WHEN vp.trip_type IN ('outstation', 'outstation-one-way') THEN vp.price_per_km ELSE 0 END) as price_per_km,
                    MAX(CASE WHEN vp.trip_type = 'outstation-round-trip' THEN vp.base_fare ELSE 0 END) as roundtrip_base_price,
                    MAX(CASE WHEN vp.trip_type = 'outstation-round-trip' THEN vp.price_per_km ELSE 0 END) as roundtrip_price_per_km,
                    MAX(vp.night_halt_charge) as night_halt_charge,
                    MAX(vp.driver_allowance) as driver_allowance
                FROM 
                    vehicle_pricing vp
                WHERE 
                    vp.trip_type IN ('outstation', 'outstation-one-way', 'outstation-round-trip')
                GROUP BY 
                    vp.vehicle_id
            ";
            
            $outPricingResult = $conn->query($getOutstationPricingQuery);
            if ($outPricingResult && $outPricingResult->num_rows > 0) {
                while ($row = $outPricingResult->fetch_assoc()) {
                    $vid = $row['vehicle_id'];
                    $basePrice = $row['base_price'];
                    $pricePerKm = $row['price_per_km'];
                    $rtBasePrice = $row['roundtrip_base_price'];
                    $rtPricePerKm = $row['roundtrip_price_per_km'];
                    $nightHalt = $row['night_halt_charge'];
                    $driverAllowance = $row['driver_allowance'];
                    
                    // If round trip values are not specified, use a discount from one-way
                    if ($rtBasePrice <= 0 && $basePrice > 0) {
                        $rtBasePrice = $basePrice * 0.95; // 5% discount
                    }
                    
                    if ($rtPricePerKm <= 0 && $pricePerKm > 0) {
                        $rtPricePerKm = $pricePerKm * 0.85; // 15% discount
                    }
                    
                    // Insert into outstation_fares
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '$vid', $basePrice, $pricePerKm, $nightHalt, $driverAllowance,
                            $rtBasePrice, $rtPricePerKm
                        )
                    ";
                    
                    if ($conn->query($insertQuery)) {
                        $inserted++;
                        error_log("Imported data from vehicle_pricing to outstation_fares for $vid");
                    } else {
                        $errors[] = "Failed to import data for $vid: " . $conn->error;
                        error_log("Failed to import data from vehicle_pricing for $vid: " . $conn->error);
                    }
                }
            }
        }
        
        // Now run the actual sync from outstation_fares to vehicle_pricing
        
        // First one-way prices
        $syncQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 'outstation', of.base_price, of.price_per_km, of.night_halt_charge, of.driver_allowance, CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE 
                base_fare = of.base_price,
                price_per_km = of.price_per_km,
                night_halt_charge = of.night_halt_charge,
                driver_allowance = of.driver_allowance,
                updated_at = CURRENT_TIMESTAMP
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncQuery = str_replace("FROM \n                outstation_fares of", "FROM \n                outstation_fares of\n            WHERE of.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'", $syncQuery);
        }
        
        if ($debugMode) {
            $debugInfo['one_way_query'] = $syncQuery;
        }
        
        $syncResult = $conn->query($syncQuery);
        if (!$syncResult) {
            $errors[] = "Failed to sync one-way fares: " . $conn->error;
            error_log("Failed to sync one-way fares: " . $conn->error);
        } else {
            $updated += $conn->affected_rows;
            error_log("Synced one-way fares: " . $conn->affected_rows . " rows affected");
        }
        
        // Also for outstation-one-way type
        $syncOneWayTypeQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 'outstation-one-way', of.base_price, of.price_per_km, of.night_halt_charge, of.driver_allowance, CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE 
                base_fare = of.base_price,
                price_per_km = of.price_per_km,
                night_halt_charge = of.night_halt_charge,
                driver_allowance = of.driver_allowance,
                updated_at = CURRENT_TIMESTAMP
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncOneWayTypeQuery = str_replace("FROM \n                outstation_fares of", "FROM \n                outstation_fares of\n            WHERE of.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'", $syncOneWayTypeQuery);
        }
        
        if ($debugMode) {
            $debugInfo['one_way_type_query'] = $syncOneWayTypeQuery;
        }
        
        $syncOneWayTypeResult = $conn->query($syncOneWayTypeQuery);
        if (!$syncOneWayTypeResult) {
            $errors[] = "Failed to sync outstation-one-way fares: " . $conn->error;
            error_log("Failed to sync outstation-one-way fares: " . $conn->error);
        } else {
            $updated += $conn->affected_rows;
            error_log("Synced outstation-one-way fares: " . $conn->affected_rows . " rows affected");
        }
        
        // Then round-trip prices
        $syncRtQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 'outstation-round-trip', of.roundtrip_base_price, of.roundtrip_price_per_km, of.night_halt_charge, of.driver_allowance, CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE 
                base_fare = of.roundtrip_base_price,
                price_per_km = of.roundtrip_price_per_km,
                night_halt_charge = of.night_halt_charge,
                driver_allowance = of.driver_allowance,
                updated_at = CURRENT_TIMESTAMP
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncRtQuery = str_replace("FROM \n                outstation_fares of", "FROM \n                outstation_fares of\n            WHERE of.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'", $syncRtQuery);
        }
        
        if ($debugMode) {
            $debugInfo['round_trip_query'] = $syncRtQuery;
        }
        
        $syncRtResult = $conn->query($syncRtQuery);
        if (!$syncRtResult) {
            $errors[] = "Failed to sync round-trip fares: " . $conn->error;
            error_log("Failed to sync round-trip fares: " . $conn->error);
        } else {
            $updated += $conn->affected_rows;
            error_log("Synced round-trip fares: " . $conn->affected_rows . " rows affected");
        }
        
        error_log("Synced $updated records from outstation_fares to vehicle_pricing");
    } else {
        // Sync from vehicle_pricing to outstation_fares
        
        // First get the one-way prices
        $getOneWayQuery = "
            SELECT 
                vp.vehicle_id,
                vp.base_fare,
                vp.price_per_km,
                vp.night_halt_charge,
                vp.driver_allowance
            FROM 
                vehicle_pricing vp
            WHERE 
                (vp.trip_type = 'outstation' OR vp.trip_type = 'outstation-one-way')
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $getOneWayQuery .= " AND vp.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        if ($debugMode) {
            $debugInfo['get_one_way_query'] = $getOneWayQuery;
        }
        
        $oneWayResult = $conn->query($getOneWayQuery);
        if (!$oneWayResult) {
            $errors[] = "Failed to get one-way fares: " . $conn->error;
            error_log("Failed to get one-way fares: " . $conn->error);
        } else {
            // Process each vehicle
            while ($row = $oneWayResult->fetch_assoc()) {
                $vId = $row['vehicle_id'];
                $baseFare = $row['base_fare'];
                $pricePerKm = $row['price_per_km'];
                $nightHaltCharge = $row['night_halt_charge'];
                $driverAllowance = $row['driver_allowance'];
                
                // Get round-trip prices if available
                $getRtQuery = "
                    SELECT base_fare, price_per_km 
                    FROM vehicle_pricing 
                    WHERE vehicle_id = '" . $conn->real_escape_string($vId) . "' AND trip_type = 'outstation-round-trip'
                ";
                
                $rtResult = $conn->query($getRtQuery);
                
                // Set default values for roundtrip
                $rtBaseFare = $baseFare * 0.95; // 5% discount
                $rtPricePerKm = $pricePerKm * 0.85; // 15% discount
                
                // Update with actual values if available
                if ($rtResult && $rtResult->num_rows > 0) {
                    $rtRow = $rtResult->fetch_assoc();
                    $rtBaseFare = $rtRow['base_fare'];
                    $rtPricePerKm = $rtRow['price_per_km'];
                }
                
                // Check if vehicle exists in outstation_fares
                $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '" . $conn->real_escape_string($vId) . "'";
                $checkResult = $conn->query($checkQuery);
                
                if ($checkResult->num_rows > 0) {
                    // Update existing record
                    $updateQuery = "
                        UPDATE outstation_fares 
                        SET 
                            base_price = $baseFare,
                            price_per_km = $pricePerKm,
                            night_halt_charge = $nightHaltCharge,
                            driver_allowance = $driverAllowance,
                            roundtrip_base_price = $rtBaseFare,
                            roundtrip_price_per_km = $rtPricePerKm,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE vehicle_id = '" . $conn->real_escape_string($vId) . "'
                    ";
                    
                    if (!$conn->query($updateQuery)) {
                        $errors[] = "Failed to update outstation_fares for $vId: " . $conn->error;
                        error_log("Failed to update outstation_fares for $vId: " . $conn->error);
                    } else {
                        $updated++;
                    }
                } else {
                    // Insert new record
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '" . $conn->real_escape_string($vId) . "', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance,
                            $rtBaseFare, $rtPricePerKm
                        )
                    ";
                    
                    if (!$conn->query($insertQuery)) {
                        $errors[] = "Failed to insert into outstation_fares for $vId: " . $conn->error;
                        error_log("Failed to insert into outstation_fares for $vId: " . $conn->error);
                    } else {
                        $inserted++;
                    }
                }
            }
            
            error_log("Synced $updated records and inserted $inserted records from vehicle_pricing to outstation_fares");
        }
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced records between outstation_fares and vehicle_pricing",
        'direction' => $source === 'outstation_fares' ? 'outstation_fares → vehicle_pricing' : 'vehicle_pricing → outstation_fares',
        'updated' => $updated,
        'inserted' => $inserted,
        'tablesCreated' => $tablesCreated,
        'timestamp' => time(),
        'errors' => $errors,
        'debug' => $debugMode ? $debugInfo : null
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in sync-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'timestamp' => time()
    ]);
}
