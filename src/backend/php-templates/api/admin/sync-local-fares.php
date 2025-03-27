
<?php
/**
 * This script synchronizes data between local_package_fares and vehicle_pricing tables
 * It handles different column name variations between tables
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');

try {
    // Get database connection
    $conn = getDbConnection();
    
    // Log start of sync process
    error_log("Starting sync between local_package_fares and vehicle_pricing tables");
    
    // First check if tables exist
    error_log("Checking if tables exist...");
    $tables = [];
    $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $tables['local_package_fares'] = $result->num_rows > 0;
    
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $tables['vehicle_pricing'] = $result->num_rows > 0;
    
    error_log("Tables check completed.");
    
    if (!$tables['local_package_fares'] && !$tables['vehicle_pricing']) {
        throw new Exception("None of the required tables exist");
    }
    
    // Create tables if they don't exist
    if (!$tables['local_package_fares']) {
        $createLocalFaresTable = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
                `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createLocalFaresTable);
        $tables['local_package_fares'] = true;
        error_log("Created local_package_fares table");
    }
    
    // Check if vehicle_pricing has vehicle_id column
    $hasVehicleIdColumn = false;
    if ($tables['vehicle_pricing']) {
        $result = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
        $hasVehicleIdColumn = $result->num_rows > 0;
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    $syncedIds = [];
    $syncResults = [
        'localToVehiclePricing' => 0,
        'vehiclePricingToLocal' => 0,
        'errors' => []
    ];
    
    // Only attempt sync if both tables exist
    if ($tables['local_package_fares'] && $tables['vehicle_pricing']) {
        error_log("Starting bi-directional sync between tables...");
        
        // 1. First sync from local_package_fares to vehicle_pricing
        error_log("Syncing from local_package_fares to vehicle_pricing...");
        
        // Get all records from local_package_fares
        $localFares = $conn->query("SELECT * FROM local_package_fares");
        
        while ($fare = $localFares->fetch_assoc()) {
            $vehicleId = $fare['vehicle_id'];
            $syncedIds[$vehicleId] = true;
            
            $price4hrs40km = $fare['price_4hrs_40km'];
            $price8hrs80km = $fare['price_8hrs_80km'];
            $price10hrs100km = $fare['price_10hrs_100km'];
            $priceExtraKm = $fare['price_extra_km'];
            $priceExtraHour = $fare['price_extra_hour'];
            
            // Check if record exists in vehicle_pricing using vehicle_id or vehicle_type
            $checkSql = "";
            $checkParams = [];
            $checkTypes = "";
            
            if ($hasVehicleIdColumn) {
                $checkSql = "SELECT * FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
                $checkParams = [$vehicleId, $vehicleId];
                $checkTypes = "ss";
            } else {
                $checkSql = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
                $checkParams = [$vehicleId];
                $checkTypes = "s";
            }
            
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param($checkTypes, ...$checkParams);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            $vpExists = $result->num_rows > 0;
            $vpData = $vpExists ? $result->fetch_assoc() : null;
            
            // Get existing outstation data to preserve it
            $existingOutstationData = null;
            if ($vpExists && $vpData['trip_type'] === 'local') {
                $outQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'outstation'";
                $outStmt = $conn->prepare($outQuery);
                $outStmt->bind_param("s", $vehicleId);
                $outStmt->execute();
                $outResult = $outStmt->get_result();
                $existingOutstationData = $outResult->fetch_assoc();
            }
            
            // Get outstation values to preserve
            $baseFare = $existingOutstationData ? ($existingOutstationData['base_fare'] ?? 0) : 0;
            $pricePerKm = $existingOutstationData ? ($existingOutstationData['price_per_km'] ?? 0) : 0;
            $nightHaltCharge = $existingOutstationData ? ($existingOutstationData['night_halt_charge'] ?? 0) : 0;
            $driverAllowance = $existingOutstationData ? ($existingOutstationData['driver_allowance'] ?? 0) : 0;
            
            try {
                if ($vpExists) {
                    // Update existing record - IMPORTANT: don't reset outstation-specific fields
                    $updateSql = "";
                    $updateParams = [];
                    $updateTypes = "";
                    
                    if ($hasVehicleIdColumn) {
                        $updateSql = "UPDATE vehicle_pricing 
                                    SET local_package_4hr = ?, 
                                        local_package_8hr = ?, 
                                        local_package_10hr = ?, 
                                        extra_km_charge = ?, 
                                        extra_hour_charge = ?,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
                        $updateParams = [$price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId, $vehicleId];
                        $updateTypes = "dddddss";
                    } else {
                        $updateSql = "UPDATE vehicle_pricing 
                                    SET local_package_4hr = ?, 
                                        local_package_8hr = ?, 
                                        local_package_10hr = ?, 
                                        extra_km_charge = ?, 
                                        extra_hour_charge = ?,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE vehicle_type = ? AND trip_type = 'local'";
                        $updateParams = [$price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId];
                        $updateTypes = "ddddds";
                    }
                    
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->bind_param($updateTypes, ...$updateParams);
                    $updateStmt->execute();
                    $syncResults['localToVehiclePricing']++;
                } else {
                    // Insert new record - USE existing outstation values if available
                    $insertSql = "";
                    $insertParams = [];
                    $insertTypes = "";
                    
                    if ($hasVehicleIdColumn) {
                        $insertSql = "INSERT INTO vehicle_pricing 
                                    (vehicle_id, vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                                    extra_km_charge, extra_hour_charge, base_fare, price_per_km, night_halt_charge, driver_allowance, 
                                    created_at, updated_at)
                                    VALUES (?, ?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                        $insertParams = [$vehicleId, $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, 
                                        $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance];
                        $insertTypes = "ssdddddddd";
                    } else {
                        $insertSql = "INSERT INTO vehicle_pricing 
                                    (vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                                    extra_km_charge, extra_hour_charge, base_fare, price_per_km, night_halt_charge, driver_allowance, 
                                    created_at, updated_at)
                                    VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                        $insertParams = [$vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, 
                                        $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance];
                        $insertTypes = "sddddddddd";
                    }
                    
                    $insertStmt = $conn->prepare($insertSql);
                    $insertStmt->bind_param($insertTypes, ...$insertParams);
                    $insertStmt->execute();
                    $syncResults['localToVehiclePricing']++;
                }
            } catch (Exception $e) {
                $syncResults['errors'][] = [
                    'table' => 'local_to_vehicle_pricing',
                    'vehicle_id' => $vehicleId,
                    'error' => $e->getMessage()
                ];
                error_log("Error syncing $vehicleId from local_package_fares to vehicle_pricing: " . $e->getMessage());
            }
        }
        
        // 2. Now sync from vehicle_pricing to local_package_fares
        error_log("Syncing from vehicle_pricing to local_package_fares...");
        
        // Get all local records from vehicle_pricing
        $vehiclePricing = $conn->query("SELECT * FROM vehicle_pricing WHERE trip_type = 'local'");
        
        while ($pricing = $vehiclePricing->fetch_assoc()) {
            // Get the vehicle ID from either vehicle_id or vehicle_type column
            $vehicleId = isset($pricing['vehicle_id']) && !empty($pricing['vehicle_id']) ? 
                        $pricing['vehicle_id'] : $pricing['vehicle_type'];
            
            // Skip if already processed
            if (isset($syncedIds[$vehicleId])) {
                continue;
            }
            
            // Mark as processed
            $syncedIds[$vehicleId] = true;
            
            // Only proceed if we have package prices
            if (
                (isset($pricing['local_package_4hr']) && $pricing['local_package_4hr'] > 0) ||
                (isset($pricing['local_package_8hr']) && $pricing['local_package_8hr'] > 0) ||
                (isset($pricing['local_package_10hr']) && $pricing['local_package_10hr'] > 0)
            ) {
                $price4hrs40km = isset($pricing['local_package_4hr']) ? $pricing['local_package_4hr'] : 0;
                $price8hrs80km = isset($pricing['local_package_8hr']) ? $pricing['local_package_8hr'] : 0;
                $price10hrs100km = isset($pricing['local_package_10hr']) ? $pricing['local_package_10hr'] : 0;
                $priceExtraKm = isset($pricing['extra_km_charge']) ? $pricing['extra_km_charge'] : 0;
                $priceExtraHour = isset($pricing['extra_hour_charge']) ? $pricing['extra_hour_charge'] : 0;
                
                try {
                    // Check if record exists in local_package_fares
                    $checkStmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $result = $checkStmt->get_result();
                    $lpfExists = $result->num_rows > 0;
                    
                    if ($lpfExists) {
                        // Update existing record
                        $updateStmt = $conn->prepare("UPDATE local_package_fares 
                                                    SET price_4hrs_40km = ?, 
                                                        price_8hrs_80km = ?, 
                                                        price_10hrs_100km = ?, 
                                                        price_extra_km = ?, 
                                                        price_extra_hour = ?,
                                                        updated_at = CURRENT_TIMESTAMP
                                                    WHERE vehicle_id = ?");
                        $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                        $updateStmt->execute();
                    } else {
                        // Insert new record
                        $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                                                    (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                                                    price_extra_km, price_extra_hour, created_at, updated_at)
                                                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
                        $insertStmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
                        $insertStmt->execute();
                    }
                    
                    $syncResults['vehiclePricingToLocal']++;
                } catch (Exception $e) {
                    $syncResults['errors'][] = [
                        'table' => 'vehicle_pricing_to_local',
                        'vehicle_id' => $vehicleId,
                        'error' => $e->getMessage()
                    ];
                    error_log("Error syncing $vehicleId from vehicle_pricing to local_package_fares: " . $e->getMessage());
                }
            }
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Tables synchronized successfully',
        'tables' => $tables,
        'hasVehicleIdColumn' => $hasVehicleIdColumn,
        'syncResults' => $syncResults,
        'vehiclesProcessed' => count($syncedIds),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if an error occurred
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error syncing tables: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'error_trace' => $e->getTraceAsString()
    ]);
}
