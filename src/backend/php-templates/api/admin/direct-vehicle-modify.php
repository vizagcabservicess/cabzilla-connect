
<?php
// Direct vehicle modify script for updating vehicle data in persistent storage

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
    $logFile = $logDir . '/vehicle_modify_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Get the raw input JSON data
$inputData = file_get_contents('php://input');
logDebug("Raw input data", $inputData);

$vehicleData = null;

// Try to parse JSON data
try {
    $vehicleData = json_decode($inputData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logDebug("JSON parsing error: " . json_last_error_msg());
    }
} catch (Exception $e) {
    logDebug("JSON decode exception: " . $e->getMessage());
}

// If JSON parsing fails, try using POST data
if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
    logDebug("Using POST data instead of JSON", $_POST);
}

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

// If vehicle not found, create a new one
if ($vehicleIndex < 0) {
    logDebug("Vehicle not found in persistent data, creating new entry");
    $newVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $vehicleData['name'] ?? 'New Vehicle',
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 0,
        'basePrice' => 0,
        'pricePerKm' => 0,
        'image' => '',
        'amenities' => ['AC', 'Music System'],
        'description' => '',
        'ac' => true,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'isActive' => true
    ];
    $persistentData[] = $newVehicle;
    $vehicleIndex = count($persistentData) - 1;
}

// Update with new values
$normalizedVehicle = $persistentData[$vehicleIndex];

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

// Update the vehicle in persistent data
$persistentData[$vehicleIndex] = $normalizedVehicle;

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

// Return success response with updated vehicle data
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully via direct-vehicle-modify',
    'vehicle' => $normalizedVehicle
]);
