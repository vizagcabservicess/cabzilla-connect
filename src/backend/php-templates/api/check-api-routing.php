
<?php
/**
 * API Routing Diagnostic Tool
 * This script helps diagnose API routing issues by showing detailed information
 * about the current request path and server configuration.
 */

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Log the request details
$logFile = $logDir . '/api_routing_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
$requestInfo = [
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'undefined',
    'PATH_INFO' => $_SERVER['PATH_INFO'] ?? 'undefined',
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'undefined',
    'PHP_SELF' => $_SERVER['PHP_SELF'] ?? 'undefined',
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'undefined',
    'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'undefined',
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'undefined',
    'HTTP_REFERER' => $_SERVER['HTTP_REFERER'] ?? 'undefined',
    'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? 'undefined',
    'SERVER_SOFTWARE' => $_SERVER['SERVER_SOFTWARE'] ?? 'undefined',
    'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'] ?? 'undefined',
    'ALL_HEADERS' => getallheaders()
];

// Log the request details
file_put_contents($logFile, "[$timestamp] " . json_encode($requestInfo, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

// Check for double API prefixes
$uri = $_SERVER['REQUEST_URI'] ?? '';
$hasDoublePrefix = (strpos($uri, '/api/api/') !== false);
$hasPrefixInWrongPlace = false;

// Look for /api/ pattern that's not at the beginning
if (strpos($uri, '/api/') !== false && strpos($uri, '/api/') !== 0) {
    $hasPrefixInWrongPlace = true;
}

// Check for RewriteRule application
$rewriteApplied = false;
if (isset($_SERVER['REDIRECT_URL']) && $_SERVER['REDIRECT_URL'] != $_SERVER['REQUEST_URI']) {
    $rewriteApplied = true;
}

// Prepare the response
$response = [
    'status' => 'success',
    'message' => 'API routing diagnostic information',
    'timestamp' => time(),
    'request_info' => $requestInfo,
    'routing_analysis' => [
        'has_double_prefix' => $hasDoublePrefix,
        'has_prefix_in_wrong_place' => $hasPrefixInWrongPlace,
        'rewrite_applied' => $rewriteApplied,
        'detected_issues' => []
    ]
];

// Add detected issues
if ($hasDoublePrefix) {
    $response['routing_analysis']['detected_issues'][] = 'Double API prefix detected in URL (/api/api/)';
}

if ($hasPrefixInWrongPlace) {
    $response['routing_analysis']['detected_issues'][] = 'API prefix found in incorrect position';
}

if (!$rewriteApplied && (strpos($uri, '/api/') === 0)) {
    $response['routing_analysis']['detected_issues'][] = 'RewriteRule may not be applied correctly';
}

// Include .htaccess files content if they exist
$response['htaccess_files'] = [];

$rootHtaccess = __DIR__ . '/../.htaccess';
if (file_exists($rootHtaccess)) {
    $response['htaccess_files']['root'] = file_get_contents($rootHtaccess);
}

$apiHtaccess = __DIR__ . '/.htaccess';
if (file_exists($apiHtaccess)) {
    $response['htaccess_files']['api'] = file_get_contents($apiHtaccess);
}

// Return the response as JSON
echo json_encode($response, JSON_PRETTY_PRINT);
