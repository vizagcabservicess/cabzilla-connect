
<?php
/**
 * Direct Airport Fares API - Public facing version
 * Forwards to the admin endpoint for compatibility
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting direct-airport-fares.php to admin/direct-airport-fares.php\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);

// Get vehicle ID from URL parameters
$vehicleId = isset($_GET['id']) ? $_GET['id'] : 
            (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : 
            (isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null));

// If we have a vehicle ID from the URL, make sure it's properly passed to the admin endpoint
if ($vehicleId) {
    $_GET['id'] = $vehicleId;
    $_REQUEST['id'] = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Using vehicleId from URL: " . $vehicleId . "\n", FILE_APPEND);
}

// Forward headers to ensure admin permissions
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';

// Forward the request to the admin endpoint
require_once __DIR__ . '/admin/direct-airport-fares.php';
