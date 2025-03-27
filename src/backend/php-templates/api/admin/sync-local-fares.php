
<?php
// sync-local-fares.php - Synchronize between local_package_fares and vehicle_pricing tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include necessary files
require_once '../../config.php';

// Initialize response
$response = [
    'status' => 'success',
    'message' => 'Sync operation completed',
    'details' => [],
    'logs' => []
];

try {
    // Connect to the database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure tables exist
    ensureTables($conn, $response);
    
    // Sync from local_package_fares to vehicle_pricing
    syncFromLocalPackageFaresToVehiclePricing($conn, $response);
    
    // Sync from vehicle_pricing to local_package_fares 
    syncFromVehiclePricingToLocalPackageFares($conn, $response);
    
    $response['message'] = "Local package fares synchronized successfully";
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['details']['error_trace'] = $e->getTraceAsString();
}

// Output the response
echo json_encode($response);
exit();

/**
 * Ensure required tables exist
 */
function ensureTables($conn, &$response) {
    $response['logs'][] = "Checking if tables exist...";
    
    // Check local_package_fares table
    $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($result->num_rows === 0) {
        $response['logs'][] = "Creating local_package_fares table...";
        
        $sql = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
            `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
            `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
            `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
            `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating local_package_fares table: " . $conn->error);
        }
        
        $response['details']['tables_created'][] = 'local_package_fares';
    }
    
    // Check vehicle_pricing table
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($result->num_rows === 0) {
        $response['logs'][] = "Creating vehicle_pricing table...";
        
        // Create vehicle_pricing table with required fields for all trip types
        $sql = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `vehicle_type` VARCHAR(50) NOT NULL,
            `trip_type` VARCHAR(50) NOT NULL,
            `base_fare` DECIMAL(10,2) DEFAULT '0.00',
            `price_per_km` DECIMAL(5,2) DEFAULT '0.00',
            `night_halt_charge` DECIMAL(10,2) DEFAULT '0.00',
            `driver_allowance` DECIMAL(10,2) DEFAULT '0.00',
            `local_package_4hr` DECIMAL(10,2) DEFAULT '0.00',
            `local_package_8hr` DECIMAL(10,2) DEFAULT '0.00',
            `local_package_10hr` DECIMAL(10,2) DEFAULT '0.00',
            `extra_km_charge` DECIMAL(5,2) DEFAULT '0.00',
            `extra_hour_charge` DECIMAL(5,2) DEFAULT '0.00',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_trip` (`vehicle_type`, `trip_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating vehicle_pricing table: " . $conn->error);
        }
        
        $response['details']['tables_created'][] = 'vehicle_pricing';
    }
    
    $response['logs'][] = "Tables check completed.";
}

/**
 * Sync data from local_package_fares to vehicle_pricing
 */
function syncFromLocalPackageFaresToVehiclePricing($conn, &$response) {
    $response['logs'][] = "Syncing from local_package_fares to vehicle_pricing...";
    
    // Get data from local_package_fares
    $query = "SELECT vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour 
              FROM local_package_fares";
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Error querying local_package_fares: " . $conn->error);
    }
    
    $synced = 0;
    while ($row = $result->fetch_assoc()) {
        // Check if record exists in vehicle_pricing
        $checkQuery = "SELECT id FROM vehicle_pricing 
                      WHERE vehicle_type = ? AND trip_type = 'local'";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $row['vehicle_id']);
        $stmt->execute();
        $checkResult = $stmt->get_result();
        $exists = $checkResult->num_rows > 0;
        $stmt->close();
        
        if ($exists) {
            // Update existing record, but only update local package fields
            $updateQuery = "UPDATE vehicle_pricing 
                          SET local_package_4hr = ?, 
                              local_package_8hr = ?, 
                              local_package_10hr = ?, 
                              extra_km_charge = ?, 
                              extra_hour_charge = ?
                          WHERE vehicle_type = ? AND trip_type = 'local'";
            
            $stmt = $conn->prepare($updateQuery);
            $stmt->bind_param(
                "ddddds",
                $row['price_4hrs_40km'],
                $row['price_8hrs_80km'],
                $row['price_10hrs_100km'],
                $row['price_extra_km'],
                $row['price_extra_hour'],
                $row['vehicle_id']
            );
        } else {
            // Insert new record
            $insertQuery = "INSERT INTO vehicle_pricing 
                          (vehicle_type, trip_type, local_package_4hr, local_package_8hr, 
                           local_package_10hr, extra_km_charge, extra_hour_charge)
                          VALUES (?, 'local', ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertQuery);
            $stmt->bind_param(
                "sddddd",
                $row['vehicle_id'],
                $row['price_4hrs_40km'],
                $row['price_8hrs_80km'],
                $row['price_10hrs_100km'],
                $row['price_extra_km'],
                $row['price_extra_hour']
            );
        }
        
        if ($stmt->execute()) {
            $synced++;
        } else {
            $response['logs'][] = "Error syncing vehicle: " . $row['vehicle_id'] . " - " . $stmt->error;
        }
        
        $stmt->close();
    }
    
    $response['details']['synced_from_local_package_fares'] = $synced;
    $response['logs'][] = "Synced $synced records from local_package_fares to vehicle_pricing.";
}

/**
 * Sync data from vehicle_pricing to local_package_fares
 */
function syncFromVehiclePricingToLocalPackageFares($conn, &$response) {
    $response['logs'][] = "Syncing from vehicle_pricing to local_package_fares...";
    
    // Get data from vehicle_pricing for local trip types
    $query = "SELECT vehicle_type, local_package_4hr, local_package_8hr, local_package_10hr, 
              extra_km_charge, extra_hour_charge 
              FROM vehicle_pricing 
              WHERE trip_type = 'local'";
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Error querying vehicle_pricing: " . $conn->error);
    }
    
    $synced = 0;
    while ($row = $result->fetch_assoc()) {
        // Check if record exists in local_package_fares
        $checkQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $row['vehicle_type']);
        $stmt->execute();
        $checkResult = $stmt->get_result();
        $exists = $checkResult->num_rows > 0;
        $stmt->close();
        
        if ($exists) {
            // Update existing record
            $updateQuery = "UPDATE local_package_fares 
                          SET price_4hrs_40km = ?, 
                              price_8hrs_80km = ?, 
                              price_10hrs_100km = ?, 
                              price_extra_km = ?, 
                              price_extra_hour = ?
                          WHERE vehicle_id = ?";
            
            $stmt = $conn->prepare($updateQuery);
            $stmt->bind_param(
                "ddddds",
                $row['local_package_4hr'],
                $row['local_package_8hr'],
                $row['local_package_10hr'],
                $row['extra_km_charge'],
                $row['extra_hour_charge'],
                $row['vehicle_type']
            );
        } else {
            // Insert new record
            $insertQuery = "INSERT INTO local_package_fares 
                          (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                           price_extra_km, price_extra_hour)
                          VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertQuery);
            $stmt->bind_param(
                "sddddd",
                $row['vehicle_type'],
                $row['local_package_4hr'],
                $row['local_package_8hr'],
                $row['local_package_10hr'],
                $row['extra_km_charge'],
                $row['extra_hour_charge']
            );
        }
        
        if ($stmt->execute()) {
            $synced++;
        } else {
            $response['logs'][] = "Error syncing vehicle: " . $row['vehicle_type'] . " - " . $stmt->error;
        }
        
        $stmt->close();
    }
    
    $response['details']['synced_from_vehicle_pricing'] = $synced;
    $response['logs'][] = "Synced $synced records from vehicle_pricing to local_package_fares.";
}
