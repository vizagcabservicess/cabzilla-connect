
<?php
// Ultra emergency endpoint that directly accesses the database for outstation fare updates
// This is a last resort endpoint for when all other endpoints fail

// Set aggressive CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
header("X-Emergency-Handler: ultra-emergency-outstation");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log the request for debugging
$requestTime = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$requestTime] Ultra emergency outstation request: $requestMethod $requestUri");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database credentials - fallback if config.php fails
$dbCredentials = [
    // Primary credentials from config
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_new_bookingdb'
    ],
    // Alternative credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_bookingdb'
    ]
];

// Try to include config.php but don't fail if it doesn't exist
@include_once __DIR__ . '/../../config.php';
@include_once __DIR__ . '/../../../config.php';
@include_once __DIR__ . '/../../../../config.php';

// Get data from various sources (POST, GET, JSON)
function getRequestData() {
    $data = [];
    
    // Get raw input
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    // Try to parse as JSON
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = $jsonData;
            error_log("Parsed JSON data: " . print_r($data, true));
        } else {
            // Try to parse as form data
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("Parsed form data: " . print_r($data, true));
            }
        }
    }
    
    // Merge with $_POST and $_GET
    $data = array_merge($data, $_POST, $_GET);
    
    // Debug
    error_log("Final merged request data: " . print_r($data, true));
    
    return $data;
}

// Extract ID from various sources
function extractVehicleId($data) {
    // Try all possible parameter names
    $idParams = ['vehicleId', 'vehicle_id', 'id', 'vehicle', 'cab_id', 'cabId'];
    
    foreach ($idParams as $param) {
        if (isset($data[$param]) && !empty($data[$param])) {
            $id = $data[$param];
            // Remove 'item-' prefix if present
            if (strpos($id, 'item-') === 0) {
                $id = substr($id, 5);
            }
            return $id;
        }
    }
    
    return null;
}

// Attempt to connect to database using multiple possible credentials
function getDatabaseConnection() {
    global $dbCredentials;
    
    // Try using constants from config.php first
    if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS')) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            if (!$conn->connect_error) {
                error_log("Connected to database using DB_ constants");
                return $conn;
            }
        } catch (Exception $e) {
            error_log("Failed to connect using DB_ constants: " . $e->getMessage());
        }
    }
    
    // Try global variables that might be set in config.php
    global $db_host, $db_name, $db_user, $db_pass;
    if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
        try {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if (!$conn->connect_error) {
                error_log("Connected to database using global variables");
                return $conn;
            }
        } catch (Exception $e) {
            error_log("Failed to connect using global variables: " . $e->getMessage());
        }
    }
    
    // Try fallback credentials
    foreach ($dbCredentials as $creds) {
        try {
            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
            if (!$conn->connect_error) {
                error_log("Connected to database using fallback credentials");
                return $conn;
            }
        } catch (Exception $e) {
            error_log("Failed to connect using fallback credentials: " . $e->getMessage());
        }
    }
    
    return null;
}

// Main processing
try {
    // Get the request data
    $data = getRequestData();
    
    // Extract vehicle ID
    $vehicleId = extractVehicleId($data);
    
    if (!$vehicleId) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required',
            'data' => $data
        ]);
        exit;
    }
    
    // For testing purposes, just return the data if test parameter is provided
    if (isset($data['test'])) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Test successful',
            'data' => $data,
            'serverTime' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Extract other parameters with defaults
    $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 
                (isset($data['base_fare']) ? floatval($data['base_fare']) : 
                (isset($data['base_price']) ? floatval($data['base_price']) : 0));
                
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 
                (isset($data['price_per_km']) ? floatval($data['price_per_km']) : 0);
                
    $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 
                     (isset($data['driver_allowance']) ? floatval($data['driver_allowance']) : 250);
                     
    $nightHalt = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 
                (isset($data['night_halt_charge']) ? floatval($data['night_halt_charge']) : 
                (isset($data['nightHalt']) ? floatval($data['nightHalt']) : 700));
                
    $roundtripBasePrice = isset($data['roundTripBasePrice']) ? floatval($data['roundTripBasePrice']) : 
                        (isset($data['roundtrip_base_fare']) ? floatval($data['roundtrip_base_fare']) : 
                        (isset($data['roundtrip_base_price']) ? floatval($data['roundtrip_base_price']) : $basePrice));
                        
    $roundtripPricePerKm = isset($data['roundTripPricePerKm']) ? floatval($data['roundTripPricePerKm']) : 
                         (isset($data['roundtrip_price_per_km']) ? floatval($data['roundtrip_price_per_km']) : $pricePerKm);
    
    // Get a database connection
    $conn = getDatabaseConnection();
    
    if (!$conn) {
        throw new Exception("Could not connect to database after multiple attempts");
    }
    
    // Create a simple table for outstation fares if it doesn't exist
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id VARCHAR(50) NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            roundtrip_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        )
    ";
    
    if (!$conn->query($createTableSql)) {
        error_log("Failed to create table: " . $conn->error);
    } else {
        error_log("Table outstation_fares created or already exists");
    }
    
    // Check if the record exists in outstation_fares
    $checkSql = "SELECT * FROM outstation_fares WHERE id = ? OR vehicle_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    
    if (!$checkStmt) {
        error_log("Prepare statement failed: " . $conn->error);
        throw new Exception("Database error: " . $conn->error);
    }
    
    $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $exists = $result->num_rows > 0;
    $checkStmt->close();
    
    if ($exists) {
        // Update existing record
        $updateSql = "
            UPDATE outstation_fares 
            SET 
                id = ?, 
                vehicle_id = ?, 
                base_fare = ?, 
                price_per_km = ?, 
                driver_allowance = ?, 
                night_halt_charge = ?,
                roundtrip_base_fare = ?,
                roundtrip_price_per_km = ?,
                updated_at = NOW()
            WHERE id = ? OR vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateSql);
        
        if (!$updateStmt) {
            error_log("Prepare update statement failed: " . $conn->error);
            throw new Exception("Database error: " . $conn->error);
        }
        
        $updateStmt->bind_param("ssddddddss", 
            $vehicleId, 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $driverAllowance, 
            $nightHalt,
            $roundtripBasePrice,
            $roundtripPricePerKm,
            $vehicleId,
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            error_log("Execute update statement failed: " . $updateStmt->error);
            throw new Exception("Database error: " . $updateStmt->error);
        }
        
        $updateStmt->close();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Outstation fare record updated',
            'databaseOperation' => 'update',
            'data' => [
                'vehicleId' => $vehicleId,
                'oneWay' => [
                    'basePrice' => $basePrice,
                    'pricePerKm' => $pricePerKm
                ],
                'roundTrip' => [
                    'basePrice' => $roundtripBasePrice,
                    'pricePerKm' => $roundtripPricePerKm
                ],
                'driverAllowance' => $driverAllowance,
                'nightHalt' => $nightHalt
            ]
        ]);
    } else {
        // Insert new record
        $insertSql = "
            INSERT INTO outstation_fares 
            (id, vehicle_id, base_fare, price_per_km, driver_allowance, night_halt_charge, roundtrip_base_fare, roundtrip_price_per_km, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ";
        
        $insertStmt = $conn->prepare($insertSql);
        
        if (!$insertStmt) {
            error_log("Prepare insert statement failed: " . $conn->error);
            throw new Exception("Database error: " . $conn->error);
        }
        
        $insertStmt->bind_param("ssdddddd", 
            $vehicleId, 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $driverAllowance, 
            $nightHalt,
            $roundtripBasePrice,
            $roundtripPricePerKm
        );
        
        if (!$insertStmt->execute()) {
            error_log("Execute insert statement failed: " . $insertStmt->error);
            throw new Exception("Database error: " . $insertStmt->error);
        }
        
        $insertStmt->close();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'New outstation fare record created',
            'databaseOperation' => 'insert',
            'data' => [
                'vehicleId' => $vehicleId,
                'oneWay' => [
                    'basePrice' => $basePrice,
                    'pricePerKm' => $pricePerKm
                ],
                'roundTrip' => [
                    'basePrice' => $roundtripBasePrice,
                    'pricePerKm' => $roundtripPricePerKm
                ],
                'driverAllowance' => $driverAllowance,
                'nightHalt' => $nightHalt
            ]
        ]);
    }
    
    // Close connection
    $conn->close();
    
} catch (Exception $e) {
    error_log("Ultra emergency endpoint error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error occurred: ' . $e->getMessage(),
        'serverTime' => date('Y-m-d H:i:s'),
        'apiVersion' => '1.0.77'
    ]);
}
?>
