
<?php
/**
 * Ultra-simple login endpoint for debugging
 * No database connection needed, just returns success
 */

// Set aggressive CORS headers 
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh');
header('Content-Type: application/json');

// Log all request information for debugging
error_log("DEBUG LOGIN: Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("DEBUG LOGIN: Request URI: " . $_SERVER['REQUEST_URI']);

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'message' => 'CORS preflight successful'
    ]);
    exit;
}

// For any HTTP method, return success with token
$input = file_get_contents('php://input');
error_log("DEBUG LOGIN: Request body: " . $input);

$data = [];
if (!empty($input)) {
    try {
        $data = json_decode($input, true);
    } catch (Exception $e) {
        error_log("DEBUG LOGIN: JSON parse error: " . $e->getMessage());
    }
}

// Determine if this is a signup or login request based on URI
$isSignup = strpos($_SERVER['REQUEST_URI'], 'signup') !== false || 
           strpos($_SERVER['REQUEST_URI'], 'register') !== false;

$responseMessage = $isSignup ? "Debug signup successful" : "Debug login successful";

// Always return success
echo json_encode([
    'status' => 'success',
    'message' => $responseMessage,
    'token' => 'debug-token-' . time(),
    'user' => [
        'id' => 1,
        'name' => $data['name'] ?? 'Debug User',
        'email' => $data['email'] ?? 'debug@example.com',
        'phone' => $data['phone'] ?? '1234567890',
        'role' => 'admin'
    ],
    'request' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'data' => $data
    ]
]);
