
<?php
// Simplified airport fare update endpoint - redirects to consolidated direct-fare-update.php

// Set CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the request body
$requestData = file_get_contents('php://input');

// Prepend tripType=airport to the request
$_GET['tripType'] = 'airport';
$_POST['tripType'] = 'airport';

// Include the direct fare update script
include __DIR__ . '/direct-fare-update.php';
