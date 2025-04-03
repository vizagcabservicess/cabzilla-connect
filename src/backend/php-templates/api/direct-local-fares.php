
<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable verbose error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-local-fares.log');
}

// Log basic request information
logMessage("Request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);
logMessage("Raw input: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response data
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'debug' => []
];

// Forward request to the admin endpoint
// CRITICAL FIX: Don't use header redirect, manually include the file
// This prevents headers from being sent twice and response corruption
try {
    // Capture raw post data
    $rawInput = file_get_contents('php://input');
    logMessage("Forwarding to admin/direct-local-fares.php with data: " . $rawInput);
    
    // Include the admin endpoint directly
    require_once __DIR__ . '/admin/direct-local-fares.php';
    // The admin endpoint will handle sending the response
    exit;
} catch (Exception $e) {
    logMessage("Error forwarding request: " . $e->getMessage());
    $response = [
        'status' => 'error',
        'message' => 'Failed to process request: ' . $e->getMessage(),
        'timestamp' => time()
    ];
    echo json_encode($response);
    exit;
}
