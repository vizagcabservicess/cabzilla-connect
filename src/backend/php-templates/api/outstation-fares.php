
<?php
// Redirect to proper outstation fares endpoint

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

$logFile = $logDir . '/outstation_fares_redirect_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Outstation fares request received - redirecting to direct endpoint\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);

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

// Normalize vehicle ID - remove spaces and convert to lowercase
if ($vehicleId) {
    $originalVehicleId = $vehicleId;
    $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
    file_put_contents($logFile, "[$timestamp] Normalized vehicle ID from '$originalVehicleId' to '$vehicleId'\n", FILE_APPEND);
}

// If we found a vehicle ID, add it to $_GET for the forwarded request
if ($vehicleId) {
    $_GET['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Using normalized vehicle_id: " . $vehicleId . "\n", FILE_APPEND);
}

// Get other params
$tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 
           (isset($_GET['tripMode']) ? $_GET['tripMode'] : 'one-way');
$distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;

// Save values to $_GET
$_GET['trip_mode'] = $tripMode;
$_GET['distance'] = $distance;

file_put_contents($logFile, "[$timestamp] Forwarding with trip_mode=$tripMode, distance=$distance\n", FILE_APPEND);

// Forward this request to the direct endpoint
require_once __DIR__ . '/direct-outstation-fares.php';
