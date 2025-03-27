
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

    // Get POST data - check for all possible parameter naming variations
    $vehicleId = null;
    $possibleIdFields = ['vehicleId', 'vehicle_id', 'id', 'vehicle_type', 'vehicleType'];
    foreach ($possibleIdFields as $field) {
        if (isset($_POST[$field]) && !empty($_POST[$field])) {
            $vehicleId = $_POST[$field];
            break;
        }
    }

    // Check for all possible parameter naming variations for price fields
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

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details for debugging
    error_log("Updating local fares for vehicle $vehicleId: 4hrs=$price4hrs40km, 8hrs=$price8hrs80km, 10hrs=$price10hrs100km, extraKm=$priceExtraKm, extraHour=$priceExtraHour");

    // Begin transaction
    $conn->begin_transaction();

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
            
            error_log("Updated existing record in local_package_fares for $vehicleId");
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
            
            error_log("Inserted new record in local_package_fares for $vehicleId");
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
        
        error_log("Created table and inserted record in local_package_fares for $vehicleId");
    }

    // Also check and update the vehicle_pricing table for backward compatibility
    $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
    $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

    if ($vehiclePricingExists) {
        // Check if vehicle exists in vehicle_pricing
        $checkVpQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
        $checkVpStmt = $conn->prepare($checkVpQuery);
        $checkVpStmt->bind_param('s', $vehicleId);
        $checkVpStmt->execute();
        $checkVpResult = $checkVpStmt->get_result();
        
        if ($checkVpResult->num_rows > 0) {
            // Update existing record
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
            
            error_log("Updated existing record in vehicle_pricing for $vehicleId");
        } else {
            // Insert new record
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
            
            error_log("Inserted new record in vehicle_pricing for $vehicleId");
        }
    } else {
        // vehicle_pricing table doesn't exist, create it with basic structure
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
        
        error_log("Created table and inserted record in vehicle_pricing for $vehicleId");
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Successfully updated local fares for ' . $vehicleId,
        'details' => [],
        'debug' => []
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in direct-local-fares.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
