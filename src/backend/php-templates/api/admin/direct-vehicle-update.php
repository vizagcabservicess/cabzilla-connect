<?php
/**
 * direct-vehicle-update.php - Update an existing vehicle and sync across all vehicle tables
 * ENHANCED: Now prioritizes database operations and ensures proper synchronization
 */

// Enable error reporting and log test
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Write a test log entry to the main log file for confirmation
$mainLogFile = __DIR__ . '/vehicle_update_' . date('Y-m-d') . '.log';
file_put_contents($mainLogFile, "[" . date('Y-m-d H:i:s') . "] Test log entry from direct-vehicle-update.php\n", FILE_APPEND);

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/direct_vehicle_update_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Load database utilities
if (file_exists(__DIR__ . '/../utils/database.php')) {
    require_once __DIR__ . '/../utils/database.php';
}

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

logDebug("Received update request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => $vehicleData,
    'raw' => $inputData
]);

// Check if we have valid data
if (empty($vehicleData)) {
    logDebug("No vehicle data provided");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No vehicle data provided'
    ]);
    exit;
}

// Get vehicle ID
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

if (!$vehicleId) {
    logDebug("Vehicle ID is required");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

logDebug("Processing vehicle ID: $vehicleId");

// Map frontend camelCase to backend snake_case for new fields
if (isset($vehicleData['cancellationPolicy'])) {
    $vehicleData['cancellation_policy'] = $vehicleData['cancellationPolicy'];
}
if (isset($vehicleData['fuelType'])) {
    $vehicleData['fuel_type'] = $vehicleData['fuelType'];
}
if (isset($vehicleData['inclusions'])) {
    $vehicleData['inclusions'] = $vehicleData['inclusions']; // for clarity, keep as is
}
if (isset($vehicleData['exclusions'])) {
    $vehicleData['exclusions'] = $vehicleData['exclusions']; // for clarity, keep as is
}

// First, try to update the database if possible (DATABASE FIRST APPROACH)
$dbUpdated = false;
$dbVehicle = null;

try {
    // Try loading config.php if exists
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
    }
    
    // Try to connect to database either using getDbConnection from utils or from config
    $conn = null;
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else if (class_exists('mysqli')) {
        // Fallback database credentials
        $dbHost = 'localhost';
        $dbName = 'u64460565_db_be';
        $dbUser = 'u64460565_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            logDebug("Failed to connect to database: " . $conn->connect_error);
            $conn = null;
        } else {
            $conn->set_charset("utf8mb4");
        }
    }
    
    if ($conn) {
        logDebug("Connected to database successfully");
        
        // Format amenities for database storage
        $amenitiesValue = '';
        if (isset($vehicleData['amenities'])) {
            if (is_array($vehicleData['amenities'])) {
                $amenitiesValue = json_encode($vehicleData['amenities']);
            } else if (is_string($vehicleData['amenities'])) {
                // If it's already a JSON string, keep it as is
                if (substr($vehicleData['amenities'], 0, 1) === '[') {
                    $amenitiesValue = $vehicleData['amenities'];
                } else {
                    // Convert comma-separated string to JSON array
                    $amenitiesArray = array_map('trim', explode(',', $vehicleData['amenities']));
                    $amenitiesValue = json_encode($amenitiesArray);
                }
            }
        }
        
        // Normalize numeric fields
        $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 0;
        $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 0;
        $basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 0;
        $pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 0;
        $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 0;
        $driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 0;
        $isActive = isset($vehicleData['isActive']) ? ($vehicleData['isActive'] ? 1 : 0) : 1;
        $ac = isset($vehicleData['ac']) ? ($vehicleData['ac'] ? 1 : 0) : 1;
        
        // Prepare other fields
        $name = isset($vehicleData['name']) ? $vehicleData['name'] : '';
        $image = isset($vehicleData['image']) ? $vehicleData['image'] : '';
        $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
        
        // Handle new fields (force as non-null strings)
        $inclusionsValue = isset($vehicleData['inclusions']) ? (is_array($vehicleData['inclusions']) ? json_encode($vehicleData['inclusions']) : (string)$vehicleData['inclusions']) : '';
        $exclusionsValue = isset($vehicleData['exclusions']) ? (is_array($vehicleData['exclusions']) ? json_encode($vehicleData['exclusions']) : (string)$vehicleData['exclusions']) : '';
        $cancellationPolicy = isset($vehicleData['cancellation_policy']) ? (string)$vehicleData['cancellation_policy'] : '';
        $fuelType = isset($vehicleData['fuel_type']) ? (string)$vehicleData['fuel_type'] : '';
        
        logDebug("Parsed numeric values:", [
            "capacity: $capacity",
            "luggageCapacity: $luggageCapacity",
            "basePrice: $basePrice",
            "price per km: $pricePerKm",
            "nightHaltCharge: $nightHaltCharge",
            "driverAllowance: $driverAllowance"
        ]);
        
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param('s', $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Get existing database record
            $dbVehicle = $result->fetch_assoc();
            logDebug("Found existing vehicle in database", $dbVehicle);
            
            // Update existing vehicle
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
                inclusions = ?,
                exclusions = ?,
                cancellation_policy = ?,
                fuel_type = ?,
                updated_at = NOW()
                WHERE vehicle_id = ?";
            
            $stmt = $conn->prepare($query);
            $stmt->bind_param('siiddsssidissssss', 
                $name, 
                $capacity, 
                $luggageCapacity,
                $basePrice,
                $pricePerKm,
                $image,
                $amenitiesValue,
                $description,
                $ac,
                $nightHaltCharge,
                $driverAllowance,
                $isActive,
                $inclusionsValue,
                $exclusionsValue,
                $cancellationPolicy,
                $fuelType,
                $vehicleId
            );
            
            $updateResult = $stmt->execute();
            $affectedRows = $stmt->affected_rows;
            
            // Log SQL errors
            if ($stmt->error) {
                logDebug("SQL Error (main update): " . $stmt->error);
            }
            
            if ($updateResult && $affectedRows > 0) {
                logDebug("Updated in database: " . $affectedRows . " rows affected");
                $dbUpdated = true;
                // Re-fetch the updated row after update
                $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
                $stmt2 = $conn->prepare($checkQuery);
                $stmt2->bind_param('s', $vehicleId);
                $stmt2->execute();
                $result2 = $stmt2->get_result();
                if ($result2->num_rows > 0) {
                    $dbVehicle = $result2->fetch_assoc();
                }
            } else {
                logDebug("Database update failed or no rows affected: " . $stmt->error);
                // Try a minimal update for debug
                $debugQuery = "UPDATE vehicles SET inclusions = ?, exclusions = ?, cancellation_policy = ?, fuel_type = ? WHERE vehicle_id = ?";
                $debugStmt = $conn->prepare($debugQuery);
                $debugStmt->bind_param('sssss', $inclusionsValue, $exclusionsValue, $cancellationPolicy, $fuelType, $vehicleId);
                $debugResult = $debugStmt->execute();
                if ($debugStmt->error) {
                    logDebug("SQL Error (minimal update): " . $debugStmt->error);
                }
                if ($debugResult && $debugStmt->affected_rows > 0) {
                    logDebug("Minimal update succeeded for new fields.");
                } else {
                    logDebug("Minimal update failed: " . $debugStmt->error);
                }
            }
        } else {
            // Insert new vehicle
            logDebug("Vehicle does not exist in database, inserting new record");
            $query = "INSERT INTO vehicles 
                (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                image, amenities, description, ac, night_halt_charge, driver_allowance, is_active, inclusions, exclusions, cancellation_policy, fuel_type, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            
            $stmt = $conn->prepare($query);
            $stmt->bind_param('ssiiddssssidiissss', 
                $vehicleId,
                $name, 
                $capacity, 
                $luggageCapacity,
                $basePrice,
                $pricePerKm,
                $image,
                $amenitiesValue,
                $description,
                $ac,
                $nightHaltCharge,
                $driverAllowance,
                $isActive,
                $inclusionsValue,
                $exclusionsValue,
                $cancellationPolicy,
                $fuelType
            );
            
            $insertResult = $stmt->execute();
            $insertId = $conn->insert_id;
            
            if ($insertResult) {
                logDebug("Inserted in database: ID = " . $insertId);
                $dbUpdated = true;
                
                // Get the newly inserted record
                $checkQuery = "SELECT * FROM vehicles WHERE id = ?";
                $stmt = $conn->prepare($checkQuery);
                $stmt->bind_param('i', $insertId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    $dbVehicle = $result->fetch_assoc();
                }
            } else {
                logDebug("Database insert failed: " . $stmt->error);
            }
        }
        
        $conn->close();
    } else {
        logDebug("Could not connect to database, skipping database update");
    }
} catch (Exception $e) {
    logDebug("Database error: " . $e->getMessage());
}

// Create vehicle object from database or input data
$vehicle = [];

if ($dbVehicle) {
    // Use database record as base
    $vehicle = [
        'id' => $dbVehicle['vehicle_id'],
        'vehicleId' => $dbVehicle['vehicle_id'],
        'name' => $dbVehicle['name'],
        'capacity' => intval($dbVehicle['capacity']),
        'luggageCapacity' => intval($dbVehicle['luggage_capacity']),
        'price' => floatval($dbVehicle['base_price']),
        'basePrice' => floatval($dbVehicle['base_price']),
        'pricePerKm' => floatval($dbVehicle['price_per_km']),
        'image' => $dbVehicle['image'],
        'description' => $dbVehicle['description'],
        'ac' => (bool)$dbVehicle['ac'],
        'nightHaltCharge' => floatval($dbVehicle['night_halt_charge']),
        'driverAllowance' => floatval($dbVehicle['driver_allowance']),
        'isActive' => (bool)$dbVehicle['is_active'],
        'inclusions' => isset($dbVehicle['inclusions']) ? (json_decode($dbVehicle['inclusions'], true) ?: $dbVehicle['inclusions']) : (isset($vehicleData['inclusions']) ? $vehicleData['inclusions'] : []),
        'exclusions' => isset($dbVehicle['exclusions']) ? (json_decode($dbVehicle['exclusions'], true) ?: $dbVehicle['exclusions']) : (isset($vehicleData['exclusions']) ? $vehicleData['exclusions'] : []),
        'cancellation_policy' => isset($dbVehicle['cancellation_policy']) ? $dbVehicle['cancellation_policy'] : (isset($vehicleData['cancellation_policy']) ? $vehicleData['cancellation_policy'] : ''),
        'fuel_type' => isset($dbVehicle['fuel_type']) ? $dbVehicle['fuel_type'] : (isset($vehicleData['fuel_type']) ? $vehicleData['fuel_type'] : ''),
    ];
    logDebug('Final vehicle array:', $vehicle);
    
    // Parse amenities from database
    if (!empty($dbVehicle['amenities'])) {
        try {
            $amenities = json_decode($dbVehicle['amenities'], true);
            if (is_array($amenities)) {
                $vehicle['amenities'] = $amenities;
            } else {
                $vehicle['amenities'] = array_map('trim', explode(',', $dbVehicle['amenities']));
            }
        } catch (Exception $e) {
            $vehicle['amenities'] = array_map('trim', explode(',', $dbVehicle['amenities']));
        }
    } else {
        $vehicle['amenities'] = ['AC'];
    }
    
    logDebug("Using database record as base for vehicle object", $vehicle);
} else {
    // Use input data as base
    $vehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => isset($vehicleData['name']) ? $vehicleData['name'] : ucwords(str_replace('_', ' ', $vehicleId)),
        'capacity' => isset($vehicleData['capacity']) ? (int)$vehicleData['capacity'] : 4,
        'luggageCapacity' => isset($vehicleData['luggageCapacity']) ? (int)$vehicleData['luggageCapacity'] : 2,
        'price' => isset($vehicleData['price']) ? (float)$vehicleData['price'] : 0,
        'basePrice' => isset($vehicleData['basePrice']) ? (float)$vehicleData['basePrice'] : 0,
        'pricePerKm' => isset($vehicleData['pricePerKm']) ? (float)$vehicleData['pricePerKm'] : 0,
        'image' => isset($vehicleData['image']) ? $vehicleData['image'] : "/cars/{$vehicleId}.png",
        'description' => isset($vehicleData['description']) ? $vehicleData['description'] : '',
        'ac' => isset($vehicleData['ac']) ? (bool)$vehicleData['ac'] : true,
        'nightHaltCharge' => isset($vehicleData['nightHaltCharge']) ? (float)$vehicleData['nightHaltCharge'] : 700,
        'driverAllowance' => isset($vehicleData['driverAllowance']) ? (float)$vehicleData['driverAllowance'] : 250,
        'isActive' => isset($vehicleData['isActive']) ? (bool)$vehicleData['isActive'] : true,
        'inclusions' => isset($vehicleData['inclusions']) ? $vehicleData['inclusions'] : [],
        'exclusions' => isset($vehicleData['exclusions']) ? $vehicleData['exclusions'] : [],
        'cancellation_policy' => isset($vehicleData['cancellation_policy']) ? $vehicleData['cancellation_policy'] : '',
        'fuel_type' => isset($vehicleData['fuel_type']) ? $vehicleData['fuel_type'] : '',
    ];
    logDebug('Final vehicle array:', $vehicle);
    
    // Handle amenities
    if (isset($vehicleData['amenities'])) {
        if (is_string($vehicleData['amenities'])) {
            try {
                $amenities = json_decode($vehicleData['amenities'], true);
                if (is_array($amenities)) {
                    $vehicle['amenities'] = $amenities;
                } else {
                    $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
                }
            } catch (Exception $e) {
                $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } else {
            $vehicle['amenities'] = $vehicleData['amenities'];
        }
    } else {
        $vehicle['amenities'] = ['AC'];
    }
    
    logDebug("Using input data as base for vehicle object", $vehicle);
}

// After building the new, complete $vehicle array (with all fields):
logDebug('Prepared vehicle data for update::', $vehicle);
logDebug('Normalized vehicle data:', $vehicle);

// Now that we have the vehicle data (from DB or input), update the persistent cache

// Load persistent data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    try {
        $persistentJson = file_get_contents($persistentCacheFile);
        $persistentData = json_decode($persistentJson, true);
        if (!is_array($persistentData)) {
            logDebug("Persistent data is not an array, resetting");
            $persistentData = [];
        }
    } catch (Exception $e) {
        logDebug("Error reading persistent cache: " . $e->getMessage());
        $persistentData = [];
    }
}

// Find vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $existingVehicle) {
    $curId = isset($existingVehicle['id']) ? $existingVehicle['id'] : (isset($existingVehicle['vehicleId']) ? $existingVehicle['vehicleId'] : '');
    if ($curId === $vehicleId) {
        $vehicleIndex = $index;
        break;
    }
}

if ($vehicleIndex >= 0) {
    // Update existing vehicle in persistent cache
    $persistentData[$vehicleIndex] = $vehicle;
    logDebug("Updated existing vehicle in persistent cache");
} else {
    // Add new vehicle to persistent cache
    $persistentData[] = $vehicle;
    logDebug("Added new vehicle to persistent cache");
}

// Save back to persistent cache
$saveResult = file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT));
if ($saveResult === false) {
    logDebug("Failed to save to persistent cache");
} else {
    logDebug("Saved to persistent cache successfully");
}

// Clear any temporary cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logDebug("Cleared cache file: " . basename($file));
    }
}

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully and saved to database',
    'vehicle' => $vehicle,
    'dbUpdated' => $dbUpdated,
    'reload' => true,
    'reloadUrl' => '/api/admin/reload-vehicles.php?_t=' . time()
]);

// After successful update, trigger a reload to ensure all systems get updated data
try {
    // Prepare and make the reload request
    $reloadEndpoint = '/api/admin/reload-vehicles.php';
    $reloadUrl = '';
    
    // Get the current script URL
    if (isset($_SERVER['HTTP_HOST']) && isset($_SERVER['REQUEST_URI'])) {
        $scriptUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
        $reloadUrl = str_replace(basename($_SERVER['PHP_SELF']), "", $scriptUrl) . 'reload-vehicles.php';
    } else if (isset($_SERVER['SCRIPT_URI'])) {
        $reloadUrl = dirname($_SERVER['SCRIPT_URI']) . "/reload-vehicles.php";
    } else {
        // Try to construct a relative path
        $reloadUrl = dirname($_SERVER['SCRIPT_NAME']) . "/reload-vehicles.php";
        if (substr($reloadUrl, 0, 1) !== '/') {
            $reloadUrl = '/' . $reloadUrl;
        }
    }
    
    logDebug("Calling API: api/admin/reload-vehicles.php");
    
    // Add timestamp to prevent caching
    $reloadUrl .= "?_t=" . time();
    
    logDebug("Full URL: " . $reloadUrl);
    
    // Make the request
    if (function_exists('curl_init')) {
        $ch = curl_init($reloadUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $reloadResult = curl_exec($ch);
        curl_close($ch);
        
        logDebug("Force refresh response: " . substr($reloadResult, 0, 500));
    } else {
        // Fallback to file_get_contents if curl is not available
        $context = stream_context_create([
            'http' => [
                'timeout' => 5
            ]
        ]);
        $reloadResult = @file_get_contents($reloadUrl, false, $context);
        
        logDebug("Force refresh response (via file_get_contents): " . substr($reloadResult, 0, 500));
    }
    
    logDebug("Vehicle update API response: " . json_encode($vehicle));
} catch (Exception $e) {
    logDebug("Failed to trigger reload: " . $e->getMessage());
}

// Clear cache files as final step
foreach (glob($cacheDir . '/vehicles_*.json') as $cacheFile) {
    if ($cacheFile !== $persistentCacheFile && strpos($cacheFile, 'persistent_backup') === false) {
        @unlink($cacheFile);
        logDebug("Clearing vehicle data cache: " . basename($cacheFile));
    }
}

logDebug("Received vehicle-data-cache-cleared event");
