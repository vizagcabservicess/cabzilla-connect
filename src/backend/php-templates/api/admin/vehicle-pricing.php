
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/headers.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

// Set necessary headers for CORS and JSON responses with more permissive settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Force-Refresh');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json');

// For preflight OPTIONS request - respond immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect to the database
$conn = connectToDatabase();

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Log incoming request for debugging
logError("Vehicle pricing request received", [
    'method' => $method,
    'uri' => $_SERVER['REQUEST_URI'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? ''
]);

// Function to check if a vehicle exists
function vehicleExists($conn, $vehicleId) {
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

// Function to sanitize and clean a vehicle ID
function cleanVehicleId($vehicleId) {
    // Remove 'item-' prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        return substr($vehicleId, 5);
    }
    return $vehicleId;
}

// Function to update or create outstation fares
function updateOutstationFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating outstation fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['basePrice']) || !isset($fareData['pricePerKm'])) {
        logError("Missing required fields for outstation fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for outstation fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $baseFare = floatval($fareData['basePrice']);
    $pricePerKm = floatval($fareData['pricePerKm']);
    $nightHaltCharge = isset($fareData['nightHaltCharge']) ? floatval($fareData['nightHaltCharge']) : 0;
    $driverAllowance = isset($fareData['driverAllowance']) ? floatval($fareData['driverAllowance']) : 0;
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating outstation fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    // Also update the main vehicles table to keep pricing consistent
    $stmt = $conn->prepare("UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ? WHERE id = ? OR vehicle_id = ?");
    $stmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
    $stmt->execute();
    
    return true;
}

// Function to update or create local package fares
function updateLocalFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating local fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['hr8km80Price']) || !isset($fareData['hr10km100Price']) || !isset($fareData['extraKmRate'])) {
        logError("Missing required fields for local fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for local fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $price8hrs80km = floatval($fareData['hr8km80Price']);
    $price10hrs100km = floatval($fareData['hr10km100Price']);
    $priceExtraKm = floatval($fareData['extraKmRate']);
    $priceExtraHour = isset($fareData['extraHourRate']) ? floatval($fareData['extraHourRate']) : 0;
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE local_package_fares SET price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ?, price_extra_hour = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("dddds", $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO local_package_fares (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sdddd", $vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating local fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    return true;
}

// Function to update or create airport transfer fares
function updateAirportFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating airport fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['basePrice']) || !isset($fareData['pricePerKm'])) {
        logError("Missing required fields for airport fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for airport fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $basePrice = floatval($fareData['basePrice']);
    $pricePerKm = floatval($fareData['pricePerKm']);
    $airportFee = isset($fareData['airportFee']) ? floatval($fareData['airportFee']) : 0;
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE airport_transfer_fares SET base_price = ?, price_per_km = ?, airport_fee = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("ddds", $basePrice, $pricePerKm, $airportFee, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, airport_fee, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sddd", $vehicleId, $basePrice, $pricePerKm, $airportFee);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating airport fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    return true;
}

// Handle POST request to update pricing
if ($method === 'POST') {
    try {
        // Get request body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        // Log the incoming data
        logError("Received vehicle pricing update request", $data);
        
        // Validate required fields
        if (!isset($data['vehicleId']) || !isset($data['tripType'])) {
            logError("Missing required fields in request", $data);
            sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields: vehicleId and tripType'], 400);
            exit;
        }
        
        // Clean the vehicle ID
        $vehicleId = cleanVehicleId($data['vehicleId']);
        $tripType = $data['tripType'];
        
        // Log the cleaned data
        logError("Cleaned vehicle pricing data", ['vehicleId' => $vehicleId, 'tripType' => $tripType]);
        
        // Enable automatic vehicle creation if it doesn't exist
        if (!vehicleExists($conn, $vehicleId)) {
            logError("Vehicle not found, will be created", ['vehicleId' => $vehicleId]);
            
            // Create the vehicle with basic info
            $stmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())");
            $name = isset($data['name']) ? $data['name'] : ucfirst(str_replace('_', ' ', $vehicleId));
            $stmt->bind_param("sss", $vehicleId, $vehicleId, $name);
            
            if (!$stmt->execute()) {
                logError("Could not create vehicle", ['error' => $stmt->error]);
                // Continue anyway as the vehicle might exist in a different format
            }
        }
        
        // Handle different trip types
        $success = false;
        
        // Map front-end trip types to their handling functions
        $tripTypeMap = [
            'outstation-one-way' => 'updateOutstationFares',
            'outstation-round-trip' => 'updateOutstationFares',
            'outstation' => 'updateOutstationFares',
            'local' => 'updateLocalFares',
            'airport' => 'updateAirportFares'
        ];
        
        if (!isset($tripTypeMap[$tripType])) {
            logError("Invalid trip type", ['tripType' => $tripType]);
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
            exit;
        }
        
        // Call the appropriate function based on trip type
        $handlerFunction = $tripTypeMap[$tripType];
        $success = $handlerFunction($conn, $vehicleId, $data);
        
        if ($success) {
            sendJsonResponse([
                'status' => 'success', 
                'message' => "Pricing updated successfully for $tripType", 
                'vehicleId' => $vehicleId,
                'timestamp' => time()
            ]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to update pricing'], 500);
        }
    } catch (Exception $e) {
        logError("Exception in POST handler", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        sendJsonResponse(['status' => 'error', 'message' => 'Exception: ' . $e->getMessage()], 500);
    }
} 
// Handle GET request to fetch pricing
else if ($method === 'GET') {
    // Get all vehicles pricing data
    $query = "SELECT id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance FROM vehicles WHERE is_active = 1 ORDER BY name";
    $result = $conn->query($query);
    
    if (!$result) {
        logError("Database error fetching vehicle pricing", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    $vehicles = [];
    
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['id'] ?? $row['vehicle_id'];
        $vehicles[] = [
            'vehicleId' => $vehicleId,
            'vehicleType' => $row['name'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'nightHaltCharge' => (float)$row['night_halt_charge'],
            'driverAllowance' => (float)$row['driver_allowance']
        ];
    }
    
    sendJsonResponse($vehicles);
} else {
    // Method not allowed
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close database connection
$conn->close();
?>
