<?php
if (file_exists(__DIR__ . '/../../config.php')) {
    require_once __DIR__ . '/../../config.php';
}
/**
 * direct-vehicle-modify.php - Direct database operations for vehicle data
 * This script provides a robust interface for both adding and modifying vehicle data
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Check if this is a load action (GET request with action=load)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'load') {
    logModifyDebug("Received vehicle load request");
    // Get all vehicles from database
    loadVehiclesFromDatabase();
    exit;
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

// Robust error handling for missing data
if (!(
    isset($_GET['action']) && in_array($_GET['action'], ['load', 'list']) && $_SERVER['REQUEST_METHOD'] === 'GET'
)) {
    if (empty($vehicleData)) {
        logModifyDebug('ERROR: No vehicle data provided');
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'No vehicle data provided'
        ]);
        exit;
    }
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
    if (!$vehicleId && isset($vehicleData['name'])) {
        $vehicleId = strtolower(str_replace(' ', '_', $vehicleData['name']));
        logModifyDebug("Generated vehicle ID from name: $vehicleId");
    }
    if (!$vehicleId) {
        logModifyDebug('ERROR: Vehicle ID or name is required');
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID or name is required'
        ]);
        exit;
    }
    logModifyDebug('Final VEHICLE_DATA for operation', $vehicleData);
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
    // Make sure vehicles table exists
    try {
        $createTableQuery = "CREATE TABLE IF NOT EXISTS vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT DEFAULT 4,
            luggage_capacity INT DEFAULT 2,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            image VARCHAR(255),
            amenities TEXT,
            description TEXT,
            ac TINYINT(1) DEFAULT 1,
            night_halt_charge DECIMAL(10,2) DEFAULT 700,
            driver_allowance DECIMAL(10,2) DEFAULT 250,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        $conn->query($createTableQuery);
        logModifyDebug("Ensured vehicles table exists");
    } catch (Exception $e) {
        logModifyDebug("Error creating vehicles table: " . $e->getMessage());
    }

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
        
        $stmt->bind_param('siiddsssidids', 
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
        
        $stmt->bind_param('ssiiddssiiddi', 
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

// Update static JSON file to keep it in sync with database
try {
    $staticJsonPath = __DIR__ . '/../../../data/vehicles.json';
    if (file_exists($staticJsonPath) && is_writable($staticJsonPath)) {
        file_put_contents($staticJsonPath, json_encode($persistentData, $jsonOptions));
        logModifyDebug("Updated static vehicles.json file");
    } else {
        logModifyDebug("Static JSON file doesn't exist or isn't writable: $staticJsonPath");
    }
} catch (Exception $e) {
    logModifyDebug("Error updating static JSON: " . $e->getMessage());
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

/**
 * Function to load all vehicles from database
 */
function loadVehiclesFromDatabase() {
    global $conn, $cacheDir, $logDir;
    
    logModifyDebug("Loading all vehicles from database");
    
    // Get database connection if not already available
    if (!$conn) {
        // Try to include config
        if (file_exists(__DIR__ . '/../../config.php')) {
            require_once __DIR__ . '/../../config.php';
            if (function_exists('getDbConnection')) {
                $conn = getDbConnection();
                logModifyDebug("Got database connection from config for loading");
            }
        }
        
        // If still no connection, try direct connection
        if (!$conn && class_exists('mysqli')) {
            $dbHost = 'localhost';
            $dbName = 'u64460565_db_be';
            $dbUser = 'u64460565_usr_be';
            $dbPass = 'Vizag@1213';
            
            try {
                $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
                if ($conn->connect_error) {
                    logModifyDebug("Failed to connect to database for loading: " . $conn->connect_error);
                    $conn = null;
                } else {
                    $conn->set_charset("utf8mb4");
                    logModifyDebug("Connected to database with direct credentials for loading");
                }
            } catch (Exception $e) {
                logModifyDebug("Connection error for loading: " . $e->getMessage());
                $conn = null;
            }
        }
    }
    
    $vehicles = [];
    $source = 'unknown';
    
    // Get vehicles from database if connection available
    if ($conn) {
        try {
            // Query all vehicles
            $query = "SELECT * FROM vehicles";
            $includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
            
            if (!$includeInactive) {
                $query .= " WHERE is_active = 1";
            }
            
            $result = $conn->query($query);
            
            if ($result && $result->num_rows > 0) {
                logModifyDebug("Found {$result->num_rows} vehicles in database");
                
                while ($row = $result->fetch_assoc()) {
                    // Convert database row to vehicle object
                    $vehicle = [
                        'id' => $row['vehicle_id'],
                        'vehicleId' => $row['vehicle_id'],
                        'name' => $row['name'],
                        'capacity' => (int)$row['capacity'],
                        'luggageCapacity' => (int)$row['luggage_capacity'],
                        'price' => (float)$row['base_price'],
                        'basePrice' => (float)$row['base_price'],
                        'pricePerKm' => (float)$row['price_per_km'],
                        'image' => $row['image'],
                        'amenities' => json_decode($row['amenities']) ?: ['AC', 'Water'],
                        'description' => $row['description'],
                        'ac' => (bool)$row['ac'],
                        'nightHaltCharge' => (float)$row['night_halt_charge'],
                        'driverAllowance' => (float)$row['driver_allowance'],
                        'isActive' => (bool)$row['is_active'],
                        'inclusions' => (function($val) {
                            $decoded = json_decode($val, true);
                            if (is_array($decoded)) return $decoded;
                            if (is_string($decoded)) return [$decoded];
                            if (is_string($val) && strlen(trim($val))) return array_map('trim', explode(',', $val));
                            return [];
                        })($row['inclusions'] ?? ''),
                        'exclusions' => (function($val) {
                            $decoded = json_decode($val, true);
                            if (is_array($decoded)) return $decoded;
                            if (is_string($decoded)) return [$decoded];
                            if (is_string($val) && strlen(trim($val))) return array_map('trim', explode(',', $val));
                            return [];
                        })($row['exclusions'] ?? ''),
                        'cancellationPolicy' => $row['cancellation_policy'] ?? '',
                        'fuelType' => $row['fuel_type'] ?? ''
                    ];
                    
                    $vehicles[] = $vehicle;
                }
                
                $source = 'database';
            } else {
                logModifyDebug("No vehicles found in database or query error");
            }
            
            $conn->close();
        } catch (Exception $e) {
            logModifyDebug("Error querying database: " . $e->getMessage());
        }
    }
    
    // If no vehicles from database, try persistent cache
    if (empty($vehicles)) {
        logModifyDebug("No vehicles from database, trying persistent cache");
        $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
        
        if (file_exists($persistentCacheFile)) {
            $persistentJson = file_get_contents($persistentCacheFile);
            if ($persistentJson) {
                try {
                    $persistentData = json_decode($persistentJson, true);
                    if (is_array($persistentData) && !empty($persistentData)) {
                        $vehicles = $persistentData;
                        $source = 'persistent_cache';
                        logModifyDebug("Loaded " . count($vehicles) . " vehicles from persistent cache");
                    }
                } catch (Exception $e) {
                    logModifyDebug("Error parsing persistent cache: " . $e->getMessage());
                }
            }
        }
    }
    
    // If still no vehicles, try static JSON
    if (empty($vehicles)) {
        logModifyDebug("No vehicles from database or persistent cache, trying static JSON");
        $staticJsonPath = __DIR__ . '/../../../data/vehicles.json';
        
        if (file_exists($staticJsonPath)) {
            $staticJson = file_get_contents($staticJsonPath);
            if ($staticJson) {
                try {
                    $staticData = json_decode($staticJson, true);
                    if (is_array($staticData) && !empty($staticData)) {
                        $vehicles = $staticData;
                        $source = 'static_json';
                        logModifyDebug("Loaded " . count($vehicles) . " vehicles from static JSON");
                    }
                } catch (Exception $e) {
                    logModifyDebug("Error parsing static JSON: " . $e->getMessage());
                }
            }
        }
    }
    
    // Return the vehicles
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicles loaded from ' . $source,
        'source' => $source,
        'count' => count($vehicles),
        'vehicles' => $vehicles,
        'timestamp' => time()
    ]);
    
    // Also update the persistent cache if we loaded from database
    if ($source === 'database' && !empty($vehicles)) {
        $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
        $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
        $saveResult = file_put_contents($persistentCacheFile, json_encode($vehicles, $jsonOptions));
        
        if ($saveResult === false) {
            logModifyDebug("Failed to update persistent cache with database data");
        } else {
            logModifyDebug("Updated persistent cache with database data");
        }
        
        // Also update static JSON file
        try {
            $staticJsonPath = __DIR__ . '/../../../data/vehicles.json';
            if (file_exists($staticJsonPath) && is_writable($staticJsonPath)) {
                file_put_contents($staticJsonPath, json_encode($vehicles, $jsonOptions));
                logModifyDebug("Updated static JSON with database data");
            }
        } catch (Exception $e) {
            logModifyDebug("Error updating static JSON: " . $e->getMessage());
        }
    }
    
    exit;
}
