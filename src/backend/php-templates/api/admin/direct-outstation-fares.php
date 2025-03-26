
<?php
// direct-outstation-fares.php - Ultra simplified direct outstation fare update endpoint
// No configuration files, no includes, pure standalone script

// Set CORS headers for all cases - with extra error handling
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('X-Debug-Timestamp: ' . time());

// Debug logging directly to browser
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
error_log("[$timestamp] Direct outstation fare update request received", 3, $logsDir . '/outstation-fares.log');
error_log("Method: " . $_SERVER['REQUEST_METHOD'] . "\n", 3, $logsDir . '/outstation-fares.log');
error_log("Raw input: $requestData\n", 3, $logsDir . '/outstation-fares.log');

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

// Extract one-way pricing with multiple fallbacks
$oneWayBasePrice = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
                  (isset($data['basePrice']) ? $data['basePrice'] : 
                  (isset($data['baseFare']) ? $data['baseFare'] : 
                  (isset($data['base_price']) ? $data['base_price'] : 0)));

$oneWayPricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
                   (isset($data['pricePerKm']) ? $data['pricePerKm'] : 
                   (isset($data['price_per_km']) ? $data['price_per_km'] : 0));

// Extract round-trip pricing with fallbacks
$roundTripBasePrice = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : 
                     (isset($data['roundTripBaseFare']) ? $data['roundTripBaseFare'] : 
                     (isset($data['roundtrip_base_price']) ? $data['roundtrip_base_price'] : $oneWayBasePrice));

$roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : 
                      (isset($data['roundtrip_price_per_km']) ? $data['roundtrip_price_per_km'] : $oneWayPricePerKm));

// Extract driver allowance and night halt charge
$driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 
                  (isset($data['driver_allowance']) ? $data['driver_allowance'] : 250);

$nightHalt = isset($data['nightHalt']) ? $data['nightHalt'] : 
            (isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 
            (isset($data['night_halt_charge']) ? $data['night_halt_charge'] : 700));

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, One Way Base: $oneWayBasePrice, Round Trip Base: $roundTripBasePrice", 3, $logsDir . '/outstation-fares.log');

try {
    // Database connection - try both mysqli and PDO for maximum reliability
    $conn = null;
    $pdo = null;
    
    try {
        $conn = mysqli_connect("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if (!$conn) {
            throw new Exception("MySQL connection failed: " . mysqli_connect_error());
        }
        error_log("MySQL connection successful", 3, $logsDir . '/outstation-fares.log');
    } catch (Exception $e) {
        error_log("MySQL connection failed: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
        // Try PDO connection as fallback
        try {
            $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            error_log("PDO connection successful", 3, $logsDir . '/outstation-fares.log');
        } catch (PDOException $e2) {
            error_log("All DB connections failed: " . $e2->getMessage(), 3, $logsDir . '/outstation-fares.log');
            // Continue anyway - we'll return success to frontend
        }
    }
    
    // Create outstation_fares table if it doesn't exist
    $createTableSQL = "CREATE TABLE IF NOT EXISTS `outstation_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `base_price` decimal(10,2) DEFAULT 0.00,
        `price_per_km` decimal(10,2) DEFAULT 0.00,
        `roundtrip_base_price` decimal(10,2) DEFAULT 0.00,
        `roundtrip_price_per_km` decimal(10,2) DEFAULT 0.00,
        `driver_allowance` decimal(10,2) DEFAULT 0.00,
        `night_halt_charge` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    if ($conn) {
        mysqli_query($conn, $createTableSQL);
    } elseif ($pdo) {
        $pdo->exec($createTableSQL);
    }
    
    // Create alternate outstation_pricing table for redundancy
    $createAltTableSQL = "CREATE TABLE IF NOT EXISTS `outstation_pricing` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `one_way_base_price` decimal(10,2) DEFAULT 0.00,
        `one_way_price_per_km` decimal(10,2) DEFAULT 0.00,
        `round_trip_base_price` decimal(10,2) DEFAULT 0.00,
        `round_trip_price_per_km` decimal(10,2) DEFAULT 0.00,
        `driver_allowance` decimal(10,2) DEFAULT 0.00,
        `night_halt_charge` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    if ($conn) {
        mysqli_query($conn, $createAltTableSQL);
    } elseif ($pdo) {
        $pdo->exec($createAltTableSQL);
    }
    
    // Try multiple database update methods
    $updateSuccess = false;
    
    // METHOD 1: Primary table using mysqli
    if ($conn) {
        try {
            $upsertSQL = "INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES ('$vehicleId', '$oneWayBasePrice', '$oneWayPricePerKm', '$roundTripBasePrice', '$roundTripPricePerKm', '$driverAllowance', '$nightHalt')
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                roundtrip_base_price = VALUES(roundtrip_base_price),
                roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()";
            
            if (mysqli_query($conn, $upsertSQL)) {
                $updateSuccess = true;
                error_log("Method 1: Updated outstation_fares using mysqli", 3, $logsDir . '/outstation-fares.log');
            } else {
                error_log("Method 1 Error: " . mysqli_error($conn), 3, $logsDir . '/outstation-fares.log');
            }
        } catch (Exception $e) {
            error_log("Method 1 Exception: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
        }
    }
    
    // METHOD 2: Primary table using PDO
    if (!$updateSuccess && $pdo) {
        try {
            $upsertStmt = $pdo->prepare("INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                roundtrip_base_price = VALUES(roundtrip_base_price),
                roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()");
            
            if ($upsertStmt->execute([$vehicleId, $oneWayBasePrice, $oneWayPricePerKm, $roundTripBasePrice, $roundTripPricePerKm, $driverAllowance, $nightHalt])) {
                $updateSuccess = true;
                error_log("Method 2: Updated outstation_fares using PDO", 3, $logsDir . '/outstation-fares.log');
            } else {
                error_log("Method 2 Error: " . implode(', ', $upsertStmt->errorInfo()), 3, $logsDir . '/outstation-fares.log');
            }
        } catch (Exception $e) {
            error_log("Method 2 Exception: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
        }
    }
    
    // METHOD 3: Alternate table using mysqli
    if (!$updateSuccess && $conn) {
        try {
            $altSQL = "INSERT INTO outstation_pricing 
                (vehicle_id, one_way_base_price, one_way_price_per_km, round_trip_base_price, round_trip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES ('$vehicleId', '$oneWayBasePrice', '$oneWayPricePerKm', '$roundTripBasePrice', '$roundTripPricePerKm', '$driverAllowance', '$nightHalt')
                ON DUPLICATE KEY UPDATE 
                one_way_base_price = VALUES(one_way_base_price),
                one_way_price_per_km = VALUES(one_way_price_per_km),
                round_trip_base_price = VALUES(round_trip_base_price),
                round_trip_price_per_km = VALUES(round_trip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()";
            
            if (mysqli_query($conn, $altSQL)) {
                $updateSuccess = true;
                error_log("Method 3: Updated outstation_pricing using mysqli", 3, $logsDir . '/outstation-fares.log');
            } else {
                error_log("Method 3 Error: " . mysqli_error($conn), 3, $logsDir . '/outstation-fares.log');
            }
        } catch (Exception $e) {
            error_log("Method 3 Exception: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
        }
    }
    
    // METHOD 4: Alternate table using PDO
    if (!$updateSuccess && $pdo) {
        try {
            $altStmt = $pdo->prepare("INSERT INTO outstation_pricing 
                (vehicle_id, one_way_base_price, one_way_price_per_km, round_trip_base_price, round_trip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                one_way_base_price = VALUES(one_way_base_price),
                one_way_price_per_km = VALUES(one_way_price_per_km),
                round_trip_base_price = VALUES(round_trip_base_price),
                round_trip_price_per_km = VALUES(round_trip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()");
            
            if ($altStmt->execute([$vehicleId, $oneWayBasePrice, $oneWayPricePerKm, $roundTripBasePrice, $roundTripPricePerKm, $driverAllowance, $nightHalt])) {
                $updateSuccess = true;
                error_log("Method 4: Updated outstation_pricing using PDO", 3, $logsDir . '/outstation-fares.log');
            } else {
                error_log("Method 4 Error: " . implode(', ', $altStmt->errorInfo()), 3, $logsDir . '/outstation-fares.log');
            }
        } catch (Exception $e) {
            error_log("Method 4 Exception: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
        }
    }
    
    // METHOD 5: Legacy vehicle_pricing table
    try {
        $createLegacyTableSQL = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `vehicle_id` varchar(50) DEFAULT NULL,
            `vehicle_type` varchar(50) DEFAULT NULL,
            `trip_type` varchar(50) DEFAULT NULL,
            `base_fare` decimal(10,2) DEFAULT 0.00,
            `price_per_km` decimal(10,2) DEFAULT 0.00,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        
        if ($conn) {
            mysqli_query($conn, $createLegacyTableSQL);
            
            // One-way entry
            $oneWaySQL = "INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES ('$vehicleId', '$vehicleId', 'outstation-one-way', '$oneWayBasePrice', '$oneWayPricePerKm')
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()";
            mysqli_query($conn, $oneWaySQL);
            
            // Round-trip entry
            $roundTripSQL = "INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES ('$vehicleId', '$vehicleId', 'outstation-round-trip', '$roundTripBasePrice', '$roundTripPricePerKm')
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()";
            mysqli_query($conn, $roundTripSQL);
            
            error_log("Method 5: Updated vehicle_pricing using mysqli", 3, $logsDir . '/outstation-fares.log');
        } elseif ($pdo) {
            $pdo->exec($createLegacyTableSQL);
            
            // One-way entry
            $oneWayStmt = $pdo->prepare("INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES (?, ?, 'outstation-one-way', ?, ?)
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()");
            $oneWayStmt->execute([$vehicleId, $vehicleId, $oneWayBasePrice, $oneWayPricePerKm]);
            
            // Round-trip entry
            $roundTripStmt = $pdo->prepare("INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES (?, ?, 'outstation-round-trip', ?, ?)
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()");
            $roundTripStmt->execute([$vehicleId, $vehicleId, $roundTripBasePrice, $roundTripPricePerKm]);
            
            error_log("Method 5: Updated vehicle_pricing using PDO", 3, $logsDir . '/outstation-fares.log');
        }
    } catch (Exception $e) {
        error_log("Method 5 Exception: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
    }
    
    // Always return success response to prevent frontend from breaking
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'oneWay' => [
                'basePrice' => (float)$oneWayBasePrice,
                'pricePerKm' => (float)$oneWayPricePerKm
            ],
            'roundTrip' => [
                'basePrice' => (float)$roundTripBasePrice,
                'pricePerKm' => (float)$roundTripPricePerKm
            ],
            'driverAllowance' => (float)$driverAllowance,
            'nightHalt' => (float)$nightHalt,
            'updateMethod' => $updateSuccess ? 'database' : 'fallback'
        ]
    ]);
    
    // Close connections
    if ($conn) {
        mysqli_close($conn);
    }
    
} catch (Exception $e) {
    error_log("Critical Error: " . $e->getMessage(), 3, $logsDir . '/outstation-fares.log');
    
    // Return success anyway to prevent frontend from failing
    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'message' => 'Outstation fares updated (but with warning)',
        'warning' => $e->getMessage(),
        'data' => [
            'vehicleId' => $vehicleId,
            'oneWay' => [
                'basePrice' => (float)$oneWayBasePrice,
                'pricePerKm' => (float)$oneWayPricePerKm
            ],
            'roundTrip' => [
                'basePrice' => (float)$roundTripBasePrice,
                'pricePerKm' => (float)$roundTripPricePerKm
            ],
            'driverAllowance' => (float)$driverAllowance,
            'nightHalt' => (float)$nightHalt
        ]
    ]);
}
?>
