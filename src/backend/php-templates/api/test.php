
<?php
// Simple test endpoint to verify authentication and API connectivity
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log all headers for debugging
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');

// Check for token in Authorization header
$hasAuthToken = false;
$tokenValue = '';

if (!empty($authHeader)) {
    $token = str_replace('Bearer ', '', $authHeader);
    if (!empty($token) && $token !== 'null' && $token !== 'undefined') {
        $hasAuthToken = true;
        $tokenValue = substr($token, 0, 10) . '...';
    }
}

// Return API connection status
echo json_encode([
    'status' => 'success',
    'message' => 'API connection successful',
    'timestamp' => date('Y-m-d H:i:s'),
    'auth' => [
        'hasToken' => $hasAuthToken,
        'token' => $tokenValue
    ],
    'server' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ]
]);
