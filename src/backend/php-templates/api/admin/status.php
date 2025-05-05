
<?php
// This file provides a simple status check endpoint to verify API connectivity

// Set headers to ensure JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Basic status information
$statusInfo = [
    'status' => 'operational',
    'server_time' => date('Y-m-d H:i:s'),
    'timestamp' => time(),
    'environment' => getenv('APP_ENV') ?: 'production',
    'api_version' => '1.0',
    'message' => 'API is functioning properly'
];

// Add PHP version information
$statusInfo['php_version'] = phpversion();

// Check if we can connect to the database
try {
    // Include the database helper if available
    if (file_exists(__DIR__ . '/../common/db_helper.php')) {
        require_once __DIR__ . '/../common/db_helper.php';
        
        if (function_exists('getDbConnectionWithRetry')) {
            $conn = getDbConnectionWithRetry(1);
        } else if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
        } else {
            throw new Exception("Database helper functions not available");
        }
        
        if ($conn) {
            $result = $conn->query("SELECT 1");
            $statusInfo['database'] = 'connected';
            $conn->close();
        } else {
            $statusInfo['database'] = 'connection_failed';
        }
    } else {
        $statusInfo['database'] = 'helper_not_found';
    }
} catch (Exception $e) {
    $statusInfo['database'] = 'error';
    $statusInfo['database_error'] = $e->getMessage();
}

// Check memory usage
$statusInfo['memory_usage'] = [
    'current' => memory_get_usage(true),
    'peak' => memory_get_peak_usage(true)
];

// Return the status information
echo json_encode($statusInfo);
