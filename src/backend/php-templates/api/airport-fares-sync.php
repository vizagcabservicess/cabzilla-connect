
<?php
/**
 * Airport Fares Sync API - Public facing version
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

$logFile = $logDir . '/airport_fares_sync_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the redirect for debugging
file_put_contents($logFile, "[$timestamp] Redirecting airport-fares-sync.php to admin/sync-airport-fares.php\n", FILE_APPEND);

// Get input data
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Forward the input data
$_POST = $input ?: [];

// Forward headers to ensure admin permissions
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';

// Forward the request to the admin endpoint
require_once __DIR__ . '/admin/sync-airport-fares.php';
