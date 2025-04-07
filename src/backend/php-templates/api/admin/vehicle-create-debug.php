
<?php
// Set error reporting to capture all errors
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start output buffering to prevent unwanted output
ob_start();

// Log this request for debugging
error_log('vehicle-create-debug.php accessed at ' . date('Y-m-d H:i:s'));
error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'none'));
error_log('Query string: ' . $_SERVER['QUERY_STRING']);

// Set headers for CORS and JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Function to send JSON response and exit
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response['vehicle'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get input data either from JSON body or from form data
    $rawInput = file_get_contents('php://input');
    error_log('Raw input: ' . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('JSON decode error: ' . json_last_error_msg());
        // Fallback to POST data
        $input = $_POST;
        error_log('Fallback to POST data: ' . print_r($_POST, true));
    }
    
    // Log the parsed input
    error_log('Parsed input: ' . print_r($input, true));
    
    if (empty($input)) {
        throw new Exception("No vehicle data provided or invalid format");
    }
    
    // Extract basic vehicle information
    $vehicleId = $input['id'] ?? $input['vehicleId'] ?? $input['vehicle_id'] ?? uniqid('v_');
    $name = $input['name'] ?? 'Unnamed Vehicle';
    $capacity = (int)($input['capacity'] ?? 4);
    
    // Prepare vehicle data for response
    $vehicleData = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => (int)($input['luggageCapacity'] ?? 2),
        'price' => (int)($input['price'] ?? $input['basePrice'] ?? 0),
        'basePrice' => (int)($input['basePrice'] ?? $input['price'] ?? 0),
        'pricePerKm' => (float)($input['pricePerKm'] ?? 0),
        'image' => $input['image'] ?? '/cars/sedan.png',
        'amenities' => $input['amenities'] ?? ['AC'],
        'description' => $input['description'] ?? '',
        'ac' => isset($input['ac']) ? (bool)$input['ac'] : true,
        'nightHaltCharge' => (int)($input['nightHaltCharge'] ?? 700),
        'driverAllowance' => (int)($input['driverAllowance'] ?? 250),
        'isActive' => isset($input['isActive']) ? (bool)$input['isActive'] : true,
    ];
    
    error_log('Prepared vehicle data: ' . print_r($vehicleData, true));
    
    // For now, just return success with the vehicle data
    // In a real implementation, you'd save to database here
    sendJsonResponse('success', 'Vehicle created successfully', $vehicleData);
    
} catch (Exception $e) {
    error_log('Error in vehicle-create-debug.php: ' . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
?>
