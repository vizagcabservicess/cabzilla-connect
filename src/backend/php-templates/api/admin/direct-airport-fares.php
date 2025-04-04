
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
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
file_put_contents($logFile, "[$timestamp] POST params: " . json_encode($_POST) . "\n", FILE_APPEND);

// Get vehicle ID from query parameters - support multiple parameter names
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type'];

// First check URL parameters
foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter '$key': $vehicleId\n", FILE_APPEND);
        break;
    }
}

// Then check POST data if still not found
if (!$vehicleId) {
    foreach ($possibleKeys as $key) {
        if (isset($_POST[$key]) && !empty($_POST[$key])) {
            $vehicleId = $_POST[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in POST data '$key': $vehicleId\n", FILE_APPEND);
            break;
        }
    }
}

// If still not found, check JSON input
if (!$vehicleId) {
    $json = file_get_contents('php://input');
    if (!empty($json)) {
        $jsonData = json_decode($json, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            foreach ($possibleKeys as $key) {
                if (isset($jsonData[$key]) && !empty($jsonData[$key])) {
                    $vehicleId = $jsonData[$key];
                    file_put_contents($logFile, "[$timestamp] Found vehicle ID in JSON data '$key': $vehicleId\n", FILE_APPEND);
                    break;
                }
            }
            
            // Check if there's a nested data property
            if (!$vehicleId && isset($jsonData['data']) && is_array($jsonData['data'])) {
                foreach ($possibleKeys as $key) {
                    if (isset($jsonData['data'][$key]) && !empty($jsonData['data'][$key])) {
                        $vehicleId = $jsonData['data'][$key];
                        file_put_contents($logFile, "[$timestamp] Found vehicle ID in nested JSON data['$key']: $vehicleId\n", FILE_APPEND);
                        break;
                    }
                }
            }
        } else {
            file_put_contents($logFile, "[$timestamp] Invalid JSON input: " . json_last_error_msg() . "\n", FILE_APPEND);
        }
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'debug' => [
            'get_params' => $_GET,
            'post_params' => $_POST,
            'timestamp' => $timestamp
        ]
    ]);
    exit;
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Load persistent vehicle data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            file_put_contents($logFile, "[$timestamp] Loaded persistent data with " . count($persistentData) . " vehicles\n", FILE_APPEND);
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Error parsing persistent data: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
}

// Check if vehicle exists in persistent data
$vehicleExists = false;
$savedFares = null;

foreach ($persistentData as $vehicle) {
    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
        $vehicleExists = true;
        // Check if airport fares are stored directly in vehicle data
        if (isset($vehicle['airportFares'])) {
            $savedFares = $vehicle['airportFares'];
            file_put_contents($logFile, "[$timestamp] Found existing airport fares in vehicle data\n", FILE_APPEND);
        }
        break;
    }
}

// Define default fares based on vehicle type
$defaultFares = [
    'sedan' => [
        'pickupPrice' => 800,
        'dropPrice' => 800,
        'tier1Price' => 600,
        'tier2Price' => 800,
        'tier3Price' => 1000,
        'tier4Price' => 1200,
        'extraKmCharge' => 12
    ],
    'ertiga' => [
        'pickupPrice' => 1000,
        'dropPrice' => 1000,
        'tier1Price' => 800,
        'tier2Price' => 1000,
        'tier3Price' => 1200,
        'tier4Price' => 1400,
        'extraKmCharge' => 15
    ],
    'innova_crysta' => [
        'pickupPrice' => 1200,
        'dropPrice' => 1200,
        'tier1Price' => 1000,
        'tier2Price' => 1200,
        'tier3Price' => 1400,
        'tier4Price' => 1600,
        'extraKmCharge' => 17
    ],
    'luxury' => [
        'pickupPrice' => 2500,
        'dropPrice' => 2500,
        'tier1Price' => 2000,
        'tier2Price' => 2200,
        'tier3Price' => 2500,
        'tier4Price' => 3000,
        'extraKmCharge' => 22
    ],
    'tempo_traveller' => [
        'pickupPrice' => 2000,
        'dropPrice' => 2000,
        'tier1Price' => 1600,
        'tier2Price' => 1800,
        'tier3Price' => 2000,
        'tier4Price' => 2500,
        'extraKmCharge' => 19
    ]
];

// If we have saved fares, use them; otherwise get default fares for the vehicle
if ($savedFares) {
    $fare = $savedFares;
    file_put_contents($logFile, "[$timestamp] Using saved fares for vehicle $vehicleId\n", FILE_APPEND);
} else {
    // Get default fare for the vehicle, or create empty fare if vehicle type not found
    $fare = isset($defaultFares[$vehicleId]) ? $defaultFares[$vehicleId] : [
        'pickupPrice' => 0,
        'dropPrice' => 0,
        'tier1Price' => 0,
        'tier2Price' => 0,
        'tier3Price' => 0,
        'tier4Price' => 0,
        'extraKmCharge' => 0
    ];
    file_put_contents($logFile, "[$timestamp] Using default fares for vehicle $vehicleId\n", FILE_APPEND);
}

// Add vehicle ID to fare data (include both formats for compatibility)
$fare['vehicleId'] = $vehicleId;
$fare['vehicle_id'] = $vehicleId;

// Also add pickup/drop in alternate format for compatibility
$fare['pickup'] = $fare['pickupPrice'];
$fare['drop'] = $fare['dropPrice'];
$fare['tier1'] = $fare['tier1Price'];
$fare['tier2'] = $fare['tier2Price'];
$fare['tier3'] = $fare['tier3Price'];
$fare['tier4'] = $fare['tier4Price'];

// Log the response
file_put_contents($logFile, "[$timestamp] Responding with fare data: " . json_encode($fare) . "\n", FILE_APPEND);

// Return fare data
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares retrieved successfully',
    'fares' => [$fare],
    'debug' => [
        'vehicle_id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'timestamp' => time()
    ]
], JSON_PARTIAL_OUTPUT_ON_ERROR);
