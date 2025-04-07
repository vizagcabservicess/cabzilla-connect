
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
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Get input data
$inputJSON = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: $inputJSON\n", FILE_APPEND);

$input = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    // Try to handle invalid JSON
    file_put_contents($logFile, "[$timestamp] WARNING: Invalid JSON input: " . json_last_error_msg() . "\n", FILE_APPEND);
    $input = [];
}

// Create a standardized data structure that will work with the admin endpoint
$synData = [
    'applyDefaults' => true,
    'forceRefresh' => true
];

// Override with any incoming parameters if they exist
if (is_array($input)) {
    if (isset($input['applyDefaults'])) {
        $synData['applyDefaults'] = $input['applyDefaults'];
    }
    if (isset($input['forceRefresh'])) {
        $synData['forceRefresh'] = $input['forceRefresh'];
    }
}

// Pass it via POST data
$_POST = $synData;

// Also set it as $_REQUEST for legacy compatibility
$_REQUEST = array_merge($_REQUEST ?? [], $synData);

// Forward headers to ensure admin permissions
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';
$_SERVER['HTTP_X_DEBUG'] = 'true';

file_put_contents($logFile, "[$timestamp] Forwarding with data: " . json_encode($synData) . "\n", FILE_APPEND);

// Forward the request to the admin endpoint
require_once __DIR__ . '/admin/sync-airport-fares.php';
