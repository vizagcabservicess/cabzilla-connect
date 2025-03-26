
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

    // Get POST data
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
    $price4hrs40km = isset($_POST['price4hrs40km']) ? floatval($_POST['price4hrs40km']) : (isset($_POST['price_4hrs_40km']) ? floatval($_POST['price_4hrs_40km']) : 0);
    $price8hrs80km = isset($_POST['price8hrs80km']) ? floatval($_POST['price8hrs80km']) : (isset($_POST['price_8hrs_80km']) ? floatval($_POST['price_8hrs_80km']) : 0);
    $price10hrs100km = isset($_POST['price10hrs100km']) ? floatval($_POST['price10hrs100km']) : (isset($_POST['price_10hrs_100km']) ? floatval($_POST['price_10hrs_100km']) : 0);
    $priceExtraKm = isset($_POST['priceExtraKm']) ? floatval($_POST['priceExtraKm']) : (isset($_POST['price_extra_km']) ? floatval($_POST['price_extra_km']) : 0);
    $priceExtraHour = isset($_POST['priceExtraHour']) ? floatval($_POST['priceExtraHour']) : (isset($_POST['price_extra_hour']) ? floatval($_POST['price_extra_hour']) : 0);

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details
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
    }

    // Also update the vehicle_pricing table for backward compatibility
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
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Local package fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'price4hrs40km' => $price4hrs40km,
            'price8hrs80km' => $price8hrs80km,
            'price10hrs100km' => $price10hrs100km,
            'priceExtraKm' => $priceExtraKm,
            'priceExtraHour' => $priceExtraHour,
            'updatedTables' => [
                'local_package_fares' => $tableExists,
                'vehicle_pricing' => $vehiclePricingExists
            ]
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
