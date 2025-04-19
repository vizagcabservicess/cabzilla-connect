
<?php
/**
 * Enhanced routing and connection diagnostic tool
 * This script provides detailed information about the current request
 * and server configuration to help diagnose routing issues.
 */

// Set CORS headers for all responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Log function
function logDiagnosticInfo($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_diagnostics_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= " - " . json_encode($data, JSON_UNESCAPED_SLASHES);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
}

// Get server information
$serverInfo = [
    'request' => [
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'undefined',
        'uri' => $_SERVER['REQUEST_URI'] ?? 'undefined',
        'query_string' => $_SERVER['QUERY_STRING'] ?? 'undefined',
        'path_info' => $_SERVER['PATH_INFO'] ?? 'undefined',
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'undefined',
        'php_self' => $_SERVER['PHP_SELF'] ?? 'undefined'
    ],
    'server' => [
        'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'undefined',
        'name' => $_SERVER['SERVER_NAME'] ?? 'undefined',
        'protocol' => $_SERVER['SERVER_PROTOCOL'] ?? 'undefined',
        'port' => $_SERVER['SERVER_PORT'] ?? 'undefined',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'undefined'
    ],
    'client' => [
        'address' => $_SERVER['REMOTE_ADDR'] ?? 'undefined',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'undefined',
        'accept' => $_SERVER['HTTP_ACCEPT'] ?? 'undefined'
    ],
    'routing' => [
        'redirect_url' => $_SERVER['REDIRECT_URL'] ?? 'none',
        'redirect_status' => $_SERVER['REDIRECT_STATUS'] ?? 'none',
        'https' => isset($_SERVER['HTTPS']) ? 'on' : 'off',
        'url_scheme' => isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'http'
    ],
    'php' => [
        'version' => PHP_VERSION,
        'sapi' => php_sapi_name(),
        'extensions' => get_loaded_extensions(),
        'config' => [
            'max_execution_time' => ini_get('max_execution_time'),
            'memory_limit' => ini_get('memory_limit'),
            'display_errors' => ini_get('display_errors'),
            'error_reporting' => ini_get('error_reporting')
        ]
    ],
    'apache' => [
        'modules' => function_exists('apache_get_modules') ? apache_get_modules() : ['function_not_available'],
        'mod_rewrite' => function_exists('apache_get_modules') ? in_array('mod_rewrite', apache_get_modules()) : 'unknown'
    ]
];

// Analyze URI for routing issues
$uri = $_SERVER['REQUEST_URI'] ?? '';
$uriAnalysis = [
    'original' => $uri,
    'has_double_api' => strpos($uri, '/api/api/') !== false,
    'api_prefix_count' => substr_count($uri, '/api/'),
    'segments' => explode('/', trim($uri, '/')),
    'problems' => []
];

if ($uriAnalysis['has_double_api']) {
    $uriAnalysis['problems'][] = "URL contains '/api/api/' which indicates a routing misconfiguration";
}

if ($uriAnalysis['api_prefix_count'] > 1) {
    $uriAnalysis['problems'][] = "URL contains multiple '/api/' segments which may cause routing issues";
}

// Check .htaccess files
$htaccessFiles = [
    'root' => $_SERVER['DOCUMENT_ROOT'] . '/.htaccess',
    'api' => __DIR__ . '/.htaccess',
    'admin' => __DIR__ . '/admin/.htaccess'
];

$htaccessStatus = [];
foreach ($htaccessFiles as $key => $path) {
    $htaccessStatus[$key] = [
        'exists' => file_exists($path),
        'readable' => is_readable($path),
        'size' => file_exists($path) ? filesize($path) : 0
    ];
}

// Log the diagnostics
logDiagnosticInfo("API Routing Diagnostic", [
    'uri' => $uri,
    'server' => $serverInfo['server'],
    'routing' => $serverInfo['routing'],
    'uri_analysis' => $uriAnalysis
]);

// Prepare the response
$response = [
    'status' => 'success',
    'message' => 'API Routing and Connection Diagnostic',
    'timestamp' => time(),
    'server_info' => $serverInfo,
    'uri_analysis' => $uriAnalysis,
    'htaccess_status' => $htaccessStatus,
    'suggestions' => []
];

// Add suggestions based on analysis
if ($uriAnalysis['has_double_api']) {
    $response['suggestions'][] = "Fix .htaccess files to properly handle and redirect '/api/api/' URLs";
}

if ($serverInfo['apache']['mod_rewrite'] !== true) {
    $response['suggestions'][] = "Ensure mod_rewrite is enabled on your server";
}

if (!empty($uriAnalysis['problems'])) {
    $response['suggestions'][] = "Use direct endpoint URLs without nested '/api/' segments";
}

// Return the response
echo json_encode($response, JSON_PRETTY_PRINT);
