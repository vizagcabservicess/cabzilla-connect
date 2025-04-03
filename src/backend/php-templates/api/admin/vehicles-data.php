
<?php
/**
 * Admin-specific vehicle data endpoint
 * This provides extended vehicle information for admin interfaces
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Process GET parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;

// Log request for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/admin_vehicles_data_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Admin vehicles data request: includeInactive=$includeInactive, forceRefresh=$forceRefresh" . ($vehicleId ? ", vehicleId=$vehicleId" : "") . "\n", FILE_APPEND);

// This endpoint should return the same data as the main vehicles-data.php
// but with admin-specific fields included
require_once __DIR__ . '/../vehicles-data.php';
