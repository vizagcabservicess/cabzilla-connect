
<?php
/**
 * Enhanced vehicle update endpoint that stores data in MySQL database
 * This endpoint properly saves vehicle data to the database for permanent storage
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../common/db_helper.php';

// Log the start of the request
file_put_contents($logFile, "[$timestamp] Vehicle update request received\n", FILE_APPEND);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is valid
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    file_put_contents($logFile, "[$timestamp] Invalid method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST or PUT'
    ]);
    exit;
}

// Get the raw input JSON data
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

// If JSON parsing fails, try using POST data
if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
    file_put_contents($logFile, "[$timestamp] Using POST data after JSON parse failed\n", FILE_APPEND);
}

// Log the received data
file_put_contents($logFile, "[$timestamp] Received data: " . json_encode($vehicleData) . "\n", FILE_APPEND);

// Check if vehicle data is valid
if (!$vehicleData) {
    http_response_code(400);
    file_put_contents($logFile, "[$timestamp] Invalid or missing vehicle data\n", FILE_APPEND);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid or missing vehicle data'
    ]);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
    http_response_code(400);
    file_put_contents($logFile, "[$timestamp] Vehicle ID is required\n", FILE_APPEND);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Get the vehicle ID from various possible fields
$vehicleId = isset($vehicleData['id']) ? $vehicleData['id'] : 
            (isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['vehicle_id']);

file_put_contents($logFile, "[$timestamp] Processing update for vehicle ID: $vehicleId\n", FILE_APPEND);

// The persistent cache file path (used for backward compatibility)
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';

// Try to load existing persistent data
$persistentData = [];
if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $data = json_decode($persistentJson, true);
            if (is_array($data)) {
                $persistentData = $data;
                file_put_contents($logFile, "[$timestamp] Loaded " . count($persistentData) . " vehicles from persistent cache\n", FILE_APPEND);
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Failed to parse persistent JSON: " . $e->getMessage() . "\n", FILE_APPEND);
            // Failed to parse JSON, start fresh
        }
    }
}

// Find if the vehicle already exists in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $vehicle) {
    if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
        (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
        $vehicleIndex = $index;
        break;
    }
}

// Ensure numeric values where needed - PRESERVE EXISTING VALUES IF ZERO IS PASSED
if ($vehicleIndex >= 0) {
    $existingVehicle = $persistentData[$vehicleIndex];
    
    // Only update these fields if the new values are valid (not empty or zero)
    if (!isset($vehicleData['capacity']) || $vehicleData['capacity'] === '' || $vehicleData['capacity'] === 0) {
        $vehicleData['capacity'] = $existingVehicle['capacity'] ?? 4;
    }
    
    if (!isset($vehicleData['luggageCapacity']) || $vehicleData['luggageCapacity'] === '' || $vehicleData['luggageCapacity'] === 0) {
        $vehicleData['luggageCapacity'] = $existingVehicle['luggageCapacity'] ?? 2;
    }
    
    if (!isset($vehicleData['price']) || $vehicleData['price'] === '' || $vehicleData['price'] === 0) {
        $vehicleData['price'] = $existingVehicle['price'] ?? $existingVehicle['basePrice'] ?? 2500;
    }
    
    if (!isset($vehicleData['basePrice']) || $vehicleData['basePrice'] === '' || $vehicleData['basePrice'] === 0) {
        $vehicleData['basePrice'] = $existingVehicle['basePrice'] ?? $existingVehicle['price'] ?? 2500;
    }
    
    if (!isset($vehicleData['pricePerKm']) || $vehicleData['pricePerKm'] === '' || $vehicleData['pricePerKm'] === 0) {
        $vehicleData['pricePerKm'] = $existingVehicle['pricePerKm'] ?? 14;
    }
    
    if (!isset($vehicleData['nightHaltCharge']) || $vehicleData['nightHaltCharge'] === '' || $vehicleData['nightHaltCharge'] === 0) {
        $vehicleData['nightHaltCharge'] = $existingVehicle['nightHaltCharge'] ?? 700;
    }
    
    if (!isset($vehicleData['driverAllowance']) || $vehicleData['driverAllowance'] === '' || $vehicleData['driverAllowance'] === 0) {
        $vehicleData['driverAllowance'] = $existingVehicle['driverAllowance'] ?? 250;
    }
    
    if (!isset($vehicleData['amenities']) || empty($vehicleData['amenities'])) {
        $vehicleData['amenities'] = $existingVehicle['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
    }
} else {
    // Default values for new vehicles
    $vehicleData['capacity'] = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
    $vehicleData['luggageCapacity'] = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 2;
    $vehicleData['price'] = isset($vehicleData['price']) ? floatval($vehicleData['price']) : 1500;
    $vehicleData['basePrice'] = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : $vehicleData['price'];
    $vehicleData['pricePerKm'] = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 14;
    $vehicleData['nightHaltCharge'] = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 700;
    $vehicleData['driverAllowance'] = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 250;
}

// Normalize amenities
if (isset($vehicleData['amenities'])) {
    if (is_string($vehicleData['amenities'])) {
        try {
            $amenitiesData = json_decode($vehicleData['amenities'], true);
            if (is_array($amenitiesData)) {
                $vehicleData['amenities'] = $amenitiesData;
            } else {
                // Fallback to comma-separated string
                $vehicleData['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } catch (Exception $e) {
            // Fallback to comma-separated string
            $vehicleData['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
        }
    }
}

// Ensure the ID fields are consistent
$vehicleData['id'] = $vehicleId;
$vehicleData['vehicleId'] = $vehicleId;

// Ensure isActive is properly set (default to true)
if (!isset($vehicleData['isActive'])) {
    $vehicleData['isActive'] = $vehicleIndex >= 0 ? 
        $persistentData[$vehicleIndex]['isActive'] : true;
}

// Update/add to persistent cache file (for backward compatibility)
if ($vehicleIndex >= 0) {
    // Update existing vehicle
    $persistentData[$vehicleIndex] = array_merge($persistentData[$vehicleIndex], $vehicleData);
} else {
    // Add new vehicle
    $persistentData[] = $vehicleData;
}

file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT));
file_put_contents($logFile, "[$timestamp] Updated persistent cache file\n", FILE_APPEND);

// CRITICAL: Now save to database as the primary storage
$dbSuccess = false;
$dbError = null;

try {
    // Connect to database
    $conn = getDbConnectionWithRetry(3);
    
    if ($conn) {
        file_put_contents($logFile, "[$timestamp] Successfully connected to database\n", FILE_APPEND);
        
        // Check if tables exist, create if not
        $tablesExist = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
        
        if (!$tablesExist) {
            file_put_contents($logFile, "[$timestamp] Vehicle tables don't exist, creating...\n", FILE_APPEND);
            $result = ensureDatabaseTables($conn);
            if ($result) {
                file_put_contents($logFile, "[$timestamp] Successfully created database tables\n", FILE_APPEND);
            } else {
                throw new Exception("Failed to create required database tables");
            }
        }
        
        // Determine which table to use
        $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
        
        // Convert amenities to string for database storage
        $amenitiesStr = isset($vehicleData['amenities']) ? 
            (is_array($vehicleData['amenities']) ? json_encode($vehicleData['amenities']) : $vehicleData['amenities']) : 
            '["AC", "Bottle Water", "Music System"]';
        
        // Check if vehicle already exists
        $checkSql = "SELECT * FROM `$tableName` WHERE vehicle_id = ?";
        $existingVehicles = executeQuery($conn, $checkSql, [$vehicleId], 's');
        
        if (is_array($existingVehicles) && count($existingVehicles) > 0) {
            // Update existing record
            file_put_contents($logFile, "[$timestamp] Updating existing vehicle in database\n", FILE_APPEND);
            
            $updateSql = "UPDATE `$tableName` SET 
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
                driver_allowance = ? 
                WHERE vehicle_id = ?";
                
            $updateResult = executeQuery($conn, $updateSql, [
                $vehicleData['name'],
                $vehicleData['capacity'],
                $vehicleData['luggageCapacity'],
                $vehicleData['ac'] ? 1 : 0,
                $vehicleData['image'],
                $amenitiesStr,
                $vehicleData['description'],
                $vehicleData['isActive'] ? 1 : 0,
                $vehicleData['basePrice'],
                $vehicleData['pricePerKm'],
                $vehicleData['nightHaltCharge'],
                $vehicleData['driverAllowance'],
                $vehicleId
            ], 'siiisissiddds');
            
            $dbSuccess = true;
        } else {
            // Insert new record
            file_put_contents($logFile, "[$timestamp] Inserting new vehicle into database\n", FILE_APPEND);
            
            $insertSql = "INSERT INTO `$tableName` (
                vehicle_id, 
                name, 
                capacity, 
                luggage_capacity, 
                ac, 
                image, 
                amenities, 
                description, 
                is_active, 
                base_price, 
                price_per_km, 
                night_halt_charge, 
                driver_allowance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $insertResult = executeQuery($conn, $insertSql, [
                $vehicleId,
                $vehicleData['name'],
                $vehicleData['capacity'],
                $vehicleData['luggageCapacity'],
                $vehicleData['ac'] ? 1 : 0,
                $vehicleData['image'],
                $amenitiesStr,
                $vehicleData['description'],
                $vehicleData['isActive'] ? 1 : 0,
                $vehicleData['basePrice'],
                $vehicleData['pricePerKm'],
                $vehicleData['nightHaltCharge'],
                $vehicleData['driverAllowance']
            ], 'ssiiisissiddd');
            
            $dbSuccess = true;
        }
        
        $conn->close();
    }
} catch (Exception $e) {
    $dbError = $e->getMessage();
    file_put_contents($logFile, "[$timestamp] Database error: " . $dbError . "\n", FILE_APPEND);
}

// Clear any regular cache files to ensure fresh data is loaded
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile) {
        unlink($file);
        file_put_contents($logFile, "[$timestamp] Cleared cache file: " . basename($file) . "\n", FILE_APPEND);
    }
}

file_put_contents($logFile, "[$timestamp] Vehicle update completed\n", FILE_APPEND);

// Return success response with updated vehicle data and database status
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully',
    'vehicle' => $vehicleData,
    'database' => [
        'success' => $dbSuccess,
        'error' => $dbError
    ]
]);
