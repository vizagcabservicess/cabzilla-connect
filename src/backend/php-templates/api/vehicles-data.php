
<?php
/**
 * ENHANCED - Special endpoint for vehicle data with ultra-robust CORS support
 * This file serves as a CORS-friendly wrapper for the main vehicles-data.php
 */

// Set ultra-aggressive CORS headers for maximum browser compatibility
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, pre-check=0, post-check=0');
header('Pragma: no-cache');
header('Expires: -1');

// Allow specific origins if specified
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400'); 
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
header('X-Content-Type-Options: nosniff');

// Add debugging headers
header('X-API-Version: 1.5.0');
header('X-CORS-Status: Ultra-Enhanced');
header('X-Debug-Endpoint: vehicles-data');
header('X-Debug-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);

// Ultra-reliable OPTIONS handling - HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time(),
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none'
        ]
    ]);
    exit;
}

// Process GET parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

// Create a persistent cache file to store updated vehicle data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';

// Try to load persistent cache first
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
            $persistentData = [];
        }
    }
}

// Hardcoded vehicle data for demonstration/fallback
$defaultVehicles = [
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
        'id' => 'luxury',
        'vehicleId' => 'luxury',
        'name' => 'Luxury Sedan',
        'capacity' => 4,
        'luggageCapacity' => 3,
        'price' => 4500,
        'basePrice' => 4500,
        'pricePerKm' => 25,
        'image' => '/cars/luxury.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
        'description' => 'Premium luxury sedan with high-end amenities for a comfortable journey.',
        'ac' => true,
        'nightHaltCharge' => 1200,
        'driverAllowance' => 300,
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

// Merge default vehicles with persistent data
$vehicles = [];
foreach ($defaultVehicles as $defaultVehicle) {
    $vehicleId = $defaultVehicle['id'];
    $found = false;
    
    // Look for this vehicle in persistent data
    foreach ($persistentData as $persistentVehicle) {
        if (isset($persistentVehicle['id']) && $persistentVehicle['id'] === $vehicleId) {
            // Use the persistent data, but ensure all required fields exist
            $mergedVehicle = array_merge($defaultVehicle, $persistentVehicle);
            $vehicles[] = $mergedVehicle;
            $found = true;
            break;
        }
    }
    
    // If not found in persistent data, use default
    if (!$found) {
        $vehicles[] = $defaultVehicle;
    }
}

// Filter inactive vehicles if needed
if (!$includeInactive) {
    $filteredVehicles = [];
    foreach ($vehicles as $vehicle) {
        if ($vehicle['isActive'] === true) {
            $filteredVehicles[] = $vehicle;
        }
    }
    $vehicles = $filteredVehicles;
}

// Filter by vehicle ID if specified
if ($vehicleId) {
    $filteredVehicles = [];
    foreach ($vehicles as $vehicle) {
        if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
            $filteredVehicles[] = $vehicle;
            break;
        }
    }
    if (!empty($filteredVehicles)) {
        $vehicles = $filteredVehicles;
    }
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles retrieved successfully',
    'vehicles' => $vehicles,
    'timestamp' => time(),
    'includeInactive' => $includeInactive,
    'forceRefresh' => $forceRefresh,
    'isAdminMode' => $isAdminMode
]);
