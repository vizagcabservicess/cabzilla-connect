
<?php
/**
 * This API endpoint force syncs between outstation_fares and vehicle_pricing tables
 * It can be called from frontend to ensure data consistency
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.0');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle ID if specified
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $direction = isset($_GET['direction']) ? $_GET['direction'] : 'to_vehicle_pricing';
    
    // Log the operation
    error_log("Starting force sync operation for " . ($vehicleId ? "vehicle $vehicleId" : "all vehicles") . ", direction: $direction");
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Make sure both tables exist
    $tables = ['outstation_fares', 'vehicle_pricing'];
    $tablesCreated = [];
    
    foreach ($tables as $table) {
        $checkTableQuery = "SHOW TABLES LIKE '$table'";
        $tableExists = $conn->query($checkTableQuery)->num_rows > 0;
        
        if (!$tableExists) {
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
    
    if ($direction === 'to_vehicle_pricing') {
        // Sync from outstation_fares to vehicle_pricing
        
        // Build the query to get fares
        $fareQuery = "SELECT * FROM outstation_fares";
        if ($vehicleId) {
            $fareQuery .= " WHERE vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        $faresResult = $conn->query($fareQuery);
        if (!$faresResult) {
            throw new Exception("Failed to fetch fares: " . $conn->error);
        }
        
        while ($fare = $faresResult->fetch_assoc()) {
            $vid = $fare['vehicle_id'];
            $basePrice = $fare['base_price'];
            $pricePerKm = $fare['price_per_km'];
            $roundtripBasePrice = $fare['roundtrip_base_price'];
            $roundtripPricePerKm = $fare['roundtrip_price_per_km'];
            $driverAllowance = $fare['driver_allowance'];
            $nightHaltCharge = $fare['night_halt_charge'];
            
            // Update or insert one-way record
            $oneWayQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $basePrice,
                    price_per_km = $pricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($oneWayQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                }
            } else {
                error_log("Failed to sync outstation fares for $vid: " . $conn->error);
            }
            
            // Also for outstation-one-way type
            $oneWayTypeQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation-one-way', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $basePrice,
                    price_per_km = $pricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($oneWayTypeQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                }
            }
            
            // Update or insert round-trip record
            $roundTripQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation-round-trip', $roundtripBasePrice, $roundtripPricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $roundtripBasePrice,
                    price_per_km = $roundtripPricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($roundTripQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                }
            } else {
                error_log("Failed to sync round-trip fares for $vid: " . $conn->error);
            }
        }
    } else {
        // Sync from vehicle_pricing to outstation_fares
        // First get the one-way prices from vehicle_pricing
        $outstationTypes = ['outstation', 'outstation-one-way'];
        $typesStr = "'" . implode("','", $outstationTypes) . "'";
        
        $pricingQuery = "SELECT vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance FROM vehicle_pricing WHERE trip_type IN ($typesStr)";
        if ($vehicleId) {
            $pricingQuery .= " AND vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        $pricingResult = $conn->query($pricingQuery);
        if (!$pricingResult) {
            throw new Exception("Failed to fetch pricing: " . $conn->error);
        }
        
        // Process each vehicle's one-way pricing
        $processedVehicles = [];
        while ($pricing = $pricingResult->fetch_assoc()) {
            $vid = $pricing['vehicle_id'];
            
            // Skip if we've already processed this vehicle
            if (in_array($vid, $processedVehicles)) {
                continue;
            }
            
            $processedVehicles[] = $vid;
            $basePrice = $pricing['base_fare'];
            $pricePerKm = $pricing['price_per_km'];
            $nightHaltCharge = $pricing['night_halt_charge'];
            $driverAllowance = $pricing['driver_allowance'];
            
            // Get round-trip data
            $rtQuery = "SELECT base_fare, price_per_km FROM vehicle_pricing WHERE vehicle_id = '$vid' AND trip_type = 'outstation-round-trip'";
            $rtResult = $conn->query($rtQuery);
            
            // Default round-trip prices (if no specific record)
            $roundtripBasePrice = $basePrice * 0.95; // 5% discount
            $roundtripPricePerKm = $pricePerKm * 0.85; // 15% discount
            
            if ($rtResult && $rtResult->num_rows > 0) {
                $rtData = $rtResult->fetch_assoc();
                $roundtripBasePrice = $rtData['base_fare'];
                $roundtripPricePerKm = $rtData['price_per_km'];
            }
            
            // Check if the vehicle exists in outstation_fares
            $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '$vid'";
            $checkResult = $conn->query($checkQuery);
            
            if ($checkResult && $checkResult->num_rows > 0) {
                // Update existing record
                $updateQuery = "
                    UPDATE outstation_fares SET
                        base_price = $basePrice,
                        price_per_km = $pricePerKm,
                        night_halt_charge = $nightHaltCharge,
                        driver_allowance = $driverAllowance,
                        roundtrip_base_price = $roundtripBasePrice,
                        roundtrip_price_per_km = $roundtripPricePerKm,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = '$vid'
                ";
                
                if ($conn->query($updateQuery)) {
                    if ($conn->affected_rows > 0) {
                        $updated++;
                    }
                } else {
                    error_log("Failed to update outstation_fares for $vid: " . $conn->error);
                }
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                        roundtrip_base_price, roundtrip_price_per_km
                    ) VALUES (
                        '$vid', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance,
                        $roundtripBasePrice, $roundtripPricePerKm
                    )
                ";
                
                if ($conn->query($insertQuery)) {
                    $inserted++;
                } else {
                    error_log("Failed to insert into outstation_fares for $vid: " . $conn->error);
                }
            }
        }
    }
    
    // Look for vehicles in other table that don't exist in the source table
    if ($direction === 'to_vehicle_pricing') {
        // Find vehicles in vehicle_pricing that don't have outstation_fares records
        $missingQuery = "
            SELECT DISTINCT vp.vehicle_id 
            FROM vehicle_pricing vp
            LEFT JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
            WHERE of.id IS NULL AND vp.trip_type IN ('outstation', 'outstation-one-way', 'outstation-round-trip')
        ";
        
        if ($vehicleId) {
            $missingQuery .= " AND vp.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        $missingResult = $conn->query($missingQuery);
        if ($missingResult && $missingResult->num_rows > 0) {
            while ($missing = $missingResult->fetch_assoc()) {
                $vid = $missing['vehicle_id'];
                
                // Get one-way data
                $oneWayQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = '$vid' AND trip_type IN ('outstation', 'outstation-one-way') LIMIT 1";
                $oneWayResult = $conn->query($oneWayQuery);
                
                if ($oneWayResult && $oneWayResult->num_rows > 0) {
                    $oneWayData = $oneWayResult->fetch_assoc();
                    $basePrice = $oneWayData['base_fare'];
                    $pricePerKm = $oneWayData['price_per_km'];
                    $nightHaltCharge = $oneWayData['night_halt_charge'];
                    $driverAllowance = $oneWayData['driver_allowance'];
                    
                    // Get round-trip data
                    $rtQuery = "SELECT base_fare, price_per_km FROM vehicle_pricing WHERE vehicle_id = '$vid' AND trip_type = 'outstation-round-trip'";
                    $rtResult = $conn->query($rtQuery);
                    
                    // Default round-trip prices (if no specific record)
                    $roundtripBasePrice = $basePrice * 0.95; // 5% discount
                    $roundtripPricePerKm = $pricePerKm * 0.85; // 15% discount
                    
                    if ($rtResult && $rtResult->num_rows > 0) {
                        $rtData = $rtResult->fetch_assoc();
                        $roundtripBasePrice = $rtData['base_fare'];
                        $roundtripPricePerKm = $rtData['price_per_km'];
                    }
                    
                    // Insert into outstation_fares
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '$vid', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance,
                            $roundtripBasePrice, $roundtripPricePerKm
                        )
                    ";
                    
                    if ($conn->query($insertQuery)) {
                        $inserted++;
                    } else {
                        error_log("Failed to insert missing vehicle $vid into outstation_fares: " . $conn->error);
                    }
                }
            }
        }
    } else {
        // Find vehicles in outstation_fares that don't have vehicle_pricing records
        $missingQuery = "
            SELECT of.vehicle_id, of.base_price, of.price_per_km, of.night_halt_charge, of.driver_allowance,
                   of.roundtrip_base_price, of.roundtrip_price_per_km
            FROM outstation_fares of
            LEFT JOIN vehicle_pricing vp ON of.vehicle_id = vp.vehicle_id AND vp.trip_type IN ('outstation', 'outstation-one-way')
            WHERE vp.id IS NULL
        ";
        
        if ($vehicleId) {
            $missingQuery .= " AND of.vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        $missingResult = $conn->query($missingQuery);
        if ($missingResult && $missingResult->num_rows > 0) {
            while ($missing = $missingResult->fetch_assoc()) {
                $vid = $missing['vehicle_id'];
                $basePrice = $missing['base_price'];
                $pricePerKm = $missing['price_per_km'];
                $roundtripBasePrice = $missing['roundtrip_base_price'];
                $roundtripPricePerKm = $missing['roundtrip_price_per_km'];
                $nightHaltCharge = $missing['night_halt_charge'];
                $driverAllowance = $missing['driver_allowance'];
                
                // Insert one-way record
                $oneWayQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance
                    ) VALUES (
                        '$vid', 'outstation', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
                    )
                ";
                
                if ($conn->query($oneWayQuery)) {
                    $inserted++;
                } else {
                    error_log("Failed to insert missing vehicle $vid into vehicle_pricing (outstation): " . $conn->error);
                }
                
                // Insert outstation-one-way record
                $oneWayTypeQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance
                    ) VALUES (
                        '$vid', 'outstation-one-way', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
                    )
                ";
                
                if ($conn->query($oneWayTypeQuery)) {
                    $inserted++;
                } else {
                    error_log("Failed to insert missing vehicle $vid into vehicle_pricing (outstation-one-way): " . $conn->error);
                }
                
                // Check if round-trip record exists
                $checkRtQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = '$vid' AND trip_type = 'outstation-round-trip'";
                $checkRtResult = $conn->query($checkRtQuery);
                
                if (!$checkRtResult || $checkRtResult->num_rows === 0) {
                    // Insert round-trip record
                    $roundTripQuery = "
                        INSERT INTO vehicle_pricing (
                            vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance
                        ) VALUES (
                            '$vid', 'outstation-round-trip', $roundtripBasePrice, $roundtripPricePerKm, $nightHaltCharge, $driverAllowance
                        )
                    ";
                    
                    if ($conn->query($roundTripQuery)) {
                        $inserted++;
                    } else {
                        error_log("Failed to insert missing vehicle $vid into vehicle_pricing (outstation-round-trip): " . $conn->error);
                    }
                }
            }
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced outstation fares data",
        'direction' => $direction,
        'vehicle_id' => $vehicleId,
        'tables_created' => $tablesCreated,
        'updated' => $updated,
        'inserted' => $inserted,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in force-sync-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
