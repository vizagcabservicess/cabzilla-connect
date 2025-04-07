
<?php
// Alias for vehicle-update.php
// This file simply includes the main vehicle-update.php file for compatibility
// with different API endpoint naming conventions

// First, set all necessary CORS headers for preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS request directly here to ensure it works
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Get the raw input data for logging
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] $requestMethod request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Input data: $rawInput\n", FILE_APPEND);

// Create cache directory if it doesn't exist
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Before passing to vehicle-update.php, make sure the data is parsed and set correctly
$vehicleData = json_decode($rawInput, true);
if (!$vehicleData && $_POST) {
    $vehicleData = $_POST;
    file_put_contents($logFile, "[$timestamp] Using POST data instead\n", FILE_APPEND);
}

// Load the existing vehicle data from persistent storage to avoid data loss
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$savedVehicleData = null;

// Check if we can read from persistent storage to fill in missing values
if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (is_array($persistentData)) {
                // Find existing vehicle data
                $vehicleId = $vehicleData['id'] ?? $vehicleData['vehicleId'] ?? null;
                foreach ($persistentData as $existingVehicle) {
                    if ($existingVehicle['id'] === $vehicleId || $existingVehicle['vehicleId'] === $vehicleId) {
                        // Save existing vehicle data for reference
                        $savedVehicleData = $existingVehicle;
                        file_put_contents($logFile, "[$timestamp] Found existing data for vehicle: $vehicleId\n", FILE_APPEND);
                        break;
                    }
                }
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Error reading persistent data: {$e->getMessage()}\n", FILE_APPEND);
        }
    }
}

// Force values to be set when passed to the update script
if ($vehicleData) {
    // If id/vehicleId is provided but no price data, keep these fields non-zero
    // to prevent data loss during refresh
    if ((!isset($vehicleData['price']) || $vehicleData['price'] === 0) && $savedVehicleData) {
        $vehicleData['price'] = $savedVehicleData['price'] ?? $savedVehicleData['basePrice'] ?? 1500;
        file_put_contents($logFile, "[$timestamp] Restored price from saved data: {$vehicleData['price']}\n", FILE_APPEND);
    }
    
    if ((!isset($vehicleData['basePrice']) || $vehicleData['basePrice'] === 0) && $savedVehicleData) {
        $vehicleData['basePrice'] = $savedVehicleData['basePrice'] ?? $savedVehicleData['price'] ?? 1500;
        file_put_contents($logFile, "[$timestamp] Restored basePrice from saved data: {$vehicleData['basePrice']}\n", FILE_APPEND);
    }
    
    if ((!isset($vehicleData['pricePerKm']) || $vehicleData['pricePerKm'] === 0) && $savedVehicleData) {
        $vehicleData['pricePerKm'] = $savedVehicleData['pricePerKm'] ?? 14;
        file_put_contents($logFile, "[$timestamp] Restored pricePerKm from saved data: {$vehicleData['pricePerKm']}\n", FILE_APPEND);
    }
    
    if ((!isset($vehicleData['amenities']) || empty($vehicleData['amenities'])) && $savedVehicleData) {
        $vehicleData['amenities'] = $savedVehicleData['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
        file_put_contents($logFile, "[$timestamp] Restored amenities from saved data\n", FILE_APPEND);
    }
    
    if (!isset($vehicleData['isActive']) && $savedVehicleData) {
        $vehicleData['isActive'] = $savedVehicleData['isActive'];
        file_put_contents($logFile, "[$timestamp] Restored isActive from saved data\n", FILE_APPEND);
    }
    
    // Make sure the data is available to vehicle-update.php
    $_POST = array_merge($_POST, $vehicleData);
    $_SERVER['VEHICLE_DATA'] = $vehicleData;
    file_put_contents($logFile, "[$timestamp] Enhanced data: " . json_encode($vehicleData) . "\n", FILE_APPEND);
}

// Try updating directly here if vehicle-update.php doesn't exist
if (!file_exists(__DIR__ . '/vehicle-update.php')) {
    file_put_contents($logFile, "[$timestamp] vehicle-update.php doesn't exist, updating directly\n", FILE_APPEND);
    
    // Include the direct-vehicle-modify.php script instead
    require_once __DIR__ . '/direct-vehicle-modify.php';
    exit;
}

// Include the main vehicle update file
require_once __DIR__ . '/vehicle-update.php';
