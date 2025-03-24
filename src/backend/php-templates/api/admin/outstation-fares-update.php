
<?php
// outstation-fares-update.php - Dedicated endpoint for updating outstation fares
// This is now a simple redirector to direct-outstation-fares.php

// Include configuration file
require_once __DIR__ . '/../config.php';

// Set CORS headers
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

// Log incoming request and redirect
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Redirecting outstation fares update: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// Get data from request
$rawInput = file_get_contents('php://input');
error_log("Outstation fare update raw input: " . $rawInput);

// Pass along to direct-outstation-fares.php using include
include_once __DIR__ . '/direct-outstation-fares.php';
?>
