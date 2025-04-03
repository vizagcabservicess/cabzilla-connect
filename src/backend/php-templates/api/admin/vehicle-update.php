
<?php
// Mock PHP file for vehicle-update.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
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

// Check if vehicle data is valid
if (!$vehicleData) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON data'
    ]);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
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

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Vehicle update request for $vehicleId\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Data: " . json_encode($vehicleData) . "\n", FILE_APPEND);

// The persistent cache file path
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
            }
        } catch (Exception $e) {
            // Failed to parse JSON, start fresh
        }
    }
}

// Find if the vehicle already exists in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $vehicle) {
    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
        $vehicleIndex = $index;
        break;
    }
}

// Ensure numeric values where needed
$vehicleData['capacity'] = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
$vehicleData['luggageCapacity'] = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 2;
$vehicleData['price'] = isset($vehicleData['price']) ? floatval($vehicleData['price']) : 0;
$vehicleData['basePrice'] = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : $vehicleData['price'];
$vehicleData['pricePerKm'] = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 0;
$vehicleData['nightHaltCharge'] = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 700;
$vehicleData['driverAllowance'] = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 250;

// Ensure the ID fields are consistent
$vehicleData['id'] = $vehicleId;
$vehicleData['vehicleId'] = $vehicleId;

// Update or add the vehicle in persistent data
if ($vehicleIndex >= 0) {
    // Update existing vehicle
    $persistentData[$vehicleIndex] = array_merge($persistentData[$vehicleIndex], $vehicleData);
} else {
    // Add new vehicle
    $persistentData[] = $vehicleData;
}

// Save the updated data back to the persistent cache file
file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT));

// Clear any regular cache files to ensure fresh data is loaded
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile) {
        unlink($file);
    }
}

file_put_contents($logFile, "[$timestamp] Saved updated vehicle data to persistent cache\n", FILE_APPEND);

// Return success response with updated vehicle data
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully',
    'vehicle' => $vehicleData
]);
