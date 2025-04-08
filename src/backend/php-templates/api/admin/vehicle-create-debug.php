
<?php
// Set error reporting to capture all errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log file path
$errorLogFile = $logDir . '/vehicle_create_debug_' . date('Y-m-d') . '.log';
ini_set('error_log', $errorLogFile);

// Start output buffering to prevent unwanted output
ob_start();

// Log this request for debugging
$timestamp = date('Y-m-d H:i:s');
file_put_contents($errorLogFile, "[$timestamp] vehicle-create-debug.php accessed via " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($errorLogFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($errorLogFile, "[$timestamp] Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'none') . "\n", FILE_APPEND);
file_put_contents($errorLogFile, "[$timestamp] Query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);

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
    // Clear any previous output
    if (ob_get_length()) ob_clean();
    
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response['vehicle'] = $data;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Log function for debugging
function logDebug($message) {
    global $errorLogFile, $timestamp;
    file_put_contents($errorLogFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get input data either from JSON body or from form data
    $rawInput = file_get_contents('php://input');
    logDebug('Raw input: ' . substr($rawInput, 0, 1000)); // Log first 1000 chars to avoid huge logs
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logDebug('JSON decode error: ' . json_last_error_msg());
        // Fallback to POST data
        $input = $_POST;
        logDebug('Fallback to POST data: ' . print_r($_POST, true));
    }
    
    // Log the parsed input
    logDebug('Parsed input: ' . print_r($input, true));
    
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
        'pricePerKm' => (float)($input['pricePerKm'] ?? 14),
        'image' => $input['image'] ?? '/cars/sedan.png',
        'amenities' => $input['amenities'] ?? ['AC'],
        'description' => $input['description'] ?? '',
        'ac' => isset($input['ac']) ? (bool)$input['ac'] : true,
        'nightHaltCharge' => (int)($input['nightHaltCharge'] ?? 700),
        'driverAllowance' => (int)($input['driverAllowance'] ?? 250),
        'isActive' => isset($input['isActive']) ? (bool)$input['isActive'] : true,
    ];
    
    logDebug('Prepared vehicle data: ' . print_r($vehicleData, true));
    
    // For now, just return success with the vehicle data
    // In a real implementation, you'd save to database here
    sendJsonResponse('success', 'Vehicle created successfully (debug endpoint)', $vehicleData);
    
} catch (Exception $e) {
    logDebug('Error in vehicle-create-debug.php: ' . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
