
<?php
// direct-airport-fares.php - Redirect to the admin endpoint for backward compatibility

// Clear any existing output buffers
if (ob_get_level()) ob_clean();

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
    $_SERVER['QUERY_STRING'] = 'vehicle_id=' . urlencode($vehicleId);
    
    // Ensure other possible keys are also set for compatibility
    $_GET['vehicleId'] = $vehicleId;
    $_GET['id'] = $vehicleId;
    
    file_put_contents($logFile, "[$timestamp] Set explicit vehicle_id in query string: $vehicleId\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Updated QUERY_STRING: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);
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

// Capture output from the included file
ob_start();
require_once __DIR__ . '/admin/direct-airport-fares.php';
$output = ob_get_clean();

// Check if the output is valid JSON
$isValidJson = false;
$jsonData = json_decode($output);
if (json_last_error() === JSON_ERROR_NONE) {
    $isValidJson = true;
}

// If the output is not valid JSON, clean it and return a structured response
if (!$isValidJson) {
    file_put_contents($logFile, "[$timestamp] Invalid JSON detected in output. Cleaning up response.\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Raw output: " . substr($output, 0, 500) . "\n", FILE_APPEND);
    
    // Return a clean JSON response
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch airport fares. The server returned invalid JSON.',
        'debug_info' => [
            'error' => 'Invalid JSON in response',
            'output_preview' => substr($output, 0, 100) . (strlen($output) > 100 ? '...' : ''),
            'time' => date('c')
        ]
    ]);
} else {
    // Output was valid JSON, pass it through
    echo $output;
}
