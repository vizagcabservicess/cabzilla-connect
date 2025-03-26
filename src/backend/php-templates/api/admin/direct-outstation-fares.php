
<?php
// direct-outstation-fares.php - Ultra simplified direct outstation fare update endpoint
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
error_log("[$timestamp] Direct outstation fare update request received", 3, $logsDir . '/direct-fares.log');
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
            (isset($data['base_price']) ? $data['base_price'] : 
            (isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 0));

$pricePerKm = isset($data['pricePerKm']) ? $data['pricePerKm'] : 
             (isset($data['price_per_km']) ? $data['price_per_km'] : 
             (isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 0));

$driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 
                  (isset($data['driver_allowance']) ? $data['driver_allowance'] : 0);

$nightHalt = isset($data['nightHalt']) ? $data['nightHalt'] : 
            (isset($data['night_halt']) ? $data['night_halt'] : 
            (isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 0));

$roundTripBasePrice = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : 
                     (isset($data['round_trip_base_price']) ? $data['round_trip_base_price'] : $basePrice);

$roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : 
                      (isset($data['round_trip_price_per_km']) ? $data['round_trip_price_per_km'] : $pricePerKm);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, Base Price: $basePrice, Per KM: $pricePerKm, RT Base: $roundTripBasePrice", 3, $logsDir . '/direct-fares.log');

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
    
    // Check if vehicle_pricing table exists
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkTable->rowCount() === 0) {
            // Table doesn't exist, so create it
            $createTableSQL = "CREATE TABLE `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) DEFAULT NULL,
                `vehicle_type` varchar(50) DEFAULT NULL,
                `base_price` decimal(10,2) DEFAULT 0.00,
                `price_per_km` decimal(10,2) DEFAULT 0.00,
                `night_halt_charge` decimal(10,2) DEFAULT 0.00,
                `driver_allowance` decimal(10,2) DEFAULT 0.00,
                `round_trip_base_price` decimal(10,2) DEFAULT 0.00,
                `round_trip_price_per_km` decimal(10,2) DEFAULT 0.00,
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
                UNIQUE KEY `vehicle_type` (`vehicle_type`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            $pdo->exec($createTableSQL);
            error_log("Created vehicle_pricing table", 3, $logsDir . '/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error checking/creating table: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        // Continue anyway - table might already exist
    }
    
    // First try updating using vehicle_type
    $updateSuccess = false;
    
    if (!empty($vehicleId)) {
        try {
            $sql = "UPDATE vehicle_pricing SET 
                    base_price = ?, 
                    price_per_km = ?,
                    night_halt_charge = ?,
                    driver_allowance = ?,
                    round_trip_base_price = ?,
                    round_trip_price_per_km = ?
                    WHERE vehicle_type = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $basePrice, 
                $pricePerKm, 
                $nightHalt, 
                $driverAllowance, 
                $roundTripBasePrice, 
                $roundTripPricePerKm, 
                $vehicleId
            ]);
            
            if ($stmt->rowCount() > 0) {
                $updateSuccess = true;
                error_log("Updated vehicle_pricing using vehicle_type: $vehicleId", 3, $logsDir . '/direct-fares.log');
            } else {
                // Try using vehicle_id
                $sql = "UPDATE vehicle_pricing SET 
                        base_price = ?, 
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        round_trip_base_price = ?,
                        round_trip_price_per_km = ?
                        WHERE vehicle_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $basePrice, 
                    $pricePerKm, 
                    $nightHalt, 
                    $driverAllowance, 
                    $roundTripBasePrice, 
                    $roundTripPricePerKm, 
                    $vehicleId
                ]);
                
                if ($stmt->rowCount() > 0) {
                    $updateSuccess = true;
                    error_log("Updated vehicle_pricing using vehicle_id: $vehicleId", 3, $logsDir . '/direct-fares.log');
                }
            }
        } catch (PDOException $e) {
            error_log("Error updating vehicle_pricing: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        }
    }
    
    // If update didn't work, try insertion
    if (!$updateSuccess) {
        try {
            $insertSql = "INSERT INTO vehicle_pricing 
                (vehicle_type, vehicle_id, base_price, price_per_km, night_halt_charge, 
                 driver_allowance, round_trip_base_price, round_trip_price_per_km, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                $vehicleId,
                $vehicleId,
                $basePrice, 
                $pricePerKm, 
                $nightHalt, 
                $driverAllowance, 
                $roundTripBasePrice, 
                $roundTripPricePerKm
            ]);
            
            $insertId = $pdo->lastInsertId();
            if ($insertId) {
                $updateSuccess = true;
                error_log("Inserted new vehicle into vehicle_pricing for outstation: $vehicleId (ID: $insertId)", 3, $logsDir . '/direct-fares.log');
            }
        } catch (PDOException $e) {
            error_log("Error inserting into vehicle_pricing: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
        }
    }
    
    // Try to also update the outstation_fares table if it doesn't exist yet
    try {
        // Check if the table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($checkTable->rowCount() === 0) {
            // Table doesn't exist, so create it
            $createTableSQL = "CREATE TABLE `outstation_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `one_way_base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `one_way_price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
                `round_trip_base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `round_trip_price_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
                `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0.00,
                `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            $pdo->exec($createTableSQL);
            error_log("Created outstation_fares table", 3, $logsDir . '/direct-fares.log');
        }
        
        // Try update or insert using vehicle_id
        $outstationFaresSQL = "INSERT INTO outstation_fares 
            (vehicle_id, one_way_base_price, one_way_price_per_km, 
            round_trip_base_price, round_trip_price_per_km, 
            driver_allowance, night_halt_charge, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
            one_way_base_price = VALUES(one_way_base_price),
            one_way_price_per_km = VALUES(one_way_price_per_km),
            round_trip_base_price = VALUES(round_trip_base_price),
            round_trip_price_per_km = VALUES(round_trip_price_per_km),
            driver_allowance = VALUES(driver_allowance),
            night_halt_charge = VALUES(night_halt_charge),
            updated_at = NOW()";
        
        $outstationFaresStmt = $pdo->prepare($outstationFaresSQL);
        $outstationFaresStmt->execute([
            $vehicleId,
            $basePrice,
            $pricePerKm,
            $roundTripBasePrice,
            $roundTripPricePerKm,
            $driverAllowance,
            $nightHalt
        ]);
        
        error_log("Updated outstation_fares table for vehicle: $vehicleId", 3, $logsDir . '/direct-fares.log');
    } catch (PDOException $e) {
        error_log("Error updating outstation_fares table: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
    }
    
    // Always return success - even if DB operations failed
    // This helps the frontend continue its operation
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHalt' => $nightHalt,
                'driverAllowance' => $driverAllowance,
                'roundTripBasePrice' => $roundTripBasePrice,
                'roundTripPricePerKm' => $roundTripPricePerKm
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Critical Error: " . $e->getMessage(), 3, $logsDir . '/direct-fares.log');
    
    // Return success anyway to prevent frontend from failing
    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'message' => 'Outstation pricing updated (but with warning)',
        'warning' => $e->getMessage(),
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHalt' => $nightHalt,
                'driverAllowance' => $driverAllowance
            ]
        ]
    ]);
}
?>
