
<?php
// Include CORS headers
require_once __DIR__ . '/../fix-cors.php';

// Return a simple JSON response with server status
$response = [
    'status' => 'ok',
    'server_time' => date('Y-m-d H:i:s'),
    'timestamp' => time(),
    'environment' => 'production',
    'api_version' => '1.0.0',
    'php_version' => PHP_VERSION
];

// Send the response
sendJsonResponse($response);
