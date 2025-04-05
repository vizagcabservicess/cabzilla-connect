
<?php
/**
 * Redirect to debug-login.php for signup requests
 * This ensures maximum compatibility with any potential direct calls to signup.php
 */

// Set CORS headers 
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
error_log("SIGNUP ENDPOINT: Redirecting to debug-login.php");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("URI: " . $_SERVER['REQUEST_URI']);

// Include the debug login file which will handle the request
require_once __DIR__ . '/debug-login.php';
