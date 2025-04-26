
<?php
/**
 * Admin API fallback handler
 * This ensures admin API routes have a valid endpoint to respond
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Get request info
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';

// Log request for debugging
error_log("Admin API request: $method $request_uri");

// Return a 200 OK response for OPTIONS requests (CORS preflight)
if ($method === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Admin API CORS preflight response'
    ]);
    exit;
}

// For GET requests, return a basic status response
if ($method === 'GET') {
    echo json_encode([
        'status' => 'success',
        'message' => 'Admin API endpoint is active',
        'endpoint' => $request_uri,
        'timestamp' => time()
    ]);
    exit;
}

// For all other methods, return a standard response
echo json_encode([
    'status' => 'error',
    'message' => 'Unsupported method for admin API fallback',
    'method' => $method,
    'endpoint' => $request_uri,
    'timestamp' => time()
]);
?>
