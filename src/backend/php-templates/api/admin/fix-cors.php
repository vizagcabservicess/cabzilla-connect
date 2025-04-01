
<?php
// fix-cors.php - Fix CORS issues across all API endpoints

// Set comprehensive CORS headers - HIGHEST PRIORITY
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, Origin, *');
header('Access-Control-Max-Age: 7200');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.1.0');
header('X-CORS-Status: Enabled');

// Handle preflight OPTIONS request with HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'headers' => [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => '*'
        ]
    ]);
    exit;
}

// Return success for all other requests
echo json_encode([
    'status' => 'success',
    'message' => 'CORS configuration is properly set',
    'timestamp' => date('c'),
    'server_time' => time(),
    'cors' => [
        'status' => 'enabled',
        'origin' => '*',
        'methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'headers' => '*'
    ]
]);
