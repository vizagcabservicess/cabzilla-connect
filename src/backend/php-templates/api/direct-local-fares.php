
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        'error' => 'Only POST requests are accepted',
        'timestamp' => time()
    ]);
    exit;
}

try {
    // Get the vehicle ID from the request
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Get the fare values from the request
    $price4hrs40km = isset($_POST['price4hrs40km']) ? floatval($_POST['price4hrs40km']) : 0;
    $price8hrs80km = isset($_POST['price8hrs80km']) ? floatval($_POST['price8hrs80km']) : 0;
    $price10hrs100km = isset($_POST['price10hrs100km']) ? floatval($_POST['price10hrs100km']) : 0;
    $priceExtraKm = isset($_POST['priceExtraKm']) ? floatval($_POST['priceExtraKm']) : 0;
    $priceExtraHour = isset($_POST['priceExtraHour']) ? floatval($_POST['priceExtraHour']) : 0;
    
    // Alternate parameter names for backward compatibility
    $price4hrs40km = $price4hrs40km ?: (isset($_POST['package4hr40km']) ? floatval($_POST['package4hr40km']) : 0);
    $price8hrs80km = $price8hrs80km ?: (isset($_POST['package8hr80km']) ? floatval($_POST['package8hr80km']) : 0);
    $price10hrs100km = $price10hrs100km ?: (isset($_POST['package10hr100km']) ? floatval($_POST['package10hr100km']) : 0);
    $priceExtraKm = $priceExtraKm ?: (isset($_POST['extraKmRate']) ? floatval($_POST['extraKmRate']) : 0);
    $priceExtraHour = $priceExtraHour ?: (isset($_POST['extraHourRate']) ? floatval($_POST['extraHourRate']) : 0);

    // Setup debug logging
    error_log("Local fares update for $vehicleId: 4hr=$price4hrs40km, 8hr=$price8hrs80km, 10hr=$price10hrs100km, extraKm=$priceExtraKm, extraHr=$priceExtraHour");
    
    // Connect to the database
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Check if the local_package_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'local_package_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $localTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // If the table doesn't exist, create it
    if (!$localTableExists) {
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT '0.00',
                `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT '0.00',
                `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT '0.00',
                `price_extra_km` decimal(10,2) NOT NULL DEFAULT '0.00',
                `price_extra_hour` decimal(10,2) NOT NULL DEFAULT '0.00',
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        $conn->query($createTableQuery);
        $localTableExists = true;
    }
    
    // Check if the vehicle exists in the local_package_fares table
    $checkVehicleQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkVehicleQuery);
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicleExists = $result && $result->num_rows > 0;
    $stmt->close();
    
    if ($vehicleExists) {
        // Update the existing record
        $query = "
            UPDATE local_package_fares 
            SET price_4hrs_40km = ?, 
                price_8hrs_80km = ?, 
                price_10hrs_100km = ?, 
                price_extra_km = ?, 
                price_extra_hour = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
    } else {
        // Insert a new record
        $query = "
            INSERT INTO local_package_fares (
                vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
    }
    
    $success = $stmt->execute();
    $stmt->close();
    
    if (!$success) {
        throw new Exception("Failed to update local package fares: " . $conn->error);
    }
    
    // Also update the vehicle_pricing table for backward compatibility
    // First, check if there's an existing 'local' record
    $checkVehiclePricingQuery = "SELECT id FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
    $stmt = $conn->prepare($checkVehiclePricingQuery);
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehiclePricingExists = $result && $result->num_rows > 0;
    $stmt->close();
    
    if ($vehiclePricingExists) {
        // Update the existing record, but ONLY update local_package fields
        $vpQuery = "
            UPDATE vehicle_pricing 
            SET local_package_4hr = ?, 
                local_package_8hr = ?, 
                local_package_10hr = ?, 
                extra_km_charge = ?, 
                extra_hour_charge = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'
        ";
        
        $stmt = $conn->prepare($vpQuery);
        $stmt->bind_param("dddddss", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId, $vehicleId);
    } else {
        // Check if vehicle_pricing has a vehicle_id column
        $checkColsQuery = "SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'";
        $checkColsResult = $conn->query($checkColsQuery);
        $hasVehicleIdCol = $checkColsResult->num_rows > 0;
        
        if ($hasVehicleIdCol) {
            $vpQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                    extra_km_charge, extra_hour_charge, created_at, updated_at
                ) VALUES (?, ?, 'local', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ";
            
            $stmt = $conn->prepare($vpQuery);
            $stmt->bind_param("ssdddd", $vehicleId, $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        } else {
            $vpQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                    extra_km_charge, extra_hour_charge, created_at, updated_at
                ) VALUES (?, 'local', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ";
            
            $stmt = $conn->prepare($vpQuery);
            $stmt->bind_param("sdddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        }
    }
    
    // Execute the vehicle_pricing update/insert
    $vpSuccess = $stmt->execute();
    $stmt->close();
    
    // Commit the transaction
    $conn->commit();
    
    // Try to sync the tables with a separate call
    try {
        $syncUrl = str_replace('direct-local-fares.php', 'admin/sync-local-fares.php', $_SERVER['PHP_SELF']);
        $fullSyncUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
                     "://" . $_SERVER['HTTP_HOST'] . $syncUrl;
        
        $ch = curl_init($fullSyncUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) {
        // Ignore sync errors, as we've already updated the primary tables
        error_log("Sync error (non-critical): " . $e->getMessage());
    }
    
    // Prepare the response
    $response = [
        'success' => true,
        'message' => 'Local package fares updated successfully',
        'localTableUpdated' => $success,
        'vehiclePricingUpdated' => $vpSuccess,
        'vehicleId' => $vehicleId,
        'fares' => [
            'price4hrs40km' => $price4hrs40km,
            'price8hrs80km' => $price8hrs80km,
            'price10hrs100km' => $price10hrs100km,
            'priceExtraKm' => $priceExtraKm,
            'priceExtraHour' => $priceExtraHour
        ],
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
