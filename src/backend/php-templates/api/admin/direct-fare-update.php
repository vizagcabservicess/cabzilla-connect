
<?php
// direct-fare-update.php - Central endpoint for all fare updates

require_once '../../config.php';

// Set headers for CORS and content type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Custom-Timestamp, X-API-Version, X-Client-Version, X-Authorization-Override, X-Debug-Mode, X-Cache-Control, X-Request-ID, X-Request-Source');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request for debugging
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[" . date('Y-m-d H:i:s') . "] Direct fare update $requestMethod request to: $requestUri\n";
error_log($logMessage, 3, __DIR__ . '/../access.log');

// Debug output
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
error_log("CONTENT_TYPE: " . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'not set'));
error_log("RAW POST: " . file_get_contents('php://input'));
error_log("POST DATA: " . print_r($_POST, true));
error_log("GET DATA: " . print_r($_GET, true));

// Try to get data from multiple sources
function getRequestData() {
    $data = [];
    
    // For JSON payload
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
            error_log("Parsed JSON data: " . print_r($jsonData, true));
        } else {
            // Try to parse as URL encoded
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
                error_log("Parsed URL encoded data: " . print_r($formData, true));
            } else {
                error_log("Failed to parse JSON: " . json_last_error_msg());
            }
        }
    }
    
    // For POST form data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
        error_log("Found POST data: " . print_r($_POST, true));
    }
    
    // For GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
        error_log("Found GET data: " . print_r($_GET, true));
    }
    
    return $data;
}

// Database connection function with error handling
function getDbConnection() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            error_log("Connected to database using constants");
            return $conn;
        }

        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            error_log("Connected to database using globals");
            return $conn;
        }

        // Fallback to hardcoded credentials as last resort (for development only)
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        error_log("Connected to database using hardcoded values");
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e; // Re-throw to be caught by the main try-catch
    }
}

// Create or ensure tables exist
function ensureTablesExist($conn) {
    try {
        // Create vehicle_types table
        $sql = "
        CREATE TABLE IF NOT EXISTS vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255),
            description TEXT,
            amenities TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Failed to create vehicle_types table: " . $conn->error);
        }
        
        // Create vehicle_pricing table
        $sql = "
        CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_type VARCHAR(50) NOT NULL,
            trip_type VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_trip_type (vehicle_type, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        // Create outstation_fares table
        $sql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Failed to create outstation_fares table: " . $conn->error);
        }
        
        // Create airport_fares table
        $sql = "
        CREATE TABLE IF NOT EXISTS airport_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            drop_price DECIMAL(10,2) DEFAULT 0,
            pickup_price DECIMAL(10,2) DEFAULT 0,
            tier1_price DECIMAL(10,2) DEFAULT 0,
            tier2_price DECIMAL(10,2) DEFAULT 0,
            tier3_price DECIMAL(10,2) DEFAULT 0,
            tier4_price DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Failed to create airport_fares table: " . $conn->error);
        }
        
        // Create local_fares table
        $sql = "
        CREATE TABLE IF NOT EXISTS local_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            package_4hr_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
            package_8hr_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
            package_10hr_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
            extra_km_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
            extra_hour_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Failed to create local_fares table: " . $conn->error);
        }
        
        error_log("All tables created successfully");
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring tables: " . $e->getMessage());
        throw $e;
    }
}

try {
    // Get all request data
    $requestData = getRequestData();
    error_log("Combined request data: " . print_r($requestData, true));
    
    // Extract trip type - try multiple possible keys
    $tripType = 'outstation'; // Default to outstation
    if (isset($requestData['tripType'])) $tripType = $requestData['tripType'];
    else if (isset($requestData['trip_type'])) $tripType = $requestData['trip_type'];
    
    // Extract vehicle ID - try multiple possible keys
    $vehicleId = null;
    $possibleIdKeys = ['vehicleId', 'vehicle_id', 'id', 'cab_id', 'cabType', 'vehicle'];
    
    foreach ($possibleIdKeys as $key) {
        if (isset($requestData[$key]) && !empty($requestData[$key])) {
            $vehicleId = $requestData[$key];
            break;
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    error_log("Processing $tripType fare update for vehicle: " . $vehicleId);
    
    // Clean vehicle ID - remove any prefix
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure the necessary tables exist
    ensureTablesExist($conn);
    
    // Route to the appropriate handler based on trip type
    switch ($tripType) {
        case 'outstation':
            // Redirect to outstation handler
            require_once __DIR__ . '/direct-outstation-fares.php';
            break;
            
        case 'airport':
            // Extract airport fare data
            $basePrice = isset($requestData['basePrice']) ? floatval($requestData['basePrice']) : 0;
            $pricePerKm = isset($requestData['pricePerKm']) ? floatval($requestData['pricePerKm']) : 0;
            $dropPrice = isset($requestData['dropPrice']) ? floatval($requestData['dropPrice']) : 0;
            $pickupPrice = isset($requestData['pickupPrice']) ? floatval($requestData['pickupPrice']) : 0;
            $tier1Price = isset($requestData['tier1Price']) ? floatval($requestData['tier1Price']) : 0;
            $tier2Price = isset($requestData['tier2Price']) ? floatval($requestData['tier2Price']) : 0;
            $tier3Price = isset($requestData['tier3Price']) ? floatval($requestData['tier3Price']) : 0;
            $tier4Price = isset($requestData['tier4Price']) ? floatval($requestData['tier4Price']) : 0;
            $extraKmCharge = isset($requestData['extraKmCharge']) ? floatval($requestData['extraKmCharge']) : 0;
            
            // Write to vehicle table first if needed
            $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ? LIMIT 1");
            if ($checkVehicleStmt) {
                $checkVehicleStmt->bind_param("s", $vehicleId);
                $checkVehicleStmt->execute();
                $vehicleResult = $checkVehicleStmt->get_result();
                
                if ($vehicleResult->num_rows == 0) {
                    // Vehicle doesn't exist, create it
                    $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                    $insertVehicleStmt = $conn->prepare("
                        INSERT INTO vehicle_types (vehicle_id, name, capacity, is_active) 
                        VALUES (?, ?, 4, 1)
                    ");
                    if ($insertVehicleStmt) {
                        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
                        $insertVehicleStmt->execute();
                        error_log("Created new vehicle type: " . $vehicleId);
                    }
                }
            }
            
            // Check if airport fare record exists
            $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM airport_fares WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $row = $checkResult->fetch_assoc();
            
            if ($row['count'] > 0) {
                // Update existing record
                $updateSql = "
                    UPDATE airport_fares 
                    SET base_price = ?, price_per_km = ?, drop_price = ?, pickup_price = ?,
                        tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?,
                        extra_km_charge = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateSql);
                if (!$updateStmt) {
                    throw new Exception("Prepare failed for update: " . $conn->error);
                }
                
                $updateStmt->bind_param(
                    "ddddddddds",
                    $basePrice, $pricePerKm, $dropPrice, $pickupPrice,
                    $tier1Price, $tier2Price, $tier3Price, $tier4Price,
                    $extraKmCharge, $vehicleId
                );
                
                if (!$updateStmt->execute()) {
                    throw new Exception("Update execution failed: " . $updateStmt->error);
                }
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Airport pricing updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm
                    ]
                ]);
            } else {
                // Insert new record
                $insertSql = "
                    INSERT INTO airport_fares 
                    (vehicle_id, base_price, price_per_km, drop_price, pickup_price,
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                
                $insertStmt = $conn->prepare($insertSql);
                if (!$insertStmt) {
                    throw new Exception("Prepare failed for insert: " . $conn->error);
                }
                
                $insertStmt->bind_param(
                    "sddddddddd",
                    $vehicleId, $basePrice, $pricePerKm, $dropPrice, $pickupPrice,
                    $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge
                );
                
                if (!$insertStmt->execute()) {
                    throw new Exception("Insert execution failed: " . $insertStmt->error);
                }
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Airport pricing added successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm
                    ]
                ]);
            }
            
            // Also update vehicle_pricing table for compatibility
            try {
                $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'airport'");
                if ($checkPricingStmt) {
                    $checkPricingStmt->bind_param("s", $vehicleId);
                    $checkPricingStmt->execute();
                    $pricingResult = $checkPricingStmt->get_result();
                    $pricingRow = $pricingResult->fetch_assoc();
                    
                    if ($pricingRow['count'] > 0) {
                        // Update pricing
                        $updatePricingStmt = $conn->prepare("
                            UPDATE vehicle_pricing 
                            SET base_price = ?, price_per_km = ?, updated_at = NOW()
                            WHERE vehicle_type = ? AND trip_type = 'airport'
                        ");
                        if ($updatePricingStmt) {
                            $updatePricingStmt->bind_param("dds", $basePrice, $pricePerKm, $vehicleId);
                            $updatePricingStmt->execute();
                        }
                    } else {
                        // Insert pricing
                        $insertPricingStmt = $conn->prepare("
                            INSERT INTO vehicle_pricing 
                            (vehicle_type, trip_type, base_price, price_per_km)
                            VALUES (?, 'airport', ?, ?)
                        ");
                        if ($insertPricingStmt) {
                            $insertPricingStmt->bind_param("sdd", $vehicleId, $basePrice, $pricePerKm);
                            $insertPricingStmt->execute();
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Error updating vehicle_pricing table: " . $e->getMessage());
                // Continue execution, this is just a backup update
            }
            break;
            
        case 'local':
            // Extract local fare data
            $package4hr40km = isset($requestData['package4hr40km']) ? floatval($requestData['package4hr40km']) : 0;
            $package8hr80km = isset($requestData['package8hr80km']) ? floatval($requestData['package8hr80km']) : 0;
            $package10hr100km = isset($requestData['package10hr100km']) ? floatval($requestData['package10hr100km']) : 0;
            $extraKmRate = isset($requestData['extraKmRate']) ? floatval($requestData['extraKmRate']) : 0;
            $extraHourRate = isset($requestData['extraHourRate']) ? floatval($requestData['extraHourRate']) : 0;
            
            // Write to vehicle table first if needed
            $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ? LIMIT 1");
            if ($checkVehicleStmt) {
                $checkVehicleStmt->bind_param("s", $vehicleId);
                $checkVehicleStmt->execute();
                $vehicleResult = $checkVehicleStmt->get_result();
                
                if ($vehicleResult->num_rows == 0) {
                    // Vehicle doesn't exist, create it
                    $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                    $insertVehicleStmt = $conn->prepare("
                        INSERT INTO vehicle_types (vehicle_id, name, capacity, is_active) 
                        VALUES (?, ?, 4, 1)
                    ");
                    if ($insertVehicleStmt) {
                        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
                        $insertVehicleStmt->execute();
                        error_log("Created new vehicle type: " . $vehicleId);
                    }
                }
            }
            
            // Check if local fare record exists
            $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM local_fares WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $row = $checkResult->fetch_assoc();
            
            if ($row['count'] > 0) {
                // Update existing record
                $updateSql = "
                    UPDATE local_fares 
                    SET package_4hr_40km = ?, package_8hr_80km = ?, package_10hr_100km = ?,
                        extra_km_rate = ?, extra_hour_rate = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateSql);
                if (!$updateStmt) {
                    throw new Exception("Prepare failed for update: " . $conn->error);
                }
                
                $updateStmt->bind_param(
                    "ddddds",
                    $package4hr40km, $package8hr80km, $package10hr100km,
                    $extraKmRate, $extraHourRate, $vehicleId
                );
                
                if (!$updateStmt->execute()) {
                    throw new Exception("Update execution failed: " . $updateStmt->error);
                }
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Local pricing updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'package4hr40km' => $package4hr40km,
                        'package8hr80km' => $package8hr80km,
                        'package10hr100km' => $package10hr100km
                    ]
                ]);
            } else {
                // Insert new record
                $insertSql = "
                    INSERT INTO local_fares 
                    (vehicle_id, package_4hr_40km, package_8hr_80km, package_10hr_100km,
                    extra_km_rate, extra_hour_rate)
                    VALUES (?, ?, ?, ?, ?, ?)
                ";
                
                $insertStmt = $conn->prepare($insertSql);
                if (!$insertStmt) {
                    throw new Exception("Prepare failed for insert: " . $conn->error);
                }
                
                $insertStmt->bind_param(
                    "sddddd",
                    $vehicleId, $package4hr40km, $package8hr80km, $package10hr100km,
                    $extraKmRate, $extraHourRate
                );
                
                if (!$insertStmt->execute()) {
                    throw new Exception("Insert execution failed: " . $insertStmt->error);
                }
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Local pricing added successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'package4hr40km' => $package4hr40km,
                        'package8hr80km' => $package8hr80km,
                        'package10hr100km' => $package10hr100km
                    ]
                ]);
            }
            
            // Also update vehicle_pricing table for compatibility
            try {
                $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'");
                if ($checkPricingStmt) {
                    $checkPricingStmt->bind_param("s", $vehicleId);
                    $checkPricingStmt->execute();
                    $pricingResult = $checkPricingStmt->get_result();
                    $pricingRow = $pricingResult->fetch_assoc();
                    
                    if ($pricingRow['count'] > 0) {
                        // Update pricing - use the 8hr80km as the standard price
                        $updatePricingStmt = $conn->prepare("
                            UPDATE vehicle_pricing 
                            SET base_price = ?, price_per_km = ?, updated_at = NOW()
                            WHERE vehicle_type = ? AND trip_type = 'local'
                        ");
                        if ($updatePricingStmt) {
                            $updatePricingStmt->bind_param("dds", $package8hr80km, $extraKmRate, $vehicleId);
                            $updatePricingStmt->execute();
                        }
                    } else {
                        // Insert pricing
                        $insertPricingStmt = $conn->prepare("
                            INSERT INTO vehicle_pricing 
                            (vehicle_type, trip_type, base_price, price_per_km)
                            VALUES (?, 'local', ?, ?)
                        ");
                        if ($insertPricingStmt) {
                            $insertPricingStmt->bind_param("sdd", $vehicleId, $package8hr80km, $extraKmRate);
                            $insertPricingStmt->execute();
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Error updating vehicle_pricing table: " . $e->getMessage());
                // Continue execution, this is just a backup update
            }
            break;
            
        default:
            // Default handler for base pricing
            $basePrice = isset($requestData['basePrice']) ? floatval($requestData['basePrice']) : 0;
            $pricePerKm = isset($requestData['pricePerKm']) ? floatval($requestData['pricePerKm']) : 0;
            $nightHaltCharge = isset($requestData['nightHaltCharge']) ? floatval($requestData['nightHaltCharge']) : 0;
            $driverAllowance = isset($requestData['driverAllowance']) ? floatval($requestData['driverAllowance']) : 0;
            
            // Write to vehicle table first if needed
            $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ? LIMIT 1");
            if ($checkVehicleStmt) {
                $checkVehicleStmt->bind_param("s", $vehicleId);
                $checkVehicleStmt->execute();
                $vehicleResult = $checkVehicleStmt->get_result();
                
                if ($vehicleResult->num_rows == 0) {
                    // Vehicle doesn't exist, create it
                    $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                    $insertVehicleStmt = $conn->prepare("
                        INSERT INTO vehicle_types (vehicle_id, name, capacity, is_active) 
                        VALUES (?, ?, 4, 1)
                    ");
                    if ($insertVehicleStmt) {
                        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
                        $insertVehicleStmt->execute();
                        error_log("Created new vehicle type: " . $vehicleId);
                    }
                }
            }
            
            // Check if pricing record exists
            $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'base'");
            if ($checkPricingStmt) {
                $checkPricingStmt->bind_param("s", $vehicleId);
                $checkPricingStmt->execute();
                $pricingResult = $checkPricingStmt->get_result();
                $pricingRow = $pricingResult->fetch_assoc();
                
                if ($pricingRow['count'] > 0) {
                    // Update pricing
                    $updatePricingStmt = $conn->prepare("
                        UPDATE vehicle_pricing 
                        SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW()
                        WHERE vehicle_type = ? AND trip_type = 'base'
                    ");
                    if ($updatePricingStmt) {
                        $updatePricingStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                        $updatePricingStmt->execute();
                        
                        echo json_encode([
                            'status' => 'success',
                            'message' => 'Base pricing updated successfully',
                            'data' => [
                                'vehicleId' => $vehicleId,
                                'basePrice' => $basePrice,
                                'pricePerKm' => $pricePerKm,
                                'nightHaltCharge' => $nightHaltCharge,
                                'driverAllowance' => $driverAllowance
                            ]
                        ]);
                    } else {
                        throw new Exception("Failed to prepare base pricing update: " . $conn->error);
                    }
                } else {
                    // Insert pricing
                    $insertPricingStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_type, trip_type, base_price, price_per_km, night_halt_charge, driver_allowance)
                        VALUES (?, 'base', ?, ?, ?, ?)
                    ");
                    if ($insertPricingStmt) {
                        $insertPricingStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                        $insertPricingStmt->execute();
                        
                        echo json_encode([
                            'status' => 'success',
                            'message' => 'Base pricing added successfully',
                            'data' => [
                                'vehicleId' => $vehicleId,
                                'basePrice' => $basePrice,
                                'pricePerKm' => $pricePerKm,
                                'nightHaltCharge' => $nightHaltCharge,
                                'driverAllowance' => $driverAllowance
                            ]
                        ]);
                    } else {
                        throw new Exception("Failed to prepare base pricing insert: " . $conn->error);
                    }
                }
            } else {
                throw new Exception("Failed to check existing base pricing: " . $conn->error);
            }
            break;
    }
} catch (Exception $e) {
    error_log("Error in direct-fare-update.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
