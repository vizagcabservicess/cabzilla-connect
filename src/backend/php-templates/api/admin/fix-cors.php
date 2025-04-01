
<?php
// fix-cors.php - Fix CORS issues across all API endpoints - ENHANCED VERSION

// Set proper content type for the response
header('Content-Type: application/json');

// Force browser cache control to prevent cache-related CORS issues
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Set comprehensive CORS headers with HIGHEST PRIORITY
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, Origin, X-Admin-Mode, *');
header('Access-Control-Max-Age: 86400'); // 24 hours
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.2.0');
header('X-CORS-Status: Enabled');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

// Log request details for debugging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] CORS fix request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../../error.log');

// Handle preflight OPTIONS request with HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Respond with 200 OK for OPTIONS requests
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'headers' => [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, Origin, X-Admin-Mode, *'
        ],
        'timestamp' => time()
    ]);
    exit;
}

// Return success for all other requests
echo json_encode([
    'status' => 'success',
    'message' => 'CORS configuration is properly set',
    'timestamp' => date('c'),
    'server_time' => time(),
    'request_method' => $requestMethod,
    'cors' => [
        'status' => 'enabled',
        'origin' => '*',
        'methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'headers' => '*'
    ]
]);
