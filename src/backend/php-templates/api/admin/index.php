
<?php
/**
 * Admin endpoint for handling admin API requests
 */

// Include configuration
require_once __DIR__ . '/../../config.php';

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Return basic admin API information
echo json_encode([
    'status' => 'success',
    'message' => 'Admin API is running',
    'endpoints' => [
        'booking' => '/api/admin/booking',
        'drivers' => '/api/admin/drivers',
        'generate-invoice' => '/api/admin/generate-invoice',
        'update-booking' => '/api/admin/update-booking',
        'assign-driver' => '/api/admin/assign-driver',
        'cancel-booking' => '/api/admin/cancel-booking',
    ],
    'timestamp' => time()
]);
?>
