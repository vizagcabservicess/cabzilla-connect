
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
header('Expires: '0');

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
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Determine the sync direction
    $source = isset($_GET['source']) ? $_GET['source'] : 'outstation_fares';
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $forceCreate = isset($_GET['force_create']) && $_GET['force_create'] === 'true';
    $verbose = isset($_GET['verbose']) && $_GET['verbose'] === 'true';
    
    // Log the operation
    error_log("Starting sync operation with source: $source, vehicle_id: " . ($vehicleId ?: 'all') . ", force_create: " . ($forceCreate ? 'true' : 'false'));
    
    // Start transaction with retry mechanism
    $retries = 3;
    $transactionStarted = false;
    
    while ($retries > 0 && !$transactionStarted) {
        try {
            $conn->begin_transaction();
            $transactionStarted = true;
        } catch (Exception $e) {
            $retries--;
            if ($retries <= 0) {
                throw new Exception("Failed to start transaction after multiple attempts: " . $e->getMessage());
            }
            sleep(1); // Wait 1 second before retrying
        }
    }
    
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
    $errorDetails = [];
    
    if ($source === 'outstation_fares') {
        // Sync from outstation_fares to vehicle_pricing
        
        // First one-way prices
        $syncQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 
                'outstation-one-way', 
                of.base_price, 
                of.price_per_km, 
                of.night_halt_charge, 
                of.driver_allowance, 
                CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            WHERE 1=1
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncQuery .= " AND of.vehicle_id = '$vehicleId'";
        }
        
        $syncQuery .= "
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        try {
            $syncResult = $conn->query($syncQuery);
            if (!$syncResult) {
                $errorDetails[] = "Failed to sync one-way fares: " . $conn->error;
            } else {
                $updated += $conn->affected_rows;
            }
        } catch (Exception $e) {
            $errorDetails[] = "Exception syncing one-way fares: " . $e->getMessage();
        }
        
        // Also for generic 'outstation' type
        $syncQueryGeneric = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 
                'outstation', 
                of.base_price, 
                of.price_per_km, 
                of.night_halt_charge, 
                of.driver_allowance, 
                CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            WHERE 1=1
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncQueryGeneric .= " AND of.vehicle_id = '$vehicleId'";
        }
        
        $syncQueryGeneric .= "
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        try {
            $syncGenericResult = $conn->query($syncQueryGeneric);
            if (!$syncGenericResult) {
                $errorDetails[] = "Failed to sync generic outstation fares: " . $conn->error;
            } else {
                $updated += $conn->affected_rows;
            }
        } catch (Exception $e) {
            $errorDetails[] = "Exception syncing generic outstation fares: " . $e->getMessage();
        }
        
        // Then round-trip prices
        $syncRtQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            )
            SELECT 
                of.vehicle_id, 
                'outstation-round-trip', 
                of.roundtrip_base_price, 
                of.roundtrip_price_per_km, 
                of.night_halt_charge, 
                of.driver_allowance, 
                CURRENT_TIMESTAMP
            FROM 
                outstation_fares of
            WHERE 1=1
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncRtQuery .= " AND of.vehicle_id = '$vehicleId'";
        }
        
        $syncRtQuery .= "
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        try {
            $syncRtResult = $conn->query($syncRtQuery);
            if (!$syncRtResult) {
                $errorDetails[] = "Failed to sync round-trip fares: " . $conn->error;
            } else {
                $updated += $conn->affected_rows;
            }
        } catch (Exception $e) {
            $errorDetails[] = "Exception syncing round-trip fares: " . $e->getMessage();
        }
        
        error_log("Synced $updated records from outstation_fares to vehicle_pricing");
    } else {
        // Sync from vehicle_pricing to outstation_fares
        
        // Process each vehicle in vehicle_pricing with outstation trip types
        $getVehiclesQuery = "
            SELECT DISTINCT vehicle_id 
            FROM vehicle_pricing 
            WHERE trip_type LIKE 'outstation%'
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $getVehiclesQuery .= " AND vehicle_id = '$vehicleId'";
        }
        
        try {
            $vehiclesResult = $conn->query($getVehiclesQuery);
            if (!$vehiclesResult) {
                $errorDetails[] = "Failed to get vehicles: " . $conn->error;
            } else {
                while ($vehicleRow = $vehiclesResult->fetch_assoc()) {
                    $vId = $vehicleRow['vehicle_id'];
                    
                    // Get one-way outstation pricing
                    $getOneWayQuery = "
                        SELECT base_fare, price_per_km, night_halt_charge, driver_allowance
                        FROM vehicle_pricing 
                        WHERE vehicle_id = '$vId' AND (trip_type = 'outstation' OR trip_type = 'outstation-one-way')
                        ORDER BY CASE 
                            WHEN trip_type = 'outstation-one-way' THEN 1
                            WHEN trip_type = 'outstation' THEN 2
                            ELSE 3
                        END
                        LIMIT 1
                    ";
                    
                    $onewayPricing = null;
                    $roundtripPricing = null;
                    
                    $onewayResult = $conn->query($getOneWayQuery);
                    if ($onewayResult && $onewayResult->num_rows > 0) {
                        $onewayPricing = $onewayResult->fetch_assoc();
                    }
                    
                    // Get round-trip pricing
                    $getRoundtripQuery = "
                        SELECT base_fare, price_per_km, night_halt_charge, driver_allowance
                        FROM vehicle_pricing 
                        WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
                        LIMIT 1
                    ";
                    
                    $roundtripResult = $conn->query($getRoundtripQuery);
                    if ($roundtripResult && $roundtripResult->num_rows > 0) {
                        $roundtripPricing = $roundtripResult->fetch_assoc();
                    }
                    
                    // Only proceed if we have at least one-way pricing
                    if ($onewayPricing) {
                        $basePrice = $onewayPricing['base_fare'];
                        $pricePerKm = $onewayPricing['price_per_km'];
                        $nightHaltCharge = $onewayPricing['night_halt_charge'];
                        $driverAllowance = $onewayPricing['driver_allowance'];
                        
                        // Set default roundtrip pricing if not available
                        $roundtripBasePrice = $roundtripPricing ? $roundtripPricing['base_fare'] : ($basePrice * 0.95);
                        $roundtripPricePerKm = $roundtripPricing ? $roundtripPricing['price_per_km'] : ($pricePerKm * 0.85);
                        
                        // Upsert to outstation_fares table
                        $upsertQuery = "
                            INSERT INTO outstation_fares (
                                vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                                roundtrip_base_price, roundtrip_price_per_km, updated_at
                            ) VALUES (
                                '$vId', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance,
                                $roundtripBasePrice, $roundtripPricePerKm, CURRENT_TIMESTAMP
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
                        
                        if ($conn->query($upsertQuery)) {
                            $updated++;
                        } else {
                            $errorDetails[] = "Failed to upsert outstation fares for vehicle $vId: " . $conn->error;
                        }
                    }
                }
            }
        } catch (Exception $e) {
            $errorDetails[] = "Exception processing vehicles: " . $e->getMessage();
        }
        
        error_log("Synced $updated records from vehicle_pricing to outstation_fares");
    }
    
    // Commit the transaction
    if ($conn->commit()) {
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => "Successfully synced $updated records between outstation_fares and vehicle_pricing",
            'direction' => $source === 'outstation_fares' ? 'outstation_fares → vehicle_pricing' : 'vehicle_pricing → outstation_fares',
            'updated' => $updated,
            'tablesCreated' => $tablesCreated,
            'timestamp' => time(),
            'errors' => $errorDetails,
            'verbose' => $verbose ? true : false,
            'source' => $source,
            'vehicleId' => $vehicleId
        ]);
    } else {
        throw new Exception("Failed to commit transaction: " . $conn->error);
    }
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackException) {
            error_log("Error during rollback: " . $rollbackException->getMessage());
        }
    }
    
    error_log("Error in sync-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => 'sync-outstation-fares.php',
        'trace' => $e->getTraceAsString()
    ]);
}
