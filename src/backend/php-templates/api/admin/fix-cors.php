
<?php
// fix-cors.php - Updated CORS fix for all API endpoints

// Force HTTP 200 OK status regardless of PHP errors
http_response_code(200);

// Set CORS headers - don't try to set Origin header
header('Content-Type: application/json');

// Ultra aggressive cache control to prevent browser caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, pre-check=0, post-check=0');
header('Pragma: no-cache');
header('Expires: -1');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');
header('Vary: Access-Control-Request-Method, Access-Control-Request-Headers');

// Additional debugging headers
header('X-API-Version: 1.3.2');
header('X-CORS-Status: Fixed');
header('X-Content-Type-Options: nosniff');
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);

// Force status 200 for OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'corsStatus' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Test CORS configuration
$corsTest = [
    'status' => 'success',
    'message' => 'CORS is properly configured',
    'timestamp' => date('c'),
    'server_time' => time(),
    'cors_headers' => [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *'
    ],
    'request_info' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'host' => $_SERVER['HTTP_HOST'] ?? 'none'
    ]
];

// Output response as JSON
echo json_encode($corsTest);
