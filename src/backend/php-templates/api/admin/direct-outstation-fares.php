
<?php
// direct-outstation-fares.php - Enhanced endpoint for outstation fares with error handling

// Set headers for CORS and caching
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

// Debug logging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Outstation fares request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// Load database configuration
if (file_exists('../../config.php')) {
    require_once '../../config.php';
} elseif (file_exists('../config.php')) {
    require_once '../config.php';
} else {
    // Fallback credentials
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

// Extract data from request in any format (JSON, form, query)
function getRequestData() {
    $data = [];
    
    // For JSON payload
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
            error_log("JSON data received: " . json_encode($jsonData, JSON_PRETTY_PRINT));
        } else {
            // Try URL encoded
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
                error_log("Form data received: " . json_encode($formData, JSON_PRETTY_PRINT));
            }
        }
    }
    
    // Add POST and GET data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
        error_log("POST data: " . json_encode($_POST, JSON_PRETTY_PRINT));
    }
    
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
        error_log("GET data: " . json_encode($_GET, JSON_PRETTY_PRINT));
    }
    
    // Add debugging information to response
    $data['_debug'] = [
        'timestamp' => time(),
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
        'raw_length' => strlen($rawInput),
        'has_json' => json_decode($rawInput) !== null ? 'yes' : 'no'
    ];
    
    return $data;
}

// Database connection with multiple fallbacks
function getDbConnection() {
    try {
        // Try constants first
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if (!$conn->connect_error) {
                error_log("Connected using constants");
                return $conn;
            }
            error_log("Connection failed using constants: " . $conn->connect_error);
        }

        // Try global variables
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if (!$conn->connect_error) {
                error_log("Connected using globals");
                return $conn;
            }
            error_log("Connection failed using globals: " . $conn->connect_error);
        }

        // Fallback to hardcoded values
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if (!$conn->connect_error) {
            error_log("Connected using hardcoded values");
            return $conn;
        }
        
        throw new Exception("All connection attempts failed");
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e;
    }
}

// Create outstation_fares table with ALL possible field names to avoid confusion
function ensureTablesExist($conn) {
    $tableSuccess = false;
    
    try {
        // Check if outstation_fares exists
        $tableResult = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($tableResult->num_rows == 0) {
            // Create outstation_fares with all possible field variations
            $sql = "
            CREATE TABLE outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                round_trip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                round_trip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            if ($conn->query($sql) === TRUE) {
                error_log("Created outstation_fares table successfully");
                $tableSuccess = true;
            } else {
                error_log("Error creating outstation_fares table: " . $conn->error);
            }
        } else {
            $tableSuccess = true;
            error_log("outstation_fares table already exists");
        }
        
        // Check if vehicle_types exists
        $vehicleTypeResult = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($vehicleTypeResult->num_rows == 0) {
            // Create vehicle_types table
            $vehicleTypesSql = "
            CREATE TABLE vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            if ($conn->query($vehicleTypesSql) === TRUE) {
                error_log("Created vehicle_types table successfully");
            } else {
                error_log("Error creating vehicle_types table: " . $conn->error);
            }
        }
        
        // Make sure all possible columns exist in outstation_fares
        $requiredColumns = [
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'night_halt' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'round_trip_base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'round_trip_price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0'
        ];
        
        foreach ($requiredColumns as $column => $definition) {
            $columnResult = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE '$column'");
            if ($columnResult->num_rows == 0) {
                $alterSql = "ALTER TABLE outstation_fares ADD COLUMN $column $definition";
                if ($conn->query($alterSql) === TRUE) {
                    error_log("Added column $column to outstation_fares");
                } else {
                    error_log("Error adding column $column: " . $conn->error);
                }
            }
        }
        
        return $tableSuccess;
    } catch (Exception $e) {
        error_log("Error ensuring tables: " . $e->getMessage());
        return false;
    }
}

try {
    // Extract data from request
    $requestData = getRequestData();
    error_log("Combined request data: " . json_encode($requestData, JSON_PRETTY_PRINT));
    
    // Get vehicle ID - check multiple possible names
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'id', 'cab_id', 'cabType', 'vehicle'];
    
    foreach ($possibleKeys as $key) {
        if (isset($requestData[$key]) && !empty($requestData[$key])) {
            $vehicleId = $requestData[$key];
            break;
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Remove any prefixes from vehicle ID
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    error_log("Processing vehicle ID: $vehicleId");
    
    // Connect to database
    $conn = getDbConnection();
    
    // Ensure tables exist
    ensureTablesExist($conn);
    
    // Handle GET requests (retrieve fares)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
                    'basePrice' => (float)($fare['base_price'] ?? $fare['base_fare'] ?? 0),
                    'pricePerKm' => (float)($fare['price_per_km'] ?? 0),
                    'roundTripBasePrice' => (float)($fare['roundtrip_base_price'] ?? $fare['round_trip_base_price'] ?? $fare['roundtrip_base_fare'] ?? 0),
                    'roundTripPricePerKm' => (float)($fare['roundtrip_price_per_km'] ?? $fare['round_trip_price_per_km'] ?? 0),
                    'driverAllowance' => (float)($fare['driver_allowance'] ?? 0),
                    'nightHalt' => (float)($fare['night_halt_charge'] ?? $fare['night_halt'] ?? 0),
                    'timestamp' => time()
                ]
            ]);
        } else {
            echo json_encode([
                'status' => 'success',
                'message' => 'No data found for this vehicle, using defaults',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'basePrice' => 0,
                    'pricePerKm' => 0,
                    'roundTripBasePrice' => 0,
                    'roundTripPricePerKm' => 0,
                    'driverAllowance' => 0,
                    'nightHalt' => 0,
                    'timestamp' => time()
                ]
            ]);
        }
    } else {
        // Handle POST/PUT requests (update fares)
        
        // Extract values with multiple possible key names
        $basePrice = 0;
        $possibleBasePriceKeys = ['basePrice', 'baseFare', 'base_price', 'base_fare', 'oneWayBasePrice'];
        foreach ($possibleBasePriceKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $basePrice = floatval($requestData[$key]);
                break;
            }
        }
        
        $pricePerKm = 0;
        $possiblePricePerKmKeys = ['pricePerKm', 'price_per_km', 'oneWayPricePerKm'];
        foreach ($possiblePricePerKmKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $pricePerKm = floatval($requestData[$key]);
                break;
            }
        }
        
        $roundtripBasePrice = 0;
        $possibleRoundtripBasePriceKeys = ['roundTripBasePrice', 'roundtrip_base_price', 'round_trip_base_price', 'roundtripBasePrice'];
        foreach ($possibleRoundtripBasePriceKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $roundtripBasePrice = floatval($requestData[$key]);
                break;
            }
        }
        
        $roundtripPricePerKm = 0;
        $possibleRoundtripPricePerKmKeys = ['roundTripPricePerKm', 'roundtrip_price_per_km', 'round_trip_price_per_km', 'roundtripPricePerKm'];
        foreach ($possibleRoundtripPricePerKmKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $roundtripPricePerKm = floatval($requestData[$key]);
                break;
            }
        }
        
        $driverAllowance = 0;
        $possibleDriverAllowanceKeys = ['driverAllowance', 'driver_allowance'];
        foreach ($possibleDriverAllowanceKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $driverAllowance = floatval($requestData[$key]);
                break;
            }
        }
        
        $nightHalt = 0;
        $possibleNightHaltKeys = ['nightHalt', 'night_halt', 'nightHaltCharge', 'night_halt_charge'];
        foreach ($possibleNightHaltKeys as $key) {
            if (isset($requestData[$key]) && is_numeric($requestData[$key])) {
                $nightHalt = floatval($requestData[$key]);
                break;
            }
        }
        
        error_log("Extracted values: basePrice=$basePrice, pricePerKm=$pricePerKm, roundtripBasePrice=$roundtripBasePrice, roundtripPricePerKm=$roundtripPricePerKm, driverAllowance=$driverAllowance, nightHalt=$nightHalt");
        
        // Check if vehicle exists and create if needed
        $checkVehicleStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
        $checkVehicleStmt->bind_param("s", $vehicleId);
        $checkVehicleStmt->execute();
        $vehicleResult = $checkVehicleStmt->get_result();
        $vehicleRow = $vehicleResult->fetch_assoc();
        
        if ($vehicleRow['count'] == 0) {
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            $insertVehicleStmt = $conn->prepare("
                INSERT INTO vehicle_types (vehicle_id, name, is_active) 
                VALUES (?, ?, 1)
            ");
            $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
            $insertVehicleStmt->execute();
            error_log("Created new vehicle: $vehicleId");
        }
        
        // Check if fare record exists for this vehicle
        $checkFareStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
        $checkFareStmt->bind_param("s", $vehicleId);
        $checkFareStmt->execute();
        $fareResult = $checkFareStmt->get_result();
        $fareRow = $fareResult->fetch_assoc();
        
        if ($fareRow['count'] > 0) {
            // Update existing record with ALL possible field names
            $updateSql = "
                UPDATE outstation_fares SET 
                    base_fare = ?, 
                    base_price = ?, 
                    price_per_km = ?, 
                    driver_allowance = ?, 
                    night_halt_charge = ?,
                    night_halt = ?,
                    roundtrip_base_fare = ?,
                    roundtrip_base_price = ?,
                    round_trip_base_price = ?,
                    roundtrip_price_per_km = ?,
                    round_trip_price_per_km = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $updateStmt = $conn->prepare($updateSql);
            if (!$updateStmt) {
                throw new Exception("Failed to prepare update statement: " . $conn->error);
            }
            
            $updateStmt->bind_param(
                "ddddddddddds",
                $basePrice,
                $basePrice,
                $pricePerKm,
                $driverAllowance,
                $nightHalt,
                $nightHalt,
                $roundtripBasePrice,
                $roundtripBasePrice,
                $roundtripBasePrice,
                $roundtripPricePerKm,
                $roundtripPricePerKm,
                $vehicleId
            );
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to execute update statement: " . $updateStmt->error);
            }
            
            error_log("Updated outstation fare record for $vehicleId");
        } else {
            // Insert new record with ALL possible field names
            $insertSql = "
                INSERT INTO outstation_fares (
                    vehicle_id, 
                    base_fare, 
                    base_price,
                    price_per_km, 
                    driver_allowance, 
                    night_halt_charge,
                    night_halt,
                    roundtrip_base_fare,
                    roundtrip_base_price,
                    round_trip_base_price,
                    roundtrip_price_per_km,
                    round_trip_price_per_km
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertSql);
            if (!$insertStmt) {
                throw new Exception("Failed to prepare insert statement: " . $conn->error);
            }
            
            $insertStmt->bind_param(
                "sdddddddddd",
                $vehicleId,
                $basePrice,
                $basePrice,
                $pricePerKm,
                $driverAllowance,
                $nightHalt,
                $nightHalt,
                $roundtripBasePrice,
                $roundtripBasePrice,
                $roundtripBasePrice,
                $roundtripPricePerKm,
                $roundtripPricePerKm
            );
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to execute insert statement: " . $insertStmt->error);
            }
            
            error_log("Inserted new outstation fare record for $vehicleId");
        }
        
        // Also update vehicle_pricing table for compatibility
        try {
            // Check if one-way record exists
            $checkOneWayStmt = $conn->prepare("
                SELECT COUNT(*) as count FROM vehicle_pricing 
                WHERE vehicle_type = ? AND trip_type = 'outstation-one-way'
            ");
            $checkOneWayStmt->bind_param("s", $vehicleId);
            $checkOneWayStmt->execute();
            $oneWayResult = $checkOneWayStmt->get_result();
            $oneWayRow = $oneWayResult->fetch_assoc();
            
            if ($oneWayRow['count'] > 0) {
                // Update one-way pricing
                $updateOneWayStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET base_price = ?, price_per_km = ?, updated_at = NOW()
                    WHERE vehicle_type = ? AND trip_type = 'outstation-one-way'
                ");
                $updateOneWayStmt->bind_param("dds", $basePrice, $pricePerKm, $vehicleId);
                $updateOneWayStmt->execute();
            } else {
                // Create one-way pricing
                $insertOneWayStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, trip_type, base_price, price_per_km, created_at, updated_at)
                    VALUES (?, 'outstation-one-way', ?, ?, NOW(), NOW())
                ");
                $insertOneWayStmt->bind_param("sdd", $vehicleId, $basePrice, $pricePerKm);
                $insertOneWayStmt->execute();
            }
            
            // Check if round-trip record exists
            $checkRoundTripStmt = $conn->prepare("
                SELECT COUNT(*) as count FROM vehicle_pricing 
                WHERE vehicle_type = ? AND trip_type = 'outstation-round-trip'
            ");
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
                $updateRoundTripStmt->bind_param("dds", $roundtripBasePrice, $roundtripPricePerKm, $vehicleId);
                $updateRoundTripStmt->execute();
            } else {
                // Create round-trip pricing
                $insertRoundTripStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, trip_type, base_price, price_per_km, created_at, updated_at)
                    VALUES (?, 'outstation-round-trip', ?, ?, NOW(), NOW())
                ");
                $insertRoundTripStmt->bind_param("sdd", $vehicleId, $roundtripBasePrice, $roundtripPricePerKm);
                $insertRoundTripStmt->execute();
            }
        } catch (Exception $e) {
            error_log("Non-critical error updating vehicle_pricing table: " . $e->getMessage());
            // Continue execution
        }
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Outstation fares updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'roundTripBasePrice' => $roundtripBasePrice,
                'roundTripPricePerKm' => $roundtripPricePerKm,
                'driverAllowance' => $driverAllowance,
                'nightHalt' => $nightHalt,
                'timestamp' => time()
            ]
        ]);
    }
} catch (Exception $e) {
    // Log the error
    $errorMessage = "Error in direct-outstation-fares.php: " . $e->getMessage();
    error_log($errorMessage);
    
    // Return detailed error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage,
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'request_data' => isset($requestData) ? $requestData : null,
            'server' => $_SERVER,
            'timestamp' => time()
        ]
    ]);
}
?>
