
<?php
// Default index.php file to handle root API requests

// Set CORS headers to allow all origins and methods
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
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

// If the path is /api/login, /api/signup or similar, forward to debug-login.php
if (preg_match('/\/(api\/)?(login|signup|register)(\.php)?$/i', $_SERVER['REQUEST_URI'])) {
    // Log the forwarding
    error_log("Forwarding to debug-login.php from path: " . $_SERVER['REQUEST_URI']);
    require_once __DIR__ . '/debug-login.php';
    exit;
}

// If the path is /api/airport-fares-sync, forward to airport-fares-sync.php
if (preg_match('/\/(api\/)?(airport-fares-sync)(\.php)?$/i', $_SERVER['REQUEST_URI'])) {
    error_log("Forwarding to airport-fares-sync.php from path: " . $_SERVER['REQUEST_URI']);
    require_once __DIR__ . '/airport-fares-sync.php';
    exit;
}

// If the path is /api/direct-airport-fares, forward to direct-airport-fares.php
if (preg_match('/\/(api\/)?(direct-airport-fares)(\.php)?$/i', $_SERVER['REQUEST_URI'])) {
    error_log("Forwarding to direct-airport-fares.php from path: " . $_SERVER['REQUEST_URI']);
    require_once __DIR__ . '/direct-airport-fares.php';
    exit;
}

// Return API information
echo json_encode([
    'status' => 'success',
    'message' => 'API is running',
    'version' => '1.0.0',
    'endpoints' => [
        'login' => '/api/login.php',
        'signup' => '/api/signup.php',
        'status' => '/api/status.php',
        'admin' => '/api/admin/status.php',
        'airport-fares-sync' => '/api/airport-fares-sync.php',
        'direct-airport-fares' => '/api/direct-airport-fares.php',
    ],
    'requestDetails' => $requestData,
    'serverTime' => date('Y-m-d H:i:s'),
    'timestamp' => time()
]);
