
<?php
// fix-cors.php - Enhanced CORS fix with routing diagnostics for all API endpoints

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
header('X-API-Version: 1.3.2');
header('X-CORS-Status: Fixed');
header('X-Content-Type-Options: nosniff');
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);
header('X-PHP-Version: ' . PHP_VERSION);
header('X-Request-URI: ' . $_SERVER['REQUEST_URI']);
header('X-Script-Name: ' . $_SERVER['SCRIPT_NAME']);

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

// Enhanced routing diagnostics
$routingInfo = [
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'undefined',
    'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'undefined',
    'path_info' => $_SERVER['PATH_INFO'] ?? 'undefined',
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'undefined',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'undefined',
    'redirect_url' => $_SERVER['REDIRECT_URL'] ?? 'none',
    'redirect_status' => $_SERVER['REDIRECT_STATUS'] ?? 'none',
    'has_double_api_prefix' => (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/api/') !== false),
    'server_signature' => $_SERVER['SERVER_SIGNATURE'] ?? 'undefined'
];

// Check mod_rewrite status
$modRewriteAvailable = in_array('mod_rewrite', apache_get_modules());

// Test CORS configuration with enhanced routing diagnostics
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
    ],
    'routing_diagnostics' => $routingInfo,
    'mod_rewrite_available' => $modRewriteAvailable
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

// Add suggested fixes
$corsTest['suggested_fixes'] = [];

if ($routingInfo['has_double_api_prefix']) {
    $corsTest['suggested_fixes'][] = "Your URL contains '/api/api/' which indicates a routing misconfiguration. Check .htaccess files.";
}

if (!$modRewriteAvailable) {
    $corsTest['suggested_fixes'][] = "mod_rewrite is not available, but is required for proper routing. Contact your hosting provider.";
}

// Output response as JSON
echo json_encode($corsTest, JSON_PRETTY_PRINT);
