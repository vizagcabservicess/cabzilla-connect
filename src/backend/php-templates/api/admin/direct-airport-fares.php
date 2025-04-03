
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from query parameters
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Define default fares based on vehicle type
$defaultFares = [
    'sedan' => [
        'priceOneWay' => 1500,
        'priceRoundTrip' => 2800,
        'nightCharges' => 300,
        'extraWaitingCharges' => 150
    ],
    'ertiga' => [
        'priceOneWay' => 1800,
        'priceRoundTrip' => 3400,
        'nightCharges' => 350,
        'extraWaitingCharges' => 200
    ],
    'innova_crysta' => [
        'priceOneWay' => 2200,
        'priceRoundTrip' => 4000,
        'nightCharges' => 400,
        'extraWaitingCharges' => 250
    ],
    'luxury' => [
        'priceOneWay' => 2600,
        'priceRoundTrip' => 4800, 
        'nightCharges' => 500,
        'extraWaitingCharges' => 300
    ],
    'tempo_traveller' => [
        'priceOneWay' => 3500,
        'priceRoundTrip' => 6000,
        'nightCharges' => 600,
        'extraWaitingCharges' => 350
    ]
];

// Get default fare for the vehicle, or create empty fare if vehicle type not found
$fare = $defaultFares[$vehicleId] ?? [
    'priceOneWay' => 0,
    'priceRoundTrip' => 0,
    'nightCharges' => 0,
    'extraWaitingCharges' => 0
];

// Add vehicle ID to fare data
$fare['vehicleId'] = $vehicleId;
$fare['vehicle_id'] = $vehicleId;

// Return fare data
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares retrieved successfully',
    'fares' => [$fare]
]);
