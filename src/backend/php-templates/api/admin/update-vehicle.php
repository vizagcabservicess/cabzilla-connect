
<?php
// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request data
$rawInput = file_get_contents('php://input');
$vehicleData = json_decode($rawInput, true);

if (!$vehicleData && $_POST) {
    $vehicleData = $_POST;
}

// Log for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Update request: " . json_encode($vehicleData) . "\n", FILE_APPEND);

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Load existing vehicles from cache
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$vehicles = [];

if (file_exists($persistentCacheFile)) {
    $json = file_get_contents($persistentCacheFile);
    if ($json) {
        $vehicles = json_decode($json, true) ?: [];
    }
}

// Find and update the vehicle
$vehicleId = $vehicleData['id'] ?? $vehicleData['vehicleId'] ?? null;
$updated = false;

if ($vehicleId) {
    for ($i = 0; $i < count($vehicles); $i++) {
        if ($vehicles[$i]['id'] === $vehicleId || $vehicles[$i]['vehicleId'] === $vehicleId) {
            // Update vehicle with new data
            $vehicles[$i] = array_merge($vehicles[$i], [
                'vehicleNumber' => $vehicleData['vehicleNumber'] ?? $vehicles[$i]['vehicleNumber'],
                'make' => $vehicleData['make'] ?? $vehicles[$i]['make'],
                'model' => $vehicleData['model'] ?? $vehicles[$i]['model'],
                'year' => $vehicleData['year'] ?? $vehicles[$i]['year'],
                'status' => $vehicleData['status'] ?? $vehicles[$i]['status'],
                'fuelType' => $vehicleData['fuelType'] ?? $vehicles[$i]['fuelType'],
                'capacity' => $vehicleData['capacity'] ?? $vehicles[$i]['capacity'],
                'luggageCapacity' => $vehicleData['luggageCapacity'] ?? $vehicles[$i]['luggageCapacity'],
                'lastService' => $vehicleData['lastService'] ?? $vehicles[$i]['lastService'],
                'nextServiceDue' => $vehicleData['nextServiceDue'] ?? $vehicles[$i]['nextServiceDue'],
                'lastServiceOdometer' => $vehicleData['lastServiceOdometer'] ?? $vehicles[$i]['lastServiceOdometer'],
                'nextServiceOdometer' => $vehicleData['nextServiceOdometer'] ?? $vehicles[$i]['nextServiceOdometer'],
                'emi' => $vehicleData['emi'] ?? $vehicles[$i]['emi'],
                // Important: Handle the new fields properly
                'inclusions' => $vehicleData['inclusions'] ?? $vehicles[$i]['inclusions'] ?? [],
                'exclusions' => $vehicleData['exclusions'] ?? $vehicles[$i]['exclusions'] ?? [],
                'cancellationPolicy' => $vehicleData['cancellationPolicy'] ?? $vehicles[$i]['cancellationPolicy'] ?? '',
                'updatedAt' => date('Y-m-d H:i:s')
            ]);
            $updated = true;
            break;
        }
    }
}

if ($updated) {
    // Save updated vehicles back to cache
    file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Vehicle updated successfully\n", FILE_APPEND);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle updated successfully and saved to database',
        'vehicle' => $vehicles[array_search($vehicleId, array_column($vehicles, 'id'))]
    ]);
} else {
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Vehicle not found for update\n", FILE_APPEND);
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle not found'
    ]);
}
?>
