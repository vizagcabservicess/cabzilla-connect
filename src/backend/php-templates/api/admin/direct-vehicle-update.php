
<?php
/**
 * direct-vehicle-update.php - Update an existing vehicle and sync across all vehicle tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-vehicle-update.log');
}

// Log request information
logMessage("Vehicle update request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Request body: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Allow POST/PUT methods
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    $response['message'] = 'Only POST or PUT methods are allowed';
    echo json_encode($response);
    exit;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

// Get vehicle data from the request
try {
    // Parse input data (support both JSON and form data)
    $vehicleData = [];
    $rawInput = file_get_contents('php://input');
    
    // Try to parse as JSON
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $vehicleData = $jsonData;
        logMessage("Parsed vehicle data from JSON");
    }
    // Fallback to POST data
    else if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle");
    }
    // Try to parse as URL-encoded
    else {
        parse_str($rawInput, $parsedData);
        if (!empty($parsedData)) {
            $vehicleData = $parsedData;
            logMessage("Parsed vehicle data as URL-encoded");
        }
    }
    
    if (empty($vehicleData)) {
        throw new Exception("No vehicle data provided");
    }
    
    // Extract vehicle ID with fallbacks for different naming conventions
    $vehicleId = null;
    $possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];
    
    foreach ($possibleVehicleIdFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleId = $vehicleData[$field];
            logMessage("Found vehicle ID in field '$field': $vehicleId");
            break;
        }
    }
    
    // Make sure we have a vehicle ID
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("Vehicle with ID '$vehicleId' not found");
        }
        
        // Get existing vehicle data
        $existingVehicle = $checkResult->fetch_assoc();
        logMessage("Existing vehicle data found: " . json_encode($existingVehicle));
        
        // Handle the isActive flag specifically (default to existing value)
        $isActiveSet = false;
        $isActive = $existingVehicle['is_active']; // Default to existing value
        
        // Check if isActive is explicitly set in the request
        if (isset($vehicleData['isActive'])) {
            $isActive = filter_var($vehicleData['isActive'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            $isActiveSet = true;
            logMessage("isActive explicitly set to: " . ($isActive ? "true" : "false"));
        } 
        else if (isset($vehicleData['is_active'])) {
            $isActive = filter_var($vehicleData['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            $isActiveSet = true;
            logMessage("is_active explicitly set to: " . ($isActive ? "true" : "false"));
        }
        
        if (!$isActiveSet) {
            logMessage("isActive not set in request, using existing value: $isActive");
        }
                
        // Extract updated vehicle properties with fallback to existing values
        $vehicleName = isset($vehicleData['name']) ? $vehicleData['name'] : $existingVehicle['name'];
        $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : $existingVehicle['capacity'];
        $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                          (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : $existingVehicle['luggage_capacity']);
        
        $ac = isset($vehicleData['ac']) ? (intval($vehicleData['ac']) ? 1 : 0) : $existingVehicle['ac'];
        
        // Handle image path
        $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : $existingVehicle['image'];
        
        // Handle amenities (convert to string if array)
        $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : $existingVehicle['amenities'];
        if (is_array($amenities)) {
            $amenities = implode(', ', $amenities);
        }
        
        $description = isset($vehicleData['description']) ? $vehicleData['description'] : $existingVehicle['description'];
        
        // Extract pricing data
        $basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                    (isset($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                    (isset($vehicleData['price']) ? floatval($vehicleData['price']) : $existingVehicle['base_price']));
        
        $pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                     (isset($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : $existingVehicle['price_per_km']);
        
        $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 
                          (isset($vehicleData['night_halt_charge']) ? floatval($vehicleData['night_halt_charge']) : $existingVehicle['night_halt_charge']);
        
        $driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 
                          (isset($vehicleData['driver_allowance']) ? floatval($vehicleData['driver_allowance']) : $existingVehicle['driver_allowance']);
        
        // Update vehicles table
        $updateVehicleQuery = "UPDATE vehicles SET 
            name = ?, 
            capacity = ?, 
            luggage_capacity = ?, 
            ac = ?, 
            image = ?, 
            amenities = ?, 
            description = ?, 
            is_active = ?, 
            base_price = ?, 
            price_per_km = ?, 
            night_halt_charge = ?, 
            driver_allowance = ?, 
            updated_at = CURRENT_TIMESTAMP 
            WHERE vehicle_id = ?";
            
        $updateVehicleStmt = $conn->prepare($updateVehicleQuery);
        $updateVehicleStmt->bind_param('siiissiddddds', 
            $vehicleName, 
            $capacity, 
            $luggageCapacity, 
            $ac, 
            $image, 
            $amenities, 
            $description, 
            $isActive, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $vehicleId
        );
        
        if (!$updateVehicleStmt->execute()) {
            throw new Exception("Error updating vehicles table: " . $updateVehicleStmt->error);
        }
        
        // Update vehicle_types table as well (for compatibility)
        $updateVehicleTypeQuery = "UPDATE vehicle_types SET 
            name = ?, 
            capacity = ?, 
            luggage_capacity = ?, 
            ac = ?, 
            image = ?, 
            amenities = ?, 
            description = ?, 
            is_active = ?, 
            base_price = ?, 
            price_per_km = ?, 
            night_halt_charge = ?, 
            driver_allowance = ?, 
            updated_at = CURRENT_TIMESTAMP 
            WHERE vehicle_id = ?";
            
        $updateVehicleTypeStmt = $conn->prepare($updateVehicleTypeQuery);
        $updateVehicleTypeStmt->bind_param('siiissiddddds', 
            $vehicleName, 
            $capacity, 
            $luggageCapacity, 
            $ac, 
            $image, 
            $amenities, 
            $description, 
            $isActive, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $vehicleId
        );
        
        if (!$updateVehicleTypeStmt->execute()) {
            throw new Exception("Error updating vehicle_types table: " . $updateVehicleTypeStmt->error);
        }
        
        // Update vehicle_pricing table for outstation
        $updateOutstationPricingQuery = "UPDATE vehicle_pricing SET 
            base_fare = ?, 
            price_per_km = ?, 
            night_halt_charge = ?, 
            driver_allowance = ?, 
            base_price = ?,
            updated_at = CURRENT_TIMESTAMP 
            WHERE vehicle_id = ? AND trip_type = 'outstation'";
            
        $updateOutstationPricingStmt = $conn->prepare($updateOutstationPricingQuery);
        $updateOutstationPricingStmt->bind_param('ddddds', 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $basePrice,
            $vehicleId
        );
        
        $updateOutstationPricingStmt->execute(); // Don't throw on error, as record might not exist yet
        
        // Update outstation_fares table if it exists
        $updateOutstationFaresQuery = "UPDATE outstation_fares SET 
            base_price = ?, 
            price_per_km = ?, 
            night_halt_charge = ?, 
            driver_allowance = ?,
            updated_at = CURRENT_TIMESTAMP 
            WHERE vehicle_id = ?";
            
        $updateOutstationFaresStmt = $conn->prepare($updateOutstationFaresQuery);
        $updateOutstationFaresStmt->bind_param('dddds', 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $vehicleId
        );
        
        $updateOutstationFaresStmt->execute(); // Don't throw on error
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['status'] = 'success';
        $response['message'] = "Vehicle '$vehicleName' updated successfully";
        $response['vehicleId'] = $vehicleId;
        $response['vehicle'] = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => $vehicleName,
            'capacity' => $capacity,
            'luggageCapacity' => $luggageCapacity,
            'ac' => $ac,
            'image' => $image,
            'description' => $description,
            'isActive' => $isActive == 1,
            'basePrice' => $basePrice,
            'price' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance
        ];
        
        logMessage("Vehicle '$vehicleName' updated successfully with ID: $vehicleId");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error updating vehicle: " . $e->getMessage());
}

// Send response
echo json_encode($response);
