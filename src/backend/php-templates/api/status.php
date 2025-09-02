
<?php
// Simple status endpoint to check API connectivity

// Set response headers
header('Content-Type: application/json');
// SECURITY: Restrict CORS to trusted domains only
$allowedOrigins = ['https://vizagtaxihub.com', 'https://www.vizagtaxihub.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://vizagtaxihub.com');
}
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
