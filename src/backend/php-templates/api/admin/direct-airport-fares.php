
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

// Log all received data for debugging
$rawInput = file_get_contents('php://input');
$postData = $_POST;
error_log("Direct airport fares raw input: " . $rawInput);
error_log("Direct airport fares POST data: " . print_r($postData, true));

try {
    // Get database connection
    $conn = getDbConnection();

    // Parse JSON input if content-type is application/json
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $data = [];
    
    if (strpos($contentType, 'application/json') !== false) {
        $jsonInput = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $data = $jsonInput;
        } else {
            error_log("JSON parsing error: " . json_last_error_msg());
        }
    } else {
        // Use POST data
        $data = $_POST;
    }
    
    // Get vehicleId from multiple possible sources and formats
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type'];
    
    foreach ($possibleKeys as $key) {
        if (isset($data[$key]) && !empty($data[$key])) {
            $vehicleId = $data[$key];
            break;
        }
    }
    
    // Try to get from URL parameters if not found in post data
    if (!$vehicleId && isset($_GET['vehicleId'])) {
        $vehicleId = $_GET['vehicleId'];
    }
    
    // Clean up vehicle ID if it has a prefix like 'item-'
    if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Further debug logging for vehicle ID
    error_log("Final vehicleId determined: " . ($vehicleId ?: 'NOT FOUND'));
    
    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required. Please check your request and ensure a valid vehicle ID is provided.');
    }

    // Get POST data with multiple field name fallbacks
    $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : (isset($data['base_price']) ? floatval($data['base_price']) : 0);
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : (isset($data['price_per_km']) ? floatval($data['price_per_km']) : 0);
    $pickupPrice = isset($data['pickupPrice']) ? floatval($data['pickupPrice']) : (isset($data['pickup_price']) ? floatval($data['pickup_price']) : 0);
    $dropPrice = isset($data['dropPrice']) ? floatval($data['dropPrice']) : (isset($data['drop_price']) ? floatval($data['drop_price']) : 0);
    $tier1Price = isset($data['tier1Price']) ? floatval($data['tier1Price']) : (isset($data['tier1_price']) ? floatval($data['tier1_price']) : 0);
    $tier2Price = isset($data['tier2Price']) ? floatval($data['tier2Price']) : (isset($data['tier2_price']) ? floatval($data['tier2_price']) : 0);
    $tier3Price = isset($data['tier3Price']) ? floatval($data['tier3Price']) : (isset($data['tier3_price']) ? floatval($data['tier3_price']) : 0);
    $tier4Price = isset($data['tier4Price']) ? floatval($data['tier4Price']) : (isset($data['tier4_price']) ? floatval($data['tier4_price']) : 0);
    $extraKmCharge = isset($data['extraKmCharge']) ? floatval($data['extraKmCharge']) : (isset($data['extra_km_charge']) ? floatval($data['extra_km_charge']) : 0);

    // Log the request details
    error_log("Updating airport fares for vehicle $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, pickupPrice=$pickupPrice, dropPrice=$dropPrice, tierPrices=$tier1Price/$tier2Price/$tier3Price/$tier4Price, extraKmCharge=$extraKmCharge");

    // Begin transaction
    $conn->begin_transaction();

    // First check if the airport_transfer_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    $tableExists = $tableCheckResult && $tableCheckResult->num_rows > 0;

    if (!$tableExists) {
        // Create the table if it doesn't exist
        $conn->query("
            CREATE TABLE airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $tableExists = true;
        error_log("Created airport_transfer_fares table");
    }

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

    if (!$vehiclePricingExists) {
        // Create the vehicle_pricing table if it doesn't exist
        $conn->query("
            CREATE TABLE vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL DEFAULT 'outstation',
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                airport_base_price DECIMAL(10,2) DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) DEFAULT 0,
                airport_drop_price DECIMAL(10,2) DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $vehiclePricingExists = true;
        error_log("Created vehicle_pricing table");
    }

    if ($vehiclePricingExists) {
        // Check if the vehicle already exists in vehicle_pricing with 'airport' trip_type
        $checkVpQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
        $checkVpStmt = $conn->prepare($checkVpQuery);
        $checkVpStmt->bind_param('s', $vehicleId);
        $checkVpStmt->execute();
        $checkVpResult = $checkVpStmt->get_result();
        
        if ($checkVpResult->num_rows > 0) {
            // Update existing record
            $updateVpQuery = "
                UPDATE vehicle_pricing
                SET base_fare = ?,
                    price_per_km = ?,
                    airport_base_price = ?,
                    airport_price_per_km = ?,
                    airport_pickup_price = ?,
                    airport_drop_price = ?,
                    airport_tier1_price = ?,
                    airport_tier2_price = ?,
                    airport_tier3_price = ?,
                    airport_tier4_price = ?,
                    airport_extra_km_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ? AND trip_type = 'airport'
            ";
            
            $updateVpStmt = $conn->prepare($updateVpQuery);
            $updateVpStmt->bind_param('ddddddddddds', $basePrice, $pricePerKm, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge, $vehicleId);
            
            if (!$updateVpStmt->execute()) {
                throw new Exception("Failed to update vehicle_pricing: " . $conn->error);
            }
            
            error_log("Updated existing record in vehicle_pricing for $vehicleId");
        } else {
            // Insert new record
            $insertVpQuery = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, 
                    airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price, 
                    airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                    airport_extra_km_charge
                ) VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertVpStmt = $conn->prepare($insertVpQuery);
            $insertVpStmt->bind_param('sddddddddddd', $vehicleId, $basePrice, $pricePerKm, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
            
            if (!$insertVpStmt->execute()) {
                throw new Exception("Failed to insert into vehicle_pricing: " . $conn->error);
            }
            
            error_log("Inserted new record in vehicle_pricing for $vehicleId");
        }
    }
    
    // Check if vehicle exists in vehicle_types table, insert if not
    $checkVehicleTypeQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $checkVehicleTypeStmt = $conn->prepare($checkVehicleTypeQuery);
    $checkVehicleTypeStmt->bind_param('s', $vehicleId);
    $checkVehicleTypeStmt->execute();
    $checkVehicleTypeResult = $checkVehicleTypeStmt->get_result();
    
    if ($checkVehicleTypeResult->num_rows === 0) {
        // Format vehicle name from ID
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        
        // Insert into vehicle_types
        $insertVehicleTypeQuery = "
            INSERT INTO vehicle_types (
                vehicle_id, name, is_active
            ) VALUES (?, ?, 1)
        ";
        
        $insertVehicleTypeStmt = $conn->prepare($insertVehicleTypeQuery);
        $insertVehicleTypeStmt->bind_param('ss', $vehicleId, $vehicleName);
        
        if (!$insertVehicleTypeStmt->execute()) {
            error_log("Warning: Failed to insert into vehicle_types: " . $conn->error);
            // Continue anyway - not critical
        } else {
            error_log("Inserted new vehicle in vehicle_types: $vehicleId");
        }
    }

    // Also update vehicle entry in vehicles table if necessary
    $checkVehiclesQuery = "SHOW TABLES LIKE 'vehicles'";
    $checkVehiclesResult = $conn->query($checkVehiclesQuery);
    $vehiclesTableExists = $checkVehiclesResult && $checkVehiclesResult->num_rows > 0;
    
    if ($vehiclesTableExists) {
        $checkVehicleQuery = "SELECT id FROM vehicles WHERE vehicle_id = ?";
        $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
        $checkVehicleStmt->bind_param('s', $vehicleId);
        $checkVehicleStmt->execute();
        $checkVehicleResult = $checkVehicleStmt->get_result();
        
        if ($checkVehicleResult->num_rows === 0) {
            // Format vehicle name from ID
            $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
            
            // Insert into vehicles table
            $insertVehicleQuery = "
                INSERT INTO vehicles (
                    vehicle_id, name, is_active, capacity, type, image_url
                ) VALUES (?, ?, 1, 4, 'standard', 'default-car.png')
            ";
            
            $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
            $insertVehicleStmt->bind_param('ss', $vehicleId, $vehicleName);
            
            if (!$insertVehicleStmt->execute()) {
                error_log("Warning: Failed to insert into vehicles: " . $conn->error);
                // Continue anyway - not critical
            } else {
                error_log("Inserted new entry in vehicles: $vehicleId");
            }
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
    
    error_log("Error in direct-airport-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'vehicleId' => $vehicleId ?? 'not set',
            'rawInput' => $rawInput ?? '',
            'postData' => $postData ?? []
        ]
    ]);
}
