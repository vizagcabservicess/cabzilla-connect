
<?php
/**
 * Special endpoint for vehicle data with enhanced CORS support
 * This file serves as a CORS-friendly wrapper for the main vehicles-data.php
 */

// Set all required CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, Origin, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');

// Add debugging headers
header('X-API-Version: 1.2.0');
header('X-CORS-Status: Enhanced');
header('X-Debug-Endpoint: vehicles-data');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Include the actual vehicles-data.php logic
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
    error_log("Special vehicles-data.php wrapper: Including fares/vehicles-data.php");
    
    // Include the main file
    require_once __DIR__ . '/fares/vehicles-data.php';
} catch (Exception $e) {
    // In case of error, return a fallback response
    error_log("Error in vehicles-data.php wrapper: " . $e->getMessage());
    
    // Return default vehicles
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
        ]
    ];
    
    // Output error but in a way that still provides usable data
    echo json_encode([
        'vehicles' => $defaultVehicles,
        'count' => count($defaultVehicles),
        'error' => $e->getMessage(),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time(),
        'source' => 'fallback'
    ]);
}
