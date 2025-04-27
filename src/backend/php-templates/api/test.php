
<?php
// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store, no-cache, must-revalidate');

// Generate simple response
$response = [
    'status' => 'success',
    'message' => 'API is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'environment' => 'production'
];

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
