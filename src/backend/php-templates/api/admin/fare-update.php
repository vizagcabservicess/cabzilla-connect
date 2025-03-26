
<?php
// fare-update.php - Universal endpoint for all fare updates

// Include any necessary configs
require_once __DIR__ . '/../../config.php';

// Set headers to prevent caching
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the incoming request
$timestamp = date('Y-m-d H:i:s');
$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$raw_input = file_get_contents('php://input');

error_log("[$timestamp] FARE UPDATE REQUEST: $request_method $request_uri\n", 3, __DIR__ . '/../logs/fare-updates.log');
error_log("Raw input: $raw_input\n", 3, __DIR__ . '/../logs/fare-updates.log');

// Redirect all fare updates to direct-fare-update.php which has robust database handling
require_once __DIR__ . '/direct-fare-update.php';
