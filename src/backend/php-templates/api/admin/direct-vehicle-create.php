
<?php
// Enable error reporting but log to file instead of output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log file path
$errorLogFile = $logDir . '/vehicle_create_' . date('Y-m-d') . '.log';
ini_set('error_log', $errorLogFile);

// Log every access to this script for debugging
$timestamp = date('Y-m-d H:i:s');
file_put_contents($errorLogFile, "[$timestamp] direct-vehicle-create.php accessed via " . $_SERVER['REQUEST_METHOD'] . ". Remote IP: " . $_SERVER['REMOTE_ADDR'] . "\n", FILE_APPEND);

// Set headers first to avoid "headers already sent" issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function for consistent JSON responses
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response['vehicle'] = $data;
    }
    
    // Output the JSON response
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Function to log debug info
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_create_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= ": " . json_encode($data);
        } else {
            $logMessage .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Invalid method: " . $_SERVER['REQUEST_METHOD']);
    sendJsonResponse('error', 'Only POST method is allowed');
}

try {
    // Load database configuration
    // Try to include the config file, if it exists
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
    } else {
        // Include database utility functions if available
        if (file_exists(__DIR__ . '/../utils/database.php')) {
            require_once __DIR__ . '/../utils/database.php';
        } else {
            // Fallback database credentials
            function getDbConnection() {
                // Database credentials
                $dbHost = 'localhost';
                $dbName = 'u644605165_db_be';
                $dbUser = 'u644605165_usr_be';
                $dbPass = 'Vizag@1213';
                
                try {
                    // Create connection
                    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
                    
                    // Check connection
                    if ($conn->connect_error) {
                        throw new Exception("Connection failed: " . $conn->connect_error);
                    }
                    
                    // Set charset
                    $conn->set_charset("utf8mb4");
                    
                    // Set collation to ensure consistency
                    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
                    
                    return $conn;
                } catch (Exception $e) {
                    // Log error
                    $logDir = __DIR__ . '/../../logs';
                    if (!file_exists($logDir)) {
                        mkdir($logDir, 0777, true);
                    }
                    
                    $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
                    $timestamp = date('Y-m-d H:i:s');
                    file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
                    
                    return null;
                }
            }
        }
    }
    
    // Get raw input
    $rawInput = file_get_contents('php://input');
    logDebug("Raw input received", $rawInput);
    
    // Try to decode JSON input
    $input = json_decode($rawInput, true);
    $jsonError = json_last_error();
    
    // Fall back to POST data if JSON parsing fails
    if ($jsonError !== JSON_ERROR_NONE) {
        logDebug("JSON decode error: " . json_last_error_msg() . " (code: $jsonError)");
        if (!empty($_POST)) {
            logDebug("Using POST data instead");
            $input = $_POST;
        }
    }
    
    // Verify we have valid data
    if (empty($input)) {
        logDebug("Input data is empty after processing");
        
        // Try to fallback to query string parameters for GET requests or debugging
        if (!empty($_GET) && isset($_GET['vehicleId'])) {
            logDebug("Falling back to GET parameters");
            $input = $_GET;
        } else {
            throw new Exception("No vehicle data provided or invalid format");
        }
    }
    
    logDebug("Parsed input data", $input);
    
    // Generate a vehicle ID if not provided
    $vehicleId = !empty($input['vehicleId']) ? $input['vehicleId'] : 
                (!empty($input['id']) ? $input['id'] : 
                (!empty($input['vehicle_id']) ? $input['vehicle_id'] : uniqid('v_')));
    
    // Extract basic vehicle information with fallbacks
    $name = !empty($input['name']) ? $input['name'] : 'Unnamed Vehicle';
    $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 4;
    $luggageCapacity = isset($input['luggageCapacity']) ? (int)$input['luggageCapacity'] : 2;
    $basePrice = isset($input['basePrice']) ? (float)$input['basePrice'] : 
               (isset($input['price']) ? (float)$input['price'] : 0);
    $price = isset($input['price']) ? (float)$input['price'] : 
           (isset($input['basePrice']) ? (float)$input['basePrice'] : 0);
    $pricePerKm = isset($input['pricePerKm']) ? (float)$input['pricePerKm'] : 14;
    $ac = isset($input['ac']) ? (bool)$input['ac'] : true;
    $image = isset($input['image']) ? $input['image'] : '/cars/sedan.png';
    $description = isset($input['description']) ? $input['description'] : '';
    $isActive = isset($input['isActive']) ? (bool)$input['isActive'] : true;
    $nightHaltCharge = isset($input['nightHaltCharge']) ? (float)$input['nightHaltCharge'] : 700;
    $driverAllowance = isset($input['driverAllowance']) ? (float)$input['driverAllowance'] : 250;
    
    // Handle amenities
    $amenities = ['AC'];
    if (isset($input['amenities'])) {
        if (is_array($input['amenities'])) {
            $amenities = $input['amenities'];
        } else if (is_string($input['amenities'])) {
            try {
                // Try to parse as JSON first
                $parsedAmenities = json_decode($input['amenities'], true);
                if (is_array($parsedAmenities)) {
                    $amenities = $parsedAmenities;
                } else {
                    // If not valid JSON, try as comma-separated string
                    $amenities = array_map('trim', explode(',', $input['amenities']));
                }
            } catch (Exception $e) {
                // Fallback to comma-separated
                $amenities = array_map('trim', explode(',', $input['amenities']));
            }
        }
    }
    
    // Create comprehensive vehicle object with all fields
    $vehicleData = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'price' => $price,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'image' => $image,
        'amenities' => $amenities,
        'description' => $description,
        'ac' => $ac,
        'nightHaltCharge' => $nightHaltCharge,
        'driverAllowance' => $driverAllowance,
        'isActive' => $isActive
    ];
    
    logDebug("Prepared vehicle data", $vehicleData);
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        logDebug("Failed to connect to database");
        
        // For development/preview environment, proceed with a mock success response
        if (strpos($_SERVER['HTTP_HOST'] ?? '', 'lovableproject.com') !== false || 
            strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false) {
            logDebug("Development environment detected, returning mock success");
            sendJsonResponse('success', 'Vehicle created successfully (mock)', $vehicleData);
            exit;
        } else {
            throw new Exception("Database connection failed. Please check credentials.");
        }
    }
    
    // Check if vehicle already exists
    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE id = ? OR vehicle_id = ?");
    if (!$checkStmt) {
        logDebug("Prepare statement error: " . $conn->error);
        throw new Exception("Database error: " . $conn->error);
    }
    
    $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        // Vehicle exists, return error
        logDebug("Vehicle with ID $vehicleId already exists");
        sendJsonResponse('error', "Vehicle with ID $vehicleId already exists. Use update endpoint instead.");
        exit;
    }
    
    // Check if vehicles table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'vehicles'");
    if ($tableExists->num_rows == 0) {
        logDebug("Vehicles table does not exist, creating it");
        
        // Create vehicles table
        $createTableSql = "CREATE TABLE IF NOT EXISTS vehicles (
            id VARCHAR(50) NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) DEFAULT 'Standard',
            capacity INT DEFAULT 4,
            luggage_capacity INT DEFAULT 2,
            ac TINYINT DEFAULT 1,
            image VARCHAR(255) DEFAULT '/cars/sedan.png',
            amenities TEXT,
            description TEXT,
            is_active TINYINT DEFAULT 1,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 700,
            driver_allowance DECIMAL(10,2) DEFAULT 250,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        
        if (!$conn->query($createTableSql)) {
            logDebug("Failed to create vehicles table: " . $conn->error);
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        logDebug("Vehicles table created successfully");
    }
    
    // Convert amenities to JSON string for database
    $amenitiesJson = json_encode($amenities);
    
    // Convert boolean values for database
    $acDB = $ac ? 1 : 0;
    $isActiveDB = $isActive ? 1 : 0;
    
    // Insert into database - use column names that match the database structure
    $insertSql = "INSERT INTO vehicles (
        id, vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, 
        description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $insertStmt = $conn->prepare($insertSql);
    
    if (!$insertStmt) {
        logDebug("Prepare statement error: " . $conn->error);
        throw new Exception("Database error: " . $conn->error);
    }
    
    $insertStmt->bind_param("sssiiisssidddd", 
        $vehicleId, 
        $vehicleId, 
        $name, 
        $capacity, 
        $luggageCapacity, 
        $acDB, 
        $image, 
        $amenitiesJson, 
        $description, 
        $isActiveDB, 
        $basePrice, 
        $pricePerKm, 
        $nightHaltCharge, 
        $driverAllowance
    );
    
    logDebug("Executing SQL with params: " . print_r([
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'ac' => $acDB,
        'image' => $image,
        'amenities' => $amenitiesJson,
        'description' => $description,
        'isActive' => $isActiveDB,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'nightHaltCharge' => $nightHaltCharge,
        'driverAllowance' => $driverAllowance
    ], true));
    
    if ($insertStmt->execute()) {
        logDebug("Vehicle inserted into database successfully");
        
        // Update persistent cache
        $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
        $persistentData = [];
        
        // Load existing cache if it exists
        if (file_exists($persistentCacheFile)) {
            $persistentJson = file_get_contents($persistentCacheFile);
            if ($persistentJson) {
                $persistentData = json_decode($persistentJson, true) ?: [];
            }
        }
        
        // Add new vehicle to persistent data
        $persistentData[] = $vehicleData;
        
        // Save back to persistent cache
        if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
            logDebug("Updated persistent cache file");
        } else {
            logDebug("Failed to update persistent cache file");
        }
        
        // Clear other cache files
        $cacheFiles = glob($cacheDir . '/vehicles_*.json');
        foreach ($cacheFiles as $file) {
            if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
                unlink($file);
                logDebug("Cleared cache file: " . basename($file));
            }
        }
        
        // Return success response
        sendJsonResponse('success', 'Vehicle created successfully', $vehicleData);
    } else {
        logDebug("Failed to insert vehicle: " . $insertStmt->error);
        throw new Exception("Failed to insert vehicle: " . $insertStmt->error);
    }
    
} catch (Exception $e) {
    logDebug("Error in direct-vehicle-create.php: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
