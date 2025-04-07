
<?php
// direct-airport-fares.php - Redirect to the admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Clear any output buffers to ensure clean response
while (ob_get_level()) {
    ob_end_clean();
}

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
file_put_contents($logFile, "[$timestamp] Request parameters: " . json_encode($_GET) . "\n", FILE_APPEND);

// Include needed utils
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/database.php';

// Try to set collation for any database queries before redirecting
try {
    $conn = getDbConnection();
    if ($conn) {
        // Set collation explicitly for the entire connection
        $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        $conn->query("SET CHARACTER SET utf8mb4");
    }
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
}

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

// If no vehicle ID was found but we need one, try other sources
if (!$vehicleId) {
    // Check in POST data
    foreach ($possibleKeys as $key) {
        if (isset($_POST[$key]) && !empty($_POST[$key])) {
            $vehicleId = $_POST[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in POST data $key: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Check in JSON body if still not found
    if (!$vehicleId) {
        $jsonInput = file_get_contents('php://input');
        if (!empty($jsonInput)) {
            $jsonData = json_decode($jsonInput, true);
            if ($jsonData && is_array($jsonData)) {
                foreach ($possibleKeys as $key) {
                    if (isset($jsonData[$key]) && !empty($jsonData[$key])) {
                        $vehicleId = $jsonData[$key];
                        file_put_contents($logFile, "[$timestamp] Found vehicle ID in JSON input $key: $vehicleId\n", FILE_APPEND);
                        break;
                    }
                }
            }
        }
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// If we found a vehicle ID, add it to $_GET for the forwarded request
if ($vehicleId) {
    $_GET['vehicleId'] = $vehicleId;
    $_GET['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Using vehicleId: " . $vehicleId . "\n", FILE_APPEND);
    
    // If this is a GET request, append vehicle_id to the query string
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($_SERVER['REQUEST_URI'], 'vehicle_id=') === false) {
        $_SERVER['QUERY_STRING'] = ($_SERVER['QUERY_STRING'] ? $_SERVER['QUERY_STRING'] . '&' : '') . 'vehicle_id=' . urlencode($vehicleId);
        $_SERVER['REQUEST_URI'] = strtok($_SERVER['REQUEST_URI'], '?') . '?' . $_SERVER['QUERY_STRING'];
        file_put_contents($logFile, "[$timestamp] Updated query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);
    }
}

try {
    // Forward the request to the admin endpoint
    file_put_contents($logFile, "[$timestamp] Forwarding to admin/direct-airport-fares.php\n", FILE_APPEND);
    require_once __DIR__ . '/admin/direct-airport-fares.php';
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Exception during forwarding: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Exception trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    // Return a properly formatted error response
    sendErrorResponse('Error processing request: ' . $e->getMessage());
}
