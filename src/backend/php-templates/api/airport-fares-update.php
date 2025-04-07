
<?php
// airport-fares-update.php - Redirect to admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

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

$logFile = $logDir . '/airport_fares_update_redirect_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

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

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting airport-fares-update.php to admin/airport-fares-update.php\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
$postData = $_POST;
file_put_contents($logFile, "[$timestamp] POST data: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);

// Ensure default values for all required fields
$defaults = [
    'basePrice' => 0,
    'base_price' => 0,
    'pricePerKm' => 0,
    'price_per_km' => 0,
    'pickupPrice' => 0,
    'pickup_price' => 0,
    'dropPrice' => 0,
    'drop_price' => 0,
    'tier1Price' => 0,
    'tier1_price' => 0,
    'tier2Price' => 0,
    'tier2_price' => 0,
    'tier3Price' => 0,
    'tier3_price' => 0,
    'tier4Price' => 0,
    'tier4_price' => 0,
    'extraKmCharge' => 0,
    'extra_km_charge' => 0
];

// Apply default values to POST data
$_POST = array_merge($defaults, $_POST);

// Get request data - check various sources
$vehicleId = null;
$jsonData = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicleid', 'vehicle-id', 'id', 'cabType', 'cab_type'];

// First check URL parameters (highest priority)
foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter $key: $vehicleId\n", FILE_APPEND);
        break;
    }
}

// Then check POST data if still not found
if (!$vehicleId) {
    foreach ($possibleKeys as $key) {
        if (isset($_POST[$key]) && !empty($_POST[$key])) {
            $vehicleId = $_POST[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in POST data $key: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
}

// If still not found, check JSON data
if (!$vehicleId && !empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    $jsonError = json_last_error();
    
    if ($jsonError === JSON_ERROR_NONE) {
        file_put_contents($logFile, "[$timestamp] Successfully parsed JSON data\n", FILE_APPEND);
        
        foreach ($possibleKeys as $key) {
            if (isset($jsonData[$key]) && !empty($jsonData[$key])) {
                $vehicleId = $jsonData[$key];
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in JSON data $key: $vehicleId\n", FILE_APPEND);
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
        
        // Also check __data field
        if (!$vehicleId && isset($jsonData['__data']) && is_array($jsonData['__data'])) {
            foreach ($possibleKeys as $key) {
                if (isset($jsonData['__data'][$key]) && !empty($jsonData['__data'][$key])) {
                    $vehicleId = $jsonData['__data'][$key];
                    file_put_contents($logFile, "[$timestamp] Found vehicle ID in __data[$key]: $vehicleId\n", FILE_APPEND);
                    break;
                }
            }
        }
        
        // Apply the default values to the JSON data
        if (isset($jsonData['data']) && is_array($jsonData['data'])) {
            $jsonData['data'] = array_merge($defaults, $jsonData['data']);
        } else if (is_array($jsonData)) {
            $jsonData = array_merge($defaults, $jsonData);
        }
        
        $GLOBALS['__UPDATED_RAW_INPUT'] = json_encode($jsonData);
        file_put_contents($logFile, "[$timestamp] Updated JSON with defaults: " . $GLOBALS['__UPDATED_RAW_INPUT'] . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Failed to parse JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
        
        // Try to parse as URL-encoded data
        parse_str($rawInput, $parsedData);
        if (!empty($parsedData)) {
            foreach ($possibleKeys as $key) {
                if (isset($parsedData[$key]) && !empty($parsedData[$key])) {
                    $vehicleId = $parsedData[$key];
                    file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL-encoded data $key: $vehicleId\n", FILE_APPEND);
                    break;
                }
            }
            
            // Apply default values to parsed data
            $parsedData = array_merge($defaults, $parsedData);
            $rawInput = http_build_query($parsedData);
        }
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// If we found a vehicle ID, add it to $_GET, $_POST, and $_REQUEST for the forwarded request
if ($vehicleId) {
    // Apply the default values to $_POST and $_GET
    $_POST = array_merge($defaults, $_POST);
    $_GET = array_merge($defaults, $_GET);
    
    $_GET['vehicleId'] = $vehicleId;
    $_GET['vehicle_id'] = $vehicleId;
    $_POST['vehicleId'] = $vehicleId;
    $_POST['vehicle_id'] = $vehicleId;
    $_REQUEST['vehicleId'] = $vehicleId;
    $_REQUEST['vehicle_id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Using vehicleId: " . $vehicleId . "\n", FILE_APPEND);
    
    // If this is a GET request, append vehicle_id to the query string
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($_SERVER['REQUEST_URI'], 'vehicle_id=') === false) {
        $_SERVER['QUERY_STRING'] = ($_SERVER['QUERY_STRING'] ? $_SERVER['QUERY_STRING'] . '&' : '') . 'vehicle_id=' . urlencode($vehicleId);
        $_SERVER['REQUEST_URI'] = strtok($_SERVER['REQUEST_URI'], '?') . '?' . $_SERVER['QUERY_STRING'];
        file_put_contents($logFile, "[$timestamp] Updated query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);
    }
    
    try {
        // Forward the request to the admin endpoint
        file_put_contents($logFile, "[$timestamp] Forwarding to admin/airport-fares-update.php with vehicle ID: $vehicleId\n", FILE_APPEND);
        require_once __DIR__ . '/admin/airport-fares-update.php';
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Exception during forwarding: " . $e->getMessage() . "\n", FILE_APPEND);
        file_put_contents($logFile, "[$timestamp] Exception trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
        
        // Return a properly formatted error response
        sendErrorResponse('Error updating airport fares: ' . $e->getMessage());
    }
} else {
    // No valid vehicle ID found, return an error
    file_put_contents($logFile, "[$timestamp] ERROR: No valid vehicle ID found in request\n", FILE_APPEND);
    sendErrorResponse('Vehicle ID is required. Please check your request and ensure a valid vehicle ID is provided.');
}
