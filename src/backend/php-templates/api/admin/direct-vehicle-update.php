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

// Log POST data for debugging
logMessage("POST data: " . json_encode($_POST, JSON_PRETTY_PRINT));

// Get vehicle data from the request
try {
    // Parse input data (support both JSON and form data)
    $vehicleData = [];
    
    // Try using POST data first (most reliable with multipart/form-data)
    if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle update");
    } 
    // If no POST data, try to parse JSON from request body
    else {
        // Read raw input once and store it
        $rawInput = file_get_contents('php://input');
        logMessage("Raw input: " . $rawInput);
        
        // Try to parse as JSON
        $jsonData = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $vehicleData = $jsonData;
            logMessage("Parsed vehicle data from JSON");
        }
        // Try to parse as URL-encoded
        else {
            parse_str($rawInput, $parsedData);
            if (!empty($parsedData)) {
                $vehicleData = $parsedData;
                logMessage("Parsed vehicle data as URL-encoded");
            }
        }
    }
    
    if (empty($vehicleData)) {
        throw new Exception("No vehicle data provided");
    }
    
    logMessage("Vehicle data after parsing: " . json_encode($vehicleData));
    
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
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('ss', $vehicleId, $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("Vehicle with ID '$vehicleId' not found");
        }
        
        // Get existing vehicle data
        $existingVehicle = $checkResult->fetch_assoc();
        logMessage("Existing vehicle data found: " . json_encode($existingVehicle));
        
        // CRITICAL: Handle the isActive flag with proper fallbacks (default to TRUE if not specified)
        $isActive = 1; // Default value is TRUE/active
        
        // Check if isActive is explicitly set in the request (using multiple possible field names)
        // This allows any variant of the field name to be used
        if (isset($vehicleData['isActive'])) {
            $isActive = filter_var($vehicleData['isActive'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            logMessage("isActive explicitly set to: " . ($isActive ? "true" : "false"));
        } 
        else if (isset($vehicleData['is_active'])) {
            $isActive = filter_var($vehicleData['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            logMessage("is_active explicitly set to: " . ($isActive ? "true" : "false"));
        }
        else if (isset($existingVehicle['is_active'])) {
            $isActive = intval($existingVehicle['is_active']);
            logMessage("Using existing is_active value: " . $isActive);
        }
        
        // CRITICAL: Handle capacity and luggage capacity properly
        $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 
                   (isset($existingVehicle['capacity']) ? intval($existingVehicle['capacity']) : 4);
                   
        $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                          (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 
                          (isset($existingVehicle['luggage_capacity']) ? intval($existingVehicle['luggage_capacity']) : 2));

        // Log capacity values for debugging
        logMessage("Capacity being set to: " . $capacity);
        logMessage("Luggage capacity being set to: " . $luggageCapacity);
        
        // Extract updated vehicle properties with fallback to existing values
        $vehicleName = isset($vehicleData['name']) && !empty($vehicleData['name']) ? $vehicleData['name'] : $existingVehicle['name'];
        
        $ac = isset($vehicleData['ac']) ? (intval($vehicleData['ac']) ? 1 : 0) : $existingVehicle['ac'];
        
        // Handle image path
        $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : $existingVehicle['image'];
        
        // Handle amenities (convert to string if array)
        $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : $existingVehicle['amenities'];
        if (is_array($amenities)) {
            $amenities = implode(', ', $amenities);
        }
        
        $description = isset($vehicleData['description']) ? $vehicleData['description'] : $existingVehicle['description'];
        
        // Extract pricing data with proper fallbacks
        $basePrice = isset($vehicleData['basePrice']) && !empty($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                    (isset($vehicleData['base_price']) && !empty($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                    (isset($vehicleData['price']) && !empty($vehicleData['price']) ? floatval($vehicleData['price']) : $existingVehicle['base_price']));
        
        $pricePerKm = isset($vehicleData['pricePerKm']) && !empty($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                     (isset($vehicleData['price_per_km']) && !empty($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : $existingVehicle['price_per_km']);
        
        $nightHaltCharge = isset($vehicleData['nightHaltCharge']) && !empty($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 
                          (isset($vehicleData['night_halt_charge']) && !empty($vehicleData['night_halt_charge']) ? floatval($vehicleData['night_halt_charge']) : $existingVehicle['night_halt_charge']);
        
        $driverAllowance = isset($vehicleData['driverAllowance']) && !empty($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 
                          (isset($vehicleData['driver_allowance']) && !empty($vehicleData['driver_allowance']) ? floatval($vehicleData['driver_allowance']) : $existingVehicle['driver_allowance']);
        
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
            WHERE vehicle_id = ? OR id = ?";
            
        $updateVehicleStmt = $conn->prepare($updateVehicleQuery);
        $updateVehicleStmt->bind_param('siiissidddddss', 
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
            $vehicleId,
            $vehicleId
        );
        
        if (!$updateVehicleStmt->execute()) {
            throw new Exception("Error updating vehicles table: " . $updateVehicleStmt->error);
        }
        
        logMessage("Successfully updated vehicles table for $vehicleId");
        
        // Optional: Update other related tables if they exist
        // This code can be kept as is since it checks for table existence first
        
        // Update vehicle_types table
        $checkTypesTableResult = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($checkTypesTableResult->num_rows > 0) {
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
                logMessage("Warning: Could not update vehicle_types table: " . $updateVehicleTypeStmt->error);
                // Don't throw exception here, continue with other updates
            } else {
                logMessage("Successfully updated vehicle_types table for $vehicleId");
            }
        }
        
        // Update vehicle_pricing table for outstation
        $checkPricingTableResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkPricingTableResult->num_rows > 0) {
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
        }
        
        // Update outstation_fares table if it exists
        $checkOutstationFaresResult = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($checkOutstationFaresResult->num_rows > 0) {
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
        }
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response = [
            'status' => 'success',
            'message' => "Vehicle '$vehicleName' updated successfully",
            'vehicleId' => $vehicleId,
            'vehicle' => [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $vehicleName,
                'capacity' => $capacity,
                'luggageCapacity' => $luggageCapacity,
                'ac' => $ac == 1,
                'image' => $image,
                'description' => $description,
                'isActive' => $isActive == 1,
                'basePrice' => $basePrice,
                'price' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance,
                'amenities' => $amenities,
            ],
            'timestamp' => time()
        ];
        
        logMessage("Vehicle '$vehicleName' updated successfully with ID: $vehicleId");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        
        $response = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ];
        
        logMessage("Error updating vehicle: " . $e->getMessage());
    }
    
} catch (Exception $e) {
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
    
    logMessage("Error in request processing: " . $e->getMessage());
}

// Send response
echo json_encode($response);
exit;
