
<?php
/**
 * fix-cors.php - Enhanced API troubleshooting tool
 * This script fixes CORS issues and provides diagnostic information
 */

// Force HTTP 200 OK status
http_response_code(200);

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');

// Additional debugging headers
header('X-API-Version: 1.3.5');
header('X-CORS-Status: Fixed');
header('X-Content-Type-Options: nosniff');
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);
header('X-PHP-Version: ' . PHP_VERSION);
header('X-Request-URI: ' . $_SERVER['REQUEST_URI']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Check for directory and file permissions
$permissionChecks = [
    'api_directory' => [
        'path' => __DIR__,
        'readable' => is_readable(__DIR__),
        'writable' => is_writable(__DIR__),
        'executable' => is_executable(__DIR__),
        'permissions' => substr(sprintf('%o', fileperms(__DIR__)), -4)
    ],
    'admin_directory' => [
        'path' => __DIR__ . '/admin',
        'readable' => is_readable(__DIR__ . '/admin'),
        'writable' => is_writable(__DIR__ . '/admin'),
        'executable' => is_executable(__DIR__ . '/admin'),
        'permissions' => file_exists(__DIR__ . '/admin') ? substr(sprintf('%o', fileperms(__DIR__ . '/admin')), -4) : 'directory_missing'
    ],
    'check_api_routing' => [
        'path' => __DIR__ . '/check-api-routing.php',
        'exists' => file_exists(__DIR__ . '/check-api-routing.php'),
        'readable' => is_readable(__DIR__ . '/check-api-routing.php'),
        'permissions' => file_exists(__DIR__ . '/check-api-routing.php') ? substr(sprintf('%o', fileperms(__DIR__ . '/check-api-routing.php')), -4) : 'file_missing'
    ]
];

// Enhanced routing diagnostics 
$uriInfo = [
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'undefined',
    'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'undefined',
    'has_double_api' => (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/api/') !== false),
    'path_info' => $_SERVER['PATH_INFO'] ?? 'undefined',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'undefined'
];

// Check server configuration
$serverConfig = [
    'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'name' => $_SERVER['SERVER_NAME'] ?? 'unknown',
    'protocol' => $_SERVER['SERVER_PROTOCOL'] ?? 'unknown',
    'signature' => $_SERVER['SERVER_SIGNATURE'] ?? 'unknown',
    'php_version' => PHP_VERSION,
    'sapi' => php_sapi_name(),
    'php_enabled_modules' => get_loaded_extensions()
];

// Test if mod_rewrite is functioning
$modRewriteAvailable = function_exists('apache_get_modules') ? in_array('mod_rewrite', apache_get_modules()) : 'unknown';

// Prepare response
$response = [
    'status' => 'success',
    'message' => 'API diagnostic completed successfully',
    'cors_status' => 'enabled',
    'timestamp' => date('c'),
    'permissions' => $permissionChecks,
    'uri_info' => $uriInfo,
    'server_config' => $serverConfig,
    'mod_rewrite_available' => $modRewriteAvailable,
    'suggested_fixes' => []
];

// Add suggested fixes based on diagnostics
if (!$permissionChecks['api_directory']['readable'] || !$permissionChecks['api_directory']['executable']) {
    $response['suggested_fixes'][] = "Fix API directory permissions with: chmod 755 " . __DIR__;
    $response['status'] = 'warning';
}

if (!$permissionChecks['admin_directory']['readable'] || !$permissionChecks['admin_directory']['executable']) {
    $response['suggested_fixes'][] = "Fix admin directory permissions with: chmod 755 " . __DIR__ . "/admin";
    $response['status'] = 'warning';
}

if (!$permissionChecks['check_api_routing']['readable']) {
    $response['suggested_fixes'][] = "Fix check-api-routing.php permissions with: chmod 644 " . __DIR__ . "/check-api-routing.php";
    $response['status'] = 'warning';
}

if ($uriInfo['has_double_api']) {
    $response['suggested_fixes'][] = "Your URL contains '/api/api/' pattern. Check .htaccess rules to remove duplicate API prefix.";
    $response['status'] = 'warning';
}

if ($modRewriteAvailable !== true && $modRewriteAvailable !== 'unknown') {
    $response['suggested_fixes'][] = "mod_rewrite module is not available or not enabled. Contact your hosting provider.";
    $response['status'] = 'warning';
}

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
