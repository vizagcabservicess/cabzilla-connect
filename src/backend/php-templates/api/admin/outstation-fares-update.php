
<?php
// outstation-fares-update.php - Dedicated endpoint for outstation fares
// NOTE: This file now directly handles outstation fare updates without redirection

// Include configuration file
require_once __DIR__ . '/../../config.php';

// Set comprehensive CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Custom-Timestamp, X-API-Version, X-Client-Version, X-Authorization-Override, X-Debug-Mode, X-Cache-Control, X-Request-ID, X-Request-Source');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Enhanced logging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Outstation fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../../access.log');

// Log all headers for debugging
$headers = getallheaders();
$headerLog = "[$timestamp] Request headers: " . json_encode($headers) . PHP_EOL;
error_log($headerLog, 3, __DIR__ . '/../../access.log');

// Get data from multiple sources
function getRequestData() {
    $data = [];
    
    // For JSON payload
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        // Log the raw input for debugging
        error_log("Raw input data: " . $rawInput, 3, __DIR__ . '/../../debug.log');
        
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
            error_log("Parsed JSON data: " . print_r($jsonData, true), 3, __DIR__ . '/../../debug.log');
        } else {
            error_log("Failed to parse JSON: " . json_last_error_msg(), 3, __DIR__ . '/../../debug.log');
            
            // Try parsing as form data if JSON fails
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
                error_log("Parsed as form data: " . print_r($formData, true), 3, __DIR__ . '/../../debug.log');
            }
        }
    }
    
    // For POST form data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
        error_log("POST data: " . print_r($_POST, true), 3, __DIR__ . '/../../debug.log');
    }
    
    // For GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
        error_log("GET data: " . print_r($_GET, true), 3, __DIR__ . '/../../debug.log');
    }
    
    return $data;
}

// Robust database connection function
function getDbConnection() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            error_log("Connected to database using constants", 3, __DIR__ . '/../../debug.log');
            return $conn;
        }

        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            error_log("Connected to database using globals", 3, __DIR__ . '/../../debug.log');
            return $conn;
        }

        // Fallback to hardcoded credentials as last resort
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        error_log("Connected to database using hardcoded values", 3, __DIR__ . '/../../debug.log');
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
        throw $e;
    }
}

// Create outstation_fares table if not exists
function ensureOutstationFaresTableExists($conn) {
    try {
        $sql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0, 
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
        
        error_log("Ensured outstation_fares table exists", 3, __DIR__ . '/../../debug.log');
        return true;
    } catch (Exception $e) {
        error_log("Error ensuring table: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
        throw $e;
    }
}

try {
    // Get request data from all sources
    $requestData = getRequestData();
    error_log("Combined request data: " . print_r($requestData, true), 3, __DIR__ . '/../../debug.log');
    
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
    
    error_log("Working with vehicle ID: $vehicleId", 3, __DIR__ . '/../../debug.log');
    
    // Clean vehicle ID if it has a prefix
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure the outstation_fares table exists
    ensureOutstationFaresTableExists($conn);
    
    // Handle GET and POST/PUT methods differently
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // GET request - retrieve fares for a vehicle
        $stmt = $conn->prepare("SELECT * FROM outstation_fares WHERE vehicle_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement error: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $fare = $result->fetch_assoc();
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'basePrice' => (float)$fare['base_fare'],
                    'pricePerKm' => (float)$fare['price_per_km'],
                    'roundTripBasePrice' => (float)$fare['roundtrip_base_fare'],
                    'roundTripPricePerKm' => (float)$fare['roundtrip_price_per_km'],
                    'driverAllowance' => (float)$fare['driver_allowance'],
                    'nightHalt' => (float)$fare['night_halt_charge']
                ]
            ]);
            error_log("Successfully retrieved outstation fares for vehicle: $vehicleId", 3, __DIR__ . '/../../debug.log');
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
            error_log("No outstation fares found for vehicle: $vehicleId", 3, __DIR__ . '/../../debug.log');
        }
    } else {
        // POST/PUT - update or insert fare data
        
        // Extract fare data with multiple possible key names
        $basePrice = 0;
        if (isset($requestData['basePrice'])) $basePrice = floatval($requestData['basePrice']);
        else if (isset($requestData['oneWayBasePrice'])) $basePrice = floatval($requestData['oneWayBasePrice']);
        else if (isset($requestData['baseFare'])) $basePrice = floatval($requestData['baseFare']);
        else if (isset($requestData['base_fare'])) $basePrice = floatval($requestData['base_fare']);
        
        $pricePerKm = 0;
        if (isset($requestData['pricePerKm'])) $pricePerKm = floatval($requestData['pricePerKm']);
        else if (isset($requestData['oneWayPricePerKm'])) $pricePerKm = floatval($requestData['oneWayPricePerKm']);
        else if (isset($requestData['price_per_km'])) $pricePerKm = floatval($requestData['price_per_km']);
        
        $roundtripBasePrice = 0;
        if (isset($requestData['roundTripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundTripBasePrice']);
        else if (isset($requestData['roundtripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundtripBasePrice']);
        else if (isset($requestData['roundtrip_base_fare'])) $roundtripBasePrice = floatval($requestData['roundtrip_base_fare']);
        
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
        
        error_log("Extracted fare data: basePrice=$basePrice, pricePerKm=$pricePerKm, roundtripBasePrice=$roundtripBasePrice, roundtripPricePerKm=$roundtripPricePerKm, driverAllowance=$driverAllowance, nightHalt=$nightHalt", 3, __DIR__ . '/../../debug.log');
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare failed for count check: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $exists = $row['count'] > 0;
        $stmt->close();
        
        // Use fixed column names that are guaranteed to match the database schema
        if ($exists) {
            // Update existing record
            $sql = "UPDATE outstation_fares SET 
                    base_fare = ?, 
                    price_per_km = ?, 
                    roundtrip_base_fare = ?, 
                    roundtrip_price_per_km = ?, 
                    driver_allowance = ?, 
                    night_halt_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = ?";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed for update: " . $conn->error);
            }
            
            $stmt->bind_param("dddddds", 
                $basePrice, 
                $pricePerKm, 
                $roundtripBasePrice, 
                $roundtripPricePerKm, 
                $driverAllowance, 
                $nightHalt, 
                $vehicleId
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Update failed: " . $stmt->error);
            }
            
            $message = "Outstation fares updated successfully";
        } else {
            // Insert new record
            $sql = "INSERT INTO outstation_fares 
                    (vehicle_id, base_fare, price_per_km, roundtrip_base_fare, roundtrip_price_per_km, 
                    driver_allowance, night_halt_charge) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed for insert: " . $conn->error);
            }
            
            $stmt->bind_param("sdddddd", 
                $vehicleId, 
                $basePrice, 
                $pricePerKm, 
                $roundtripBasePrice, 
                $roundtripPricePerKm, 
                $driverAllowance, 
                $nightHalt
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Insert failed: " . $stmt->error);
            }
            
            $message = "Outstation fares inserted successfully";
        }
        
        $stmt->close();
        error_log("Outstation fares updated successfully for vehicle: $vehicleId", 3, __DIR__ . '/../../debug.log');
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => [
                'vehicleId' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'roundTripBasePrice' => $roundtripBasePrice,
                'roundTripPricePerKm' => $roundtripPricePerKm,
                'driverAllowance' => $driverAllowance,
                'nightHalt' => $nightHalt
            ]
        ]);
    }
} catch (Exception $e) {
    error_log("Error in outstation-fares-update.php: " . $e->getMessage() . " at line " . $e->getLine(), 3, __DIR__ . '/../../error.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ]);
}
?>
