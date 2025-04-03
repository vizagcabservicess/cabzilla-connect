
<?php
// Alias for vehicle-update.php
// This file simply includes the main vehicle-update.php file for compatibility
// with different API endpoint naming conventions

// First, set all necessary CORS headers for preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS request directly here to ensure it works
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the main vehicle update file
require_once __DIR__ . '/vehicle-update.php';
