
<?php
// local-fares-update.php - Dedicated endpoint for updating local trip fares

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
$logMessage = "[$timestamp] Local fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
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
error_log('Received local fares update data: ' . print_r($data, true));

// Check if data is valid - support multiple field name variations
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

// Extract pricing data with multiple possible field names
$price8hrs80km = floatval($data['hr8km80Price'] ?? $data['price8hrs80km'] ?? $data['hr8Km80'] ?? 0);
$price10hrs100km = floatval($data['hr10km100Price'] ?? $data['price10hrs100km'] ?? $data['hr10Km100'] ?? 0);
$priceExtraKm = floatval($data['extraKmRate'] ?? $data['priceExtraKm'] ?? 0);

// Validate data
if ($price8hrs80km <= 0 && $price10hrs100km <= 0) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'At least one package price must be greater than zero',
        'receivedData' => $data
    ]);
    exit;
}

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
    
    // APPROACH 1: Try local_trip_packages table
    try {
        // First check if the table exists
        $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'local_trip_packages'");
        if ($checkTableStmt->rowCount() === 0) {
            // Table doesn't exist, create it
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS local_trip_packages (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    vehicle_id VARCHAR(50) NOT NULL,
                    price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_extra_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            $pdo->exec($createTableSql);
            error_log("Created local_trip_packages table");
        }
        
        // Check if record exists
        $checkLocalStmt = $pdo->prepare("SELECT id FROM local_trip_packages WHERE vehicle_id = ?");
        $checkLocalStmt->execute([$vehicleId]);
        
        if ($checkLocalStmt->rowCount() > 0) {
            // Update existing record
            $updateStmt = $pdo->prepare("
                UPDATE local_trip_packages 
                SET 
                    price_8hrs_80km = ?, 
                    price_10hrs_100km = ?,
                    price_extra_km = ?,
                    updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            $updateStmt->execute([$price8hrs80km, $price10hrs100km, $priceExtraKm, $vehicleId]);
        } else {
            // Insert new record
            $insertStmt = $pdo->prepare("
                INSERT INTO local_trip_packages 
                (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())
            ");
            $insertStmt->execute([$vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm]);
        }
        
        error_log("APPROACH 1 succeeded: Updated local_trip_packages");
        $success = true;
    } catch (Exception $e) {
        error_log("APPROACH 1 failed: " . $e->getMessage());
    }
    
    // APPROACH 2: Try vehicle_pricing table with package_type
    if (!$success) {
        try {
            // Use a transaction to ensure all operations succeed or fail together
            $pdo->beginTransaction();
            
            // Package 8hrs80km
            $check8hrs80kmStmt = $pdo->prepare("
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = '8hrs-80km'
            ");
            $check8hrs80kmStmt->execute([$vehicleId]);
            
            if ($check8hrs80kmStmt->rowCount() > 0) {
                // Update existing record
                $update8hrs80kmStmt = $pdo->prepare("
                    UPDATE vehicle_pricing 
                    SET base_fare = ?, updated_at = NOW() 
                    WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = '8hrs-80km'
                ");
                $update8hrs80kmStmt->execute([$price8hrs80km, $vehicleId]);
            } else {
                // Insert new record
                $insert8hrs80kmStmt = $pdo->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, package_type, base_fare, created_at, updated_at) 
                    VALUES (?, 'local', '8hrs-80km', ?, NOW(), NOW())
                ");
                $insert8hrs80kmStmt->execute([$vehicleId, $price8hrs80km]);
            }
            
            // Package 10hrs100km
            $check10hrs100kmStmt = $pdo->prepare("
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = '10hrs-100km'
            ");
            $check10hrs100kmStmt->execute([$vehicleId]);
            
            if ($check10hrs100kmStmt->rowCount() > 0) {
                // Update existing record
                $update10hrs100kmStmt = $pdo->prepare("
                    UPDATE vehicle_pricing 
                    SET base_fare = ?, updated_at = NOW() 
                    WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = '10hrs-100km'
                ");
                $update10hrs100kmStmt->execute([$price10hrs100km, $vehicleId]);
            } else {
                // Insert new record
                $insert10hrs100kmStmt = $pdo->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, package_type, base_fare, created_at, updated_at) 
                    VALUES (?, 'local', '10hrs-100km', ?, NOW(), NOW())
                ");
                $insert10hrs100kmStmt->execute([$vehicleId, $price10hrs100km]);
            }
            
            // Extra km rate
            $checkExtraKmStmt = $pdo->prepare("
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = 'extra-km'
            ");
            $checkExtraKmStmt->execute([$vehicleId]);
            
            if ($checkExtraKmStmt->rowCount() > 0) {
                // Update existing record
                $updateExtraKmStmt = $pdo->prepare("
                    UPDATE vehicle_pricing 
                    SET price_per_km = ?, updated_at = NOW() 
                    WHERE vehicle_id = ? AND trip_type = 'local' AND package_type = 'extra-km'
                ");
                $updateExtraKmStmt->execute([$priceExtraKm, $vehicleId]);
            } else {
                // Insert new record
                $insertExtraKmStmt = $pdo->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, package_type, price_per_km, created_at, updated_at) 
                    VALUES (?, 'local', 'extra-km', ?, NOW(), NOW())
                ");
                $insertExtraKmStmt->execute([$vehicleId, $priceExtraKm]);
            }
            
            $pdo->commit();
            
            error_log("APPROACH 2 succeeded: Updated vehicle_pricing for local packages");
            $success = true;
        } catch (Exception $e) {
            $pdo->rollBack();
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
            
            // Use a transaction to ensure all inserts succeed or fail together
            $pdo->beginTransaction();
            
            // 8hrs-80km package
            $pkg8hrs80kmSql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                VALUES (?, 'local', '8hrs-80km', ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                updated_at = NOW()
            ";
            $pkg8hrs80kmStmt = $pdo->prepare($pkg8hrs80kmSql);
            $pkg8hrs80kmStmt->execute([$vehicleId, $price8hrs80km]);
            
            // 10hrs-100km package
            $pkg10hrs100kmSql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                VALUES (?, 'local', '10hrs-100km', ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                updated_at = NOW()
            ";
            $pkg10hrs100kmStmt = $pdo->prepare($pkg10hrs100kmSql);
            $pkg10hrs100kmStmt->execute([$vehicleId, $price10hrs100km]);
            
            // Extra km rate
            $extraKmSql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, price_per_km, created_at, updated_at)
                VALUES (?, 'local', 'extra-km', ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()
            ";
            $extraKmStmt = $pdo->prepare($extraKmSql);
            $extraKmStmt->execute([$vehicleId, $priceExtraKm]);
            
            $pdo->commit();
            
            error_log("APPROACH 3 succeeded: Updated fare_prices for local packages");
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
        'message' => 'Local fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'packages' => [
                '8hrs-80km' => $price8hrs80km,
                '10hrs-100km' => $price10hrs100km,
                'extra-km' => $priceExtraKm
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
