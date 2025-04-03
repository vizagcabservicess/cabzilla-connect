
<?php
/**
 * vehicle-create.php - Create a new vehicle proxy script
 * 
 * This file acts as a proxy to direct-vehicle-create.php
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
error_log('Vehicle create proxy accessed. Method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Request body: ' . file_get_contents('php://input'));

// Include the direct-vehicle-create.php file which has the full implementation
require_once(__DIR__ . '/direct-vehicle-create.php');
?>
