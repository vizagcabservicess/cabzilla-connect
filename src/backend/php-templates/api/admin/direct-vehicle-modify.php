
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

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Increase timeouts for database operations
ini_set('max_execution_time', 120); // 120 seconds
ini_set('mysql.connect_timeout', 60); // 60 seconds
ini_set('default_socket_timeout', 60); // 60 seconds

// Logging function
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
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

logMessage("Vehicle data before processing: " . json_encode($vehicleData, JSON_PRETTY_PRINT | JSON_PARTIAL_OUTPUT_ON_ERROR));

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
    // Direct database connection with hardcoded credentials
    function getDirectDbConnection($maxRetries = 3) {
        $attempts = 0;
        $lastError = null;
        
        // Hardcoded database credentials specific to this environment
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        while ($attempts < $maxRetries) {
            try {
                $attempts++;
                $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
                
                if ($conn->connect_error) {
                    throw new Exception("Database connection failed: " . $conn->connect_error);
                }
                
                logMessage("Connected to database using direct connection on attempt $attempts");
                return $conn;
            } catch (Exception $e) {
                $lastError = $e;
                logMessage("Connection attempt $attempts failed: " . $e->getMessage());
                
                if ($attempts < $maxRetries) {
                    $sleepTime = pow(2, $attempts - 1) * 500000; // 0.5s, 1s, 2s
                    usleep($sleepTime);
                    logMessage("Retrying connection after $sleepTime microseconds");
                }
            }
        }
        
        // All attempts failed
        throw new Exception("Failed to connect to database after $maxRetries attempts: " . $lastError->getMessage());
    }
    
    // Get database connection directly
    $conn = getDirectDbConnection(3);
    
    // Set connection options for better stability
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 30);
    $conn->query("SET SESSION wait_timeout=300"); // 5 minutes
    $conn->query("SET SESSION interactive_timeout=300"); // 5 minutes
    $conn->query("SET SESSION net_read_timeout=300"); // 5 minutes
    $conn->query("SET SESSION net_write_timeout=300"); // 5 minutes
    
    // Begin transaction with increased isolation
    $conn->query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('ss', $vehicleId, $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        // Process vehicle data and update
        if ($checkResult->num_rows > 0) {
            // Get existing data
            $existingVehicle = $checkResult->fetch_assoc();
            logMessage("Existing vehicle data found: " . json_encode($existingVehicle, JSON_PARTIAL_OUTPUT_ON_ERROR));
            
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
            
            $ac = isset($vehicleData['ac']) ? (filter_var($vehicleData['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 
                (isset($existingVehicle['ac']) ? intval($existingVehicle['ac']) : 1);
            
            // Handle image and amenities
            $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : 
                   (isset($existingVehicle['image']) ? $existingVehicle['image'] : '/cars/sedan.png');
            
            $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : 
                        (isset($existingVehicle['amenities']) ? $existingVehicle['amenities'] : 'AC');
            if (is_array($amenities)) {
                $amenities = implode(', ', $amenities);
            }
            
            $description = isset($vehicleData['description']) ? $vehicleData['description'] : 
                          (isset($existingVehicle['description']) ? $existingVehicle['description'] : '');
            
            // Extract pricing data with NULL protection
            $basePrice = isset($vehicleData['basePrice']) && !empty($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                        (isset($vehicleData['base_price']) && !empty($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                        (isset($vehicleData['price']) && !empty($vehicleData['price']) ? floatval($vehicleData['price']) : 
                        (isset($existingVehicle['base_price']) && !empty($existingVehicle['base_price']) ? floatval($existingVehicle['base_price']) : 0)));
            
            $pricePerKm = isset($vehicleData['pricePerKm']) && !empty($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                         (isset($vehicleData['price_per_km']) && !empty($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : 
                         (isset($existingVehicle['price_per_km']) && !empty($existingVehicle['price_per_km']) ? floatval($existingVehicle['price_per_km']) : 0));
            
            // CRITICAL: Ensure night_halt_charge and driver_allowance are never NULL
            $nightHaltCharge = isset($vehicleData['nightHaltCharge']) && $vehicleData['nightHaltCharge'] !== null ? floatval($vehicleData['nightHaltCharge']) : 
                              (isset($vehicleData['night_halt_charge']) && $vehicleData['night_halt_charge'] !== null ? floatval($vehicleData['night_halt_charge']) : 
                              (isset($existingVehicle['night_halt_charge']) && $existingVehicle['night_halt_charge'] !== null ? floatval($existingVehicle['night_halt_charge']) : 700));
            
            $driverAllowance = isset($vehicleData['driverAllowance']) && $vehicleData['driverAllowance'] !== null ? floatval($vehicleData['driverAllowance']) : 
                              (isset($vehicleData['driver_allowance']) && $vehicleData['driver_allowance'] !== null ? floatval($vehicleData['driver_allowance']) : 
                              (isset($existingVehicle['driver_allowance']) && $existingVehicle['driver_allowance'] !== null ? floatval($existingVehicle['driver_allowance']) : 250));
            
            // Ensure these fields are never NULL or less than 0
            $nightHaltCharge = max(0, $nightHaltCharge);
            $driverAllowance = max(0, $driverAllowance);
            
            logMessage("Processed vehicle data for update: " . json_encode([
                'id' => $vehicleId,
                'name' => $vehicleName,
                'capacity' => $capacity,
                'luggage_capacity' => $luggageCapacity,
                'is_active' => $isActive,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ], JSON_PARTIAL_OUTPUT_ON_ERROR));
            
            // Update vehicles table with proper binding to avoid NULL values
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
                
            $stmt = $conn->prepare($updateQuery);
            $stmt->bind_param('siiisssiddddss', 
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
            
            if (!$stmt->execute()) {
                throw new Exception("Error updating vehicles table: " . $stmt->error);
            }
            
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
        }
    } catch (Exception $e) {
        // Log detailed error and rollback transaction
        logMessage("Error in transaction: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        $conn->rollback();
        throw $e;
    } finally {
        // Always close the connection
        $conn->close();
    }
    
} catch (Exception $e) {
    $errorMessage = "Error updating vehicle: " . $e->getMessage();
    $response['message'] = $errorMessage;
    $response['error'] = $e->getMessage();
    logMessage($errorMessage);
}

// Send response with proper JSON encoding and error handling
try {
    // Ensure all necessary fields exist in the response
    if (!isset($response['status'])) {
        $response['status'] = 'error';
    }
    if (!isset($response['timestamp'])) {
        $response['timestamp'] = time();
    }
    
    // Encode with safety checks
    $jsonResponse = json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($jsonResponse === false) {
        $jsonError = json_last_error_msg();
        logMessage("JSON encoding error: " . $jsonError);
        echo '{"status":"error","message":"Failed to encode response: ' . $jsonError . '","timestamp":' . time() . '}';
    } else {
        echo $jsonResponse;
    }
} catch (Exception $e) {
    logMessage("Fatal error sending response: " . $e->getMessage());
    echo '{"status":"error","message":"Fatal error sending response","timestamp":' . time() . '}';
}
exit;
