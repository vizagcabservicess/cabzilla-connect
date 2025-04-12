
<?php
// Set proper CORS headers for all API endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Cache-Control, Pragma, Expires');
header('Access-Control-Max-Age: 86400'); // 24 hours
header('Content-Type: application/json');

// Ultra aggressive cache control to prevent browser caching for admin endpoints
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Log the request for debugging
error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// For 405 error responses (Method Not Allowed)
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Helper function for sending JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    // Make sure we don't have any output before this
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set proper status code
    http_response_code($statusCode);
    
    // Log response for debugging
    error_log("Sending JSON response: " . json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR));
    
    // Send JSON response
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Ensure clean output buffer
if (ob_get_level()) {
    ob_end_clean();
}

// Start a new output buffer to catch any accidental output
ob_start();

// Register shutdown function to ensure proper JSON response
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // Clean any output that might have been generated
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        // Send proper error response
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'PHP Fatal Error: ' . $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ]);
    }
});
