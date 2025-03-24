
<?php
// direct-fare-update.php - Ultra simplified fare update endpoint for all trip types
// This is a standalone script with minimal dependencies for maximum reliability

// Set CORS headers for all cases
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
$requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
$tripType = $_GET['tripType'] ?? $_POST['tripType'] ?? $_GET['trip_type'] ?? $_POST['trip_type'] ?? 'unknown';

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

error_log("[$timestamp] Direct fare update request received: URI=$requestUri, Method=" . $_SERVER['REQUEST_METHOD'] . ", TripType=$tripType", 3, "$logsDir/direct-fares.log");
error_log("Raw input: $requestData", 3, "$logsDir/direct-fares.log");

// Get data from all possible sources - maximum flexibility
$data = [];

// Try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true), 3, "$logsDir/direct-fares.log");
}

// If no POST data, try JSON input
if (empty($data) || count($data) <= 1) {
    if (!empty($requestData)) {
        $jsonData = json_decode($requestData, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $data = $jsonData;
            error_log("Using JSON data: " . print_r($data, true), 3, "$logsDir/direct-fares.log");
        } else {
            // Try parsing as form data
            parse_str($requestData, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("Parsed raw input as form data: " . print_r($data, true), 3, "$logsDir/direct-fares.log");
            }
        }
    }
}

// Finally try GET parameters
if (empty($data) && !empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data: " . print_r($data, true), 3, "$logsDir/direct-fares.log");
}

// Extract vehicle ID and normalize using any of the possible field names
$vehicleId = '';
foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id', 'cab', 'cabType'] as $field) {
    if (!empty($data[$field])) {
        $vehicleId = $data[$field];
        break;
    }
}

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Determine trip type with multiple fallbacks
$tripType = strtolower($data['tripType'] ?? $data['trip_type'] ?? $data['type'] ?? $tripType ?? 'outstation');

error_log("Processing fare update for vehicle: $vehicleId, trip type: $tripType", 3, "$logsDir/direct-fares.log");

// Database Connection Function - super reliable with multiple fallbacks
function getDbConnection() {
    $attempts = 0;
    $maxAttempts = 3;
    $lastError = '';
    
    while ($attempts < $maxAttempts) {
        try {
            $attempts++;
            
            // First try using constants from config.php if available
            if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
                $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
                if (!$conn->connect_error) {
                    return $conn;
                }
                $lastError = "Connection failed using constants: " . $conn->connect_error;
            }
            
            // Then try global variables that might be defined
            global $db_host, $db_name, $db_user, $db_pass;
            if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
                if (!$conn->connect_error) {
                    return $conn;
                }
                $lastError = "Connection failed using globals: " . $conn->connect_error;
            }
            
            // Hardcoded credentials as last resort
            $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
            if (!$conn->connect_error) {
                return $conn;
            }
            $lastError = "Connection failed using hardcoded values: " . $conn->connect_error;
            
            // If we reach here, try with PDO as last resort
            try {
                $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                return $pdo; // Return PDO connection
            } catch (PDOException $e) {
                $lastError = "PDO connection failed: " . $e->getMessage();
            }
            
            // Wait briefly before retry
            usleep(250000); // 250ms
        } catch (Exception $e) {
            $lastError = "Exception in connection attempt $attempts: " . $e->getMessage();
        }
    }
    
    throw new Exception("Failed to connect to database after $maxAttempts attempts. Last error: $lastError");
}

// Function to ensure all required tables exist
function ensureTables($conn) {
    // Define table creation queries
    $createTableQueries = [
        // Local package fares table
        "CREATE TABLE IF NOT EXISTS local_package_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            price_4hrs_40km DECIMAL(10,2) DEFAULT 0,
            price_8hrs_80km DECIMAL(10,2) DEFAULT 0,
            price_10hrs_100km DECIMAL(10,2) DEFAULT 0,
            price_extra_km DECIMAL(10,2) DEFAULT 0,
            price_extra_hour DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        // Outstation fares table
        "CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            roundtrip_price_multiplier DECIMAL(5,2) DEFAULT 1.0,
            min_km_per_day DECIMAL(10,2) DEFAULT 250,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        // Airport fares table
        "CREATE TABLE IF NOT EXISTS airport_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            pickup_price DECIMAL(10,2) DEFAULT 0,
            drop_price DECIMAL(10,2) DEFAULT 0,
            tier1_price DECIMAL(10,2) DEFAULT 0,
            tier2_price DECIMAL(10,2) DEFAULT 0,
            tier3_price DECIMAL(10,2) DEFAULT 0,
            tier4_price DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        // Vehicle pricing table (legacy)
        "CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_type VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            local_package_4hr DECIMAL(10,2) DEFAULT 0,
            local_package_8hr DECIMAL(10,2) DEFAULT 0,
            local_package_10hr DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(10,2) DEFAULT 0,
            extra_hour_charge DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_type (vehicle_type)
        )"
    ];
    
    // Determine if we're using mysqli or PDO
    if ($conn instanceof mysqli) {
        foreach ($createTableQueries as $query) {
            if ($conn->query($query) !== TRUE) {
                error_log("Error creating table: " . $conn->error, 3, __DIR__ . '/../logs/database-errors.log');
                // Continue anyway - maybe the table already exists
            }
        }
    } else if ($conn instanceof PDO) {
        foreach ($createTableQueries as $query) {
            try {
                $conn->exec($query);
            } catch (PDOException $e) {
                error_log("PDO Error creating table: " . $e->getMessage(), 3, __DIR__ . '/../logs/database-errors.log');
                // Continue anyway - maybe the table already exists
            }
        }
    }
    
    return true;
}

// Handle the actual fare update
try {
    // Connect to database 
    $conn = getDbConnection();
    
    // Ensure all tables exist
    ensureTables($conn);
    
    // Prepare response data
    $responseData = [
        'status' => 'success',
        'message' => ucfirst($tripType) . ' fares updated successfully',
        'vehicleId' => $vehicleId,
        'tripType' => $tripType,
        'timestamp' => time()
    ];
    
    // Process based on trip type
    if ($tripType === 'local') {
        // Handle local packages
        $package4hr = 0;
        foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hrs_40km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package4hr = floatval($data[$field]);
                break;
            }
        }
        
        $package8hr = 0;
        foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hrs_80km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package8hr = floatval($data[$field]);
                break;
            }
        }
        
        $package10hr = 0;
        foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $package10hr = floatval($data[$field]);
                break;
            }
        }
        
        $extraKmRate = 0;
        foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'price_extra_km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraKmRate = floatval($data[$field]);
                break;
            }
        }
        
        $extraHourRate = 0;
        foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'price_extra_hour'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraHourRate = floatval($data[$field]);
                break;
            }
        }
        
        // Log the received values
        error_log("Local Packages - 4hr: $package4hr, 8hr: $package8hr, 10hr: $package10hr", 3, "$logsDir/direct-fares.log");
        
        // Add data to response
        $responseData['data'] = [
            'package4hr40km' => $package4hr,
            'package8hr80km' => $package8hr,
            'package10hr100km' => $package10hr,
            'extraKmRate' => $extraKmRate,
            'extraHourRate' => $extraHourRate
        ];
        
        // Update in database
        if ($conn instanceof mysqli) {
            // Check if record exists
            $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateSql = "UPDATE local_package_fares 
                             SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?,
                                 price_extra_km = ?, price_extra_hour = ?, updated_at = NOW()
                             WHERE vehicle_id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("ddddds", $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate, $vehicleId);
                $updateStmt->execute();
            } else {
                // Insert new record
                $insertSql = "INSERT INTO local_package_fares 
                             (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                             VALUES (?, ?, ?, ?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("sddddd", $vehicleId, $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate);
                $insertStmt->execute();
            }
            
            // Also update legacy table for maximum compatibility
            $legacyStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
            $legacyStmt->bind_param("s", $vehicleId);
            $legacyStmt->execute();
            $legacyResult = $legacyStmt->get_result();
            
            if ($legacyResult->num_rows > 0) {
                // Update existing record
                $legacyUpdateSql = "UPDATE vehicle_pricing 
                                  SET local_package_4hr = ?, local_package_8hr = ?, local_package_10hr = ?,
                                      extra_km_charge = ?, extra_hour_charge = ?, updated_at = NOW()
                                  WHERE vehicle_type = ?";
                $legacyUpdateStmt = $conn->prepare($legacyUpdateSql);
                $legacyUpdateStmt->bind_param("ddddds", $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate, $vehicleId);
                $legacyUpdateStmt->execute();
            } else {
                // Insert with minimal fields
                $legacyInsertSql = "INSERT INTO vehicle_pricing 
                                  (vehicle_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge)
                                  VALUES (?, ?, ?, ?, ?, ?)";
                $legacyInsertStmt = $conn->prepare($legacyInsertSql);
                $legacyInsertStmt->bind_param("sddddd", $vehicleId, $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate);
                $legacyInsertStmt->execute();
            }
        } else if ($conn instanceof PDO) {
            // Same operations using PDO
            try {
                // Check if record exists
                $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
                $stmt->execute([$vehicleId]);
                
                if ($stmt->rowCount() > 0) {
                    // Update existing record
                    $updateSql = "UPDATE local_package_fares 
                                 SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?,
                                     price_extra_km = ?, price_extra_hour = ?, updated_at = NOW()
                                 WHERE vehicle_id = ?";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->execute([$package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate, $vehicleId]);
                } else {
                    // Insert new record
                    $insertSql = "INSERT INTO local_package_fares 
                                 (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                                 VALUES (?, ?, ?, ?, ?, ?)";
                    $insertStmt = $conn->prepare($insertSql);
                    $insertStmt->execute([$vehicleId, $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate]);
                }
                
                // Also update legacy table
                $legacyStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
                $legacyStmt->execute([$vehicleId]);
                
                if ($legacyStmt->rowCount() > 0) {
                    // Update existing record
                    $legacyUpdateSql = "UPDATE vehicle_pricing 
                                      SET local_package_4hr = ?, local_package_8hr = ?, local_package_10hr = ?,
                                          extra_km_charge = ?, extra_hour_charge = ?, updated_at = NOW()
                                      WHERE vehicle_type = ?";
                    $legacyUpdateStmt = $conn->prepare($legacyUpdateSql);
                    $legacyUpdateStmt->execute([$package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate, $vehicleId]);
                } else {
                    // Insert with minimal fields
                    $legacyInsertSql = "INSERT INTO vehicle_pricing 
                                      (vehicle_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge)
                                      VALUES (?, ?, ?, ?, ?, ?)";
                    $legacyInsertStmt = $conn->prepare($legacyInsertSql);
                    $legacyInsertStmt->execute([$vehicleId, $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate]);
                }
            } catch (PDOException $e) {
                throw new Exception("PDO Error: " . $e->getMessage());
            }
        }
        
    } else if ($tripType === 'airport') {
        // Handle airport fares
        $basePrice = 0;
        foreach (['basePrice', 'base_price', 'base', 'airport_base_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $basePrice = floatval($data[$field]);
                break;
            }
        }
        
        $pricePerKm = 0;
        foreach (['pricePerKm', 'price_per_km', 'perKmRate', 'airport_price_per_km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pricePerKm = floatval($data[$field]);
                break;
            }
        }
        
        $pickupPrice = 0;
        foreach (['pickupPrice', 'pickup_price', 'pickupCharge', 'airport_pickup_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pickupPrice = floatval($data[$field]);
                break;
            }
        }
        
        $dropPrice = 0;
        foreach (['dropPrice', 'drop_price', 'dropCharge', 'airport_drop_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $dropPrice = floatval($data[$field]);
                break;
            }
        }
        
        $tier1Price = 0;
        foreach (['tier1Price', 'tier1_price', 'tier1', 'airport_tier1_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier1Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier2Price = 0;
        foreach (['tier2Price', 'tier2_price', 'tier2', 'airport_tier2_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier2Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier3Price = 0;
        foreach (['tier3Price', 'tier3_price', 'tier3', 'airport_tier3_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier3Price = floatval($data[$field]);
                break;
            }
        }
        
        $tier4Price = 0;
        foreach (['tier4Price', 'tier4_price', 'tier4', 'airport_tier4_price'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $tier4Price = floatval($data[$field]);
                break;
            }
        }
        
        $extraKmCharge = 0;
        foreach (['extraKmCharge', 'extra_km_charge', 'airport_extra_km_charge'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $extraKmCharge = floatval($data[$field]);
                break;
            }
        }
        
        // Log the received values
        error_log("Airport Fares - Base: $basePrice, Per KM: $pricePerKm", 3, "$logsDir/direct-fares.log");
        
        // Add data to response
        $responseData['data'] = [
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge
        ];
        
        // Update in database
        if ($conn instanceof mysqli) {
            // Check if record exists
            $stmt = $conn->prepare("SELECT id FROM airport_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateSql = "UPDATE airport_fares 
                             SET base_price = ?, price_per_km = ?, pickup_price = ?, drop_price = ?,
                                 tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?,
                                 extra_km_charge = ?, updated_at = NOW()
                             WHERE vehicle_id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("ddddddddds", $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                                      $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge, $vehicleId);
                $updateStmt->execute();
            } else {
                // Insert new record
                $insertSql = "INSERT INTO airport_fares 
                             (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                              tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("sddddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice,
                                      $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
                $insertStmt->execute();
            }
        } else if ($conn instanceof PDO) {
            // Same operations using PDO
            try {
                // Check if record exists
                $stmt = $conn->prepare("SELECT id FROM airport_fares WHERE vehicle_id = ?");
                $stmt->execute([$vehicleId]);
                
                if ($stmt->rowCount() > 0) {
                    // Update existing record
                    $updateSql = "UPDATE airport_fares 
                                 SET base_price = ?, price_per_km = ?, pickup_price = ?, drop_price = ?,
                                     tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?,
                                     extra_km_charge = ?, updated_at = NOW()
                                 WHERE vehicle_id = ?";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->execute([$basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                                        $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge, $vehicleId]);
                } else {
                    // Insert new record
                    $insertSql = "INSERT INTO airport_fares 
                                 (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                                  tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $insertStmt = $conn->prepare($insertSql);
                    $insertStmt->execute([$vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice,
                                        $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge]);
                }
            } catch (PDOException $e) {
                throw new Exception("PDO Error: " . $e->getMessage());
            }
        }
        
    } else if ($tripType === 'outstation') {
        // Handle outstation fares
        $basePrice = 0;
        foreach (['basePrice', 'base_price', 'base', 'one_way_base'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $basePrice = floatval($data[$field]);
                break;
            }
        }
        
        $pricePerKm = 0;
        foreach (['pricePerKm', 'price_per_km', 'perKmRate', 'per_km'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $pricePerKm = floatval($data[$field]);
                break;
            }
        }
        
        $driverAllowance = 0;
        foreach (['driverAllowance', 'driver_allowance', 'driverPerDay', 'driver_per_day'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $driverAllowance = floatval($data[$field]);
                break;
            }
        }
        
        $nightHaltCharge = 0;
        foreach (['nightHaltCharge', 'night_halt_charge', 'nightHalt', 'night_halt'] as $field) {
            if (isset($data[$field]) && is_numeric($data[$field])) {
                $nightHaltCharge = floatval($data[$field]);
                break;
            }
        }
        
        // Set some defaults if values are missing
        if ($basePrice <= 0) $basePrice = 4000; // Default base price
        if ($pricePerKm <= 0) $pricePerKm = 14; // Default price per km
        if ($driverAllowance <= 0) $driverAllowance = 250; // Default driver allowance
        if ($nightHaltCharge <= 0) $nightHaltCharge = 700; // Default night halt charge
        
        // Log the received values
        error_log("Outstation Fares - Base: $basePrice, Per KM: $pricePerKm", 3, "$logsDir/direct-fares.log");
        
        // Add data to response
        $responseData['data'] = [
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'driverAllowance' => $driverAllowance,
            'nightHaltCharge' => $nightHaltCharge
        ];
        
        // Update in database
        if ($conn instanceof mysqli) {
            // Check if record exists
            $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateSql = "UPDATE outstation_fares 
                             SET base_price = ?, price_per_km = ?, driver_allowance = ?, 
                                 night_halt_charge = ?, updated_at = NOW()
                             WHERE vehicle_id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge, $vehicleId);
                $updateStmt->execute();
            } else {
                // Insert new record
                $insertSql = "INSERT INTO outstation_fares 
                             (vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge)
                             VALUES (?, ?, ?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge);
                $insertStmt->execute();
            }
            
            // Also update legacy table for maximum compatibility
            $legacyStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
            $legacyStmt->bind_param("s", $vehicleId);
            $legacyStmt->execute();
            $legacyResult = $legacyStmt->get_result();
            
            if ($legacyResult->num_rows > 0) {
                // Update existing record
                $legacyUpdateSql = "UPDATE vehicle_pricing 
                                  SET base_price = ?, price_per_km = ?, driver_allowance = ?, 
                                      night_halt_charge = ?, updated_at = NOW()
                                  WHERE vehicle_type = ?";
                $legacyUpdateStmt = $conn->prepare($legacyUpdateSql);
                $legacyUpdateStmt->bind_param("dddds", $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge, $vehicleId);
                $legacyUpdateStmt->execute();
            } else {
                // Insert with minimal fields
                $legacyInsertSql = "INSERT INTO vehicle_pricing 
                                  (vehicle_type, base_price, price_per_km, driver_allowance, night_halt_charge)
                                  VALUES (?, ?, ?, ?, ?)";
                $legacyInsertStmt = $conn->prepare($legacyInsertSql);
                $legacyInsertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge);
                $legacyInsertStmt->execute();
            }
        } else if ($conn instanceof PDO) {
            // Same operations using PDO
            try {
                // Check if record exists
                $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
                $stmt->execute([$vehicleId]);
                
                if ($stmt->rowCount() > 0) {
                    // Update existing record
                    $updateSql = "UPDATE outstation_fares 
                                 SET base_price = ?, price_per_km = ?, driver_allowance = ?, 
                                     night_halt_charge = ?, updated_at = NOW()
                                 WHERE vehicle_id = ?";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->execute([$basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge, $vehicleId]);
                } else {
                    // Insert new record
                    $insertSql = "INSERT INTO outstation_fares 
                                 (vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge)
                                 VALUES (?, ?, ?, ?, ?)";
                    $insertStmt = $conn->prepare($insertSql);
                    $insertStmt->execute([$vehicleId, $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge]);
                }
                
                // Also update legacy table
                $legacyStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
                $legacyStmt->execute([$vehicleId]);
                
                if ($legacyStmt->rowCount() > 0) {
                    // Update existing record
                    $legacyUpdateSql = "UPDATE vehicle_pricing 
                                      SET base_price = ?, price_per_km = ?, driver_allowance = ?, 
                                          night_halt_charge = ?, updated_at = NOW()
                                      WHERE vehicle_type = ?";
                    $legacyUpdateStmt = $conn->prepare($legacyUpdateSql);
                    $legacyUpdateStmt->execute([$basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge, $vehicleId]);
                } else {
                    // Insert with minimal fields
                    $legacyInsertSql = "INSERT INTO vehicle_pricing 
                                      (vehicle_type, base_price, price_per_km, driver_allowance, night_halt_charge)
                                      VALUES (?, ?, ?, ?, ?)";
                    $legacyInsertStmt = $conn->prepare($legacyInsertSql);
                    $legacyInsertStmt->execute([$vehicleId, $basePrice, $pricePerKm, $driverAllowance, $nightHaltCharge]);
                }
            } catch (PDOException $e) {
                throw new Exception("PDO Error: " . $e->getMessage());
            }
        }
    } else {
        // Unsupported trip type
        throw new Exception("Unsupported trip type: $tripType");
    }
    
    // Return success response
    echo json_encode($responseData);
    
} catch (Exception $e) {
    error_log("Error in direct-fare-update.php: " . $e->getMessage(), 3, "$logsDir/direct-fares.log");
    
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred while updating the fares: ' . $e->getMessage(),
        'tripType' => $tripType,
        'vehicleId' => $vehicleId,
        'timestamp' => time()
    ]);
}
