
<?php
// direct-airport-fares.php - Redirect to the admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the redirect for debugging
error_log("Redirecting direct-airport-fares.php to admin/direct-airport-fares.php");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
$postData = $_POST;
error_log("POST data: " . print_r($_POST, true));
error_log("Raw input: " . $rawInput);

// Make sure we have a vehicle ID from any possible source before forwarding
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type'];

// Check POST data for vehicle ID
foreach ($possibleKeys as $key) {
    if (isset($_POST[$key]) && !empty($_POST[$key])) {
        $vehicleId = $_POST[$key];
        break;
    }
}

// If not found in POST, check JSON data
if (!$vehicleId && !empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        foreach ($possibleKeys as $key) {
            if (isset($jsonData[$key]) && !empty($jsonData[$key])) {
                $vehicleId = $jsonData[$key];
                break;
            }
        }
    }
}

// If still not found, check GET parameters
if (!$vehicleId) {
    foreach ($possibleKeys as $key) {
        if (isset($_GET[$key]) && !empty($_GET[$key])) {
            $vehicleId = $_GET[$key];
            break;
        }
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// If we found a vehicle ID, add it to $_POST for the forwarded request
if ($vehicleId) {
    $_POST['vehicleId'] = $vehicleId;
    $_POST['vehicle_id'] = $vehicleId;
    error_log("Using vehicleId: " . $vehicleId);
} else {
    // No valid vehicle ID found, return an error
    error_log("ERROR: No valid vehicle ID found in request");
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
require_once __DIR__ . '/admin/direct-airport-fares.php';
