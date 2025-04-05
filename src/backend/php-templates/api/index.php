
<?php
// Default index.php file to handle root API requests

// Set CORS headers to allow all origins
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// For OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Return API information
echo json_encode([
    'status' => 'success',
    'message' => 'API is running',
    'version' => '1.0.0',
    'endpoints' => [
        'login' => '/api/login.php',
        'status' => '/api/status.php',
        'admin' => '/api/admin/status.php',
    ],
    'serverTime' => date('Y-m-d H:i:s'),
    'timestamp' => time()
]);
?>
