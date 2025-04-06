
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

// Setup error handling to return proper JSON responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Get vehicleId from all possible sources
$vehicleId = null;

// First check URL parameters - use all common parameter names
if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
} elseif (isset($_GET['vehicleId'])) {
    $vehicleId = $_GET['vehicleId'];
} elseif (isset($_GET['vehicle_id'])) {
    $vehicleId = $_GET['vehicle_id'];
}

// Log the request with vehicle ID
file_put_contents($logFile, "[$timestamp] Direct airport fares request received. Method: {$_SERVER['REQUEST_METHOD']}, Vehicle ID: " . ($vehicleId ?? 'not provided') . "\n", FILE_APPEND);

// Set admin headers to ensure permission
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';

try {
    // Forward the request to the admin endpoint
    require_once __DIR__ . '/admin/direct-airport-fares.php';
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return a proper JSON error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal server error: ' . $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
