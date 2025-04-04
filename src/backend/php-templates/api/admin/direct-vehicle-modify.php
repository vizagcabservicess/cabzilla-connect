
<?php
/**
 * direct-vehicle-modify.php - Direct database operations for vehicle data
 * This script provides a robust interface for both adding and modifying vehicle data
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log debug info
function logModifyDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_modify_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Get input data from various sources
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
}

if (!$vehicleData && !empty($_GET)) {
    $vehicleData = $_GET;
}

logModifyDebug("Received vehicle modify request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => $vehicleData
]);

// Validate vehicle data
if (empty($vehicleData)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No vehicle data provided'
    ]);
    exit;
}

// Get vehicle ID (required for updating, optional for new vehicles)
$vehicleId = null;
if (isset($vehicleData['id'])) {
    $vehicleId = $vehicleData['id'];
} elseif (isset($vehicleData['vehicleId'])) {
    $vehicleId = $vehicleData['vehicleId'];
} elseif (isset($vehicleData['vehicle_id'])) {
    $vehicleId = $vehicleData['vehicle_id'];
} elseif (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

// For new vehicles without ID, generate one
if (!$vehicleId && isset($vehicleData['name'])) {
    $vehicleId = strtolower(str_replace(' ', '_', $vehicleData['name']));
    logModifyDebug("Generated vehicle ID from name: $vehicleId");
}

// If we still don't have an ID, error out
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID or name is required'
    ]);
    exit;
}

// Prepare vehicle data for database
$name = isset($vehicleData['name']) ? $vehicleData['name'] : ucwords(str_replace('_', ' ', $vehicleId));
$capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
$luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 2;
$basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
             (isset($vehicleData['price']) ? floatval($vehicleData['price']) : 0);
$pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 0;
$image = isset($vehicleData['image']) ? $vehicleData['image'] : "/cars/{$vehicleId}.png";
$description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
$ac = isset($vehicleData['ac']) ? (bool)$vehicleData['ac'] : true;
$nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 700;
$driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 250;
$isActive = isset($vehicleData['isActive']) ? (bool)$vehicleData['isActive'] : true;

// Format amenities
$amenitiesArray = [];
if (isset($vehicleData['amenities'])) {
    if (is_array($vehicleData['amenities'])) {
        $amenitiesArray = $vehicleData['amenities'];
    } else if (is_string($vehicleData['amenities'])) {
        if (substr($vehicleData['amenities'], 0, 1) === '[') {
            try {
                $amenitiesArray = json_decode($vehicleData['amenities'], true);
                if (!is_array($amenitiesArray)) {
                    $amenitiesArray = array_map('trim', explode(',', str_replace(['[', ']', '"', "'"], '', $vehicleData['amenities'])));
                }
            } catch (Exception $e) {
                $amenitiesArray = array_map('trim', explode(',', str_replace(['[', ']', '"', "'"], '', $vehicleData['amenities'])));
            }
        } else {
            $amenitiesArray = array_map('trim', explode(',', $vehicleData['amenities']));
        }
    }
} else {
    $amenitiesArray = ['AC', 'Bottle Water', 'Music System'];
}

$amenitiesJson = json_encode($amenitiesArray);

logModifyDebug("Parsed numeric values:", [
    "capacity: $capacity",
    "luggageCapacity: $luggageCapacity",
    "basePrice: $basePrice",
    "price per km: $pricePerKm",
    "nightHaltCharge: $nightHaltCharge",
    "driverAllowance: $driverAllowance"
]);

// Get database connection
$conn = null;

// First try to include config
if (file_exists(__DIR__ . '/../../config.php')) {
    require_once __DIR__ . '/../../config.php';
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
        logModifyDebug("Got database connection from config");
    }
}

// If no connection yet, try direct connection
if (!$conn && class_exists('mysqli')) {
    // Fallback database credentials
    $dbHost = 'localhost';
    $dbName = 'u64460565_db_be';
    $dbUser = 'u64460565_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            logModifyDebug("Failed to connect to database: " . $conn->connect_error);
            $conn = null;
        } else {
            $conn->set_charset("utf8mb4");
            logModifyDebug("Connected to database with direct credentials");
        }
    } catch (Exception $e) {
        logModifyDebug("Connection error: " . $e->getMessage());
        $conn = null;
    }
}

// If we have a database connection, perform the operation
$dbResult = false;
$dbMessage = "Database operation failed";
$dbInsertId = 0;

if ($conn) {
    // Check if vehicle exists
    $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param('s', $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing vehicle
        logModifyDebug("Updating existing vehicle in database");
        
        $query = "UPDATE vehicles SET 
            name = ?, 
            capacity = ?,
            luggage_capacity = ?,
            base_price = ?,
            price_per_km = ?,
            image = ?,
            amenities = ?,
            description = ?,
            ac = ?,
            night_halt_charge = ?,
            driver_allowance = ?,
            is_active = ?,
            updated_at = NOW()
            WHERE vehicle_id = ?";
        
        $stmt = $conn->prepare($query);
        
        // Convert boolean to integer for database
        $acInt = $ac ? 1 : 0;
        $isActiveInt = $isActive ? 1 : 0;
        
        $stmt->bind_param('siiddsssidis', 
            $name, 
            $capacity, 
            $luggageCapacity,
            $basePrice,
            $pricePerKm,
            $image,
            $amenitiesJson,
            $description,
            $acInt,
            $nightHaltCharge,
            $driverAllowance,
            $isActiveInt,
            $vehicleId
        );
        
        $dbResult = $stmt->execute();
        if ($dbResult) {
            $dbMessage = "Vehicle updated successfully in database";
            logModifyDebug($dbMessage);
        } else {
            $dbMessage = "Failed to update vehicle in database: " . $stmt->error;
            logModifyDebug($dbMessage);
        }
    } else {
        // Insert new vehicle
        logModifyDebug("Inserting new vehicle in database");
        
        $query = "INSERT INTO vehicles 
            (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
            image, amenities, description, ac, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $conn->prepare($query);
        
        // Convert boolean to integer for database
        $acInt = $ac ? 1 : 0;
        $isActiveInt = $isActive ? 1 : 0;
        
        $stmt->bind_param('ssiiddssiidi', 
            $vehicleId,
            $name, 
            $capacity, 
            $luggageCapacity,
            $basePrice,
            $pricePerKm,
            $image,
            $amenitiesJson,
            $description,
            $acInt,
            $nightHaltCharge,
            $driverAllowance,
            $isActiveInt
        );
        
        $dbResult = $stmt->execute();
        if ($dbResult) {
            $dbInsertId = $conn->insert_id;
            $dbMessage = "Vehicle inserted successfully in database with ID: " . $dbInsertId;
            logModifyDebug($dbMessage);
        } else {
            $dbMessage = "Failed to insert vehicle in database: " . $stmt->error;
            logModifyDebug($dbMessage);
        }
    }
    
    $conn->close();
} else {
    $dbMessage = "No database connection available";
    logModifyDebug($dbMessage);
}

// Prepare vehicle object for response and cache
$vehicle = [
    'id' => $vehicleId,
    'vehicleId' => $vehicleId,
    'name' => $name,
    'capacity' => $capacity,
    'luggageCapacity' => $luggageCapacity,
    'price' => $basePrice,
    'basePrice' => $basePrice,
    'pricePerKm' => $pricePerKm,
    'image' => $image,
    'amenities' => $amenitiesArray,
    'description' => $description,
    'ac' => $ac,
    'nightHaltCharge' => $nightHaltCharge,
    'driverAllowance' => $driverAllowance,
    'isActive' => $isActive
];

logModifyDebug("Prepared vehicle data for update:", $vehicle);

// Update persistent cache
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                $persistentData = [];
            }
        } catch (Exception $e) {
            logModifyDebug("Error parsing persistent cache: " . $e->getMessage());
            $persistentData = [];
        }
    }
}

// Find vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $existingVehicle) {
    $curId = isset($existingVehicle['id']) ? $existingVehicle['id'] : 
            (isset($existingVehicle['vehicleId']) ? $existingVehicle['vehicleId'] : '');
    if ($curId === $vehicleId) {
        $vehicleIndex = $index;
        break;
    }
}

if ($vehicleIndex >= 0) {
    // Update existing vehicle in persistent cache
    $persistentData[$vehicleIndex] = $vehicle;
    logModifyDebug("Updated existing vehicle in persistent cache");
} else {
    // Add new vehicle to persistent cache
    $persistentData[] = $vehicle;
    logModifyDebug("Added new vehicle to persistent cache");
}

// Save back to persistent cache
$jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
$saveResult = file_put_contents($persistentCacheFile, json_encode($persistentData, $jsonOptions));
if ($saveResult === false) {
    logModifyDebug("Failed to save to persistent cache");
} else {
    logModifyDebug("Saved to persistent cache successfully");
}

// Clear all temporary cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && strpos($file, 'persistent_backup') === false) {
        unlink($file);
        logModifyDebug("Cleared cache file: " . basename($file));
    }
}

// Trigger reload in background
$reloadUrl = dirname($_SERVER['SCRIPT_NAME']) . "/reload-vehicles.php?_t=" . time();
logModifyDebug("Triggering reload at: " . $reloadUrl);

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully and saved to database',
    'dbMessage' => $dbMessage,
    'dbSuccess' => $dbResult,
    'dbInsertId' => $dbInsertId,
    'vehicle' => $vehicle,
    'reload' => true,
    'reloadUrl' => '/api/admin/reload-vehicles.php?_t=' . time()
]);

// Try to trigger a reload in the background
try {
    $cmd = "GET " . $reloadUrl . " HTTP/1.1\r\n";
    $cmd .= "Host: " . $_SERVER['HTTP_HOST'] . "\r\n";
    $cmd .= "Connection: Close\r\n\r\n";
    
    $fp = fsockopen($_SERVER['HTTP_HOST'], 80, $errno, $errstr, 30);
    if ($fp) {
        fwrite($fp, $cmd);
        fclose($fp);
        logModifyDebug("Reload triggered via fsockopen");
    } else {
        logModifyDebug("Failed to trigger reload via fsockopen: $errstr ($errno)");
    }
} catch (Exception $e) {
    logModifyDebug("Error triggering reload: " . $e->getMessage());
}
