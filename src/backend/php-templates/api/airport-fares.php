
<?php
// Redirect to proper airport fares endpoint

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
file_put_contents($logFile, "[$timestamp] Airport fares request received - redirecting to direct endpoint\n", FILE_APPEND);
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

// If no vehicle ID found, use a default
if (!$vehicleId) {
    $vehicleId = 'sedan';  // Default to sedan if no vehicle ID provided
    file_put_contents($logFile, "[$timestamp] No vehicle ID found, using default: sedan\n", FILE_APPEND);
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// Normalize vehicle ID - remove spaces and convert to lowercase
if ($vehicleId) {
    $originalVehicleId = $vehicleId;
    
    // Map specific vehicles
    $mappings = [
        'innova hyrcoss' => 'innova_crysta',
        'innova hycross' => 'innova_crysta',
        'innovacrystal' => 'innova_crysta',
        'innova crystal' => 'innova_crysta',
        'innovacrystal 7seater' => 'innova_crysta',
        'crysta' => 'innova_crysta',
        'suzuki ertiga' => 'ertiga',
        'maruti ertiga' => 'ertiga',
        'ertigaac' => 'ertiga',
        'dzire' => 'sedan',
        'swift dzire' => 'sedan',
        'etios' => 'sedan',
        'toyota etios' => 'sedan',
        'honda amaze' => 'sedan',
        'amaze' => 'sedan',
        'toyota' => 'innova_crysta',
        'mpv' => 'tempo',
        'tempo_traveller' => 'tempo',
    ];
    
    $vehicleLower = strtolower($vehicleId);
    if (isset($mappings[$vehicleLower])) {
        $vehicleId = $mappings[$vehicleLower];
    } else {
        // Check for partial matches
        foreach ($mappings as $key => $value) {
            if (strpos($vehicleLower, $key) !== false) {
                $vehicleId = $value;
                break;
            }
        }
        
        if ($vehicleId === $originalVehicleId) {
            // If no mapping was applied, normalize the string
            $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
        }
    }
    
    file_put_contents($logFile, "[$timestamp] Normalized vehicle ID from '$originalVehicleId' to '$vehicleId'\n", FILE_APPEND);
}

// If we found a vehicle ID, add it to $_GET for the forwarded request
if ($vehicleId) {
    $_GET['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Using normalized vehicle_id: " . $vehicleId . "\n", FILE_APPEND);
}

// Get distance parameter if present
if (isset($_GET['distance']) && !empty($_GET['distance'])) {
    $distance = (float)$_GET['distance'];
    file_put_contents($logFile, "[$timestamp] Found distance parameter: $distance\n", FILE_APPEND);
} else {
    // Set a default distance if none provided
    $_GET['distance'] = 15;
    file_put_contents($logFile, "[$timestamp] No distance parameter, setting default: 15\n", FILE_APPEND);
}

// Forward this request to the direct endpoint
require_once __DIR__ . '/direct-airport-fares.php';
