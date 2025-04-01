
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
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400'); 
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
header('X-Content-Type-Options: nosniff');

// Add debugging headers
header('X-API-Version: 1.3.0');
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

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

// Try to include the main file
try {
    // Log the attempt
    error_log("Enhanced vehicles-data.php wrapper: Including fares/vehicles-data.php");
    
    // Include the main file if it exists
    if (file_exists(__DIR__ . '/fares/vehicles-data.php')) {
        require_once __DIR__ . '/fares/vehicles-data.php';
    } else {
        throw new Exception("Backend file fares/vehicles-data.php not found");
    }
} catch (Exception $e) {
    // In case of error, return a fallback response
    error_log("Error in enhanced vehicles-data.php wrapper: " . $e->getMessage());
    
    // Check if JSON file exists as backup
    $vehiclesJson = __DIR__ . '/../../data/vehicles.json';
    $vehicles = [];
    
    if (file_exists($vehiclesJson)) {
        $jsonContent = file_get_contents($vehiclesJson);
        $jsonData = json_decode($jsonContent, true);
        if ($jsonData && is_array($jsonData)) {
            $vehicles = $jsonData;
            error_log("Retrieved " . count($vehicles) . " vehicles from JSON file");
        }
    }
    
    // If still no vehicles, return default set
    if (empty($vehicles)) {
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
                'id' => 'tempo',
                'vehicleId' => 'tempo',
                'name' => 'Tempo Traveller',
                'capacity' => 12,
                'luggageCapacity' => 8,
                'price' => 6000,
                'basePrice' => 6000,
                'pricePerKm' => 22,
                'image' => '/cars/tempo.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                'description' => 'Spacious vehicle for large groups.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ],
            [
                'id' => 'luxury',
                'vehicleId' => 'luxury',
                'name' => 'Luxury Sedan',
                'capacity' => 4,
                'luggageCapacity' => 3,
                'price' => 5000,
                'basePrice' => 5000,
                'pricePerKm' => 25,
                'image' => '/cars/luxury.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Premium Seats', 'Charging Point'],
                'description' => 'Premium luxury sedan for comfortable rides.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ]
        ];
    }
    
    // Filter inactive vehicles if not requested
    if (!$includeInactive) {
        $vehicles = array_filter($vehicles, function($vehicle) {
            return isset($vehicle['isActive']) ? $vehicle['isActive'] : true;
        });
    }
    
    // Output fallback vehicles with error info
    echo json_encode([
        'vehicles' => array_values($vehicles),
        'count' => count($vehicles),
        'error' => $e->getMessage(),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time(),
        'source' => 'enhanced_fallback',
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'error' => $e->getMessage(),
            'get' => $_GET,
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none'
        ]
    ]);
}
