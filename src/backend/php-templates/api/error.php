
<?php
/**
 * Error handler page for API errors
 */

// Set CORS headers for error responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

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

if ($status == 404) {
    $details = "The requested API endpoint '{$path}' could not be found. Please check the URL and try again.";
} elseif ($status == 500) {
    $details = "The server encountered an internal error processing your request. This might be due to database connectivity issues or server maintenance.";
}

// Log the error
$logMessage = date('Y-m-d H:i:s') . " - Error {$status}: {$message} - " . $path;
error_log($logMessage, 3, dirname(__FILE__) . '/../logs/api-errors.log');

// Return JSON error response
echo json_encode([
    'status' => 'error',
    'code' => $status,
    'message' => "API Error: {$message}",
    'details' => $details,
    'path' => $path,
    'timestamp' => time()
]);
?>
