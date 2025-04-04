
<?php
/**
 * reload-vehicles.php - Reloads vehicle data from persistent storage
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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
    $logFile = $logDir . '/vehicle_reload_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

logDebug("Vehicle reload requested");

// Load data from persistent storage
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$vehicles = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $vehicles = json_decode($persistentJson, true);
            if (!is_array($vehicles)) {
                $vehicles = [];
                logDebug("Persistent data is not an array");
            } else {
                logDebug("Loaded " . count($vehicles) . " vehicles from persistent cache");
            }
        } catch (Exception $e) {
            logDebug("Failed to parse persistent JSON: " . $e->getMessage());
            $vehicles = [];
        }
    } else {
        logDebug("Persistent cache file exists but is empty");
    }
} else {
    logDebug("Persistent cache file does not exist");
    
    // If persistent file doesn't exist yet, create demo data
    $vehicles = [
        [
            'id' => 'sedan',
            'vehicleId' => 'sedan',
            'name' => 'Sedan',
            'capacity' => 4,
            'luggageCapacity' => 2,
            'price' => 2500,
            'basePrice' => 2500,
            'pricePerKm' => 14,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System'],
            'description' => 'Comfortable sedan suitable for 4 passengers.',
            'ac' => true,
            'nightHaltCharge' => 700,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'ertiga',
            'vehicleId' => 'ertiga',
            'name' => 'Ertiga',
            'capacity' => 6,
            'luggageCapacity' => 3,
            'price' => 3200,
            'basePrice' => 3200,
            'pricePerKm' => 18,
            'image' => '/cars/ertiga.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
            'description' => 'Spacious SUV suitable for 6 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'innova_crysta',
            'vehicleId' => 'innova_crysta',
            'name' => 'Innova Crysta',
            'capacity' => 7,
            'luggageCapacity' => 4,
            'price' => 3800,
            'basePrice' => 3800,
            'pricePerKm' => 20,
            'image' => '/cars/innova.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
            'description' => 'Premium SUV with ample space for 7 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'tempo_traveller',
            'vehicleId' => 'tempo_traveller',
            'name' => 'Tempo Traveller',
            'capacity' => 12,
            'luggageCapacity' => 8,
            'price' => 5500,
            'basePrice' => 5500,
            'pricePerKm' => 25,
            'image' => '/cars/tempo.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Pushback Seats'],
            'description' => 'Large vehicle suitable for groups of up to 12 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1200,
            'driverAllowance' => 300,
            'isActive' => true
        ]
    ];
    
    // Save demo data to persistent cache
    file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    logDebug("Created new persistent cache with demo data");
}

// Filter inactive vehicles if requested
$includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
if (!$includeInactive) {
    $vehicleCount = count($vehicles);
    $vehicles = array_filter($vehicles, function($vehicle) {
        return isset($vehicle['isActive']) ? $vehicle['isActive'] === true : true;
    });
    $vehicles = array_values($vehicles); // Re-index array
    logDebug("Filtered inactive vehicles. Before: $vehicleCount, After: " . count($vehicles));
}

// Clear all regular cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logDebug("Cleared cache file: " . basename($file));
    }
}

// Save to temporary cache file for faster future access
$tempCacheFile = $cacheDir . '/vehicles_' . ($includeInactive ? 'all' : 'active') . '.json';
file_put_contents($tempCacheFile, json_encode([
    'status' => 'success',
    'timestamp' => time(),
    'vehicles' => $vehicles
], JSON_PRETTY_PRINT));
logDebug("Saved to temporary cache file: " . basename($tempCacheFile));

// Return the data as JSON
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles reloaded from persistent storage',
    'count' => count($vehicles),
    'timestamp' => time(),
    'vehicles' => $vehicles
], JSON_PRETTY_PRINT);

logDebug("Vehicle reload completed. Returned " . count($vehicles) . " vehicles");
