
<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS - FIX: Set these headers consistently
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable verbose error reporting for debug
ini_set('display_errors', 0); // CRITICAL FIX: Disable PHP error output in response
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
// CRITICAL FIX: Make sure we capture and handle any output or errors
try {
    // Capture raw post data
    $rawInput = file_get_contents('php://input');
    logMessage("Forwarding to admin/direct-local-fares.php with data: " . $rawInput);
    
    // Start output buffering to capture any PHP errors or warnings
    ob_start();
    
    // Include the admin endpoint directly
    require_once __DIR__ . '/admin/direct-local-fares.php';
    
    // Get any output and clear the buffer
    $output = ob_get_clean();
    
    // If there was unexpected output before JSON, log it and filter it out
    if ($output && strpos($output, '{') !== 0) {
        $jsonStart = strpos($output, '{');
        if ($jsonStart !== false) {
            $errorContent = substr($output, 0, $jsonStart);
            logMessage("WARNING: Unexpected output before JSON: " . $errorContent);
            $output = substr($output, $jsonStart);
        }
    }
    
    // Check if output is valid JSON
    $decodedOutput = json_decode($output, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage("ERROR: Invalid JSON response: " . $output);
        logMessage("JSON error: " . json_last_error_msg());
        throw new Exception("Invalid JSON response from admin endpoint");
    }
    
    // If we got a valid JSON response, send it directly
    echo $output;
    
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
