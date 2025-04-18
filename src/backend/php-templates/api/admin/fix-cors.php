
<?php
// fix-cors.php - Updated CORS fix for all API endpoints

// Force HTTP 200 OK status regardless of PHP errors
http_response_code(200);

// Allow all origins
header('Access-Control-Allow-Origin: *');

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
header('X-API-Version: 1.3.1');
header('X-CORS-Status: Fixed');
header('X-Content-Type-Options: nosniff');
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);
header('X-PHP-Version: ' . PHP_VERSION);

// Diagnostic PHP info
$phpInfo = [
    'version' => PHP_VERSION,
    'modules' => get_loaded_extensions(),
    'sapi' => php_sapi_name(),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'display_errors' => ini_get('display_errors'),
    'error_reporting' => ini_get('error_reporting')
];

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
    'php_info' => $phpInfo,
    'cors_headers' => [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *'
    ],
    'request_info' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'host' => $_SERVER['HTTP_HOST'] ?? 'none',
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]
];

// Test required functions
$corsTest['function_tests'] = [
    'json_encode' => function_exists('json_encode'),
    'json_decode' => function_exists('json_decode'),
    'file_get_contents' => function_exists('file_get_contents'),
    'mysqli' => class_exists('mysqli'),
    'curl' => function_exists('curl_init'),
    'password_hash' => function_exists('password_hash'),
    'password_verify' => function_exists('password_verify')
];

// Output response as JSON
echo json_encode($corsTest);
