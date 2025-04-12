
<?php
// status.php - A simple endpoint to check API status

// Set CORS headers to allow requests from anywhere
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');

// Handle OPTIONS preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit();
}

// Set content type
header('Content-Type: application/json');

// Basic API status response
$response = [
    'status' => 'success',
    'message' => 'API is operational',
    'timestamp' => time(),
    'server_time' => date('Y-m-d H:i:s'),
    'server_info' => [
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'request_method' => $_SERVER['REQUEST_METHOD']
    ]
];

// Output as JSON
echo json_encode($response);
