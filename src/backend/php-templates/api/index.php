
<?php
// Basic API status check endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo json_encode([
    'status' => 'success',
    'message' => 'API is running',
    'timestamp' => date('Y-m-d H:i:s'),
    'endpoints' => [
        'login' => '/api/login.php',
        'signup' => '/api/signup.php',
        'status' => '/api/status.php'
    ]
]);
