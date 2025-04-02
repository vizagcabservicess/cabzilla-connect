
<?php
/**
 * Error handler page for API errors
 */

// Set CORS headers for error responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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

// Log the error
$logMessage = date('Y-m-d H:i:s') . " - Error {$status}: {$message} - " . $_SERVER['REQUEST_URI'];
error_log($logMessage, 3, dirname(__FILE__) . '/../logs/api-errors.log');

// Return JSON error response
echo json_encode([
    'status' => 'error',
    'code' => $status,
    'message' => "API Error: {$message}",
    'path' => $_SERVER['REQUEST_URI'],
    'timestamp' => time()
]);
?>
