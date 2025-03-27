
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
    // Get the vehicle ID from the request - check all common parameter names
    $vehicleId = null;
    $possibleIdFields = ['vehicleId', 'vehicle_id', 'id', 'vehicle_type', 'vehicleType'];
    foreach ($possibleIdFields as $field) {
        if (isset($_POST[$field]) && !empty($_POST[$field])) {
            $vehicleId = $_POST[$field];
            break;
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Get the fare values from the request - check all common parameter names
    $price4hrs40km = 0;
    $possiblePrice4hrFields = ['price4hrs40km', 'package4hr40km', 'price_4hrs_40km', 'local_package_4hr'];
    foreach ($possiblePrice4hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price4hrs40km = floatval($_POST[$field]);
            break;
        }
    }
    
    $price8hrs80km = 0;
    $possiblePrice8hrFields = ['price8hrs80km', 'package8hr80km', 'price_8hrs_80km', 'local_package_8hr'];
    foreach ($possiblePrice8hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price8hrs80km = floatval($_POST[$field]);
            break;
        }
    }
    
    $price10hrs100km = 0;
    $possiblePrice10hrFields = ['price10hrs100km', 'package10hr100km', 'price_10hrs_100km', 'local_package_10hr'];
    foreach ($possiblePrice10hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price10hrs100km = floatval($_POST[$field]);
            break;
        }
    }
    
    $priceExtraKm = 0;
    $possibleExtraKmFields = ['priceExtraKm', 'extraKmRate', 'price_extra_km', 'extra_km_charge'];
    foreach ($possibleExtraKmFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $priceExtraKm = floatval($_POST[$field]);
            break;
        }
    }
    
    $priceExtraHour = 0;
    $possibleExtraHourFields = ['priceExtraHour', 'extraHourRate', 'price_extra_hour', 'extra_hour_charge'];
    foreach ($possibleExtraHourFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $priceExtraHour = floatval($_POST[$field]);
            break;
        }
    }

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
    
    // Update both tables: local_package_fares and vehicle_pricing
    $updateResults = [
        'local_package_fares' => false,
        'vehicle_pricing' => false
    ];
    
    // 1. First update the local_package_fares table
    // Check if the table exists
    $checkLocalFaresTable = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($checkLocalFaresTable && $checkLocalFaresTable->num_rows > 0) {
        // Check if vehicle exists in this table
        $checkVehicleQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkVehicleQuery);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $vehicleExistsInLocalFares = $result && $result->num_rows > 0;
        $stmt->close();
        
        if ($vehicleExistsInLocalFares) {
            // Update existing record
            $updateQuery = "
                UPDATE local_package_fares 
                SET price_4hrs_40km = ?, 
                    price_8hrs_80km = ?, 
                    price_10hrs_100km = ?, 
                    price_extra_km = ?, 
                    price_extra_hour = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $stmt = $conn->prepare($updateQuery);
            $stmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
            $updateResults['local_package_fares'] = $stmt->execute();
            $stmt->close();
        } else {
            // Insert new record
            $insertQuery = "
                INSERT INTO local_package_fares (
                    vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                    price_extra_km, price_extra_hour, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ";
            
            $stmt = $conn->prepare($insertQuery);
            $stmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
            $updateResults['local_package_fares'] = $stmt->execute();
            $stmt->close();
        }
    } else {
        // Table doesn't exist, create it
        $createTableQuery = "
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
        $conn->query($createTableQuery);
        
        // Insert the record into the newly created table
        $insertQuery = "
            INSERT INTO local_package_fares (
                vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                price_extra_km, price_extra_hour, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ";
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        $updateResults['local_package_fares'] = $stmt->execute();
        $stmt->close();
    }
    
    // 2. Now update the vehicle_pricing table for backward compatibility
    $checkVehiclePricingTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($checkVehiclePricingTable && $checkVehiclePricingTable->num_rows > 0) {
        // Check if the vehicle_id column exists in vehicle_pricing
        $checkVehicleIdCol = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
        $hasVehicleIdColumn = $checkVehicleIdCol && $checkVehicleIdCol->num_rows > 0;
        
        // Check if record exists
        $checkVehicleQuery = "";
        $checkStmt = null;
        
        if ($hasVehicleIdColumn) {
            $checkVehicleQuery = "SELECT id FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
            $checkStmt = $conn->prepare($checkVehicleQuery);
            $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
        } else {
            $checkVehicleQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
            $checkStmt = $conn->prepare($checkVehicleQuery);
            $checkStmt->bind_param("s", $vehicleId);
        }
        
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $vehicleExistsInVehiclePricing = $result && $result->num_rows > 0;
        $checkStmt->close();
        
        // IMPORTANT: Get existing outstation values to preserve them
        $getExistingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'outstation'";
        $getStmt = $conn->prepare($getExistingQuery);
        $getStmt->bind_param("s", $vehicleId);
        $getStmt->execute();
        $getResult = $getStmt->get_result();
        $existingOutstationData = $getResult->fetch_assoc();
        $getStmt->close();
        
        // Set default values for outstation data
        $baseFare = 0;
        $pricePerKm = 0;
        $nightHaltCharge = 0;
        $driverAllowance = 0;
        
        // If outstation data exists, use it
        if ($existingOutstationData) {
            $baseFare = $existingOutstationData['base_fare'] ?? 0;
            $pricePerKm = $existingOutstationData['price_per_km'] ?? 0;
            $nightHaltCharge = $existingOutstationData['night_halt_charge'] ?? 0;
            $driverAllowance = $existingOutstationData['driver_allowance'] ?? 0;
        }
        
        if ($vehicleExistsInVehiclePricing) {
            // Update existing record - make sure to ONLY update local package fields
            $updateQuery = "";
            $stmt = null;
            
            if ($hasVehicleIdColumn) {
                $updateQuery = "
                    UPDATE vehicle_pricing 
                    SET local_package_4hr = ?, 
                        local_package_8hr = ?, 
                        local_package_10hr = ?, 
                        extra_km_charge = ?, 
                        extra_hour_charge = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'
                ";
                
                $stmt = $conn->prepare($updateQuery);
                $stmt->bind_param("dddddss", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId, $vehicleId);
            } else {
                $updateQuery = "
                    UPDATE vehicle_pricing 
                    SET local_package_4hr = ?, 
                        local_package_8hr = ?, 
                        local_package_10hr = ?, 
                        extra_km_charge = ?, 
                        extra_hour_charge = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_type = ? AND trip_type = 'local'
                ";
                
                $stmt = $conn->prepare($updateQuery);
                $stmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
            }
            
            $updateResults['vehicle_pricing'] = $stmt->execute();
            $stmt->close();
        } else {
            // Insert new record - with zero-values for outstation fields to avoid confusion
            $insertQuery = "";
            $stmt = null;
            
            if ($hasVehicleIdColumn) {
                $insertQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, vehicle_type, trip_type, 
                        local_package_4hr, local_package_8hr, local_package_10hr, 
                        extra_km_charge, extra_hour_charge,
                        base_fare, price_per_km, night_halt_charge, driver_allowance,
                        created_at, updated_at
                    ) VALUES (?, ?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ";
                
                $stmt = $conn->prepare($insertQuery);
                $stmt->bind_param("ssddddddddd", $vehicleId, $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
            } else {
                $insertQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_type, trip_type, 
                        local_package_4hr, local_package_8hr, local_package_10hr, 
                        extra_km_charge, extra_hour_charge,
                        base_fare, price_per_km, night_halt_charge, driver_allowance,
                        created_at, updated_at
                    ) VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ";
                
                $stmt = $conn->prepare($insertQuery);
                $stmt->bind_param("sddddddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
            }
            
            $updateResults['vehicle_pricing'] = $stmt->execute();
            $stmt->close();
        }
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Trigger a sync operation
    $syncUrl = str_replace('direct-local-fares.php', 'admin/sync-local-fares.php', $_SERVER['PHP_SELF']);
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
             "://" . $_SERVER['HTTP_HOST'];
    $fullSyncUrl = $baseUrl . dirname($syncUrl) . '/sync-local-fares.php';
    
    try {
        $ch = curl_init($fullSyncUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $syncResponse = curl_exec($ch);
        curl_close($ch);
        error_log("Sync response: " . $syncResponse);
    } catch (Exception $e) {
        error_log("Sync error (non-critical): " . $e->getMessage());
    }
    
    // Prepare the response
    $response = [
        'success' => true,
        'message' => 'Local package fares updated successfully',
        'updateResults' => $updateResults,
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
