
<?php
// Simple test endpoint for debugging API connectivity

// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// For preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request data
error_log("API test.php endpoint called: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
error_log("Request headers: " . json_encode(getallheaders()));

// Get token if present
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    error_log("Token received: " . (strlen($token) > 0 ? substr($token, 0, 15) . '...' : 'empty token'));
} else {
    error_log("No Authorization header found");
}

// Return a success response with diagnostic info
echo json_encode([
    'status' => 'success',
    'message' => 'API test endpoint is working',
    'timestamp' => time(),
    'has_token' => !empty($token),
    'server_info' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'request_time' => date('Y-m-d H:i:s'),
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]
]);
