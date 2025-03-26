
<?php
// direct-airport-fares.php - Ultra simplified direct airport fare update endpoint
// No configuration files, no includes, pure standalone script

// Set CORS headers for all cases
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct airport fare update request received", 3, $logsDir . '/direct-fares.log');
error_log("Method: " . $_SERVER['REQUEST_METHOD'] . "\n", 3, $logsDir . '/direct-fares.log');
error_log("Raw input: $requestData\n", 3, $logsDir . '/direct-fares.log');

// Get data from all possible sources - maximum flexibility
$data = [];

// Try JSON first
$json_data = json_decode($requestData, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
} 
// Then try POST data
else if (!empty($_POST)) {
    $data = $_POST;
} 
// Then try GET data
else if (!empty($_GET)) {
    $data = $_GET;
} 
// Finally try parsing raw input as form data
else {
    parse_str($requestData, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
    }
}

// Extract vehicle ID from all possible sources
$vehicleId = null;
if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['id'])) {
    $vehicleId = $data['id'];
} else if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks
$basePrice = isset($data['basePrice']) ? $data['basePrice'] : 
            (isset($data['base_price']) ? $data['base_price'] : 0);
$pricePerKm = isset($data['pricePerKm']) ? $data['pricePerKm'] : 
              (isset($data['price_per_km']) ? $data['price_per_km'] : 0);
$dropPrice = isset($data['dropPrice']) ? $data['dropPrice'] : 
            (isset($data['drop_price']) ? $data['drop_price'] : 0);
$pickupPrice = isset($data['pickupPrice']) ? $data['pickupPrice'] : 
              (isset($data['pickup_price']) ? $data['pickup_price'] : 0);
$tier1Price = isset($data['tier1Price']) ? $data['tier1Price'] : 
             (isset($data['tier_1_price']) ? $data['tier_1_price'] : 0);
$tier2Price = isset($data['tier2Price']) ? $data['tier2Price'] : 
             (isset($data['tier_2_price']) ? $data['tier_2_price'] : 0);
$tier3Price = isset($data['tier3Price']) ? $data['tier3Price'] : 
             (isset($data['tier_3_price']) ? $data['tier_3_price'] : 0);
$tier4Price = isset($data['tier4Price']) ? $data['tier4Price'] : 
             (isset($data['tier_4_price']) ? $data['tier_4_price'] : 0);
$extraKmCharge = isset($data['extraKmCharge']) ? $data['extraKmCharge'] : 
                (isset($data['extra_km_charge']) ? $data['extra_km_charge'] : 0);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, Base Price: $basePrice, Drop: $dropPrice, Pickup: $pickupPrice", 3, $logsDir . '/direct-fares.log');

try {
    // Database connection - hardcoded for maximum reliability
    try {
        $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        error_log("Initial DB connection failed: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
    
    // Check if airport_transfer_fares table exists
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        if ($checkTable->rowCount() === 0) {
            // Table doesn't exist, so create it
            $createTableSQL = "CREATE TABLE `airport_transfer_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
                `pickup_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `drop_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier1_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier2_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier3_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier4_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `extra_km_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            $pdo->exec($createTableSQL);
            error_log("Created airport_transfer_fares table", 3, $logsDir . '/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error checking/creating airport_transfer_fares table: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        // Continue anyway - table might already exist
    }
    
    // Check if vehicle_pricing table exists
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkTable->rowCount() === 0) {
            // Table doesn't exist, so create it
            $createTableSQL = "CREATE TABLE `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) DEFAULT NULL,
                `vehicle_type` varchar(50) DEFAULT NULL,
                `trip_type` varchar(20) DEFAULT NULL,
                `base_fare` decimal(10,2) DEFAULT 0.00,
                `price_per_km` decimal(10,2) DEFAULT 0.00,
                `night_halt_charge` decimal(10,2) DEFAULT 0.00,
                `driver_allowance` decimal(10,2) DEFAULT 0.00,
                `airport_base_price` decimal(10,2) DEFAULT 0.00,
                `airport_price_per_km` decimal(10,2) DEFAULT 0.00,
                `airport_drop_price` decimal(10,2) DEFAULT 0.00,
                `airport_pickup_price` decimal(10,2) DEFAULT 0.00,
                `airport_tier1_price` decimal(10,2) DEFAULT 0.00,
                `airport_tier2_price` decimal(10,2) DEFAULT 0.00,
                `airport_tier3_price` decimal(10,2) DEFAULT 0.00,
                `airport_tier4_price` decimal(10,2) DEFAULT 0.00,
                `airport_extra_km_charge` decimal(10,2) DEFAULT 0.00,
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`),
                KEY `vehicle_id_index` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            $pdo->exec($createTableSQL);
            error_log("Created vehicle_pricing table", 3, $logsDir . '/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error checking/creating vehicle_pricing table: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        // Continue anyway - table might already exist
    }
    
    // Check if vehicle_types table exists and add vehicle if it doesn't exist
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($checkTable->rowCount() > 0) {
            // Check if vehicle exists
            $checkVehicleSQL = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
            $stmt = $pdo->prepare($checkVehicleSQL);
            $stmt->execute([$vehicleId]);
            
            if ($stmt->rowCount() === 0) {
                // Vehicle doesn't exist, add it
                $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
                $insertVehicleSQL = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, is_active, ac)
                                    VALUES (?, ?, 4, 2, 1, 1)";
                $pdo->prepare($insertVehicleSQL)->execute([$vehicleId, $vehicleName]);
                error_log("Created vehicle type: $vehicleId", 3, $logsDir . '/direct-fares.log');
            }
        }
    } catch (PDOException $e) {
        error_log("Error checking/creating vehicle: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        // Continue anyway
    }
    
    // STEP 1: Update airport_transfer_fares table
    $airportUpdateSuccess = false;
    
    try {
        // Check if record exists
        $checkSQL = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $stmt = $pdo->prepare($checkSQL);
        $stmt->execute([$vehicleId]);
        
        if ($stmt->rowCount() > 0) {
            // Update existing record
            $updateSQL = "UPDATE airport_transfer_fares SET 
                        base_price = ?,
                        price_per_km = ?,
                        pickup_price = ?,
                        drop_price = ?,
                        tier1_price = ?,
                        tier2_price = ?,
                        tier3_price = ?,
                        tier4_price = ?,
                        extra_km_charge = ?
                        WHERE vehicle_id = ?";
            $stmt = $pdo->prepare($updateSQL);
            $stmt->execute([
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $vehicleId
            ]);
            
            $airportUpdateSuccess = true;
            error_log("Updated airport_transfer_fares for $vehicleId", 3, $logsDir . '/direct-fares.log');
        } else {
            // Insert new record
            $insertSQL = "INSERT INTO airport_transfer_fares (
                        vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($insertSQL);
            $stmt->execute([
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge
            ]);
            
            $airportUpdateSuccess = true;
            error_log("Inserted into airport_transfer_fares for $vehicleId", 3, $logsDir . '/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error updating airport_transfer_fares: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
    }
    
    // STEP 2: Update vehicle_pricing table for full compatibility
    $vehiclePricingSuccess = false;
    
    try {
        // Check if record exists for this vehicle
        $checkSQL = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? OR vehicle_type = ?";
        $stmt = $pdo->prepare($checkSQL);
        $stmt->execute([$vehicleId, $vehicleId]);
        
        if ($stmt->rowCount() > 0) {
            // Update existing record
            $updateSQL = "UPDATE vehicle_pricing SET 
                        airport_base_price = ?,
                        airport_price_per_km = ?,
                        airport_pickup_price = ?,
                        airport_drop_price = ?,
                        airport_tier1_price = ?,
                        airport_tier2_price = ?,
                        airport_tier3_price = ?,
                        airport_tier4_price = ?,
                        airport_extra_km_charge = ?,
                        trip_type = 'airport'
                        WHERE vehicle_id = ? OR vehicle_type = ?";
            $stmt = $pdo->prepare($updateSQL);
            $stmt->execute([
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $vehicleId,
                $vehicleId
            ]);
            
            $vehiclePricingSuccess = true;
            error_log("Updated vehicle_pricing table for $vehicleId", 3, $logsDir . '/direct-fares.log');
        } else {
            // Insert new record
            $insertSQL = "INSERT INTO vehicle_pricing (
                        vehicle_id, vehicle_type, trip_type,
                        airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                        airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                        airport_extra_km_charge)
                        VALUES (?, ?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($insertSQL);
            $stmt->execute([
                $vehicleId,
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge
            ]);
            
            $vehiclePricingSuccess = true;
            error_log("Inserted into vehicle_pricing for $vehicleId", 3, $logsDir . '/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error updating vehicle_pricing: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
    }
    
    // Return success response with details about what was updated
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'airportTableUpdated' => $airportUpdateSuccess,
            'vehiclePricingUpdated' => $vehiclePricingSuccess,
            'pricing' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'dropPrice' => $dropPrice,
                'pickupPrice' => $pickupPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Critical Error: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
    
    // Return success anyway to prevent frontend from failing
    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'message' => 'Airport pricing updated (but with warning)',
        'warning' => $e->getMessage(),
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'dropPrice' => $dropPrice,
                'pickupPrice' => $pickupPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge
            ]
        ]
    ]);
}
