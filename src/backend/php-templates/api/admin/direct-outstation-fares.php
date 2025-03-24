
<?php
// direct-outstation-fares.php - Dedicated endpoint for outstation fares

// Set headers before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// For OPTIONS requests, return 200 immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Direct outstation fares request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// Load configuration if it exists
if (file_exists('../../config.php')) {
    require_once '../../config.php';
} elseif (file_exists('../config.php')) {
    require_once '../config.php';
} else {
    // Define fallback credentials if config not found
    define('DB_HOST', 'localhost');
    define('DB_USERNAME', 'u644605165_new_bookingusr');
    define('DB_PASSWORD', 'Vizag@1213');
    define('DB_DATABASE', 'u644605165_new_bookingdb');
    
    // Also set as variables for backward compatibility
    $db_host = 'localhost';
    $db_user = 'u644605165_new_bookingusr';
    $db_pass = 'Vizag@1213';
    $db_name = 'u644605165_new_bookingdb';
    
    error_log("Config file not found, using hardcoded credentials");
}

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

// Create or ensure outstation_fares table exists with correct fields
function ensureOutstationFaresTableExists($conn) {
    try {
        // Create the table if it doesn't exist
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
        
        // Check if the table exists and has all the required columns
        $requiredColumns = [
            'roundtrip_base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'roundtrip_price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0'
        ];
        
        foreach ($requiredColumns as $column => $definition) {
            $checkColumnQuery = "SHOW COLUMNS FROM outstation_fares LIKE '$column'";
            $columnResult = $conn->query($checkColumnQuery);
            
            if (!$columnResult || $columnResult->num_rows == 0) {
                $alterTableSql = "ALTER TABLE outstation_fares ADD COLUMN $column $definition";
                if ($conn->query($alterTableSql) !== TRUE) {
                    throw new Exception("Failed to add column $column: " . $conn->error);
                }
                error_log("Added missing column $column to outstation_fares table");
            }
        }
        
        error_log("outstation_fares table is ready");
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring table: " . $e->getMessage());
        throw $e;
    }
}

try {
    // Get all request data
    $requestData = getRequestData();
    error_log("Combined request data: " . print_r($requestData, true));
    
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
    
    error_log("Found vehicle ID: " . $vehicleId);
    
    // Clean vehicle ID - remove any prefix
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure the outstation_fares table exists with all required columns
    ensureOutstationFaresTableExists($conn);
    
    // Handle GET and POST/PUT methods differently
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // GET request - retrieve fares for a vehicle
        $stmt = $conn->prepare("SELECT * FROM outstation_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $fare = $result->fetch_assoc();
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'basePrice' => (float)$fare['base_price'],
                    'pricePerKm' => (float)$fare['price_per_km'],
                    'roundTripBasePrice' => (float)$fare['roundtrip_base_price'],
                    'roundTripPricePerKm' => (float)$fare['roundtrip_price_per_km'],
                    'driverAllowance' => (float)$fare['driver_allowance'],
                    'nightHalt' => (float)$fare['night_halt_charge']
                ]
            ]);
            error_log("Successfully retrieved outstation fares for vehicle: " . $vehicleId);
        } else {
            // No fare found - return default values
            echo json_encode([
                'status' => 'success',
                'message' => 'No fare data found for this vehicle, using defaults',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'basePrice' => 0,
                    'pricePerKm' => 0,
                    'roundTripBasePrice' => 0,
                    'roundTripPricePerKm' => 0,
                    'driverAllowance' => 0,
                    'nightHalt' => 0
                ]
            ]);
            error_log("No outstation fares found for vehicle: " . $vehicleId);
        }
    } else {
        // POST/PUT - update or insert fare data
        
        // Extract fare data with multiple possible key names
        $basePrice = 0;
        if (isset($requestData['basePrice'])) $basePrice = floatval($requestData['basePrice']);
        else if (isset($requestData['oneWayBasePrice'])) $basePrice = floatval($requestData['oneWayBasePrice']);
        else if (isset($requestData['baseFare'])) $basePrice = floatval($requestData['baseFare']);
        else if (isset($requestData['base_price'])) $basePrice = floatval($requestData['base_price']);
        
        $pricePerKm = 0;
        if (isset($requestData['pricePerKm'])) $pricePerKm = floatval($requestData['pricePerKm']);
        else if (isset($requestData['oneWayPricePerKm'])) $pricePerKm = floatval($requestData['oneWayPricePerKm']);
        else if (isset($requestData['price_per_km'])) $pricePerKm = floatval($requestData['price_per_km']);
        
        $roundtripBasePrice = 0;
        if (isset($requestData['roundTripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundTripBasePrice']);
        else if (isset($requestData['roundtripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundtripBasePrice']);
        else if (isset($requestData['roundtrip_base_price'])) $roundtripBasePrice = floatval($requestData['roundtrip_base_price']);
        
        $roundtripPricePerKm = 0;
        if (isset($requestData['roundTripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundTripPricePerKm']);
        else if (isset($requestData['roundtripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundtripPricePerKm']);
        else if (isset($requestData['roundtrip_price_per_km'])) $roundtripPricePerKm = floatval($requestData['roundtrip_price_per_km']);
        
        $driverAllowance = 0;
        if (isset($requestData['driverAllowance'])) $driverAllowance = floatval($requestData['driverAllowance']);
        else if (isset($requestData['driver_allowance'])) $driverAllowance = floatval($requestData['driver_allowance']);
        
        $nightHalt = 0;
        if (isset($requestData['nightHalt'])) $nightHalt = floatval($requestData['nightHalt']);
        else if (isset($requestData['nightHaltCharge'])) $nightHalt = floatval($requestData['nightHaltCharge']);
        else if (isset($requestData['night_halt_charge'])) $nightHalt = floatval($requestData['night_halt_charge']);
        
        error_log("Extracted fare data: basePrice=$basePrice, pricePerKm=$pricePerKm, roundtripBasePrice=$roundtripBasePrice, roundtripPricePerKm=$roundtripPricePerKm, driverAllowance=$driverAllowance, nightHalt=$nightHalt");
        
        // Ensure values are not blank strings or null, set to 0 if so
        if (empty($basePrice) && $basePrice !== 0) $basePrice = 0;
        if (empty($pricePerKm) && $pricePerKm !== 0) $pricePerKm = 0;
        if (empty($roundtripBasePrice) && $roundtripBasePrice !== 0) $roundtripBasePrice = 0;
        if (empty($roundtripPricePerKm) && $roundtripPricePerKm !== 0) $roundtripPricePerKm = 0;
        if (empty($driverAllowance) && $driverAllowance !== 0) $driverAllowance = 0;
        if (empty($nightHalt) && $nightHalt !== 0) $nightHalt = 0;
        
        // Write to vehicle_types table first if needed
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
        
        // Check if outstation fare record exists
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $row = $checkResult->fetch_assoc();
        
        if ($row['count'] > 0) {
            // Update existing record
            $updateSql = "
                UPDATE outstation_fares 
                SET base_price = ?, price_per_km = ?, roundtrip_base_price = ?, 
                    roundtrip_price_per_km = ?, driver_allowance = ?, night_halt_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $updateStmt = $conn->prepare($updateSql);
            if (!$updateStmt) {
                throw new Exception("Prepare failed for update: " . $conn->error);
            }
            
            $updateStmt->bind_param(
                "dddddds",
                $basePrice,
                $pricePerKm,
                $roundtripBasePrice,
                $roundtripPricePerKm,
                $driverAllowance,
                $nightHalt,
                $vehicleId
            );
            
            if (!$updateStmt->execute()) {
                throw new Exception("Update execution failed: " . $updateStmt->error);
            }
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Vehicle pricing updated successfully',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'pricing' => [
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'roundTripBasePrice' => $roundtripBasePrice,
                        'roundTripPricePerKm' => $roundtripPricePerKm,
                        'driverAllowance' => $driverAllowance,
                        'nightHalt' => $nightHalt,
                    ]
                ]
            ]);
            error_log("Updated existing outstation fare record for vehicle: " . $vehicleId);
        } else {
            // Insert new record
            $insertSql = "
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, 
                roundtrip_price_per_km, driver_allowance, night_halt_charge)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertSql);
            if (!$insertStmt) {
                throw new Exception("Prepare failed for insert: " . $conn->error);
            }
            
            $insertStmt->bind_param(
                "sdddddd",
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $roundtripBasePrice,
                $roundtripPricePerKm,
                $driverAllowance,
                $nightHalt
            );
            
            if (!$insertStmt->execute()) {
                throw new Exception("Insert execution failed: " . $insertStmt->error);
            }
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Vehicle pricing added successfully',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'pricing' => [
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'roundTripBasePrice' => $roundtripBasePrice,
                        'roundTripPricePerKm' => $roundtripPricePerKm,
                        'driverAllowance' => $driverAllowance,
                        'nightHalt' => $nightHalt,
                    ]
                ]
            ]);
            error_log("Inserted new outstation fare record for vehicle: " . $vehicleId);
        }
        
        // Also update vehicle_pricing table for compatibility
        try {
            $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'outstation-one-way'");
            if ($checkPricingStmt) {
                $checkPricingStmt->bind_param("s", $vehicleId);
                $checkPricingStmt->execute();
                $pricingResult = $checkPricingStmt->get_result();
                $pricingRow = $pricingResult->fetch_assoc();
                
                if ($pricingRow['count'] > 0) {
                    // Update one-way pricing
                    $updateOneWayStmt = $conn->prepare("
                        UPDATE vehicle_pricing 
                        SET base_price = ?, price_per_km = ?, updated_at = NOW()
                        WHERE vehicle_type = ? AND trip_type = 'outstation-one-way'
                    ");
                    if ($updateOneWayStmt) {
                        $updateOneWayStmt->bind_param("dds", $basePrice, $pricePerKm, $vehicleId);
                        $updateOneWayStmt->execute();
                    }
                } else {
                    // Insert one-way pricing
                    $insertOneWayStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_type, trip_type, base_price, price_per_km)
                        VALUES (?, 'outstation-one-way', ?, ?)
                    ");
                    if ($insertOneWayStmt) {
                        $insertOneWayStmt->bind_param("sdd", $vehicleId, $basePrice, $pricePerKm);
                        $insertOneWayStmt->execute();
                    }
                }
                
                // Round trip pricing
                $checkRoundTripStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'outstation-round-trip'");
                $checkRoundTripStmt->bind_param("s", $vehicleId);
                $checkRoundTripStmt->execute();
                $roundTripResult = $checkRoundTripStmt->get_result();
                $roundTripRow = $roundTripResult->fetch_assoc();
                
                if ($roundTripRow['count'] > 0) {
                    // Update round-trip pricing
                    $updateRoundTripStmt = $conn->prepare("
                        UPDATE vehicle_pricing 
                        SET base_price = ?, price_per_km = ?, updated_at = NOW()
                        WHERE vehicle_type = ? AND trip_type = 'outstation-round-trip'
                    ");
                    if ($updateRoundTripStmt) {
                        $updateRoundTripStmt->bind_param("dds", $roundtripBasePrice, $roundtripPricePerKm, $vehicleId);
                        $updateRoundTripStmt->execute();
                    }
                } else {
                    // Insert round-trip pricing
                    $insertRoundTripStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_type, trip_type, base_price, price_per_km)
                        VALUES (?, 'outstation-round-trip', ?, ?)
                    ");
                    if ($insertRoundTripStmt) {
                        $insertRoundTripStmt->bind_param("sdd", $vehicleId, $roundtripBasePrice, $roundtripPricePerKm);
                        $insertRoundTripStmt->execute();
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Error updating vehicle_pricing table: " . $e->getMessage());
            // Continue execution, this is just a backup update
        }
    }
} catch (Exception $e) {
    error_log("Error in direct-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
