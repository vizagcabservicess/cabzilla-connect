
<?php
// airport-fares-update.php - Redirect to admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

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

$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting airport-fares-update.php to admin/airport-fares-update.php\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
$postData = $_POST;
file_put_contents($logFile, "[$timestamp] POST data: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);

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
    if (json_last_error() === JSON_ERROR_NONE) {
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
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// If we found a vehicle ID, add it to $_GET, $_POST, and $_REQUEST for the forwarded request
if ($vehicleId) {
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
} else {
    // No valid vehicle ID found, return an error
    file_put_contents($logFile, "[$timestamp] ERROR: No valid vehicle ID found in request\n", FILE_APPEND);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required. Please check your request and ensure a valid vehicle ID is provided.',
        'debug' => [
            'post' => $_POST,
            'get' => $_GET,
            'rawInput' => $rawInput
        ]
    ]);
    exit;
}

// Forward the request to the admin endpoint
require_once __DIR__ . '/admin/airport-fares-update.php';
