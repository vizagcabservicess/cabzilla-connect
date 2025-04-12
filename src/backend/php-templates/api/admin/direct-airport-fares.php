
<?php
// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from any of the possible parameter names
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type', 'id'];

foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        break;
    }
}

// Clean up vehicle ID if it has a prefix
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// If no vehicle ID is provided, return an error
if (!$vehicleId) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Sample fare data based on vehicle type (fallback if database query fails)
$defaultFares = [
    'sedan' => [
        'tier1Price' => 800,  // 0-10 KM
        'tier2Price' => 1200, // 11-20 KM
        'tier3Price' => 1800, // 21-30 KM
        'tier4Price' => 2500, // 31+ KM
        'extraKmCharge' => 14
    ],
    'ertiga' => [
        'tier1Price' => 1000,
        'tier2Price' => 1500,
        'tier3Price' => 2200,
        'tier4Price' => 3000,
        'extraKmCharge' => 16
    ],
    'innova_crysta' => [
        'tier1Price' => 1200,
        'tier2Price' => 1800,
        'tier3Price' => 2500,
        'tier4Price' => 3500,
        'extraKmCharge' => 18
    ],
    'luxury' => [
        'tier1Price' => 1500,
        'tier2Price' => 2200,
        'tier3Price' => 3000,
        'tier4Price' => 4000,
        'extraKmCharge' => 22
    ],
    'tempo' => [
        'tier1Price' => 2000,
        'tier2Price' => 3000,
        'tier3Price' => 4000,
        'tier4Price' => 5000,
        'extraKmCharge' => 25
    ],
    'etios' => [
        'tier1Price' => 800,
        'tier2Price' => 1200,
        'tier3Price' => 1800,
        'tier4Price' => 2500,
        'extraKmCharge' => 14
    ],
    'toyota' => [
        'tier1Price' => 800,
        'tier2Price' => 1200,
        'tier3Price' => 1800,
        'tier4Price' => 2500,
        'extraKmCharge' => 14
    ],
];

// Initialize vehicle fare array
$vehicleFare = [];

// Get vehicle specific default if available, or use sedan as fallback
$fareDefaults = isset($defaultFares[$vehicleId]) ? $defaultFares[$vehicleId] : $defaultFares['sedan'];

// Set default vehicle fare from the lookup table
$vehicleFare = [
    'vehicleId' => $vehicleId,
    'tier1Price' => $fareDefaults['tier1Price'],
    'tier2Price' => $fareDefaults['tier2Price'],
    'tier3Price' => $fareDefaults['tier3Price'],
    'tier4Price' => $fareDefaults['tier4Price'],
    'extraKmCharge' => $fareDefaults['extraKmCharge']
];

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares retrieved successfully',
    'fares' => [$vehicleFare]
]);
