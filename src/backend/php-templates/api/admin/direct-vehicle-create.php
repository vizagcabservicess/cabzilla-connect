
<?php
// direct-vehicle-create.php - A simplified endpoint for vehicle creation

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.5');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle create request: Method=$requestMethod, URI=$requestUri");

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

// Get data from request using multiple approaches
$data = [];

// Try POST data first
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
}
// Then try JSON input
else {
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    // Try JSON decode
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Successfully parsed JSON data");
    }
    // Try form-urlencoded
    else {
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Successfully parsed form-urlencoded data");
        }
    }
}

// Final validation
if (empty($data) || !isset($data['name'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required field: name',
        'receivedData' => $data
    ]);
    exit;
}

// Success response for development/testing environments
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle created successfully',
    'vehicleId' => $data['vehicleId'] ?? $data['id'] ?? strtolower(str_replace(' ', '_', $data['name'])),
    'details' => [
        'name' => $data['name'],
        'capacity' => $data['capacity'] ?? 4,
        'timestamp' => time(),
        'development_mode' => true
    ]
]);
