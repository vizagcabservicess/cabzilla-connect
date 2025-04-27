
<?php
/**
 * Central error handling script for API requests
 */

// Set CORS headers for error responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

// Log all error requests
$requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
$method = $_SERVER['REQUEST_METHOD'] ?? 'unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$timestamp = date('Y-m-d H:i:s');
$logEntry = "[$timestamp] Error Request: $method $requestUri | User-Agent: $userAgent\n";
$logFile = __DIR__ . '/../logs/api-error-requests.log';
file_put_contents($logFile, $logEntry, FILE_APPEND);

// Parse requested path
$path = explode('?', $requestUri)[0];
$pathParts = explode('/', trim($path, '/'));

// Determine if this is an admin or user API request
$isAdminRequest = false;
$apiType = '';
if (count($pathParts) >= 2) {
    if ($pathParts[0] === 'api' && $pathParts[1] === 'admin') {
        $isAdminRequest = true;
        $apiType = 'admin';
    } else if ($pathParts[0] === 'api' && $pathParts[1] === 'user') {
        $apiType = 'user';
    }
}

// Check for specific API types
if ($isAdminRequest) {
    // Special handling for admin/bookings endpoint
    if (strpos($path, 'api/admin/bookings') !== false) {
        // Redirect to the fix-bookings-api.php script
        http_response_code(307); // Temporary redirect
        header('Location: /api/admin/fix-bookings-api.php');
        exit;
    }
    
    // Special handling for admin/drivers endpoint
    if (strpos($path, 'api/admin/drivers') !== false) {
        // Redirect to the get-drivers.php script
        http_response_code(307); // Temporary redirect
        header('Location: /api/admin/get-drivers.php');
        exit;
    }
}

// If we get here, provide a generic API error response
echo json_encode([
    'status' => 'error',
    'code' => 404,
    'message' => 'API Error: Not Found',
    'details' => "The requested API endpoint '$path' could not be found. Please check the URL and try again.",
    'path' => $path,
    'requestType' => $isAdminRequest ? 'admin' : 'user',
    'timestamp' => time()
]);
