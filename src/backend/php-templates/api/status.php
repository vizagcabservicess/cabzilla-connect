
<?php
/**
 * status.php - Simple API health check endpoint
 */

// Set CORS headers - don't try to set Origin header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Health-Check, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'CORS preflight successful']);
    exit;
}

// Add debug information to help diagnose routing issues
$requestInfo = [
    'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'script' => $_SERVER['SCRIPT_NAME'] ?? 'unknown',
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
];

// Simple status check - no database connection required
echo json_encode([
    'status' => 'success',
    'message' => 'API is operational',
    'timestamp' => time(),
    'version' => '1.0.5',
    'server_time' => date('Y-m-d H:i:s'),
    'server_info' => [
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'request_method' => $_SERVER['REQUEST_METHOD']
    ],
    'request_info' => $requestInfo
]);
