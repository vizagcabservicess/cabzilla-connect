
<?php
/**
 * reload-vehicles.php - Reload vehicles from persistent storage
 * This endpoint ensures that vehicle data is properly refreshed from persistent storage
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

// Log the request
$logFile = $logDir . '/reload_vehicles_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Reloading vehicles data\n", FILE_APPEND);

// Check for persistent cache file
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Failed to reload vehicles',
    'timestamp' => time()
];

if (file_exists($persistentCacheFile)) {
    try {
        // Read the persistent cache file
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            $data = json_decode($persistentJson, true);
            
            if (is_array($data) && !empty($data)) {
                $vehicleCount = count($data);
                file_put_contents($logFile, "[$timestamp] Successfully loaded $vehicleCount vehicles from persistent cache\n", FILE_APPEND);
                
                // Create a regular cache file with the same data
                $regularCacheFile = $cacheDir . '/vehicles_' . date('Ymd_His') . '.json';
                file_put_contents($regularCacheFile, $persistentJson);
                
                // Update response
                $response = [
                    'status' => 'success',
                    'message' => "Successfully reloaded $vehicleCount vehicles",
                    'count' => $vehicleCount,
                    'timestamp' => time()
                ];
            } else {
                file_put_contents($logFile, "[$timestamp] Error: Persistent data is not a valid array or is empty\n", FILE_APPEND);
            }
        } else {
            file_put_contents($logFile, "[$timestamp] Error: Failed to read persistent cache file\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    }
} else {
    file_put_contents($logFile, "[$timestamp] Error: Persistent cache file not found\n", FILE_APPEND);
    
    // Try to create a default persistent file
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
    
    $jsonData = json_encode($defaultVehicles, JSON_PRETTY_PRINT);
    if (file_put_contents($persistentCacheFile, $jsonData)) {
        file_put_contents($logFile, "[$timestamp] Created new persistent cache file with default vehicles\n", FILE_APPEND);
        
        $response = [
            'status' => 'success',
            'message' => 'Created new persistent cache with default vehicles',
            'count' => count($defaultVehicles),
            'timestamp' => time()
        ];
    } else {
        file_put_contents($logFile, "[$timestamp] Failed to create persistent cache file\n", FILE_APPEND);
    }
}

// Return the response
echo json_encode($response);
