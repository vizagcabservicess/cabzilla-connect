
<?php
/**
 * Error handler page for API errors
 */

// Set CORS headers for error responses - more comprehensive headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Get the HTTP status code
$status = $_SERVER['REDIRECT_STATUS'] ?? 500;

// Map status codes to more descriptive messages
$statusMessages = [
    400 => 'Bad Request',
    401 => 'Unauthorized',
    403 => 'Forbidden',
    404 => 'Not Found',
    405 => 'Method Not Allowed',
    408 => 'Request Timeout',
    500 => 'Internal Server Error',
    502 => 'Bad Gateway',
    503 => 'Service Unavailable',
    504 => 'Gateway Timeout'
];

// Get message for status code
$message = $statusMessages[$status] ?? 'Unknown Error';

// Add more details based on the URL
$details = "";
$path = $_SERVER['REQUEST_URI'] ?? '';
$originalUrl = $_SERVER['REDIRECT_URL'] ?? $path;

// Add debugging info to understand what's happening
$server = $_SERVER;
$requestInfo = [
    'requested_path' => $path,
    'redirect_url' => $originalUrl,
    'script_name' => $server['SCRIPT_NAME'] ?? 'unknown',
    'query_string' => $server['QUERY_STRING'] ?? '',
    'remote_addr' => $server['REMOTE_ADDR'] ?? 'unknown',
    'request_method' => $server['REQUEST_METHOD'] ?? 'unknown',
    'server_software' => $server['SERVER_SOFTWARE'] ?? 'unknown',
    'http_host' => $server['HTTP_HOST'] ?? 'unknown',
    'http_user_agent' => $server['HTTP_USER_AGENT'] ?? 'unknown'
];

if ($status == 404) {
    if (strpos($originalUrl, '/admin') === 0 || strpos($path, '/admin') === 0) {
        $details = "The requested admin endpoint '{$originalUrl}' could not be found. This might indicate a routing configuration issue between the frontend and API.";
    } else {
        $details = "The requested API endpoint '{$originalUrl}' could not be found. Please check the URL and try again.";
    }
} elseif ($status == 500) {
    $details = "The server encountered an internal error processing your request. This might be due to database connectivity issues or server maintenance.";
}

// Enhanced logging with environment info
$logMessage = date('Y-m-d H:i:s') . " - Error {$status}: {$message} - Original URL: {$originalUrl}, Request URI: {$path}, Method: {$requestInfo['request_method']}";
$logFile = dirname(__FILE__) . '/../logs/api-errors.log';

// Create logs directory if it doesn't exist
$logsDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logsDir)) {
    mkdir($logsDir, 0755, true);
}

error_log($logMessage, 3, $logFile);

// Return JSON error response
echo json_encode([
    'status' => 'error',
    'code' => $status,
    'message' => "API Error: {$message}",
    'details' => $details,
    'path' => $originalUrl,
    'requestUri' => $path,
    'requestInfo' => $requestInfo,
    'timestamp' => time()
]);
?>
