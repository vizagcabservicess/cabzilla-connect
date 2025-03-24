
<?php
// direct-outstation-fares.php - Dedicated endpoint for outstation fares

require_once '../../config.php';

// Set headers for CORS and content type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Custom-Timestamp, X-API-Version');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request for debugging
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[" . date('Y-m-d H:i:s') . "] Direct outstation fares $requestMethod request to: $requestUri\n";
error_log($logMessage, 3, __DIR__ . '/../access.log');

// Try to get data from multiple sources
function getRequestData() {
    $data = [];
    
    // For JSON payload
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
        }
    }
    
    // For POST form data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    
    // For GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
    }
    
    return $data;
}

// Create or ensure outstation_fares table exists
function ensureOutstationFaresTableExists($conn) {
    try {
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
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;
        ";
        
        $conn->query($sql);
        return true;
    } catch (Exception $e) {
        throw new Exception("Failed to create outstation_fares table: " . $e->getMessage());
    }
}

try {
    // Get all request data
    $requestData = getRequestData();
    
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
    
    // Clean vehicle ID - remove any prefix
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
    if ($requestMethod === 'GET') {
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
        }
    } else {
        // POST/PUT - update or insert fare data
        
        // Extract fare data with multiple possible key names
        $basePrice = 0;
        if (isset($requestData['basePrice'])) $basePrice = floatval($requestData['basePrice']);
        else if (isset($requestData['oneWayBasePrice'])) $basePrice = floatval($requestData['oneWayBasePrice']);
        else if (isset($requestData['baseFare'])) $basePrice = floatval($requestData['baseFare']);
        
        $pricePerKm = 0;
        if (isset($requestData['pricePerKm'])) $pricePerKm = floatval($requestData['pricePerKm']);
        else if (isset($requestData['oneWayPricePerKm'])) $pricePerKm = floatval($requestData['oneWayPricePerKm']);
        
        $roundtripBasePrice = 0;
        if (isset($requestData['roundTripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundTripBasePrice']);
        else if (isset($requestData['roundtripBasePrice'])) $roundtripBasePrice = floatval($requestData['roundtripBasePrice']);
        
        $roundtripPricePerKm = 0;
        if (isset($requestData['roundTripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundTripPricePerKm']);
        else if (isset($requestData['roundtripPricePerKm'])) $roundtripPricePerKm = floatval($requestData['roundtripPricePerKm']);
        
        $driverAllowance = 0;
        if (isset($requestData['driverAllowance'])) $driverAllowance = floatval($requestData['driverAllowance']);
        
        $nightHalt = 0;
        if (isset($requestData['nightHalt'])) $nightHalt = floatval($requestData['nightHalt']);
        else if (isset($requestData['nightHaltCharge'])) $nightHalt = floatval($requestData['nightHaltCharge']);
        
        // Check if record exists
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $row = $checkResult->fetch_assoc();
        
        if ($row['count'] > 0) {
            // Update existing record
            $updateStmt = $conn->prepare("
                UPDATE outstation_fares 
                SET base_price = ?, price_per_km = ?, roundtrip_base_price = ?, 
                    roundtrip_price_per_km = ?, driver_allowance = ?, night_halt_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ");
            
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
            
            $updateStmt->execute();
            
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
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, 
                roundtrip_price_per_km, driver_allowance, night_halt_charge)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
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
            
            $insertStmt->execute();
            
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
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
