
<?php
// airport-fares.php - Redirect to admin endpoint for airport fares

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_redirect_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares request received with: " . json_encode($_GET) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);

// Make sure we have a vehicle ID from any possible source before forwarding
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type', 'id'];

// First check URL parameters (highest priority)
foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter $key: $vehicleId\n", FILE_APPEND);
        break;
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// Normalize the vehicle ID for consistent lookup
function normalizeVehicleId($id) {
    // Convert to lowercase and remove spaces/hyphens
    $id = strtolower(preg_replace('/[\s-]+/', '_', $id));
    
    // Map common vehicle types to standard IDs
    if (strpos($id, 'innova') !== false && strpos($id, 'crysta') !== false) {
        return 'innova_crysta';
    } else if (strpos($id, 'innova') !== false && strpos($id, 'hycross') !== false) {
        return 'innova_crysta'; // Map Hycross to Crysta for fare lookup
    } else if (strpos($id, 'innova') !== false) {
        return 'innova_crysta';
    } else if (strpos($id, 'ertiga') !== false) {
        return 'ertiga';
    } else if (strpos($id, 'sedan') !== false || strpos($id, 'dzire') !== false) {
        return 'sedan';
    } else if (strpos($id, 'luxury') !== false) {
        return 'luxury';
    } else if (strpos($id, 'tempo') !== false) {
        return 'tempo';
    } else if (strpos($id, 'mpv') !== false) {
        return 'innova_crysta'; // Map MPV to Innova Crysta as fallback
    }
    
    return $id;
}

// Normalize the vehicle ID if we have one
if ($vehicleId) {
    $originalVehicleId = $vehicleId;
    $vehicleId = normalizeVehicleId($vehicleId);
    file_put_contents($logFile, "[$timestamp] Normalized vehicle ID: $originalVehicleId -> $vehicleId\n", FILE_APPEND);
    
    // Add both original and normalized IDs to the query parameters
    $_GET['vehicleId'] = $vehicleId;
    $_GET['vehicle_id'] = $vehicleId;
    $_GET['original_vehicle_id'] = $originalVehicleId;
    
    // If this is a GET request, append vehicle_id to the query string
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($_SERVER['REQUEST_URI'], 'vehicle_id=') === false) {
        $_SERVER['QUERY_STRING'] = ($_SERVER['QUERY_STRING'] ? $_SERVER['QUERY_STRING'] . '&' : '') . 'vehicle_id=' . urlencode($vehicleId);
        $_SERVER['REQUEST_URI'] = strtok($_SERVER['REQUEST_URI'], '?') . '?' . $_SERVER['QUERY_STRING'];
        file_put_contents($logFile, "[$timestamp] Updated query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);
    }
}

// Set the X-Force-Refresh header to ensure we get fresh data
$_SERVER['HTTP_X_FORCE_REFRESH'] = 'true';
// Set admin mode for direct access to tables
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
// Set debug mode for extra output
$_SERVER['HTTP_X_DEBUG'] = 'true';

// Force cache-busting 
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Before forwarding to the actual endpoint, check if we need to handle direct output
if (isset($_GET['direct_output']) && $_GET['direct_output'] === 'true') {
    file_put_contents($logFile, "[$timestamp] Using direct output mode for vehicle_id: $vehicleId\n", FILE_APPEND);
    
    // Define updated fares based on DB screenshot
    $defaultFares = [
        'sedan' => [
            'basePrice' => 3900,
            'pickupPrice' => 800,
            'dropPrice' => 800,
            'extraKmCharge' => 12
        ],
        'ertiga' => [
            'basePrice' => 3200,
            'pickupPrice' => 1000,
            'dropPrice' => 1000,
            'extraKmCharge' => 15
        ],
        'innova_crysta' => [
            'basePrice' => 4000,
            'pickupPrice' => 1200,
            'dropPrice' => 1200,
            'extraKmCharge' => 17
        ],
        'luxury' => [
            'basePrice' => 7000,
            'pickupPrice' => 2500,
            'dropPrice' => 2500,
            'extraKmCharge' => 22
        ],
        'tempo' => [
            'basePrice' => 6000,
            'pickupPrice' => 2000,
            'dropPrice' => 2000,
            'extraKmCharge' => 19
        ],
        'mpv' => [
            'basePrice' => 4000, // Same as innova_crysta
            'pickupPrice' => 1200,
            'dropPrice' => 1200,
            'extraKmCharge' => 17
        ]
    ];
    
    // Try to normalize the vehicle ID to match our array keys
    $normalizedVehicleId = strtolower(str_replace([' ', '-', '_'], '_', $vehicleId));
    
    // Try to find a matching fare in our default fares
    $fare = isset($defaultFares[$normalizedVehicleId]) 
        ? $defaultFares[$normalizedVehicleId] 
        : $defaultFares['sedan']; // Default to sedan
    
    $response = [
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'fares' => [
            [
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
                'basePrice' => $fare['basePrice'],
                'base_price' => $fare['basePrice'],
                'pricePerKm' => $fare['extraKmCharge'],
                'price_per_km' => $fare['extraKmCharge'],
                'pickupPrice' => $fare['pickupPrice'],
                'pickup_price' => $fare['pickupPrice'],
                'dropPrice' => $fare['dropPrice'],
                'drop_price' => $fare['dropPrice'],
                'extraKmCharge' => $fare['extraKmCharge'],
                'extra_km_charge' => $fare['extraKmCharge'],
                'tier1Price' => isset($fare['tier1Price']) ? $fare['tier1Price'] : $fare['basePrice'],
                'tier1_price' => isset($fare['tier1Price']) ? $fare['tier1Price'] : $fare['basePrice'],
                'tier2Price' => isset($fare['tier2Price']) ? $fare['tier2Price'] : $fare['basePrice'] + 200,
                'tier2_price' => isset($fare['tier2Price']) ? $fare['tier2Price'] : $fare['basePrice'] + 200,
                'tier3Price' => isset($fare['tier3Price']) ? $fare['tier3Price'] : $fare['basePrice'] + 400,
                'tier3_price' => isset($fare['tier3Price']) ? $fare['tier3Price'] : $fare['basePrice'] + 400,
                'tier4Price' => isset($fare['tier4Price']) ? $fare['tier4Price'] : $fare['basePrice'] + 600,
                'tier4_price' => isset($fare['tier4Price']) ? $fare['tier4Price'] : $fare['basePrice'] + 600
            ]
        ],
        'count' => 1,
        'timestamp' => time()
    ];
    
    file_put_contents($logFile, "[$timestamp] Direct output response: " . json_encode($response) . "\n", FILE_APPEND);
    echo json_encode($response);
    exit;
}

// Forward this request to the admin endpoint
require_once __DIR__ . '/admin/direct-airport-fares.php';
