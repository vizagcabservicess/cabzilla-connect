
<?php
// Prevent any output before headers
ob_start();

// Set JSON content type and CORS headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');

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
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input && !empty($_POST)) {
        $input = $_POST;
    }
    
    if (!$input) {
        throw new Exception("No vehicle data provided");
    }

    // Process vehicle creation through simpler endpoint
    require_once(__DIR__ . '/add-vehicle-simple.php');
    
} catch (Exception $e) {
    sendJsonResponse('error', $e->getMessage());
}
