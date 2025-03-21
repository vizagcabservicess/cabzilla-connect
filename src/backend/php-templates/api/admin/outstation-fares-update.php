
<?php
// outstation-fares-update.php - Dedicated endpoint for updating outstation fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Include database configuration
require_once __DIR__ . '/../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Outstation fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . $_SERVER['CONTENT_TYPE'] ?? 'not set');
error_log("ALL HEADERS: " . json_encode(getallheaders()));

// Get JSON data from request
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Ensure we have valid JSON input
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON parse error: " . json_last_error_msg());
    
    // Try to decode as URL encoded form data if JSON fails
    parse_str($rawInput, $formData);
    if (!empty($formData)) {
        $data = $formData;
        error_log("Parsed as form data: " . print_r($data, true));
    }
}

// If still no data, try $_POST directly
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
    error_log("Using _POST data: " . print_r($data, true));
}

// Log received data for debugging
error_log('Received outstation fares update data: ' . print_r($data, true));

// Check if data is valid
if (!$data || (!isset($data['vehicleId']) && !isset($data['vehicle_id']) && !isset($data['vehicleType']))) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID',
        'receivedData' => $data
    ]);
    exit;
}

// Extract vehicle ID and normalize
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract one-way pricing
$oneWayBasePrice = floatval($data['oneWayBasePrice'] ?? $data['baseFare'] ?? 0);
$oneWayPricePerKm = floatval($data['oneWayPricePerKm'] ?? $data['pricePerKm'] ?? 0);

// Extract round-trip pricing
$roundTripBasePrice = floatval($data['roundTripBasePrice'] ?? $data['roundTripBaseFare'] ?? 0);
$roundTripPricePerKm = floatval($data['roundTripPricePerKm'] ?? $data['roundTripPricePerKm'] ?? 0);

try {
    // Connect to database - try multiple connection approaches
    $pdo = null;
    $connectionError = null;
    
    try {
        // Try using constants first
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_DATABASE, DB_USERNAME, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        $connectionError = $e->getMessage();
        error_log("First DB connection attempt failed: " . $connectionError);
        
        // Try with variables from config.php
        try {
            // Try accessing global variables from config.php
            global $db_host, $db_name, $db_user, $db_pass;
            
            if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $connectionError = null;
                error_log("Connected using global variables");
            } else {
                error_log("Global DB variables not set");
                
                // Try alternative file location
                require_once __DIR__ . '/../../config.php';
                
                // Try again with global variables
                if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $connectionError = null;
                    error_log("Connected using global variables from alternative location");
                } else {
                    // Last resort - hardcoded credentials (for testing only)
                    $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $connectionError = null;
                    error_log("Connected using hardcoded credentials");
                }
            }
        } catch (PDOException $e2) {
            $connectionError .= "; Alternative connection also failed: " . $e2->getMessage();
            error_log("All DB connection attempts failed: " . $connectionError);
        }
    }
    
    if (!$pdo) {
        throw new Exception("Database connection failed: " . $connectionError);
    }
    
    error_log("Database connection successful");
    
    // Check if vehicle exists in vehicles table
    $checkVehicleStmt = $pdo->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    $checkVehicleStmt->execute([$vehicleId, $vehicleId]);
    
    if ($checkVehicleStmt->rowCount() === 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $pdo->prepare("
            INSERT INTO vehicles 
            (id, vehicle_id, name, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        ");
        $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName]);
        error_log("Created new vehicle: $vehicleId");
    }
    
    $success = false;
    
    // APPROACH 1: Update one-way pricing
    try {
        // Check if one-way record exists
        $checkOneWayStmt = $pdo->prepare("
            SELECT id FROM vehicle_pricing 
            WHERE vehicle_id = ? AND trip_type = 'outstation-one-way'
        ");
        $checkOneWayStmt->execute([$vehicleId]);
        
        if ($checkOneWayStmt->rowCount() > 0) {
            // Update existing record
            $updateOneWayStmt = $pdo->prepare("
                UPDATE vehicle_pricing 
                SET base_fare = ?, price_per_km = ?, updated_at = NOW()
                WHERE vehicle_id = ? AND trip_type = 'outstation-one-way'
            ");
            $updateOneWayStmt->execute([$oneWayBasePrice, $oneWayPricePerKm, $vehicleId]);
            error_log("Updated one-way record");
        } else {
            // Insert new record
            $insertOneWayStmt = $pdo->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, base_fare, price_per_km, created_at, updated_at)
                VALUES (?, 'outstation-one-way', ?, ?, NOW(), NOW())
            ");
            $insertOneWayStmt->execute([$vehicleId, $oneWayBasePrice, $oneWayPricePerKm]);
            error_log("Inserted new one-way record");
        }
        
        // Check if round-trip record exists
        $checkRoundTripStmt = $pdo->prepare("
            SELECT id FROM vehicle_pricing 
            WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'
        ");
        $checkRoundTripStmt->execute([$vehicleId]);
        
        if ($checkRoundTripStmt->rowCount() > 0) {
            // Update existing record
            $updateRoundTripStmt = $pdo->prepare("
                UPDATE vehicle_pricing 
                SET base_fare = ?, price_per_km = ?, updated_at = NOW()
                WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'
            ");
            $updateRoundTripStmt->execute([$roundTripBasePrice, $roundTripPricePerKm, $vehicleId]);
            error_log("Updated round-trip record");
        } else {
            // Insert new record
            $insertRoundTripStmt = $pdo->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, base_fare, price_per_km, created_at, updated_at)
                VALUES (?, 'outstation-round-trip', ?, ?, NOW(), NOW())
            ");
            $insertRoundTripStmt->execute([$vehicleId, $roundTripBasePrice, $roundTripPricePerKm]);
            error_log("Inserted new round-trip record");
        }
        
        error_log("APPROACH 1 succeeded: Updated vehicle_pricing for outstation");
        $success = true;
    } catch (Exception $e) {
        error_log("APPROACH 1 failed: " . $e->getMessage());
    }
    
    // APPROACH 2: Try outstation_fares table
    if (!$success) {
        try {
            // First check if the table exists
            $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'outstation_fares'");
            if ($checkTableStmt->rowCount() === 0) {
                // Table doesn't exist, create it
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS outstation_fares (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        one_way_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        one_way_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        round_trip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        round_trip_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                $pdo->exec($createTableSql);
                error_log("Created outstation_fares table");
            }
            
            $alternateSql = "
                INSERT INTO outstation_fares 
                (vehicle_id, one_way_base_price, one_way_price_per_km, 
                round_trip_base_price, round_trip_price_per_km, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                one_way_base_price = VALUES(one_way_base_price),
                one_way_price_per_km = VALUES(one_way_price_per_km),
                round_trip_base_price = VALUES(round_trip_base_price),
                round_trip_price_per_km = VALUES(round_trip_price_per_km),
                updated_at = NOW()
            ";
            
            $alternateStmt = $pdo->prepare($alternateSql);
            $alternateStmt->execute([
                $vehicleId,
                $oneWayBasePrice,
                $oneWayPricePerKm,
                $roundTripBasePrice,
                $roundTripPricePerKm
            ]);
            
            error_log("APPROACH 2 succeeded: Updated outstation_fares");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 2 failed: " . $e->getMessage());
        }
    }
    
    // APPROACH 3: Try fare_prices table
    if (!$success) {
        try {
            // Check if the table exists
            $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'fare_prices'");
            if ($checkTableStmt->rowCount() === 0) {
                // Table doesn't exist, create it
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS fare_prices (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) NOT NULL,
                        package_type VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY trip_vehicle_package (vehicle_id, trip_type, package_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                $pdo->exec($createTableSql);
                error_log("Created fare_prices table");
            }
            
            // Use a transaction to ensure both inserts succeed or fail together
            $pdo->beginTransaction();
            
            // One Way
            $oneWaySql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, price_per_km, created_at, updated_at)
                VALUES (?, 'outstation', 'one_way', ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()
            ";
            $oneWayStmt = $pdo->prepare($oneWaySql);
            $oneWayStmt->execute([$vehicleId, $oneWayBasePrice, $oneWayPricePerKm]);
            
            // Round Trip
            $roundTripSql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, price_per_km, created_at, updated_at)
                VALUES (?, 'outstation', 'round_trip', ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()
            ";
            $roundTripStmt = $pdo->prepare($roundTripSql);
            $roundTripStmt->execute([$vehicleId, $roundTripBasePrice, $roundTripPricePerKm]);
            
            $pdo->commit();
            
            error_log("APPROACH 3 succeeded: Updated fare_prices for outstation");
            $success = true;
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log("APPROACH 3 failed: " . $e->getMessage());
        }
    }
    
    if (!$success) {
        throw new Exception("All database approaches failed");
    }
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'oneWay' => [
                'basePrice' => $oneWayBasePrice,
                'pricePerKm' => $oneWayPricePerKm
            ],
            'roundTrip' => [
                'basePrice' => $roundTripBasePrice,
                'pricePerKm' => $roundTripPricePerKm
            ]
        ]
    ]);
    
} catch (Exception $e) {
    // Log the full error
    error_log('Database error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'receivedData' => $data
    ]);
}
?>
