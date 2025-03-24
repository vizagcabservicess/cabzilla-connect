
<?php
// outstation-fares-update.php - DEDICATED DIRECT HANDLER FOR OUTSTATION FARES
// SPECIAL ULTRA HIGH RELIABILITY VERSION - NO REDIRECTS

// Include configuration file
require_once __DIR__ . '/../../config.php';

// Essential debugging - write access log
$timestamp = date('Y-m-d H:i:s');
$debugLog = "$timestamp - OUTSTATION FARES UPDATE ACCESSED - Method: {$_SERVER['REQUEST_METHOD']} - URI: {$_SERVER['REQUEST_URI']}\n";
file_put_contents(__DIR__ . '/../../debug.log', $debugLog, FILE_APPEND);

// Set comprehensive CORS headers - TOP PRIORITY
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Custom-Timestamp, X-API-Version, X-Client-Version, X-Authorization-Override, X-Debug-Mode, X-Cache-Control, X-Request-ID, X-Request-Source');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'CORS preflight successful']);
    exit;
}

// DEBUG LOG - Log all information about the request
$requestInfo = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'contentType' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'rawInput' => file_get_contents('php://input'),
    'post' => $_POST,
    'get' => $_GET,
    'timestamp' => date('Y-m-d H:i:s')
];
file_put_contents(__DIR__ . '/../../request_debug.log', print_r($requestInfo, true), FILE_APPEND);

// Enhanced data extraction from all possible sources
function getRequestData() {
    $data = [];
    
    // For JSON payload
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        // Try parsing as JSON first
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
            
            // Log successful JSON parsing
            file_put_contents(__DIR__ . '/../../debug.log', "Successfully parsed JSON input: " . print_r($jsonData, true) . "\n", FILE_APPEND);
        } else {
            // If JSON fails, try parsing as form data
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
                
                // Log successful form parsing
                file_put_contents(__DIR__ . '/../../debug.log', "Parsed as form data: " . print_r($formData, true) . "\n", FILE_APPEND);
            } else {
                // Log parsing failure
                file_put_contents(__DIR__ . '/../../debug.log', "Failed to parse input as JSON or form data: $rawInput\n", FILE_APPEND);
            }
        }
    }
    
    // For POST form data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
        
        // Log POST data
        file_put_contents(__DIR__ . '/../../debug.log', "Found POST data: " . print_r($_POST, true) . "\n", FILE_APPEND);
    }
    
    // For GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
        
        // Log GET data
        file_put_contents(__DIR__ . '/../../debug.log', "Found GET data: " . print_r($_GET, true) . "\n", FILE_APPEND);
    }
    
    // Final combined data
    file_put_contents(__DIR__ . '/../../debug.log', "Combined request data: " . print_r($data, true) . "\n", FILE_APPEND);
    
    return $data;
}

// Establish database connection with multiple fallback options
function getDbConnection() {
    try {
        // First try to use constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if (!$conn->connect_error) {
                file_put_contents(__DIR__ . '/../../debug.log', "Connected to database using config constants\n", FILE_APPEND);
                return $conn;
            }
            file_put_contents(__DIR__ . '/../../debug.log', "Failed to connect using config constants: {$conn->connect_error}\n", FILE_APPEND);
        }

        // Try global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if (!$conn->connect_error) {
                file_put_contents(__DIR__ . '/../../debug.log', "Connected to database using global variables\n", FILE_APPEND);
                return $conn;
            }
            file_put_contents(__DIR__ . '/../../debug.log', "Failed to connect using global variables: {$conn->connect_error}\n", FILE_APPEND);
        }

        // Fallback to hardcoded credentials as absolute last resort
        $hardcodedConn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if (!$hardcodedConn->connect_error) {
            file_put_contents(__DIR__ . '/../../debug.log', "Connected to database using hardcoded values\n", FILE_APPEND);
            return $hardcodedConn;
        }
        
        // If all connection attempts fail
        file_put_contents(__DIR__ . '/../../debug.log', "All database connection attempts failed\n", FILE_APPEND);
        throw new Exception("Could not connect to database after all attempts");
    } catch (Exception $e) {
        file_put_contents(__DIR__ . '/../../error.log', "Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw $e;
    }
}

// Create or ensure outstation_fares table exists with BOTH base_fare AND base_price column names
function ensureOutstationFaresTableExists($conn) {
    try {
        // First check if the table exists and has the required columns
        $tableExists = false;
        $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($result && $result->num_rows > 0) {
            $tableExists = true;
            file_put_contents(__DIR__ . '/../../debug.log', "outstation_fares table exists\n", FILE_APPEND);
            
            // Check for column structure to see if we need to add either base_fare or base_price
            $columnResult = $conn->query("SHOW COLUMNS FROM outstation_fares");
            $columns = [];
            while ($row = $columnResult->fetch_assoc()) {
                $columns[] = $row['Field'];
            }
            
            // If base_fare doesn't exist but base_price does, add base_fare
            if (!in_array('base_fare', $columns) && in_array('base_price', $columns)) {
                $conn->query("ALTER TABLE outstation_fares ADD COLUMN base_fare DECIMAL(10,2) 
                             GENERATED ALWAYS AS (base_price) STORED");
                file_put_contents(__DIR__ . '/../../debug.log', "Added base_fare column as alias of base_price\n", FILE_APPEND);
            }
            
            // If base_price doesn't exist but base_fare does, add base_price
            if (!in_array('base_price', $columns) && in_array('base_fare', $columns)) {
                $conn->query("ALTER TABLE outstation_fares ADD COLUMN base_price DECIMAL(10,2) 
                             GENERATED ALWAYS AS (base_fare) STORED");
                file_put_contents(__DIR__ . '/../../debug.log', "Added base_price column as alias of base_fare\n", FILE_APPEND);
            }
            
            // Same for roundtrip columns
            if (!in_array('roundtrip_base_fare', $columns) && in_array('roundtrip_base_price', $columns)) {
                $conn->query("ALTER TABLE outstation_fares ADD COLUMN roundtrip_base_fare DECIMAL(10,2) 
                             GENERATED ALWAYS AS (roundtrip_base_price) STORED");
            }
            
            if (!in_array('roundtrip_base_price', $columns) && in_array('roundtrip_base_fare', $columns)) {
                $conn->query("ALTER TABLE outstation_fares ADD COLUMN roundtrip_base_price DECIMAL(10,2) 
                             GENERATED ALWAYS AS (roundtrip_base_fare) STORED");
            }
        }
        
        // If table doesn't exist, create it with both column naming conventions
        if (!$tableExists) {
            $sql = "
            CREATE TABLE outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            if ($conn->query($sql)) {
                file_put_contents(__DIR__ . '/../../debug.log', "Created outstation_fares table successfully\n", FILE_APPEND);
                return true;
            } else {
                file_put_contents(__DIR__ . '/../../error.log', "Failed to create outstation_fares table: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Failed to create outstation_fares table: " . $conn->error);
            }
        }
        
        return true;
    } catch (Exception $e) {
        file_put_contents(__DIR__ . '/../../error.log', "Error ensuring outstation_fares table: " . $e->getMessage() . "\n", FILE_APPEND);
        throw $e;
    }
}

// Main execution block
try {
    // Get request data from all sources
    $requestData = getRequestData();
    file_put_contents(__DIR__ . '/../../debug.log', "Processing outstation fares update with data: " . print_r($requestData, true) . "\n", FILE_APPEND);
    
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
    
    // Clean vehicle ID if it has a prefix
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    file_put_contents(__DIR__ . '/../../debug.log', "Using vehicle ID: $vehicleId\n", FILE_APPEND);
    
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
        if (!$stmt) {
            throw new Exception("Prepare statement error: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $fare = $result->fetch_assoc();
            
            // Choose base_price or base_fare depending on which is non-zero
            $basePrice = (float)($fare['base_price'] > 0 ? $fare['base_price'] : $fare['base_fare']);
            $roundTripBasePrice = (float)($fare['roundtrip_base_price'] > 0 ? $fare['roundtrip_base_price'] : $fare['roundtrip_base_fare']);
            
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'basePrice' => $basePrice,
                    'pricePerKm' => (float)$fare['price_per_km'],
                    'roundTripBasePrice' => $roundTripBasePrice,
                    'roundTripPricePerKm' => (float)$fare['roundtrip_price_per_km'],
                    'driverAllowance' => (float)$fare['driver_allowance'],
                    'nightHalt' => (float)$fare['night_halt_charge']
                ]
            ]);
            file_put_contents(__DIR__ . '/../../debug.log', "Successfully retrieved outstation fares for vehicle: $vehicleId\n", FILE_APPEND);
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
            file_put_contents(__DIR__ . '/../../debug.log', "No outstation fares found for vehicle: $vehicleId\n", FILE_APPEND);
        }
    } else {
        // POST/PUT - update or insert fare data
        
        // Extract fare data with multiple possible key names
        $basePrice = 0;
        if (isset($requestData['basePrice'])) $basePrice = floatval($requestData['basePrice']);
        else if (isset($requestData['oneWayBasePrice'])) $basePrice = floatval($requestData['oneWayBasePrice']);
        else if (isset($requestData['baseFare'])) $basePrice = floatval($requestData['baseFare']);
        else if (isset($requestData['base_fare'])) $basePrice = floatval($requestData['base_fare']);
        else if (isset($requestData['base_price'])) $basePrice = floatval($requestData['base_price']);
        
        $pricePerKm = 0;
        if (isset($requestData['pricePerKm'])) $pricePerKm = floatval($requestData['pricePerKm']);
        else if (isset($requestData['oneWayPricePerKm'])) $pricePerKm = floatval($requestData['oneWayPricePerKm']);
        else if (isset($requestData['price_per_km'])) $pricePerKm = floatval($requestData['price_per_km']);
        
        $roundtripBasePrice = 0;
        if (isset($requestData['roundTripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundTripBasePrice']);
        else if (isset($requestData['roundtripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundtripBasePrice']);
        else if (isset($requestData['roundtrip_base_fare'])) $roundtripBasePrice = floatval($requestData['roundtrip_base_fare']);
        else if (isset($requestData['roundtrip_base_price'])) $roundtripBasePrice = floatval($requestData['roundtrip_base_price']);
        else if (isset($requestData['round_trip_base_price'])) $roundtripBasePrice = floatval($requestData['round_trip_base_price']);
        
        $roundtripPricePerKm = 0;
        if (isset($requestData['roundTripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundTripPricePerKm']);
        else if (isset($requestData['roundtripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundtripPricePerKm']);
        else if (isset($requestData['roundtrip_price_per_km'])) $roundtripPricePerKm = floatval($requestData['roundtrip_price_per_km']);
        else if (isset($requestData['round_trip_price_per_km'])) $roundtripPricePerKm = floatval($requestData['round_trip_price_per_km']);
        
        $driverAllowance = 0;
        if (isset($requestData['driverAllowance'])) $driverAllowance = floatval($requestData['driverAllowance']);
        else if (isset($requestData['driver_allowance'])) $driverAllowance = floatval($requestData['driver_allowance']);
        
        $nightHalt = 0;
        if (isset($requestData['nightHalt'])) $nightHalt = floatval($requestData['nightHalt']);
        else if (isset($requestData['nightHaltCharge'])) $nightHalt = floatval($requestData['nightHaltCharge']);
        else if (isset($requestData['night_halt_charge'])) $nightHalt = floatval($requestData['night_halt_charge']);
        
        file_put_contents(__DIR__ . '/../../debug.log', "Extracted fare data for $vehicleId: 
            basePrice=$basePrice, 
            pricePerKm=$pricePerKm, 
            roundtripBasePrice=$roundtripBasePrice, 
            roundtripPricePerKm=$roundtripPricePerKm, 
            driverAllowance=$driverAllowance, 
            nightHalt=$nightHalt\n", FILE_APPEND);
        
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
        
        // Use prepared statement with the correct columns
        if ($exists) {
            // Update existing record - handle both column naming conventions
            $sql = "UPDATE outstation_fares SET 
                    base_price = ?, 
                    base_fare = ?, 
                    price_per_km = ?, 
                    roundtrip_base_price = ?,
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
            
            $stmt->bind_param("dddddddds", 
                $basePrice,  // base_price
                $basePrice,  // base_fare - same value
                $pricePerKm, 
                $roundtripBasePrice,  // roundtrip_base_price
                $roundtripBasePrice,  // roundtrip_base_fare - same value
                $roundtripPricePerKm, 
                $driverAllowance, 
                $nightHalt, 
                $vehicleId
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Update failed: " . $stmt->error);
            }
            
            $message = "Outstation fares updated successfully";
            file_put_contents(__DIR__ . '/../../debug.log', "Updated outstation fares for vehicle: $vehicleId\n", FILE_APPEND);
        } else {
            // Insert new record with both column naming conventions
            $sql = "INSERT INTO outstation_fares 
                    (vehicle_id, base_price, base_fare, price_per_km, 
                     roundtrip_base_price, roundtrip_base_fare, roundtrip_price_per_km, 
                     driver_allowance, night_halt_charge) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed for insert: " . $conn->error);
            }
            
            $stmt->bind_param("sdddddddd", 
                $vehicleId,
                $basePrice,  // base_price
                $basePrice,  // base_fare - same value
                $pricePerKm,
                $roundtripBasePrice,  // roundtrip_base_price
                $roundtripBasePrice,  // roundtrip_base_fare - same value
                $roundtripPricePerKm,
                $driverAllowance,
                $nightHalt
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Insert failed: " . $stmt->error);
            }
            
            $message = "Outstation fares inserted successfully";
            file_put_contents(__DIR__ . '/../../debug.log', "Inserted new outstation fares for vehicle: $vehicleId\n", FILE_APPEND);
        }
        
        $stmt->close();
        
        // ALSO Update vehicle_pricing table for compatibility with other parts of the system
        try {
            // Delete any existing records for this vehicle and trip type
            $conn->query("DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = 'outstation-one-way'");
            $conn->query("DELETE FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = 'outstation-round-trip'");
            
            // Insert new records
            $conn->query("INSERT INTO vehicle_pricing (vehicle_id, trip_type, base_fare, price_per_km) 
                        VALUES ('$vehicleId', 'outstation-one-way', $basePrice, $pricePerKm)");
            $conn->query("INSERT INTO vehicle_pricing (vehicle_id, trip_type, base_fare, price_per_km) 
                        VALUES ('$vehicleId', 'outstation-round-trip', $roundtripBasePrice, $roundtripPricePerKm)");
            
            file_put_contents(__DIR__ . '/../../debug.log', "Also updated vehicle_pricing table for compatibility\n", FILE_APPEND);
        } catch (Exception $e) {
            // Log but don't fail if the compatibility update fails
            file_put_contents(__DIR__ . '/../../debug.log', "Warning: vehicle_pricing update failed: " . $e->getMessage() . "\n", FILE_APPEND);
        }
        
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
    file_put_contents(__DIR__ . '/../../error.log', "Error in outstation-fares-update.php: " . $e->getMessage() . " at line " . $e->getLine() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ]);
}
