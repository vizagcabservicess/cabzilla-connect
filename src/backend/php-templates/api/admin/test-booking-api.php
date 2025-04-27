
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Test connectivity and configuration
echo json_encode([
    'status' => 'success',
    'message' => 'API test endpoint is working correctly',
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown'
    ],
    'endpoints' => [
        'bookings' => '/api/admin/booking',
        'drivers' => '/api/admin/drivers',
        'get_drivers' => '/api/admin/get-drivers'
    ]
]);
