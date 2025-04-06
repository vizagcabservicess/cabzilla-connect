
<?php
/**
 * Direct Airport Fares API - Public facing version
 * Forwards to the admin endpoint for compatibility
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting direct-airport-fares.php to admin/direct-airport-fares.php\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);

// Check for vehicle ID in all possible parameter names
$vehicleIdParams = ['id', 'vehicleId', 'vehicle_id', 'vehicleid'];
$vehicleId = null;

// First check URL parameters
foreach ($vehicleIdParams as $param) {
    if (isset($_GET[$param]) && !empty($_GET[$param])) {
        $vehicleId = $_GET[$param];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter '$param': $vehicleId\n", FILE_APPEND);
        break;
    }
}

// If not found in URL, check JSON input
if (!$vehicleId && !empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    if ($jsonData) {
        foreach ($vehicleIdParams as $param) {
            if (isset($jsonData[$param]) && !empty($jsonData[$param])) {
                $vehicleId = $jsonData[$param];
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in JSON input '$param': $vehicleId\n", FILE_APPEND);
                break;
            }
        }
    }
}

// If we have a vehicle ID, make sure it's properly passed to the admin endpoint
if ($vehicleId) {
    // Set it in all possible parameter locations to ensure it's found
    $_GET['id'] = $vehicleId;
    $_REQUEST['id'] = $vehicleId;
    $_GET['vehicleId'] = $vehicleId;
    $_REQUEST['vehicleId'] = $vehicleId;
    $_GET['vehicle_id'] = $vehicleId;
    $_REQUEST['vehicle_id'] = $vehicleId;
    
    file_put_contents($logFile, "[$timestamp] Setting vehicle ID in all parameters: $vehicleId\n", FILE_APPEND);
} else {
    file_put_contents($logFile, "[$timestamp] WARNING: No vehicle ID found in request\n", FILE_APPEND);
}

// Forward headers to ensure admin permissions
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';

// Forward the request to the admin endpoint
require_once __DIR__ . '/admin/direct-airport-fares.php';
