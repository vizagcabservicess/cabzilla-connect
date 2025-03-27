
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
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: sync-outstation-fares.php');
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
    
    // Determine the sync direction
    $source = isset($_GET['source']) ? $_GET['source'] : 'outstation_fares';
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $forceCreate = isset($_GET['force_create']) && $_GET['force_create'] === 'true';
    
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
    
    if ($source === 'outstation_fares') {
        // Sync from outstation_fares to vehicle_pricing
        
        // First one-way prices
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
        if (!$syncResult) {
            throw new Exception("Failed to sync one-way fares: " . $conn->error);
        }
        $updated += $conn->affected_rows;
        
        // Then round-trip prices
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
        if (!$syncRtResult) {
            throw new Exception("Failed to sync round-trip fares: " . $conn->error);
        }
        $updated += $conn->affected_rows;
        
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
        if (!$missingResult) {
            throw new Exception("Failed to check for missing entries: " . $conn->error);
        }
        
        // Process missing entries
        while ($row = $missingResult->fetch_assoc()) {
            $vId = $row['vehicle_id'];
            $baseFare = $row['base_price'];
            $pricePerKm = $row['price_per_km'];
            $rtBaseFare = $row['roundtrip_base_price'];
            $rtPricePerKm = $row['roundtrip_price_per_km'];
            $nightHaltCharge = $row['night_halt_charge'];
            $driverAllowance = $row['driver_allowance'];
            
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
                        $updated++;
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
                    $updated++;
                    error_log("Inserted round-trip entry for $vId");
                } else {
                    error_log("Failed to insert round-trip entry for $vId: " . $conn->error);
                }
            }
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
            $getOneWayQuery .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        $oneWayResult = $conn->query($getOneWayQuery);
        if (!$oneWayResult) {
            throw new Exception("Failed to get one-way fares: " . $conn->error);
        }
        
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
                WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
            ";
            
            $rtResult = $conn->query($getRtQuery);
            
            // Set default values for roundtrip
            $rtBaseFare = $baseFare;
            $rtPricePerKm = $pricePerKm;
            
            // Update with actual values if available
            if ($rtResult && $rtResult->num_rows > 0) {
                $rtRow = $rtResult->fetch_assoc();
                $rtBaseFare = $rtRow['base_fare'];
                $rtPricePerKm = $rtRow['price_per_km'];
            }
            
            // Check if vehicle exists in outstation_fares
            $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '$vId'";
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
                    WHERE vehicle_id = '$vId'
                ";
                
                if (!$conn->query($updateQuery)) {
                    throw new Exception("Failed to update outstation_fares for $vId: " . $conn->error);
                }
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                        roundtrip_base_price, roundtrip_price_per_km
                    ) VALUES (
                        '$vId', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance,
                        $rtBaseFare, $rtPricePerKm
                    )
                ";
                
                if (!$conn->query($insertQuery)) {
                    throw new Exception("Failed to insert into outstation_fares for $vId: " . $conn->error);
                }
            }
            
            $updated++;
        }
        
        error_log("Synced $updated records from vehicle_pricing to outstation_fares");
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced $updated records between outstation_fares and vehicle_pricing",
        'direction' => $source === 'outstation_fares' ? 'outstation_fares → vehicle_pricing' : 'vehicle_pricing → outstation_fares',
        'updated' => $updated,
        'tablesCreated' => $tablesCreated,
        'timestamp' => time()
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
        'timestamp' => time()
    ]);
}
