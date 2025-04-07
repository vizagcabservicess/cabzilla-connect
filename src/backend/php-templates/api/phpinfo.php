
<?php
// Set JSON headers for API consistency
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Return basic PHP diagnostic info as JSON
echo json_encode([
    'status' => 'success',
    'message' => 'PHP is executing properly',
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'request_time' => date('Y-m-d H:i:s'),
    'api_path' => __FILE__
]);
