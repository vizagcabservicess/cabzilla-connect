
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

// If no vehicle ID found, use a default
if (!$vehicleId) {
    $vehicleId = 'sedan';  // Default to sedan if no vehicle ID provided
    $_GET['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] No vehicle ID found, using default: sedan\n", FILE_APPEND);
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    $_GET['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// Normalize vehicle ID - important for matching in database
if ($vehicleId) {
    $originalVehicleId = $vehicleId;
    
    // Map specific vehicles - expanded mapping for more accuracy
    $mappings = [
        'innova hyrcoss' => 'innova_crysta',
        'innova hycross' => 'innova_crysta',
        'innovacrystal' => 'innova_crysta',
        'innova crystal' => 'innova_crysta',
        'innovacrystal 7seater' => 'innova_crysta',
        'innova' => 'innova_crysta',
        'crysta' => 'innova_crysta',
        'toyota innova' => 'innova_crysta',
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
        'dzire cng' => 'sedan',
        'bus' => 'bus'
    ];
    
    $vehicleLower = strtolower($vehicleId);
    if (isset($mappings[$vehicleLower])) {
        $vehicleId = $mappings[$vehicleLower];
        file_put_contents($logFile, "[$timestamp] Mapped vehicle ID from '$originalVehicleId' to '$vehicleId' using direct mapping\n", FILE_APPEND);
    } else {
        // Check for partial matches
        foreach ($mappings as $key => $value) {
            if (strpos($vehicleLower, $key) !== false) {
                $vehicleId = $value;
                file_put_contents($logFile, "[$timestamp] Mapped vehicle ID from '$originalVehicleId' to '$vehicleId' using partial match on '$key'\n", FILE_APPEND);
                break;
            }
        }
        
        if ($vehicleId === $originalVehicleId) {
            // If no mapping was applied, normalize the string
            $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
            file_put_contents($logFile, "[$timestamp] Normalized vehicle ID format: '$originalVehicleId' to '$vehicleId'\n", FILE_APPEND);
        }
    }
}

// Store both original and normalized vehicle IDs in GET params
$_GET['vehicle_id'] = $vehicleId;
$_GET['original_vehicle_id'] = $originalVehicleId ?? $vehicleId;
file_put_contents($logFile, "[$timestamp] Using normalized vehicle_id: " . $vehicleId . "\n", FILE_APPEND);

// Get trip mode parameter
$tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 
           (isset($_GET['tripMode']) ? $_GET['tripMode'] : 'one-way');
$_GET['trip_mode'] = $tripMode;

// Get distance parameter
$distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;

// Set default distance if none provided or too small
if ($distance <= 0) {
    $distance = 150; // Default distance if none specified
    $_GET['distance'] = $distance;
    file_put_contents($logFile, "[$timestamp] No valid distance parameter, setting default: 150\n", FILE_APPEND);
}

file_put_contents($logFile, "[$timestamp] Forwarding with trip_mode=$tripMode, distance=$distance\n", FILE_APPEND);

// Buffer the output so we can modify it before sending to client
ob_start();

// Forward this request to the direct endpoint
require_once __DIR__ . '/direct-outstation-fares.php';

// Get the output and decode it
$output = ob_get_clean();
$response = json_decode($output, true);

// Log the response
file_put_contents($logFile, "[$timestamp] Raw response from direct-outstation-fares.php: " . $output . "\n", FILE_APPEND);

// Ensure the response format is consistent
if ($response && isset($response['fare']) && !isset($response['fares'])) {
    $response['fares'] = [$response['fare']];
    $output = json_encode($response);
    file_put_contents($logFile, "[$timestamp] Added 'fares' array to response for consistency\n", FILE_APPEND);
} else if ($response && isset($response['fares']) && !isset($response['fare']) && !empty($response['fares'])) {
    $response['fare'] = $response['fares'][0];
    $output = json_encode($response);
    file_put_contents($logFile, "[$timestamp] Added 'fare' object to response for consistency\n", FILE_APPEND);
}

// Output the modified response
echo $output;
