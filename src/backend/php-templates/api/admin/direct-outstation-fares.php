
<?php
/**
 * This API endpoint updates outstation fares for a vehicle
 * It handles the update in both outstation_fares and vehicle_pricing tables for backward compatibility
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.2');

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
    $nightHalt = isset($_POST['nightHalt']) ? floatval($_POST['nightHalt']) : (isset($_POST['nightHaltCharge']) ? floatval($_POST['nightHaltCharge']) : (isset($_POST['night_halt_charge']) ? floatval($_POST['night_halt_charge']) : 0));
    $driverAllowance = isset($_POST['driverAllowance']) ? floatval($_POST['driverAllowance']) : (isset($_POST['driver_allowance']) ? floatval($_POST['driver_allowance']) : 0);
    $roundTripBasePrice = isset($_POST['roundTripBasePrice']) ? floatval($_POST['roundTripBasePrice']) : (isset($_POST['roundtrip_base_price']) ? floatval($_POST['roundtrip_base_price']) : 0);
    $roundTripPricePerKm = isset($_POST['roundTripPricePerKm']) ? floatval($_POST['roundTripPricePerKm']) : (isset($_POST['roundtrip_price_per_km']) ? floatval($_POST['roundtrip_price_per_km']) : 0);

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details
    error_log("Updating outstation fares for vehicle $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, nightHalt=$nightHalt, driverAllowance=$driverAllowance, roundTripBasePrice=$roundTripBasePrice, roundTripPricePerKm=$roundTripPricePerKm");

    // Begin transaction
    $conn->begin_transaction();

    // ALWAYS update outstation_fares table first - it's our primary source
    // Check if the vehicle already exists in the specialized table
    $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Update existing record
        $updateQuery = "
            UPDATE outstation_fares
            SET base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                roundtrip_base_price = ?,
                roundtrip_price_per_km = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param('dddddds', $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm, $vehicleId);
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update outstation_fares: " . $conn->error);
        }
        
        error_log("Updated existing record in outstation_fares for $vehicleId");
    } else {
        // Insert new record
        $insertQuery = "
            INSERT INTO outstation_fares (
                vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sdddddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm);
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert into outstation_fares: " . $conn->error);
        }
        
        error_log("Inserted new record in outstation_fares for $vehicleId");
    }

    // Also update the vehicle_pricing table for backward compatibility
    $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
    $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

    if ($vehiclePricingExists) {
        // First update the one-way fares
        $checkOneWayQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND (trip_type = 'outstation-one-way' OR trip_type = 'outstation')";
        $checkOneWayStmt = $conn->prepare($checkOneWayQuery);
        $checkOneWayStmt->bind_param('s', $vehicleId);
        $checkOneWayStmt->execute();
        $checkOneWayResult = $checkOneWayStmt->get_result();
        
        if ($checkOneWayResult->num_rows > 0) {
            // Update existing one-way record
            $updateOneWayQuery = "
                UPDATE vehicle_pricing
                SET base_fare = ?,
                    price_per_km = ?,
                    night_halt_charge = ?,
                    driver_allowance = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ? AND (trip_type = 'outstation-one-way' OR trip_type = 'outstation')
            ";
            
            $updateOneWayStmt = $conn->prepare($updateOneWayQuery);
            $updateOneWayStmt->bind_param('dddds', $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $vehicleId);
            
            if (!$updateOneWayStmt->execute()) {
                throw new Exception("Failed to update vehicle_pricing one-way: " . $conn->error);
            }
            
            error_log("Updated existing one-way record in vehicle_pricing for $vehicleId");
        } else {
            // Insert new one-way record
            $insertOneWayQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance
                ) VALUES (?, 'outstation-one-way', ?, ?, ?, ?)
            ";
            
            $insertOneWayStmt = $conn->prepare($insertOneWayQuery);
            $insertOneWayStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance);
            
            if (!$insertOneWayStmt->execute()) {
                throw new Exception("Failed to insert into vehicle_pricing one-way: " . $conn->error);
            }
            
            error_log("Inserted new one-way record in vehicle_pricing for $vehicleId");
        }
        
        // Now update the round-trip fares
        $checkRoundTripQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'";
        $checkRoundTripStmt = $conn->prepare($checkRoundTripQuery);
        $checkRoundTripStmt->bind_param('s', $vehicleId);
        $checkRoundTripStmt->execute();
        $checkRoundTripResult = $checkRoundTripStmt->get_result();
        
        if ($checkRoundTripResult->num_rows > 0) {
            // Update existing round-trip record
            $updateRoundTripQuery = "
                UPDATE vehicle_pricing
                SET base_fare = ?,
                    price_per_km = ?,
                    night_halt_charge = ?,
                    driver_allowance = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'
            ";
            
            $updateRoundTripStmt = $conn->prepare($updateRoundTripQuery);
            $updateRoundTripStmt->bind_param('dddds', $roundTripBasePrice, $roundTripPricePerKm, $nightHalt, $driverAllowance, $vehicleId);
            
            if (!$updateRoundTripStmt->execute()) {
                throw new Exception("Failed to update vehicle_pricing round-trip: " . $conn->error);
            }
            
            error_log("Updated existing round-trip record in vehicle_pricing for $vehicleId");
        } else if ($roundTripBasePrice > 0) {
            // Insert new round-trip record only if we have round trip pricing
            $insertRoundTripQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance
                ) VALUES (?, 'outstation-round-trip', ?, ?, ?, ?)
            ";
            
            $insertRoundTripStmt = $conn->prepare($insertRoundTripQuery);
            $insertRoundTripStmt->bind_param('sdddd', $vehicleId, $roundTripBasePrice, $roundTripPricePerKm, $nightHalt, $driverAllowance);
            
            if (!$insertRoundTripStmt->execute()) {
                throw new Exception("Failed to insert into vehicle_pricing round-trip: " . $conn->error);
            }
            
            error_log("Inserted new round-trip record in vehicle_pricing for $vehicleId");
        }
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHalt,
            'driverAllowance' => $driverAllowance,
            'roundTripBasePrice' => $roundTripBasePrice,
            'roundTripPricePerKm' => $roundTripPricePerKm,
            'updatedTables' => [
                'outstation_fares' => true,
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
