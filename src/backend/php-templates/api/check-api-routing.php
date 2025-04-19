
<?php
/**
 * Enhanced API Routing Diagnostic Tool
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

// Log the request details with enhanced information
$logFile = $logDir . '/api_routing_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Enhanced server information
$requestInfo = [
    // Standard request info
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'undefined',
    'PATH_INFO' => $_SERVER['PATH_INFO'] ?? 'undefined',
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'undefined',
    'PHP_SELF' => $_SERVER['PHP_SELF'] ?? 'undefined',
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'undefined',
    'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'undefined',
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'undefined',
    'HTTP_REFERER' => $_SERVER['HTTP_REFERER'] ?? 'undefined',
    
    // Additional routing diagnostics
    'REDIRECT_URL' => $_SERVER['REDIRECT_URL'] ?? 'undefined',
    'REDIRECT_STATUS' => $_SERVER['REDIRECT_STATUS'] ?? 'undefined',
    'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'undefined',
    'CONTEXT_DOCUMENT_ROOT' => $_SERVER['CONTEXT_DOCUMENT_ROOT'] ?? 'undefined',
    'CONTEXT_PREFIX' => $_SERVER['CONTEXT_PREFIX'] ?? 'undefined',
    'SERVER_ADDR' => $_SERVER['SERVER_ADDR'] ?? 'undefined',
    'SERVER_NAME' => $_SERVER['SERVER_NAME'] ?? 'undefined',
    'SERVER_PORT' => $_SERVER['SERVER_PORT'] ?? 'undefined',
    'SERVER_PROTOCOL' => $_SERVER['SERVER_PROTOCOL'] ?? 'undefined',
    'SERVER_SIGNATURE' => $_SERVER['SERVER_SIGNATURE'] ?? 'undefined',
    'SERVER_SOFTWARE' => $_SERVER['SERVER_SOFTWARE'] ?? 'undefined',
    'GATEWAY_INTERFACE' => $_SERVER['GATEWAY_INTERFACE'] ?? 'undefined',
    'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? 'undefined',
    'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'] ?? 'undefined',
    'ALL_HEADERS' => getallheaders()
];

// Log the request details
file_put_contents($logFile, "[$timestamp] " . json_encode($requestInfo, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

// Parse the URL to check for routing issues
$uri = $_SERVER['REQUEST_URI'] ?? '';
$parsedUrl = parse_url($uri);
$path = $parsedUrl['path'] ?? '';

// Check for double API prefixes and other routing issues
$hasDoublePrefix = (strpos($path, '/api/api/') !== false);
$hasPrefixInWrongPlace = false;
$apiPrefixCount = substr_count($path, '/api/');

// Look for multiple /api/ patterns or incorrect placement
if ($apiPrefixCount > 1) {
    $hasPrefixInWrongPlace = true;
}

// Check for the presence of mod_rewrite and whether rules are being applied
$modRewriteEnabled = in_array('mod_rewrite', apache_get_modules());
$rewriteApplied = false;

if (isset($_SERVER['REDIRECT_URL']) && isset($_SERVER['REQUEST_URI']) && $_SERVER['REDIRECT_URL'] != $_SERVER['REQUEST_URI']) {
    $rewriteApplied = true;
}

// Advanced rule checking
$uriSegments = explode('/', trim($path, '/'));
$hasIncorrectNesting = false;
$detectedIssues = [];

if (count($uriSegments) > 1) {
    $apiCount = 0;
    foreach ($uriSegments as $segment) {
        if ($segment === 'api') {
            $apiCount++;
        }
    }
    if ($apiCount > 1) {
        $hasIncorrectNesting = true;
        $detectedIssues[] = "Multiple 'api' segments in path: $apiCount found";
    }
}

// Additional issues detection
if (!$rewriteApplied && (strpos($path, '/api/') === 0)) {
    $detectedIssues[] = "RewriteRule may not be applied correctly; mod_rewrite may be disabled or misconfigured";
}

if ($hasDoublePrefix) {
    $detectedIssues[] = "Double API prefix detected in URL (/api/api/)";
}

if ($hasPrefixInWrongPlace) {
    $detectedIssues[] = "Multiple API prefixes found in path: $apiPrefixCount instances of '/api/'";
}

if (isset($_SERVER['REDIRECT_URL']) && $_SERVER['REDIRECT_URL'] !== $_SERVER['REQUEST_URI']) {
    $detectedIssues[] = "URL rewriting is active but may be incorrectly configured. Original URL: {$_SERVER['REQUEST_URI']}, Redirected to: {$_SERVER['REDIRECT_URL']}";
}

// Prepare the response with enhanced debugging info
$response = [
    'status' => 'success',
    'message' => 'API routing diagnostic information',
    'timestamp' => time(),
    'request_info' => $requestInfo,
    'routing_analysis' => [
        'mod_rewrite_enabled' => $modRewriteEnabled,
        'has_double_prefix' => $hasDoublePrefix,
        'has_prefix_in_wrong_place' => $hasPrefixInWrongPlace,
        'api_prefix_count' => $apiPrefixCount,
        'has_incorrect_nesting' => $hasIncorrectNesting,
        'rewrite_applied' => $rewriteApplied,
        'uri_parsed' => [
            'original' => $uri,
            'path' => $path,
            'segments' => $uriSegments
        ],
        'detected_issues' => $detectedIssues
    ],
    'suggested_fixes' => []
];

// Add suggested fixes based on detected issues
if ($hasDoublePrefix || $hasPrefixInWrongPlace) {
    $response['suggested_fixes'][] = "Review .htaccess files to ensure proper redirect rules for removing duplicate '/api/' prefixes";
    $response['suggested_fixes'][] = "Consider adding RewriteRule ^api/api/(.*)$ /api/$1 [R=301,L] to root .htaccess";
}

if (!$rewriteApplied) {
    $response['suggested_fixes'][] = "Ensure mod_rewrite is enabled in Apache configuration";
    $response['suggested_fixes'][] = "Check that .htaccess files are being processed (AllowOverride needs to be set to All)";
}

// Include .htaccess files content if they exist
$response['htaccess_files'] = [];

$rootHtaccess = $_SERVER['DOCUMENT_ROOT'] . '/.htaccess';
if (file_exists($rootHtaccess)) {
    $response['htaccess_files']['root'] = file_get_contents($rootHtaccess);
}

$apiHtaccess = __DIR__ . '/.htaccess';
if (file_exists($apiHtaccess)) {
    $response['htaccess_files']['api'] = file_get_contents($apiHtaccess);
}

$adminHtaccess = __DIR__ . '/admin/.htaccess';
if (file_exists($adminHtaccess)) {
    $response['htaccess_files']['admin'] = file_get_contents($adminHtaccess);
}

// Return the response as JSON
echo json_encode($response, JSON_PRETTY_PRINT);
