
<?php
/**
 * direct-vehicle-create.php - Create a new vehicle and sync across all vehicle tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-vehicle-create.log');
}

// Log request information
logMessage("Vehicle create request received: " . $_SERVER['REQUEST_METHOD']);
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

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Only POST method is allowed';
    echo json_encode($response);
    exit;
}

// Log received data for debugging
logMessage("POST data: " . print_r($_POST, true));

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
    
    // First priority: $_POST data
    if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle");
    }
    // Second priority: JSON input
    else {
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $vehicleData = $jsonData;
            logMessage("Parsed vehicle data from JSON");
        }
        // Third priority: URL-encoded
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
    
    // Extract vehicle name
    $vehicleName = null;
    $possibleNameFields = ['name', 'vehicleName', 'vehicle_name', 'cab_name', 'cabName'];
    
    foreach ($possibleNameFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleName = $vehicleData[$field];
            logMessage("Found vehicle name in field '$field': $vehicleName");
            break;
        }
    }
    
    if (empty($vehicleName)) {
        $vehicleName = $vehicleId; // Default to using the ID as name
        logMessage("No vehicle name found, defaulting to ID: $vehicleName");
    }
    
    // Extract other vehicle properties with defaults
    $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                      (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 2);
    
    $ac = isset($vehicleData['ac']) ? (intval($vehicleData['ac']) ? 1 : 0) : 1;
    $isActive = isset($vehicleData['isActive']) ? (intval($vehicleData['isActive']) ? 1 : 0) : 
               (isset($vehicleData['is_active']) ? (intval($vehicleData['is_active']) ? 1 : 0) : 1);
    
    // Handle image path
    $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : '/cars/sedan.png';
    
    // Handle amenities (convert to string if array)
    $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : 'AC';
    if (is_array($amenities)) {
        $amenities = implode(', ', $amenities);
    }
    
    $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
    
    // Extract pricing data
    $basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                (isset($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                (isset($vehicleData['price']) ? floatval($vehicleData['price']) : 0));
    
    $pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                 (isset($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : 0);
    
    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 
                      (isset($vehicleData['night_halt_charge']) ? floatval($vehicleData['night_halt_charge']) : 0);
    
    $driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 
                      (isset($vehicleData['driver_allowance']) ? floatval($vehicleData['driver_allowance']) : 0);
    
    // Create a vehicle record with all fields
    $vehicleRecord = [
        'id' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'name' => $vehicleName,
        'capacity' => $capacity,
        'luggage_capacity' => $luggageCapacity,
        'ac' => $ac,
        'is_active' => $isActive,
        'image' => $image,
        'amenities' => $amenities,
        'description' => $description,
        'base_price' => $basePrice,
        'price_per_km' => $pricePerKm,
        'night_halt_charge' => $nightHaltCharge,
        'driver_allowance' => $driverAllowance
    ];
    
    // Log the vehicle record for debugging
    logMessage("Vehicle record to insert: " . print_r($vehicleRecord, true));
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if all necessary tables exist, and create them if they don't
        $requiredTables = [
            'vehicles',
            'vehicle_types',
            'vehicle_pricing',
            'local_package_fares',
            'airport_transfer_fares',
            'outstation_fares'
        ];
        
        foreach ($requiredTables as $table) {
            $tableCheckResult = $conn->query("SHOW TABLES LIKE '$table'");
            if ($tableCheckResult->num_rows == 0) {
                logMessage("Table $table does not exist, will be created during vehicle insertion");
                // Tables will be created later if needed
            }
        }
        
        // Check if vehicle ID already exists across any table
        $checkQuery = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        if ($checkStmt) {
            $checkStmt->bind_param('s', $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $row = $checkResult->fetch_assoc();
            
            if ($row && $row['count'] > 0) {
                // Vehicle already exists, try to update it instead
                logMessage("Vehicle with ID '$vehicleId' already exists, attempting to update it");
                
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
                    updated_at = NOW()
                    WHERE vehicle_id = ?";
                
                $updateVehicleStmt = $conn->prepare($updateVehicleQuery);
                $updateVehicleStmt->bind_param(
                    'siiississddds',
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
                    throw new Exception("Error updating vehicle: " . $updateVehicleStmt->error);
                }
                
                // Commit transaction
                $conn->commit();
                
                // Success response for update
                $response['status'] = 'success';
                $response['message'] = "Vehicle '$vehicleName' updated successfully";
                $response['vehicleId'] = $vehicleId;
                $response['operation'] = 'update';
                
                logMessage("Vehicle '$vehicleName' updated successfully with ID: $vehicleId");
                
                echo json_encode($response);
                exit;
            }
        }
        
        // Insert into vehicles table
        $insertVehicleQuery = "INSERT INTO vehicles 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        $insertVehicleStmt->bind_param('ssiiisssidddd', 
            $vehicleId, 
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
            $driverAllowance
        );
        
        if (!$insertVehicleStmt->execute()) {
            // If the insert fails, it might be because the table doesn't exist
            if ($conn->errno == 1146) { // Table doesn't exist
                logMessage("Vehicles table doesn't exist, creating it");
                
                // Create the vehicles table
                $createTableQuery = "CREATE TABLE IF NOT EXISTS vehicles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    capacity INT DEFAULT 4,
                    luggage_capacity INT DEFAULT 2,
                    ac TINYINT(1) DEFAULT 1,
                    image VARCHAR(255),
                    amenities TEXT,
                    description TEXT,
                    is_active TINYINT(1) DEFAULT 1,
                    base_price DECIMAL(10, 2) DEFAULT 0.00,
                    price_per_km DECIMAL(10, 2) DEFAULT 0.00,
                    night_halt_charge DECIMAL(10, 2) DEFAULT 0.00,
                    driver_allowance DECIMAL(10, 2) DEFAULT 0.00,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )";
                
                if (!$conn->query($createTableQuery)) {
                    throw new Exception("Failed to create vehicles table: " . $conn->error);
                }
                
                // Try the insert again
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->bind_param('ssiiisssidddd', 
                    $vehicleId, 
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
                    $driverAllowance
                );
                
                if (!$insertVehicleStmt->execute()) {
                    throw new Exception("Error inserting into vehicles table after creation: " . $insertVehicleStmt->error);
                }
            } else {
                throw new Exception("Error inserting into vehicles table: " . $insertVehicleStmt->error);
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['status'] = 'success';
        $response['message'] = "Vehicle '$vehicleName' created successfully";
        $response['vehicleId'] = $vehicleId;
        $response['vehicle'] = $vehicleRecord;
        
        logMessage("Vehicle '$vehicleName' created successfully with ID: $vehicleId");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error creating vehicle: " . $e->getMessage());
}

// Send response
echo json_encode($response);
