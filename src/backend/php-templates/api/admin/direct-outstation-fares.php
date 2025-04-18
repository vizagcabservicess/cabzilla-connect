
<?php
// Mock PHP file for direct-outstation-fares.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
}

// If vehicle ID is not in JSON body, check POST data
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
}

if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required for updates'
    ]);
    exit;
}

// Sample fare data
$fares = [
    'sedan' => [
        'basePrice' => 3000,
        'pricePerKm' => 15,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'roundTripBasePrice' => 2850,
        'roundTripPricePerKm' => 12.75
    ],
    'ertiga' => [
        'basePrice' => 3500,
        'pricePerKm' => 18,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'roundTripBasePrice' => 3325,
        'roundTripPricePerKm' => 15.3
    ],
    'innova_crysta' => [
        'basePrice' => 4000,
        'pricePerKm' => 20,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 300,
        'roundTripBasePrice' => 3800,
        'roundTripPricePerKm' => 17
    ],
    'tempo_traveller' => [
        'basePrice' => 6000,
        'pricePerKm' => 30,
        'nightHaltCharge' => 1200,
        'driverAllowance' => 300,
        'roundTripBasePrice' => 5700,
        'roundTripPricePerKm' => 25.5
    ]
];

// Handle GET request - Return fare data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($vehicleId && isset($fares[$vehicleId])) {
        // Return data for the specific vehicle
        $response = [
            'status' => 'success',
            'message' => "Outstation fares retrieved for $vehicleId",
            'fares' => [$vehicleId => $fares[$vehicleId]]
        ];
    } else {
        // Return all fares
        $response = [
            'status' => 'success',
            'message' => 'All outstation fares retrieved',
            'fares' => $fares
        ];
    }
}
// Handle POST request - Update fare data
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Mock updating the fare data
    $response = [
        'status' => 'success',
        'message' => "Outstation fares updated for $vehicleId",
        'vehicle_id' => $vehicleId
    ];
}
// Handle unsupported methods
else {
    http_response_code(405);
    $response = [
        'status' => 'error',
        'message' => 'Method not allowed'
    ];
}

// Return JSON response
echo json_encode($response);
