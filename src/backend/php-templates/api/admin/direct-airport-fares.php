
<?php
/**
 * This API endpoint updates airport transfer fares for a vehicle
 * It handles the update in both airport_transfer_fares and vehicle_pricing tables for backward compatibility
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

    // Get POST data with multiple field name fallbacks
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
    $basePrice = isset($_POST['basePrice']) ? floatval($_POST['basePrice']) : (isset($_POST['base_price']) ? floatval($_POST['base_price']) : 0);
    $pricePerKm = isset($_POST['pricePerKm']) ? floatval($_POST['pricePerKm']) : (isset($_POST['price_per_km']) ? floatval($_POST['price_per_km']) : 0);
    $pickupPrice = isset($_POST['pickupPrice']) ? floatval($_POST['pickupPrice']) : (isset($_POST['pickup_price']) ? floatval($_POST['pickup_price']) : 0);
    $dropPrice = isset($_POST['dropPrice']) ? floatval($_POST['dropPrice']) : (isset($_POST['drop_price']) ? floatval($_POST['drop_price']) : 0);
    $tier1Price = isset($_POST['tier1Price']) ? floatval($_POST['tier1Price']) : (isset($_POST['tier1_price']) ? floatval($_POST['tier1_price']) : 0);
    $tier2Price = isset($_POST['tier2Price']) ? floatval($_POST['tier2Price']) : (isset($_POST['tier2_price']) ? floatval($_POST['tier2_price']) : 0);
    $tier3Price = isset($_POST['tier3Price']) ? floatval($_POST['tier3Price']) : (isset($_POST['tier3_price']) ? floatval($_POST['tier3_price']) : 0);
    $tier4Price = isset($_POST['tier4Price']) ? floatval($_POST['tier4Price']) : (isset($_POST['tier4_price']) ? floatval($_POST['tier4_price']) : 0);
    $extraKmCharge = isset($_POST['extraKmCharge']) ? floatval($_POST['extraKmCharge']) : (isset($_POST['extra_km_charge']) ? floatval($_POST['extra_km_charge']) : 0);

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details
    error_log("Updating airport fares for vehicle $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, pickupPrice=$pickupPrice, dropPrice=$dropPrice, tierPrices=$tier1Price/$tier2Price/$tier3Price/$tier4Price, extraKmCharge=$extraKmCharge");

    // Begin transaction
    $conn->begin_transaction();

    // First check if the airport_transfer_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    $tableExists = $tableCheckResult && $tableCheckResult->num_rows > 0;

    if ($tableExists) {
        // Check if the vehicle already exists in the specialized table
        $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateQuery = "
                UPDATE airport_transfer_fares
                SET base_price = ?,
                    price_per_km = ?,
                    pickup_price = ?,
                    drop_price = ?,
                    tier1_price = ?,
                    tier2_price = ?,
                    tier3_price = ?,
                    tier4_price = ?,
                    extra_km_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param('ddddddddds', $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge, $vehicleId);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update airport_transfer_fares: " . $conn->error);
            }
            
            error_log("Updated existing record in airport_transfer_fares for $vehicleId");
        } else {
            // Insert new record
            $insertQuery = "
                INSERT INTO airport_transfer_fares (
                    vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param('sddddddddd', $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert into airport_transfer_fares: " . $conn->error);
            }
            
            error_log("Inserted new record in airport_transfer_fares for $vehicleId");
        }
    }

    // Also update the vehicle_pricing table for backward compatibility
    $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
    $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

    if ($vehiclePricingExists) {
        // Check if the vehicle already exists in vehicle_pricing
        $checkVpQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'airport'";
        $checkVpStmt = $conn->prepare($checkVpQuery);
        $checkVpStmt->bind_param('s', $vehicleId);
        $checkVpStmt->execute();
        $checkVpResult = $checkVpStmt->get_result();
        
        if ($checkVpResult->num_rows > 0) {
            // Update existing record
            $updateVpQuery = "
                UPDATE vehicle_pricing
                SET airport_base_price = ?,
                    airport_price_per_km = ?,
                    airport_pickup_price = ?,
                    airport_drop_price = ?,
                    airport_tier1_price = ?,
                    airport_tier2_price = ?,
                    airport_tier3_price = ?,
                    airport_tier4_price = ?,
                    airport_extra_km_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_type = ? AND trip_type = 'airport'
            ";
            
            $updateVpStmt = $conn->prepare($updateVpQuery);
            $updateVpStmt->bind_param('ddddddddds', $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge, $vehicleId);
            
            if (!$updateVpStmt->execute()) {
                throw new Exception("Failed to update vehicle_pricing: " . $conn->error);
            }
            
            error_log("Updated existing record in vehicle_pricing for $vehicleId");
        } else {
            // Insert new record
            $insertVpQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_type, trip_type, airport_base_price, airport_price_per_km, 
                    airport_pickup_price, airport_drop_price, airport_tier1_price, airport_tier2_price, 
                    airport_tier3_price, airport_tier4_price, airport_extra_km_charge
                ) VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertVpStmt = $conn->prepare($insertVpQuery);
            $insertVpStmt->bind_param('sddddddddd', $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
            
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
        'message' => 'Airport transfer fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge,
            'updatedTables' => [
                'airport_transfer_fares' => $tableExists,
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
