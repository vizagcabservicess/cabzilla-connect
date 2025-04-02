
<?php
/**
 * direct-vehicle-modify.php - Direct implementation for vehicle updates
 * This handles internal server errors better and provides more robust error handling
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging but don't display to client
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Increase timeouts for database operations
ini_set('max_execution_time', 120); // 120 seconds
ini_set('mysql.connect_timeout', 60); // 60 seconds
ini_set('default_socket_timeout', 60); // 60 seconds

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/vehicle-modify.log');
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request information
logMessage("Vehicle modify request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Headers: " . json_encode(getallheaders()));
logMessage("Request body: " . file_get_contents('php://input'));

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

// Parse input data
$rawInput = file_get_contents('php://input');
$vehicleData = [];

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

logMessage("Vehicle data before processing: " . json_encode($vehicleData, JSON_PRETTY_PRINT));

if (empty($vehicleData)) {
    $response['message'] = 'No vehicle data provided';
    echo json_encode($response);
    exit;
}

// Extract vehicle ID
$vehicleId = null;
$possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];

foreach ($possibleVehicleIdFields as $field) {
    if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
        $vehicleId = $vehicleData[$field];
        logMessage("Found vehicle ID in field '$field': $vehicleId");
        break;
    }
}

if (empty($vehicleId)) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

// Get database connection
try {
    // Try to use database.php utility functions if available
    if (file_exists(dirname(__FILE__) . '/../utils/database.php')) {
        require_once dirname(__FILE__) . '/../utils/database.php';
        $conn = getDbConnection();
        logMessage("Connected to database using database.php utilities");
    }
    // Fallback to config if available
    else if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Last resort - hardcoded credentials
    else {
        logMessage("Config files not found, using hardcoded credentials");
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
    
    // Set connection options for better stability
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 30);
    $conn->query("SET SESSION wait_timeout=300"); // 5 minutes
    $conn->query("SET SESSION interactive_timeout=300"); // 5 minutes
    
    // Begin transaction with increased isolation
    $conn->query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1";
        $checkStmt = $conn->prepare($checkQuery);
        if (!$checkStmt) {
            throw new Exception("Error preparing check query: " . $conn->error);
        }
        $checkStmt->bind_param('ss', $vehicleId, $vehicleId);
        
        // Execute with error handling
        if (!$checkStmt->execute()) {
            throw new Exception("Error executing vehicle check: " . $checkStmt->error);
        }
        
        $checkResult = $checkStmt->get_result();
        
        // Process vehicle data and update
        if ($checkResult->num_rows > 0) {
            // Get existing data
            $existingVehicle = $checkResult->fetch_assoc();
            logMessage("Existing vehicle data found: " . json_encode($existingVehicle));
            
            // Extract and normalize vehicle data
            $vehicleName = isset($vehicleData['name']) && !empty($vehicleData['name']) ? $vehicleData['name'] : $existingVehicle['name'];
            $isActive = 1; // Default TRUE
            
            if (isset($vehicleData['isActive'])) {
                $isActive = filter_var($vehicleData['isActive'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            } else if (isset($vehicleData['is_active'])) {
                $isActive = filter_var($vehicleData['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            } else if (isset($existingVehicle['is_active'])) {
                $isActive = intval($existingVehicle['is_active']);
            }
            
            // Handle capacity fields
            $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 
                       (isset($existingVehicle['capacity']) ? intval($existingVehicle['capacity']) : 4);
                       
            $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                              (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 
                              (isset($existingVehicle['luggage_capacity']) ? intval($existingVehicle['luggage_capacity']) : 2));
            
            $ac = isset($vehicleData['ac']) ? (filter_var($vehicleData['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : $existingVehicle['ac'];
            
            // Handle image and amenities
            $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : $existingVehicle['image'];
            
            $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : $existingVehicle['amenities'];
            if (is_array($amenities)) {
                $amenities = implode(', ', $amenities);
            }
            
            $description = isset($vehicleData['description']) ? $vehicleData['description'] : $existingVehicle['description'];
            
            // Extract pricing data
            $basePrice = isset($vehicleData['basePrice']) && !empty($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                        (isset($vehicleData['base_price']) && !empty($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                        (isset($vehicleData['price']) && !empty($vehicleData['price']) ? floatval($vehicleData['price']) : $existingVehicle['base_price']));
            
            $pricePerKm = isset($vehicleData['pricePerKm']) && !empty($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                         (isset($vehicleData['price_per_km']) && !empty($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : $existingVehicle['price_per_km']);
            
            $nightHaltCharge = isset($vehicleData['nightHaltCharge']) && !empty($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 
                              (isset($vehicleData['night_halt_charge']) && !empty($vehicleData['night_halt_charge']) ? floatval($vehicleData['night_halt_charge']) : $existingVehicle['night_halt_charge']);
            
            $driverAllowance = isset($vehicleData['driverAllowance']) && !empty($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 
                              (isset($vehicleData['driver_allowance']) && !empty($vehicleData['driver_allowance']) ? floatval($vehicleData['driver_allowance']) : $existingVehicle['driver_allowance']);
            
            // Create the update query with proper parameter binding
            $updateQuery = "UPDATE vehicles SET 
                name = ?, 
                capacity = ?, 
                luggage_capacity = ?, 
                ac = ?, 
                is_active = ?, 
                image = ?, 
                amenities = ?, 
                description = ?, 
                base_price = ?, 
                price_per_km = ?, 
                night_halt_charge = ?, 
                driver_allowance = ?, 
                updated_at = NOW() 
                WHERE id = ? OR vehicle_id = ?";
                
            // Prepare, bind and execute the update statement
            $updateStmt = $conn->prepare($updateQuery);
            if (!$updateStmt) {
                throw new Exception("Error preparing update statement: " . $conn->error);
            }
            
            // Use explicit variable types for bind_param to avoid issues
            $updateStmt->bind_param(
                'siiiisssdddss',
                $vehicleName,
                $capacity,
                $luggageCapacity,
                $ac,
                $isActive,
                $image,
                $amenities,
                $description,
                $basePrice,
                $pricePerKm,
                $nightHaltCharge,
                $driverAllowance,
                $vehicleId,
                $vehicleId
            );
            
            if (!$updateStmt->execute()) {
                throw new Exception("Error executing update: " . $updateStmt->error);
            }
            
            // Log success
            logMessage("Successfully updated vehicles table for $vehicleId");
            
            // Commit the transaction
            $conn->commit();
            
            // Build success response
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
                    'ac' => (bool)$ac,
                    'isActive' => (bool)$isActive,
                    'image' => $image,
                    'amenities' => $amenities,
                    'description' => $description,
                    'basePrice' => $basePrice,
                    'price' => $basePrice,
                    'pricePerKm' => $pricePerKm,
                    'nightHaltCharge' => $nightHaltCharge,
                    'driverAllowance' => $driverAllowance
                ],
                'timestamp' => time()
            ];
            
        } else {
            // Vehicle not found - provide detailed error
            $conn->rollback();
            $response['message'] = "Vehicle with ID '$vehicleId' not found";
            $response['error'] = "NOT_FOUND";
            $response['vehicleId'] = $vehicleId;
            
            // Log the error
            logMessage("Error: Vehicle with ID '$vehicleId' not found");
        }
    } catch (Exception $e) {
        // Log detailed error and rollback transaction
        logMessage("Error in transaction: " . $e->getMessage());
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $errorMessage = "Error updating vehicle: " . $e->getMessage();
    $response['message'] = $errorMessage;
    $response['error'] = $e->getMessage();
    logMessage($errorMessage);
}

// Send response and log it
logMessage("Sending response: " . json_encode($response));
echo json_encode($response);
