
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

// Instead of including the file directly, we'll make a direct API call to the admin endpoint
// This prevents any PHP output buffering issues or HTML contamination
$adminEndpointUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/direct-airport-fares.php';
if (!empty($_SERVER['QUERY_STRING'])) {
    $adminEndpointUrl .= '?' . $_SERVER['QUERY_STRING'];
}

// Add a cache buster
$adminEndpointUrl .= (strpos($adminEndpointUrl, '?') !== false ? '&' : '?') . '_t=' . time();

file_put_contents($logFile, "[$timestamp] Making direct API call to: $adminEndpointUrl\n", FILE_APPEND);

$options = [
    'http' => [
        'method' => 'GET',
        'header' => [
            'X-Force-Refresh: true',
            'X-Admin-Mode: true',
            'X-Debug: true',
            'Accept: application/json',
            'Cache-Control: no-cache, no-store, must-revalidate'
        ]
    ]
];

$context = stream_context_create($options);

try {
    $response = file_get_contents($adminEndpointUrl, false, $context);
    
    if ($response === false) {
        throw new Exception("Failed to get response from admin endpoint");
    }
    
    file_put_contents($logFile, "[$timestamp] Received response from admin endpoint. First 100 chars: " . substr($response, 0, 100) . "\n", FILE_APPEND);
    
    // Verify the response is valid JSON
    $decoded = json_decode($response);
    if (json_last_error() !== JSON_ERROR_NONE) {
        file_put_contents($logFile, "[$timestamp] WARNING: Invalid JSON response received: " . json_last_error_msg() . "\n", FILE_APPEND);
        
        // Try to clean the response - remove any non-JSON content
        $jsonStart = strpos($response, '{');
        $jsonEnd = strrpos($response, '}');
        
        if ($jsonStart !== false && $jsonEnd !== false) {
            $cleanedResponse = substr($response, $jsonStart, $jsonEnd - $jsonStart + 1);
            file_put_contents($logFile, "[$timestamp] Attempting to clean response JSON. First 100 chars: " . substr($cleanedResponse, 0, 100) . "\n", FILE_APPEND);
            
            // Check if the cleaned response is valid JSON
            $decodedCleaned = json_decode($cleanedResponse);
            if (json_last_error() === JSON_ERROR_NONE) {
                file_put_contents($logFile, "[$timestamp] Successfully cleaned JSON response\n", FILE_APPEND);
                $response = $cleanedResponse;
            } else {
                file_put_contents($logFile, "[$timestamp] Failed to clean JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
            }
        }
        
        // If we still can't parse it, return a valid JSON error response
        if (json_last_error() !== JSON_ERROR_NONE) {
            $response = json_encode([
                'status' => 'error',
                'message' => 'Invalid response from airport fares endpoint',
                'debug_info' => 'The endpoint returned invalid JSON format',
                'timestamp' => time()
            ]);
        }
    }
    
    // Return the response (either original or cleaned/error)
    echo $response;
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return a valid JSON error response
    echo json_encode([
        'status' => 'error',
        'message' => 'Error fetching airport fares: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
