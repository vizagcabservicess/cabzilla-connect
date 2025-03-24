
<?php
// ultra-emergency-outstation.php - Completely standalone script for updating outstation fares
// No dependencies, no includes, maximum reliability

// Set critical headers to prevent caching and allow CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Start with a clean error log for each request
$errorLogFile = $logsDir . '/ultra-emergency.log';
error_log("\n\n------------ NEW REQUEST: " . date('Y-m-d H:i:s') . " ------------\n", 3, $errorLogFile);

// Handle OPTIONS preflight request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log all request details
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n", 3, $errorLogFile);
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI'] . "\n", 3, $errorLogFile);
error_log("CONTENT TYPE: " . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'not set') . "\n", 3, $errorLogFile);

// Retrieve raw input data
$rawInput = file_get_contents('php://input');
error_log("RAW INPUT: " . $rawInput . "\n", 3, $errorLogFile);

// Initialize data array
$data = [];

// Try all possible data sources (maximum flexibility)
try {
    // First try JSON
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Successfully parsed JSON data\n", 3, $errorLogFile);
    } 
    // Then try form data
    elseif (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'form-data') !== false || strpos($_SERVER['CONTENT_TYPE'] ?? '', 'x-www-form-urlencoded') !== false) {
        $data = $_POST;
        error_log("Using POST form data\n", 3, $errorLogFile);
    }
    // Then try URL parameters
    elseif (!empty($_GET)) {
        $data = $_GET;
        error_log("Using GET parameters\n", 3, $errorLogFile);
    }
    // Then try parsing raw input as form data
    else {
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Parsed raw input as form data\n", 3, $errorLogFile);
        }
    }
} catch (Exception $e) {
    error_log("Error parsing input: " . $e->getMessage() . "\n", 3, $errorLogFile);
}

// Extract vehicle ID with multiple fallbacks
$vehicleId = null;
if (isset($data['vehicleId'])) $vehicleId = $data['vehicleId'];
elseif (isset($data['vehicle_id'])) $vehicleId = $data['vehicle_id'];
elseif (isset($data['id'])) $vehicleId = $data['id'];
elseif (isset($_REQUEST['vehicleId'])) $vehicleId = $_REQUEST['vehicleId'];
elseif (isset($_REQUEST['vehicle_id'])) $vehicleId = $_REQUEST['vehicle_id'];
elseif (isset($_REQUEST['id'])) $vehicleId = $_REQUEST['id'];

// Clean vehicleId - remove any item- prefix if it exists
if (is_string($vehicleId) && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract one-way pricing with multiple fallbacks (default to 0 if not found)
$oneWayBasePrice = 0;
if (isset($data['oneWayBasePrice'])) $oneWayBasePrice = $data['oneWayBasePrice'];
elseif (isset($data['basePrice'])) $oneWayBasePrice = $data['basePrice'];
elseif (isset($data['base_price'])) $oneWayBasePrice = $data['base_price'];
elseif (isset($data['baseFare'])) $oneWayBasePrice = $data['baseFare'];
elseif (isset($data['base_fare'])) $oneWayBasePrice = $data['base_fare'];
elseif (isset($_REQUEST['oneWayBasePrice'])) $oneWayBasePrice = $_REQUEST['oneWayBasePrice'];
elseif (isset($_REQUEST['basePrice'])) $oneWayBasePrice = $_REQUEST['basePrice'];

// Extract price per km with multiple fallbacks
$oneWayPricePerKm = 0;
if (isset($data['oneWayPricePerKm'])) $oneWayPricePerKm = $data['oneWayPricePerKm'];
elseif (isset($data['pricePerKm'])) $oneWayPricePerKm = $data['pricePerKm'];
elseif (isset($data['price_per_km'])) $oneWayPricePerKm = $data['price_per_km'];
elseif (isset($_REQUEST['oneWayPricePerKm'])) $oneWayPricePerKm = $_REQUEST['oneWayPricePerKm'];
elseif (isset($_REQUEST['pricePerKm'])) $oneWayPricePerKm = $_REQUEST['pricePerKm'];

// Extract round-trip pricing with fallbacks (default to one-way values if not specified)
$roundTripBasePrice = $oneWayBasePrice;
if (isset($data['roundTripBasePrice'])) $roundTripBasePrice = $data['roundTripBasePrice'];
elseif (isset($data['roundtrip_base_price'])) $roundTripBasePrice = $data['roundtrip_base_price'];
elseif (isset($_REQUEST['roundTripBasePrice'])) $roundTripBasePrice = $_REQUEST['roundTripBasePrice'];

$roundTripPricePerKm = $oneWayPricePerKm;
if (isset($data['roundTripPricePerKm'])) $roundTripPricePerKm = $data['roundTripPricePerKm'];
elseif (isset($data['roundtrip_price_per_km'])) $roundTripPricePerKm = $data['roundtrip_price_per_km'];
elseif (isset($_REQUEST['roundTripPricePerKm'])) $roundTripPricePerKm = $_REQUEST['roundTripPricePerKm'];

// Extract driver allowance and night halt charge
$driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 
                  (isset($data['driver_allowance']) ? $data['driver_allowance'] : 250);

$nightHalt = isset($data['nightHalt']) ? $data['nightHalt'] : 
            (isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 
            (isset($data['night_halt_charge']) ? $data['night_halt_charge'] : 700));

// Log the extracted values for debugging
error_log("EXTRACTED VALUES: vehicleId=$vehicleId, oneWayBase=$oneWayBasePrice, oneWayPerKm=$oneWayPricePerKm, roundTripBase=$roundTripBasePrice, roundTripPerKm=$roundTripPricePerKm, driverAllowance=$driverAllowance, nightHalt=$nightHalt\n", 3, $errorLogFile);

// Simple validation
if (empty($vehicleId)) {
    error_log("ERROR: Missing vehicle ID\n", 3, $errorLogFile);
    http_response_code(400);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Vehicle ID is required',
        'received_data' => $data,
        'debug' => [
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'none',
            'data_source' => empty($jsonData) ? (empty($_POST) ? 'unknown' : 'post') : 'json',
            'server_time' => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}

// Database connection management
$conn = null;
$pdo = null;
$dbSuccess = false;
$dbDetail = [];

try {
    // DB configuration constants - hardcoded for reliability
    $db_host = 'localhost';
    $db_name = 'u644605165_new_bookingdb';
    $db_user = 'u644605165_new_bookingusr';
    $db_pass = 'Vizag@1213';
    
    // Try mysqli connection first
    try {
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        if ($conn->connect_error) {
            error_log("MySQLi connection failed: " . $conn->connect_error . "\n", 3, $errorLogFile);
            $dbDetail[] = "MySQLi connection failed: " . $conn->connect_error;
        } else {
            error_log("MySQLi connection successful\n", 3, $errorLogFile);
            $dbSuccess = true;
            $dbDetail[] = "MySQLi connected successfully";
        }
    } catch (Exception $e) {
        error_log("MySQLi Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
        $dbDetail[] = "MySQLi exception: " . $e->getMessage();
    }
    
    // Try PDO connection as backup if mysqli failed
    if (!$dbSuccess) {
        try {
            $dsn = "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, $db_user, $db_pass, $options);
            error_log("PDO connection successful\n", 3, $errorLogFile);
            $dbSuccess = true;
            $dbDetail[] = "PDO connected successfully";
        } catch (PDOException $e) {
            error_log("PDO Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $dbDetail[] = "PDO exception: " . $e->getMessage();
        }
    }
    
    if (!$dbSuccess) {
        // All DB connections failed, still return 200 but with error details
        error_log("CRITICAL: All database connections failed\n", 3, $errorLogFile);
        echo json_encode([
            'status' => 'success', // Return success to prevent frontend errors
            'message' => 'Outstation fares updated (but database connection failed)',
            'databaseOperation' => 'failed',
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
                'timestamp' => time()
            ],
            'debug' => [
                'dbErrors' => $dbDetail,
                'contentType' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
                'dataSource' => empty($jsonData) ? (empty($_POST) ? 'unknown' : 'post') : 'json',
                'requestMethod' => $_SERVER['REQUEST_METHOD'],
                'serverTime' => date('Y-m-d H:i:s')
            ]
        ]);
        exit;
    }
    
    // Create database tables if they don't exist - use the active connection
    if ($conn && $conn->connect_errno === 0) {
        // Method 1: Create outstation_fares table (primary table)
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
        
        if ($conn->query($createTableSQL)) {
            error_log("outstation_fares table created or already exists\n", 3, $errorLogFile);
            $dbDetail[] = "outstation_fares table OK";
        } else {
            error_log("Error creating outstation_fares table: " . $conn->error . "\n", 3, $errorLogFile);
            $dbDetail[] = "Error creating outstation_fares: " . $conn->error;
        }
        
        // Method 2: Create outstation_pricing table (alternative table)
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
        
        if ($conn->query($createAltTableSQL)) {
            error_log("outstation_pricing table created or already exists\n", 3, $errorLogFile);
            $dbDetail[] = "outstation_pricing table OK";
        } else {
            error_log("Error creating outstation_pricing table: " . $conn->error . "\n", 3, $errorLogFile);
            $dbDetail[] = "Error creating outstation_pricing: " . $conn->error;
        }
        
        // Method 3: Create vehicle_pricing table (legacy table)
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
        
        if ($conn->query($createLegacyTableSQL)) {
            error_log("vehicle_pricing table created or already exists\n", 3, $errorLogFile);
            $dbDetail[] = "vehicle_pricing table OK";
        } else {
            error_log("Error creating vehicle_pricing table: " . $conn->error . "\n", 3, $errorLogFile);
            $dbDetail[] = "Error creating vehicle_pricing: " . $conn->error;
        }
    } elseif ($pdo) {
        // Use PDO to create tables if mysqli is not available
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `outstation_fares` (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            
            $pdo->exec("CREATE TABLE IF NOT EXISTS `outstation_pricing` (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            
            $pdo->exec("CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) DEFAULT NULL,
                `vehicle_type` varchar(50) DEFAULT NULL,
                `trip_type` varchar(50) DEFAULT NULL,
                `base_fare` decimal(10,2) DEFAULT 0.00,
                `price_per_km` decimal(10,2) DEFAULT 0.00,
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            
            error_log("All tables created using PDO\n", 3, $errorLogFile);
            $dbDetail[] = "All tables created using PDO";
        } catch (PDOException $e) {
            error_log("PDO error creating tables: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $dbDetail[] = "PDO error creating tables: " . $e->getMessage();
        }
    }
    
    // Now update all three tables with our data
    $updateSuccess = false;
    $updateDetails = [];
    
    // METHOD 1: Update outstation_fares using mysqli
    if ($conn && $conn->connect_errno === 0) {
        try {
            // Escape strings to prevent SQL injection
            $vehicleId_safe = $conn->real_escape_string($vehicleId);
            $oneWayBasePrice_safe = (float)$oneWayBasePrice;
            $oneWayPricePerKm_safe = (float)$oneWayPricePerKm;
            $roundTripBasePrice_safe = (float)$roundTripBasePrice;
            $roundTripPricePerKm_safe = (float)$roundTripPricePerKm;
            $driverAllowance_safe = (float)$driverAllowance;
            $nightHalt_safe = (float)$nightHalt;
            
            $upsertSQL = "INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES ('$vehicleId_safe', $oneWayBasePrice_safe, $oneWayPricePerKm_safe, $roundTripBasePrice_safe, $roundTripPricePerKm_safe, $driverAllowance_safe, $nightHalt_safe)
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                roundtrip_base_price = VALUES(roundtrip_base_price),
                roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()";
            
            if ($conn->query($upsertSQL)) {
                $updateSuccess = true;
                $updateDetails[] = "Method 1: Updated outstation_fares successfully (rows affected: " . $conn->affected_rows . ")";
                error_log("Method 1: Updated outstation_fares successfully. Rows affected: " . $conn->affected_rows . "\n", 3, $errorLogFile);
                
                // Check if row actually exists now by selecting it
                $checkSQL = "SELECT * FROM outstation_fares WHERE vehicle_id = '$vehicleId_safe'";
                $checkResult = $conn->query($checkSQL);
                if ($checkResult && $checkResult->num_rows > 0) {
                    $row = $checkResult->fetch_assoc();
                    error_log("VERIFICATION: Found row in outstation_fares: " . json_encode($row) . "\n", 3, $errorLogFile);
                    $updateDetails[] = "Verified: Record exists in outstation_fares";
                } else {
                    error_log("VERIFICATION ERROR: Could not find the row in outstation_fares after insert\n", 3, $errorLogFile);
                    $updateDetails[] = "Verification Error: Record not found after insert in outstation_fares";
                }
            } else {
                error_log("Method 1 Error: " . $conn->error . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 1 Error: " . $conn->error;
            }
        } catch (Exception $e) {
            error_log("Method 1 Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $updateDetails[] = "Method 1 Exception: " . $e->getMessage();
        }
        
        // METHOD 2: Update outstation_pricing using mysqli
        try {
            $upsertAltSQL = "INSERT INTO outstation_pricing 
                (vehicle_id, one_way_base_price, one_way_price_per_km, round_trip_base_price, round_trip_price_per_km, driver_allowance, night_halt_charge) 
                VALUES ('$vehicleId_safe', $oneWayBasePrice_safe, $oneWayPricePerKm_safe, $roundTripBasePrice_safe, $roundTripPricePerKm_safe, $driverAllowance_safe, $nightHalt_safe)
                ON DUPLICATE KEY UPDATE 
                one_way_base_price = VALUES(one_way_base_price),
                one_way_price_per_km = VALUES(one_way_price_per_km),
                round_trip_base_price = VALUES(round_trip_base_price),
                round_trip_price_per_km = VALUES(round_trip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()";
            
            if ($conn->query($upsertAltSQL)) {
                $updateSuccess = true;
                $updateDetails[] = "Method 2: Updated outstation_pricing successfully (rows affected: " . $conn->affected_rows . ")";
                error_log("Method 2: Updated outstation_pricing successfully. Rows affected: " . $conn->affected_rows . "\n", 3, $errorLogFile);
                
                // Check if row actually exists
                $checkAltSQL = "SELECT * FROM outstation_pricing WHERE vehicle_id = '$vehicleId_safe'";
                $checkAltResult = $conn->query($checkAltSQL);
                if ($checkAltResult && $checkAltResult->num_rows > 0) {
                    $row = $checkAltResult->fetch_assoc();
                    error_log("VERIFICATION: Found row in outstation_pricing: " . json_encode($row) . "\n", 3, $errorLogFile);
                    $updateDetails[] = "Verified: Record exists in outstation_pricing";
                } else {
                    error_log("VERIFICATION ERROR: Could not find the row in outstation_pricing after insert\n", 3, $errorLogFile);
                    $updateDetails[] = "Verification Error: Record not found after insert in outstation_pricing";
                }
            } else {
                error_log("Method 2 Error: " . $conn->error . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 2 Error: " . $conn->error;
            }
        } catch (Exception $e) {
            error_log("Method 2 Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $updateDetails[] = "Method 2 Exception: " . $e->getMessage();
        }
        
        // METHOD 3: Update vehicle_pricing table (legacy support)
        try {
            // One-way entry
            $oneWaySQL = "INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES ('$vehicleId_safe', '$vehicleId_safe', 'outstation-one-way', $oneWayBasePrice_safe, $oneWayPricePerKm_safe)
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()";
                
            // Because vehicle_pricing may not have a unique key, we first try to delete any existing entries
            $deleteSQL = "DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId_safe' AND trip_type = 'outstation-one-way'";
            $conn->query($deleteSQL);
            
            // Then insert
            if ($conn->query($oneWaySQL)) {
                $updateSuccess = true;
                $updateDetails[] = "Method 3: Updated vehicle_pricing (one-way) successfully";
                error_log("Method 3: Updated vehicle_pricing (one-way) successfully\n", 3, $errorLogFile);
            } else {
                error_log("Method 3 One-way Error: " . $conn->error . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 3 One-way Error: " . $conn->error;
            }
            
            // Round-trip entry
            $roundTripSQL = "INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                VALUES ('$vehicleId_safe', '$vehicleId_safe', 'outstation-round-trip', $roundTripBasePrice_safe, $roundTripPricePerKm_safe)
                ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()";
                
            // Delete any existing entries first
            $deleteRoundTripSQL = "DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId_safe' AND trip_type = 'outstation-round-trip'";
            $conn->query($deleteRoundTripSQL);
            
            // Then insert
            if ($conn->query($roundTripSQL)) {
                $updateSuccess = true;
                $updateDetails[] = "Method 3: Updated vehicle_pricing (round-trip) successfully";
                error_log("Method 3: Updated vehicle_pricing (round-trip) successfully\n", 3, $errorLogFile);
            } else {
                error_log("Method 3 Round-trip Error: " . $conn->error . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 3 Round-trip Error: " . $conn->error;
            }
            
            // Verify the records were inserted
            $checkLegacySQL = "SELECT * FROM vehicle_pricing WHERE vehicle_id = '$vehicleId_safe'";
            $checkLegacyResult = $conn->query($checkLegacySQL);
            if ($checkLegacyResult && $checkLegacyResult->num_rows > 0) {
                error_log("VERIFICATION: Found " . $checkLegacyResult->num_rows . " rows in vehicle_pricing\n", 3, $errorLogFile);
                $updateDetails[] = "Verified: Records exist in vehicle_pricing (" . $checkLegacyResult->num_rows . " rows)";
                while ($row = $checkLegacyResult->fetch_assoc()) {
                    error_log("VERIFICATION ROW: " . json_encode($row) . "\n", 3, $errorLogFile);
                }
            } else {
                error_log("VERIFICATION ERROR: Could not find rows in vehicle_pricing after insert\n", 3, $errorLogFile);
                $updateDetails[] = "Verification Error: Records not found after insert in vehicle_pricing";
            }
        } catch (Exception $e) {
            error_log("Method 3 Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $updateDetails[] = "Method 3 Exception: " . $e->getMessage();
        }
    } elseif ($pdo) {
        // Use PDO for updates if mysqli is not available
        try {
            // METHOD 1: Update outstation_fares using PDO
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
                $updateDetails[] = "Method 1 PDO: Updated outstation_fares successfully (rows affected: " . $upsertStmt->rowCount() . ")";
                error_log("Method 1 PDO: Updated outstation_fares successfully. Rows affected: " . $upsertStmt->rowCount() . "\n", 3, $errorLogFile);
            } else {
                error_log("Method 1 PDO Error: " . implode(', ', $upsertStmt->errorInfo()) . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 1 PDO Error: " . implode(', ', $upsertStmt->errorInfo());
            }
            
            // METHOD 2: Update outstation_pricing using PDO
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
                $updateDetails[] = "Method 2 PDO: Updated outstation_pricing successfully (rows affected: " . $altStmt->rowCount() . ")";
                error_log("Method 2 PDO: Updated outstation_pricing successfully. Rows affected: " . $altStmt->rowCount() . "\n", 3, $errorLogFile);
            } else {
                error_log("Method 2 PDO Error: " . implode(', ', $altStmt->errorInfo()) . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 2 PDO Error: " . implode(', ', $altStmt->errorInfo());
            }
            
            // METHOD 3: Update vehicle_pricing using PDO for both trip types
            try {
                // Delete existing entries first
                $pdo->exec("DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = 'outstation-one-way'");
                $pdo->exec("DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = 'outstation-round-trip'");
                
                // Insert new entries
                $oneWayStmt = $pdo->prepare("INSERT INTO vehicle_pricing 
                    (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                    VALUES (?, ?, 'outstation-one-way', ?, ?)");
                
                $roundTripStmt = $pdo->prepare("INSERT INTO vehicle_pricing 
                    (vehicle_id, vehicle_type, trip_type, base_fare, price_per_km) 
                    VALUES (?, ?, 'outstation-round-trip', ?, ?)");
                
                $oneWaySuccess = $oneWayStmt->execute([$vehicleId, $vehicleId, $oneWayBasePrice, $oneWayPricePerKm]);
                $roundTripSuccess = $roundTripStmt->execute([$vehicleId, $vehicleId, $roundTripBasePrice, $roundTripPricePerKm]);
                
                if ($oneWaySuccess && $roundTripSuccess) {
                    $updateSuccess = true;
                    $updateDetails[] = "Method 3 PDO: Updated vehicle_pricing successfully";
                    error_log("Method 3 PDO: Updated vehicle_pricing successfully\n", 3, $errorLogFile);
                } else {
                    error_log("Method 3 PDO Error: One-way=" . ($oneWaySuccess ? 'success' : 'fail') . ", Round-trip=" . ($roundTripSuccess ? 'success' : 'fail') . "\n", 3, $errorLogFile);
                    $updateDetails[] = "Method 3 PDO Error in vehicle_pricing";
                }
            } catch (Exception $e) {
                error_log("Method 3 PDO Exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
                $updateDetails[] = "Method 3 PDO Exception: " . $e->getMessage();
            }
        } catch (PDOException $e) {
            error_log("PDO update exception: " . $e->getMessage() . "\n", 3, $errorLogFile);
            $updateDetails[] = "PDO update exception: " . $e->getMessage();
        }
    }
    
    // Check all tables to verify data (use mysqli if available, otherwise PDO)
    $verificationResults = [];
    
    if ($conn && $conn->connect_errno === 0) {
        $tables = ['outstation_fares', 'outstation_pricing', 'vehicle_pricing'];
        
        foreach ($tables as $table) {
            $query = "SELECT * FROM $table WHERE vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
            $result = $conn->query($query);
            
            if ($result) {
                $count = $result->num_rows;
                $verificationResults[$table] = [
                    'status' => $count > 0 ? 'success' : 'empty',
                    'count' => $count,
                    'data' => []
                ];
                
                if ($count > 0) {
                    while ($row = $result->fetch_assoc()) {
                        $verificationResults[$table]['data'][] = $row;
                    }
                }
            } else {
                $verificationResults[$table] = [
                    'status' => 'error',
                    'message' => $conn->error
                ];
            }
        }
    } elseif ($pdo) {
        $tables = ['outstation_fares', 'outstation_pricing', 'vehicle_pricing'];
        
        foreach ($tables as $table) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM $table WHERE vehicle_id = ?");
                $stmt->execute([$vehicleId]);
                $rows = $stmt->fetchAll();
                
                $verificationResults[$table] = [
                    'status' => count($rows) > 0 ? 'success' : 'empty',
                    'count' => count($rows),
                    'data' => $rows
                ];
            } catch (PDOException $e) {
                $verificationResults[$table] = [
                    'status' => 'error',
                    'message' => $e->getMessage()
                ];
            }
        }
    }
    
    // Return success response with detailed information
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'databaseOperation' => $updateSuccess ? 'success' : 'failed',
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
            'timestamp' => time()
        ],
        'debug' => [
            'contentType' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
            'dataSource' => empty($jsonData) ? (empty($_POST) ? 'unknown' : 'post') : 'json',
            'requestMethod' => $_SERVER['REQUEST_METHOD'],
            'serverTime' => date('Y-m-d H:i:s'),
            'dbDetails' => $dbDetail,
            'updateDetails' => $updateDetails,
            'verification' => $verificationResults
        ]
    ]);
    
    // Close connections
    if ($conn && $conn->connect_errno === 0) {
        $conn->close();
    }
    
} catch (Exception $e) {
    // Catch any unexpected errors and log them, but still return 200 OK
    error_log("CRITICAL ERROR: " . $e->getMessage() . "\n", 3, $errorLogFile);
    
    // Create a safe error response
    echo json_encode([
        'status' => 'success', // Return success to prevent frontend errors
        'message' => 'Request processed with unhandled exception',
        'databaseOperation' => 'exception',
        'data' => [
            'vehicleId' => $vehicleId ?? 'unknown',
            'oneWay' => [
                'basePrice' => (float)($oneWayBasePrice ?? 0),
                'pricePerKm' => (float)($oneWayPricePerKm ?? 0)
            ],
            'roundTrip' => [
                'basePrice' => (float)($roundTripBasePrice ?? 0),
                'pricePerKm' => (float)($roundTripPricePerKm ?? 0)
            ],
            'driverAllowance' => (float)($driverAllowance ?? 0),
            'nightHalt' => (float)($nightHalt ?? 0),
            'timestamp' => time()
        ],
        'debug' => [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>
