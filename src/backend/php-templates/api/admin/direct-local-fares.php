
<?php
/**
 * This API endpoint updates local package fares for a vehicle
 * It handles the update in both local_package_fares and vehicle_pricing tables for backward compatibility
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');

// Enable detailed error logging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct local fare update request received: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] POST data: " . print_r($_POST, true), 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/direct-fares.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Get POST data - check for all possible parameter naming variations
    $vehicleId = null;
    $possibleIdFields = ['vehicleId', 'vehicle_id', 'id', 'vehicle_type', 'vehicleType'];
    foreach ($possibleIdFields as $field) {
        if (isset($_POST[$field]) && !empty($_POST[$field])) {
            $vehicleId = $_POST[$field];
            break;
        }
    }

    // If we didn't get vehicleId from POST, try to get it from JSON
    if (!$vehicleId && !empty($requestData)) {
        $jsonData = json_decode($requestData, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            foreach ($possibleIdFields as $field) {
                if (isset($jsonData[$field]) && !empty($jsonData[$field])) {
                    $vehicleId = $jsonData[$field];
                    break;
                }
            }
        }
    }

    // Check for all possible parameter naming variations for price fields
    $price4hrs40km = 0;
    $possiblePrice4hrFields = ['price4hrs40km', 'package4hr40km', 'price_4hrs_40km', 'local_package_4hr'];
    foreach ($possiblePrice4hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price4hrs40km = floatval($_POST[$field]);
            break;
        } elseif (!empty($jsonData) && isset($jsonData[$field]) && is_numeric($jsonData[$field])) {
            $price4hrs40km = floatval($jsonData[$field]);
            break;
        }
    }
    
    $price8hrs80km = 0;
    $possiblePrice8hrFields = ['price8hrs80km', 'package8hr80km', 'price_8hrs_80km', 'local_package_8hr'];
    foreach ($possiblePrice8hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price8hrs80km = floatval($_POST[$field]);
            break;
        } elseif (!empty($jsonData) && isset($jsonData[$field]) && is_numeric($jsonData[$field])) {
            $price8hrs80km = floatval($jsonData[$field]);
            break;
        }
    }
    
    $price10hrs100km = 0;
    $possiblePrice10hrFields = ['price10hrs100km', 'package10hr100km', 'price_10hrs_100km', 'local_package_10hr'];
    foreach ($possiblePrice10hrFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $price10hrs100km = floatval($_POST[$field]);
            break;
        } elseif (!empty($jsonData) && isset($jsonData[$field]) && is_numeric($jsonData[$field])) {
            $price10hrs100km = floatval($jsonData[$field]);
            break;
        }
    }
    
    $priceExtraKm = 0;
    $possibleExtraKmFields = ['priceExtraKm', 'extraKmRate', 'price_extra_km', 'extra_km_charge'];
    foreach ($possibleExtraKmFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $priceExtraKm = floatval($_POST[$field]);
            break;
        } elseif (!empty($jsonData) && isset($jsonData[$field]) && is_numeric($jsonData[$field])) {
            $priceExtraKm = floatval($jsonData[$field]);
            break;
        }
    }
    
    $priceExtraHour = 0;
    $possibleExtraHourFields = ['priceExtraHour', 'extraHourRate', 'price_extra_hour', 'extra_hour_charge'];
    foreach ($possibleExtraHourFields as $field) {
        if (isset($_POST[$field]) && is_numeric($_POST[$field])) {
            $priceExtraHour = floatval($_POST[$field]);
            break;
        } elseif (!empty($jsonData) && isset($jsonData[$field]) && is_numeric($jsonData[$field])) {
            $priceExtraHour = floatval($jsonData[$field]);
            break;
        }
    }

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details for debugging
    error_log("Updating local fares for vehicle $vehicleId: 4hrs=$price4hrs40km, 8hrs=$price8hrs80km, 10hrs=$price10hrs100km, extraKm=$priceExtraKm, extraHour=$priceExtraHour", 3, $logDir . '/direct-fares.log');

    // Begin transaction
    $conn->begin_transaction();
    $updatesPerformed = [];

    // First check if the local_package_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'local_package_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    $tableExists = $tableCheckResult && $tableCheckResult->num_rows > 0;

    if ($tableExists) {
        // Check if the vehicle already exists in the specialized table
        $checkQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
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
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param('ddddds', $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update local_package_fares: " . $conn->error);
            }
            
            $updatesPerformed[] = "Updated existing record in local_package_fares for $vehicleId";
            error_log("Updated existing record in local_package_fares for $vehicleId", 3, $logDir . '/direct-fares.log');
        } else {
            // Insert new record
            $insertQuery = "
                INSERT INTO local_package_fares (
                    vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour
                ) VALUES (?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert into local_package_fares: " . $conn->error);
            }
            
            $updatesPerformed[] = "Inserted new record in local_package_fares for $vehicleId";
            error_log("Inserted new record in local_package_fares for $vehicleId", 3, $logDir . '/direct-fares.log');
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
        
        if (!$conn->query($createTableQuery)) {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
        
        $updatesPerformed[] = "Created local_package_fares table";
        
        // Now insert the new record
        $insertQuery = "
            INSERT INTO local_package_fares (
                vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour
            ) VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert into local_package_fares: " . $conn->error);
        }
        
        $updatesPerformed[] = "Inserted new record in local_package_fares for $vehicleId";
        error_log("Created table and inserted record in local_package_fares for $vehicleId", 3, $logDir . '/direct-fares.log');
    }

    // Also check and update the vehicle_pricing table for backward compatibility
    $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
    $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

    if ($vehiclePricingExists) {
        // Get columns information for vehicle_pricing table
        $columnsQuery = "SHOW COLUMNS FROM vehicle_pricing";
        $columnsResult = $conn->query($columnsQuery);
        $hasVehicleId = false;
        $hasLocalPackage4hr = false;
        
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                if ($column['Field'] === 'vehicle_id') {
                    $hasVehicleId = true;
                }
                if ($column['Field'] === 'local_package_4hr') {
                    $hasLocalPackage4hr = true;
                }
            }
        }
        
        // Check if vehicle exists in vehicle_pricing
        $checkVpQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
        $checkVpStmt = $conn->prepare($checkVpQuery);
        $checkVpStmt->bind_param('s', $vehicleId);
        $checkVpStmt->execute();
        $checkVpResult = $checkVpStmt->get_result();
        
        if ($checkVpResult->num_rows > 0) {
            // Update existing record - only include the matching columns
            if ($hasLocalPackage4hr) {
                $updateVpQuery = "
                    UPDATE vehicle_pricing
                    SET local_package_4hr = ?,
                        local_package_8hr = ?,
                        local_package_10hr = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_type = ? AND trip_type = 'local'
                ";
                
                $updateVpStmt = $conn->prepare($updateVpQuery);
                $updateVpStmt->bind_param('ddddds', $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                
                if (!$updateVpStmt->execute()) {
                    throw new Exception("Failed to update vehicle_pricing: " . $conn->error);
                }
                
                $updatesPerformed[] = "Updated existing record in vehicle_pricing for $vehicleId";
                error_log("Updated existing record in vehicle_pricing for $vehicleId with local_package_4hr format", 3, $logDir . '/direct-fares.log');
            } else {
                // Use package4hr40km format instead
                $updateVpQuery = "
                    UPDATE vehicle_pricing
                    SET package4hr40km = ?,
                        package8hr80km = ?,
                        package10hr100km = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_type = ? AND trip_type = 'local'
                ";
                
                $updateVpStmt = $conn->prepare($updateVpQuery);
                $updateVpStmt->bind_param('ddddds', $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                
                if (!$updateVpStmt->execute()) {
                    throw new Exception("Failed to update vehicle_pricing with package4hr40km format: " . $conn->error);
                }
                
                $updatesPerformed[] = "Updated existing record in vehicle_pricing for $vehicleId (package format)";
                error_log("Updated existing record in vehicle_pricing for $vehicleId with package4hr40km format", 3, $logDir . '/direct-fares.log');
            }
        } else {
            // Insert new record - only include the matching columns
            if ($hasLocalPackage4hr) {
                $insertVpQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge
                    ) VALUES (?, 'local', ?, ?, ?, ?, ?)
                ";
                
                $insertVpStmt = $conn->prepare($insertVpQuery);
                $insertVpStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
                
                if (!$insertVpStmt->execute()) {
                    throw new Exception("Failed to insert into vehicle_pricing: " . $conn->error);
                }
                
                $updatesPerformed[] = "Inserted new record in vehicle_pricing for $vehicleId";
                error_log("Inserted new record in vehicle_pricing for $vehicleId with local_package_4hr format", 3, $logDir . '/direct-fares.log');
            } else {
                // Use package4hr40km format instead
                $insertVpQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_type, trip_type, package4hr40km, package8hr80km, package10hr100km, extra_km_charge, extra_hour_charge
                    ) VALUES (?, 'local', ?, ?, ?, ?, ?)
                ";
                
                $insertVpStmt = $conn->prepare($insertVpQuery);
                $insertVpStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
                
                if (!$insertVpStmt->execute()) {
                    throw new Exception("Failed to insert into vehicle_pricing with package4hr40km format: " . $conn->error);
                }
                
                $updatesPerformed[] = "Inserted new record in vehicle_pricing for $vehicleId (package format)";
                error_log("Inserted new record in vehicle_pricing for $vehicleId with package4hr40km format", 3, $logDir . '/direct-fares.log');
            }
        }
    } else {
        // vehicle_pricing table doesn't exist, create it with appropriate column names
        $createVpTableQuery = "
            CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_type` varchar(50) NOT NULL,
                `trip_type` enum('local','outstation','airport') NOT NULL,
                `local_package_4hr` decimal(10,2) DEFAULT '0.00',
                `local_package_8hr` decimal(10,2) DEFAULT '0.00',
                `local_package_10hr` decimal(10,2) DEFAULT '0.00',
                `base_fare` decimal(10,2) DEFAULT '0.00',
                `price_per_km` decimal(10,2) DEFAULT '0.00',
                `night_halt_charge` decimal(10,2) DEFAULT '0.00',
                `driver_allowance` decimal(10,2) DEFAULT '0.00',
                `extra_km_charge` decimal(10,2) DEFAULT '0.00',
                `extra_hour_charge` decimal(10,2) DEFAULT '0.00',
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_type_trip_type` (`vehicle_type`,`trip_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createVpTableQuery)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        $updatesPerformed[] = "Created vehicle_pricing table";
        
        // Now insert the new record
        $insertVpQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge
            ) VALUES (?, 'local', ?, ?, ?, ?, ?)
        ";
        
        $insertVpStmt = $conn->prepare($insertVpQuery);
        $insertVpStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        
        if (!$insertVpStmt->execute()) {
            throw new Exception("Failed to insert into vehicle_pricing: " . $conn->error);
        }
        
        $updatesPerformed[] = "Inserted new record in vehicle_pricing table for $vehicleId";
        error_log("Created table and inserted record in vehicle_pricing for $vehicleId", 3, $logDir . '/direct-fares.log');
    }

    // Sync the tables after updates
    try {
        // Build the sync URL based on the current script's location
        $syncUrl = dirname($_SERVER['SCRIPT_NAME']) . '/sync-local-fares.php';
        $fullSyncUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
                     "://" . $_SERVER['HTTP_HOST'] . $syncUrl;
        
        error_log("Attempting to sync tables using: $fullSyncUrl", 3, $logDir . '/direct-fares.log');
        
        $ch = curl_init($fullSyncUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $syncResult = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            $updatesPerformed[] = "Synchronized tables successfully";
            error_log("Tables sync successful: $syncResult", 3, $logDir . '/direct-fares.log');
        } else {
            error_log("Tables sync failed with HTTP code $httpCode: $syncResult", 3, $logDir . '/direct-fares.log');
            // Don't throw an exception here, just log the warning
            $updatesPerformed[] = "Warning: Tables sync attempt returned code $httpCode";
        }
    } catch (Exception $e) {
        // Just log the sync error, don't fail the entire operation
        error_log("Tables sync error: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
        $updatesPerformed[] = "Warning: Tables sync error: " . $e->getMessage();
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Successfully updated local fares for ' . $vehicleId,
        'actions' => $updatesPerformed,
        'data' => [
            'vehicle_id' => $vehicleId,
            'price_4hrs_40km' => $price4hrs40km,
            'price_8hrs_80km' => $price8hrs80km,
            'price_10hrs_100km' => $price10hrs100km,
            'price_extra_km' => $priceExtraKm,
            'price_extra_hour' => $priceExtraHour
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in direct-local-fares.php: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 3, $logDir . '/direct-fares.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
