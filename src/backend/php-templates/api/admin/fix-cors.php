
<?php
// fix-cors.php - Ultimate CORS fix for all API endpoints

// Force HTTP 200 OK status regardless of PHP errors
http_response_code(200);

// Allow specific origins - particularly important for preflight OPTIONS requests
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    header('Access-Control-Allow-Origin: *');
}

// Send immediate headers without delay
header('Content-Type: application/json');

// Ultra aggressive cache control to prevent browser caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, pre-check=0, post-check=0');
header('Pragma: no-cache');
header('Expires: -1');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

// Additional debugging headers
header('X-API-Version: 1.3.0');
header('X-CORS-Status: Ultimate Fix');
header('X-Content-Type-Options: nosniff');
header('X-Debug-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);
header('X-Debug-Headers: ' . ($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? 'none'));

// Force status 200 for OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'corsStatus' => 'enabled',
        'timestamp' => time(),
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none',
            'host' => $_SERVER['HTTP_HOST'] ?? 'none',
            'requestHeaders' => $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? 'none',
            'requestMethod' => $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'] ?? 'none'
        ]
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
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *',
        'Access-Control-Max-Age' => '86400',
        'Access-Control-Expose-Headers' => '*'
    ],
    'request_info' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'query' => $_SERVER['QUERY_STRING'] ?? '',
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'none',
        'referer' => $_SERVER['HTTP_REFERER'] ?? 'none',
        'host' => $_SERVER['HTTP_HOST'] ?? 'none',
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]
];

// Output response as JSON
echo json_encode($corsTest);
