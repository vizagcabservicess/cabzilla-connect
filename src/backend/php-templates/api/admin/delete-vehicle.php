
<?php
/**
 * delete-vehicle.php - Delete a vehicle
 * This is a simple proxy to direct-vehicle-delete.php
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

// Log the incoming request
error_log("Delete vehicle request received: " . $_SERVER['REQUEST_METHOD']);
error_log("Request URI: " . $_SERVER['REQUEST_URI']);
error_log("Request body: " . file_get_contents('php://input'));

// Include the direct-vehicle-delete.php file which has the full implementation
require_once(__DIR__ . '/direct-vehicle-delete.php');
?>
