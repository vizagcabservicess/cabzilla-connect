
<?php
// direct-airport-fares.php - Redirect to the admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting direct-airport-fares.php to admin/direct-airport-fares.php\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);

// Capture URL parameters
file_put_contents($logFile, "[$timestamp] URL parameters: " . json_encode($_GET) . "\n", FILE_APPEND);

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

// Explicitly set in query string for the admin endpoint
if ($vehicleId) {
    // Make sure the vehicle_id parameter is set for the forward
    $_GET['vehicle_id'] = $vehicleId;
    $_GET['vehicleId'] = $vehicleId;
    $_GET['id'] = $vehicleId;
    
    // Ensure query string is properly formatted
    $_SERVER['QUERY_STRING'] = http_build_query($_GET);
    
    file_put_contents($logFile, "[$timestamp] Set explicit vehicle_id in query string: $vehicleId\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Updated QUERY_STRING: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);
}

// Set the X-Force-Refresh header to ensure we get fresh data
$_SERVER['HTTP_X_FORCE_REFRESH'] = 'true';
// Set admin mode for direct access to tables
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
// Set debug mode for extra output
$_SERVER['HTTP_X_DEBUG'] = 'true';

// CRITICAL: Clear any output buffers to prevent HTML contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Instead of include_once, we'll use output buffering to capture any unwanted output
ob_start();
include_once __DIR__ . '/admin/direct-airport-fares.php';
$output = ob_get_clean();

// Check if the output is valid JSON
json_decode($output);
if (json_last_error() !== JSON_ERROR_NONE) {
    // Output is not valid JSON, we need to create a valid JSON response
    file_put_contents($logFile, "[$timestamp] WARNING: Invalid JSON returned from admin endpoint. First 100 chars: " . substr($output, 0, 100) . "\n", FILE_APPEND);
    
    // Create a valid JSON response
    $errorResponse = json_encode([
        'status' => 'error',
        'message' => 'Error processing request - invalid response format',
        'debug_info' => 'The endpoint returned invalid JSON format. Check server logs for details.',
        'timestamp' => time()
    ]);
    
    echo $errorResponse;
} else {
    // Output is valid JSON, send it as is
    echo $output;
}
