
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
    
    if (!$tables['local_package_fares'] || !$tables['vehicle_pricing']) {
        throw new Exception("One or more required tables don't exist");
    }
    
    // Check if vehicle_pricing has vehicle_id column
    $hasVehicleIdColumn = false;
    $result = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
    $hasVehicleIdColumn = $result->num_rows > 0;
    
    // Begin transaction
    $conn->begin_transaction();
    
    error_log("Syncing from local_package_fares to vehicle_pricing...");
    
    // Get all records from local_package_fares
    $localFares = $conn->query("SELECT * FROM local_package_fares");
    
    while ($fare = $localFares->fetch_assoc()) {
        $vehicleId = $fare['vehicle_id'];
        $price4hrs40km = $fare['price_4hrs_40km'];
        $price8hrs80km = $fare['price_8hrs_80km'];
        $price10hrs100km = $fare['price_10hrs_100km'];
        $priceExtraKm = $fare['price_extra_km'];
        $priceExtraHour = $fare['price_extra_hour'];
        
        // Check if record exists in vehicle_pricing using BOTH vehicle_id and vehicle_type
        $checkSql = "";
        $checkParams = [];
        $checkTypes = "";
        
        // Construct the query based on available columns
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
        
        if ($result->num_rows > 0) {
            // Update existing record - IMPORTANT: don't reset base_fare and other fields
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
        } else {
            // Insert new record - ONLY if no record exists
            $insertSql = "";
            $insertParams = [];
            $insertTypes = "";
            
            if ($hasVehicleIdColumn) {
                $insertSql = "INSERT INTO vehicle_pricing 
                              (vehicle_id, vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                              extra_km_charge, extra_hour_charge, created_at, updated_at)
                              VALUES (?, ?, 'local', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                $insertParams = [$vehicleId, $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour];
                $insertTypes = "ssdddd";
            } else {
                $insertSql = "INSERT INTO vehicle_pricing 
                              (vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                              extra_km_charge, extra_hour_charge, created_at, updated_at)
                              VALUES (?, 'local', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                $insertParams = [$vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour];
                $insertTypes = "sdddd";
            }
            
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param($insertTypes, ...$insertParams);
            $insertStmt->execute();
        }
    }
    
    // Now sync from vehicle_pricing to local_package_fares
    error_log("Syncing from vehicle_pricing to local_package_fares...");
    
    // Get all local records from vehicle_pricing
    $vehiclePricing = $conn->query("SELECT * FROM vehicle_pricing WHERE trip_type = 'local'");
    
    while ($pricing = $vehiclePricing->fetch_assoc()) {
        // Get the vehicle ID from either vehicle_id or vehicle_type column
        $vehicleId = isset($pricing['vehicle_id']) && !empty($pricing['vehicle_id']) ? 
                    $pricing['vehicle_id'] : $pricing['vehicle_type'];
        
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
            
            // Check if record exists in local_package_fares
            $checkStmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
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
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Tables synchronized successfully',
        'tables' => $tables,
        'hasVehicleIdColumn' => $hasVehicleIdColumn
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
        'error_trace' => $e->getTraceAsString(),
        'logs' => ['Checking if tables exist...', 'Tables check completed.', 'Syncing from local_package_fares to vehicle_pricing...']
    ]);
}
