
<?php
/**
 * API fallback handler for unmatched routes
 * This prevents 404 errors for misconfigured API paths
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Get the requested URI for debugging
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';

// Log the invalid API request
error_log("API fallback handler: Received {$method} request to unmatched path {$request_uri}");

// Return a 200 OK response for OPTIONS requests (CORS preflight)
if ($method === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight response'
    ]);
    exit;
}

// Return a 404 for all other requests with a helpful message
http_response_code(404);
echo json_encode([
    'status' => 'error',
    'code' => 404,
    'message' => 'API endpoint not found',
    'details' => "The requested API endpoint '{$request_uri}' does not exist or is not configured correctly.",
    'timestamp' => time()
]);

// End of file
?>
