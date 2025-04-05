
<?php
// Default index.php file to handle root API requests

// Set CORS headers to allow all origins and methods
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, Accept');
header('Content-Type: application/json');

// For OPTIONS preflight requests - CRITICAL for browser CORS compliance
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request details for debugging
$requestData = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'headers' => getallheaders(),
    'time' => date('Y-m-d H:i:s')
];

// Log the request for debugging
error_log("API Request: " . json_encode($requestData));

// If the path is /api/login or api/login.php, forward to login.php
if (preg_match('/\/(api\/)?login(\.php)?$/i', $_SERVER['REQUEST_URI'])) {
    // Log the forwarding
    error_log("Forwarding to login.php");
    include_once __DIR__ . '/login.php';
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
    'requestDetails' => $requestData,
    'serverTime' => date('Y-m-d H:i:s'),
    'timestamp' => time()
]);
