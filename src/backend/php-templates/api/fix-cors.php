
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

// Add special handling for dashboard/metrics API endpoints
if ((strpos($_SERVER['REQUEST_URI'], 'dashboard') !== false || 
     strpos($_SERVER['REQUEST_URI'], 'metrics') !== false) && 
    $_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // Log for debugging
    error_log("Special handling for dashboard/metrics API request: " . $_SERVER['REQUEST_URI']);
    
    // Add special header to indicate we're handling this endpoint
    header("X-API-Debug-Info: fix-cors-dashboard");
}
