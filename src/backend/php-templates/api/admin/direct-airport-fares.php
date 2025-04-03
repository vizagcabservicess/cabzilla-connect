
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Debug-Endpoint: direct-airport-fares');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Direct airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);

// Get vehicle ID from query parameters - support multiple parameter names
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'id'];

foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in '$key': $vehicleId\n", FILE_APPEND);
        break;
    }
}

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'debug' => [
            'get_params' => $_GET,
            'timestamp' => $timestamp
        ]
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

// Add vehicle ID to fare data (include both formats for compatibility)
$fare['vehicleId'] = $vehicleId;
$fare['vehicle_id'] = $vehicleId;

// Log the response
file_put_contents($logFile, "[$timestamp] Responding with fare data: " . json_encode($fare) . "\n", FILE_APPEND);

// Return fare data
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares retrieved successfully',
    'fares' => [$fare],
    'debug' => [
        'vehicle_id' => $vehicleId,
        'timestamp' => time()
    ]
]);
