
<?php
// Enhanced vehicle update script with improved error handling and database integration

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
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
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Check if request method is valid
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
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
    logDebug("Using POST data instead of JSON", $_POST);
}

// Also check if $_SERVER has vehicle data from an alias script
if (!$vehicleData && isset($_SERVER['VEHICLE_DATA']) && is_array($_SERVER['VEHICLE_DATA'])) {
    $vehicleData = $_SERVER['VEHICLE_DATA'];
    logDebug("Using vehicle data from SERVER", $vehicleData);
}

logDebug("Received update request with data", $vehicleData);

// Check if vehicle data is valid
if (!$vehicleData) {
    logDebug("Invalid or missing vehicle data");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid or missing vehicle data'
    ]);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
    logDebug("Vehicle ID is required");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Get the vehicle ID from various possible fields
$vehicleId = isset($vehicleData['id']) ? $vehicleData['id'] : 
            (isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['vehicle_id']);

logDebug("Processing update for vehicle ID: $vehicleId");

// Load existing persistent data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                $persistentData = [];
            } else {
                logDebug("Loaded " . count($persistentData) . " vehicles from persistent cache");
            }
        } catch (Exception $e) {
            logDebug("Failed to parse persistent JSON: " . $e->getMessage());
            // Start with empty array
            $persistentData = [];
        }
    }
}

// Find the vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $vehicle) {
    if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
        (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
        $vehicleIndex = $index;
        logDebug("Found vehicle at index $index in persistent data");
        break;
    }
}

// Normalize the vehicle data
$normalizedVehicle = [];

// If we found the vehicle in persistent data, use it as base
if ($vehicleIndex >= 0) {
    $normalizedVehicle = $persistentData[$vehicleIndex];
}

// Update with new values
$normalizedVehicle['id'] = $vehicleId;
$normalizedVehicle['vehicleId'] = $vehicleId;

// Only update these fields if they are provided
if (isset($vehicleData['name'])) {
    $normalizedVehicle['name'] = $vehicleData['name'];
}

if (isset($vehicleData['capacity'])) {
    $normalizedVehicle['capacity'] = (int)$vehicleData['capacity'];
}

if (isset($vehicleData['luggageCapacity'])) {
    $normalizedVehicle['luggageCapacity'] = (int)$vehicleData['luggageCapacity'];
} else if (isset($vehicleData['luggage_capacity'])) {
    $normalizedVehicle['luggageCapacity'] = (int)$vehicleData['luggage_capacity'];
}

if (isset($vehicleData['ac'])) {
    $normalizedVehicle['ac'] = (bool)$vehicleData['ac'];
}

if (isset($vehicleData['image'])) {
    $normalizedVehicle['image'] = $vehicleData['image'];
}

if (isset($vehicleData['amenities'])) {
    if (is_string($vehicleData['amenities'])) {
        try {
            // Try to parse as JSON first
            $amenities = json_decode($vehicleData['amenities'], true);
            if (is_array($amenities)) {
                $normalizedVehicle['amenities'] = $amenities;
            } else {
                // If not valid JSON, try as comma-separated string
                $normalizedVehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } catch (Exception $e) {
            // Fallback to comma-separated
            $normalizedVehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
        }
    } else {
        $normalizedVehicle['amenities'] = $vehicleData['amenities'];
    }
}

if (isset($vehicleData['description'])) {
    $normalizedVehicle['description'] = $vehicleData['description'];
}

if (isset($vehicleData['isActive'])) {
    $normalizedVehicle['isActive'] = (bool)$vehicleData['isActive'];
} else if (isset($vehicleData['is_active'])) {
    $normalizedVehicle['isActive'] = (bool)$vehicleData['is_active'];
}

if (isset($vehicleData['price'])) {
    $normalizedVehicle['price'] = (float)$vehicleData['price'];
}

if (isset($vehicleData['basePrice'])) {
    $normalizedVehicle['basePrice'] = (float)$vehicleData['basePrice'];
} else if (isset($vehicleData['base_price'])) {
    $normalizedVehicle['basePrice'] = (float)$vehicleData['base_price'];
}

// Ensure price and basePrice are consistent
if (isset($normalizedVehicle['price']) && !isset($normalizedVehicle['basePrice'])) {
    $normalizedVehicle['basePrice'] = $normalizedVehicle['price'];
} else if (!isset($normalizedVehicle['price']) && isset($normalizedVehicle['basePrice'])) {
    $normalizedVehicle['price'] = $normalizedVehicle['basePrice'];
}

if (isset($vehicleData['pricePerKm'])) {
    $normalizedVehicle['pricePerKm'] = (float)$vehicleData['pricePerKm'];
} else if (isset($vehicleData['price_per_km'])) {
    $normalizedVehicle['pricePerKm'] = (float)$vehicleData['price_per_km'];
}

if (isset($vehicleData['nightHaltCharge'])) {
    $normalizedVehicle['nightHaltCharge'] = (float)$vehicleData['nightHaltCharge'];
} else if (isset($vehicleData['night_halt_charge'])) {
    $normalizedVehicle['nightHaltCharge'] = (float)$vehicleData['night_halt_charge'];
}

if (isset($vehicleData['driverAllowance'])) {
    $normalizedVehicle['driverAllowance'] = (float)$vehicleData['driverAllowance'];
} else if (isset($vehicleData['driver_allowance'])) {
    $normalizedVehicle['driverAllowance'] = (float)$vehicleData['driver_allowance'];
}

logDebug("Normalized vehicle data", $normalizedVehicle);

// Update or add the vehicle in persistent data
if ($vehicleIndex >= 0) {
    // Update existing vehicle
    $persistentData[$vehicleIndex] = $normalizedVehicle;
} else {
    // Add new vehicle
    $persistentData[] = $normalizedVehicle;
}

// Save the updated data back to the persistent cache file
if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
    logDebug("Updated persistent cache file");
} else {
    logDebug("Failed to update persistent cache file");
}

// Clear any regular cache files to ensure fresh data is loaded
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logDebug("Cleared cache file: " . basename($file));
    }
}

// Try to update the database if possible
$dbUpdated = false;
try {
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn) {
                // Convert amenities to JSON string if needed
                $amenitiesJson = is_array($normalizedVehicle['amenities']) 
                    ? json_encode($normalizedVehicle['amenities']) 
                    : json_encode([]);
                
                // Check if vehicle exists in database
                $checkQuery = "SELECT id FROM vehicles WHERE vehicle_id = ?";
                $stmt = $conn->prepare($checkQuery);
                $stmt->bind_param('s', $vehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    // Update existing record
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
                    
                    $name = $normalizedVehicle['name'];
                    $capacity = $normalizedVehicle['capacity'];
                    $luggageCapacity = $normalizedVehicle['luggageCapacity'];
                    $basePrice = $normalizedVehicle['basePrice'];
                    $pricePerKm = $normalizedVehicle['pricePerKm'];
                    $image = $normalizedVehicle['image'];
                    $description = $normalizedVehicle['description'];
                    $ac = $normalizedVehicle['ac'] ? 1 : 0;
                    $nightHaltCharge = $normalizedVehicle['nightHaltCharge'];
                    $driverAllowance = $normalizedVehicle['driverAllowance'];
                    $isActive = $normalizedVehicle['isActive'] ? 1 : 0;
                    
                    $stmt->bind_param('siiddsssidis', 
                        $name, 
                        $capacity, 
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $image,
                        $amenitiesJson,
                        $description,
                        $ac,
                        $nightHaltCharge,
                        $driverAllowance,
                        $isActive,
                        $vehicleId
                    );
                    
                    $stmt->execute();
                    logDebug("Updated vehicle in database: " . $stmt->affected_rows . " rows affected");
                    $dbUpdated = true;
                } else {
                    // Insert new record
                    $query = "INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                        image, amenities, description, ac, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                    
                    $stmt = $conn->prepare($query);
                    
                    $name = $normalizedVehicle['name'];
                    $capacity = $normalizedVehicle['capacity'];
                    $luggageCapacity = $normalizedVehicle['luggageCapacity'];
                    $basePrice = $normalizedVehicle['basePrice'];
                    $pricePerKm = $normalizedVehicle['pricePerKm'];
                    $image = $normalizedVehicle['image'];
                    $description = $normalizedVehicle['description'];
                    $ac = $normalizedVehicle['ac'] ? 1 : 0;
                    $nightHaltCharge = $normalizedVehicle['nightHaltCharge'];
                    $driverAllowance = $normalizedVehicle['driverAllowance'];
                    $isActive = $normalizedVehicle['isActive'] ? 1 : 0;
                    
                    $stmt->bind_param('ssiiddssidii', 
                        $vehicleId,
                        $name, 
                        $capacity, 
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $image,
                        $amenitiesJson,
                        $description,
                        $ac,
                        $nightHaltCharge,
                        $driverAllowance,
                        $isActive
                    );
                    
                    $stmt->execute();
                    logDebug("Inserted new vehicle in database: " . $conn->insert_id);
                    $dbUpdated = true;
                }
                
                $conn->close();
            }
        }
    }
} catch (Exception $e) {
    logDebug("Database error: " . $e->getMessage());
}

// Return success response with updated vehicle data
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully' . ($dbUpdated ? ' (in database and cache)' : ' (in cache only)'),
    'vehicle' => $normalizedVehicle
]);
