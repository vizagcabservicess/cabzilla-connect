
<?php
// Enhanced PHP file for check-vehicle.php with improved error handling
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the vehicle ID from GET or POST parameters
$vehicleId = isset($_GET['id']) ? $_GET['id'] : 
            (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : 
            (isset($_POST['id']) ? $_POST['id'] : 
            (isset($_POST['vehicleId']) ? $_POST['vehicleId'] : null)));

// Check if vehicle ID is provided
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'timestamp' => time()
    ]);
    exit;
}

// List of valid vehicle IDs for demonstration
$validVehicleIds = [
    'sedan', 
    'ertiga', 
    'innova_crysta', 
    'tempo_traveller', 
    'luxury', 
    'tempo'
];

// Check if the vehicle exists
$exists = in_array($vehicleId, $validVehicleIds);

// Create a mock vehicle data structure based on ID
function createVehicleData($id, $exists) {
    $baseFare = 0;
    $capacity = 4;
    $luggageCapacity = 2;
    
    switch($id) {
        case 'sedan':
            $baseFare = 2500;
            break;
        case 'ertiga':
            $baseFare = 3200;
            $capacity = 6;
            $luggageCapacity = 3;
            break;
        case 'innova_crysta':
            $baseFare = 3800;
            $capacity = 7;
            $luggageCapacity = 4;
            break;
        case 'luxury':
            $baseFare = 4500;
            $luggageCapacity = 3;
            break;
        case 'tempo_traveller':
        case 'tempo':
            $baseFare = 5500;
            $capacity = 12;
            $luggageCapacity = 8;
            break;
    }
    
    return [
        'id' => $id,
        'vehicleId' => $id,
        'name' => ucwords(str_replace('_', ' ', $id)),
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'price' => $baseFare,
        'basePrice' => $baseFare,
        'pricePerKm' => $baseFare > 4000 ? 22 : ($baseFare > 3000 ? 18 : 14),
        'image' => "/cars/$id.png",
        'amenities' => ['AC', 'Bottle Water', 'Music System'],
        'description' => 'Vehicle description here',
        'ac' => true,
        'nightHaltCharge' => $baseFare > 4000 ? 1200 : 700,
        'driverAllowance' => 250,
        'isActive' => true,
        'exists' => $exists
    ];
}

if ($exists) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle exists',
        'vehicle' => createVehicleData($vehicleId, true),
        'timestamp' => time()
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle not found',
        'vehicle' => createVehicleData($vehicleId, false),
        'timestamp' => time()
    ]);
}
