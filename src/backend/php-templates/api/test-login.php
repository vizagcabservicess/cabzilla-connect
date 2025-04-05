
<?php
/**
 * Test login endpoint that always returns success
 * Use this for debugging login issues
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log all request data
error_log("Test login request received. Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Test login request URI: " . $_SERVER['REQUEST_URI']);
error_log("Test login request headers: " . json_encode(getallheaders()));

// Get raw request body
$input = file_get_contents('php://input');
error_log("Test login request body: " . $input);

// Return success for any POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode($input, true);
    $email = $data['email'] ?? 'test@example.com';
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Test login successful',
        'token' => 'test-token-' . time(),
        'user' => [
            'id' => 1,
            'name' => 'Test User',
            'email' => $email,
            'role' => 'user'
        ],
        'request' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'headers' => getallheaders(),
            'body' => $data
        ]
    ]);
} else {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST for login.',
        'request_method' => $_SERVER['REQUEST_METHOD']
    ]);
}
