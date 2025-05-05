
<?php
// Simple status endpoint to check API connectivity

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Basic info about the server environment
$info = [
    'status' => 'ok',
    'message' => 'API is running',
    'timestamp' => time(),
    'datetime' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'host' => $_SERVER['HTTP_HOST'] ?? 'unknown'
];

// Return JSON response
echo json_encode($info);
exit;
