
<?php
// Prevent any output before headers
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Log access for debugging
error_log("direct-vehicle-create.php accessed with method: " . $_SERVER['REQUEST_METHOD']);

// Set JSON content type and CORS headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');

// Force no caching
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Function to send JSON response
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

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Only POST method is allowed');
}

try {
    // Get input data
    $rawInput = file_get_contents('php://input');
    error_log("Raw input received in direct-vehicle-create: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (!$input && !empty($_POST)) {
        $input = $_POST;
        error_log("Using POST data instead of JSON");
    }
    
    if (!$input) {
        throw new Exception("No vehicle data provided or invalid JSON");
    }
    
    error_log("Parsed input: " . print_r($input, true));
    
    // Process vehicle creation through simpler endpoint
    require_once(__DIR__ . '/add-vehicle-simple.php');
    
} catch (Exception $e) {
    error_log("Error in direct-vehicle-create.php: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
