
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

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the direct-vehicle-delete.php file which has the full implementation
require_once(__DIR__ . '/direct-vehicle-delete.php');
?>
