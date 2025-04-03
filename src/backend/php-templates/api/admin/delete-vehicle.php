
<?php
/**
 * delete-vehicle.php - Delete a vehicle
 * This endpoint ensures proper handling of vehicle IDs before proxying to direct-vehicle-delete.php
 */

// Set CORS headers - don't set Origin header
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

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
error_log("[$timestamp] delete-vehicle.php: Received $requestMethod request", 3, "$logDir/vehicle_operations.log");

// Include the direct-vehicle-delete.php file which has the full implementation
require_once(__DIR__ . '/direct-vehicle-delete.php');
?>
