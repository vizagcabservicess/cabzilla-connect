
<?php
// Enable error reporting but log to file instead of output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php-errors.log');

// Log every access to this script for debugging
error_log("direct-vehicle-create.php accessed via " . $_SERVER['REQUEST_METHOD'] . ". Remote IP: " . $_SERVER['REMOTE_ADDR']);

// Set headers first to avoid "headers already sent" issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Function for consistent JSON responses
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response['vehicle'] = $data;
    }
    
    // Output the JSON response
    echo json_encode($response);
    exit;
}

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("Invalid method: " . $_SERVER['REQUEST_METHOD']);
    sendJsonResponse('error', 'Only POST method is allowed');
}

try {
    // Get raw input
    $rawInput = file_get_contents('php://input');
    error_log("Raw input received: " . substr($rawInput, 0, 1000)); // Log first 1000 chars
    
    // Try to decode JSON input
    $input = json_decode($rawInput, true);
    
    // Fall back to POST data if JSON parsing fails
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        if (!empty($_POST)) {
            error_log("Using POST data instead");
            $input = $_POST;
        }
    }
    
    // Verify we have valid data
    if (empty($input)) {
        throw new Exception("No vehicle data provided or invalid format");
    }
    
    error_log("Parsed input: " . print_r($input, true));
    
    // Generate a vehicle ID if not provided
    $vehicleId = !empty($input['vehicleId']) ? $input['vehicleId'] : 
                (!empty($input['id']) ? $input['id'] : 
                (!empty($input['vehicle_id']) ? $input['vehicle_id'] : uniqid('v_')));
    
    // Extract basic vehicle information with fallbacks
    $name = !empty($input['name']) ? $input['name'] : 'Unnamed Vehicle';
    $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 4;
    
    // CRITICAL - Create comprehensive vehicle object with all possible fields
    $vehicleData = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => isset($input['luggageCapacity']) ? (int)$input['luggageCapacity'] : 2,
        'price' => isset($input['price']) ? (int)$input['price'] : 
                  (isset($input['basePrice']) ? (int)$input['basePrice'] : 0),
        'basePrice' => isset($input['basePrice']) ? (int)$input['basePrice'] : 
                      (isset($input['price']) ? (int)$input['price'] : 0),
        'pricePerKm' => isset($input['pricePerKm']) ? (float)$input['pricePerKm'] : 0,
        'image' => isset($input['image']) ? $input['image'] : '/cars/sedan.png',
        'amenities' => isset($input['amenities']) ? $input['amenities'] : ['AC'],
        'description' => isset($input['description']) ? $input['description'] : '',
        'ac' => isset($input['ac']) ? (bool)$input['ac'] : true,
        'nightHaltCharge' => isset($input['nightHaltCharge']) ? (int)$input['nightHaltCharge'] : 700,
        'driverAllowance' => isset($input['driverAllowance']) ? (int)$input['driverAllowance'] : 250,
        'isActive' => isset($input['isActive']) ? (bool)$input['isActive'] : true
    ];
    
    error_log("Prepared vehicle data: " . print_r($vehicleData, true));
    
    // In a real system, we'd save to database here
    // For now, just return success with the vehicle data
    sendJsonResponse('success', 'Vehicle created successfully', $vehicleData);
    
} catch (Exception $e) {
    error_log("Error in direct-vehicle-create.php: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
