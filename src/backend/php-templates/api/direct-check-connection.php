
<?php
/**
 * Direct connection diagnostic tool for API
 * This script provides immediate feedback on API connectivity and permissions
 */

// Set headers for CORS and JSON output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get basic server and request info
$serverInfo = [
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
];

// Check permissions for API directories
$dirPermissions = [
    'api_dir' => is_readable(__DIR__) ? 'readable' : 'not readable',
    'admin_dir' => is_readable(__DIR__ . '/admin') ? 'readable' : 'not readable',
    'root_dir' => is_readable($_SERVER['DOCUMENT_ROOT']) ? 'readable' : 'not readable',
];

// Check for critical API files
$apiFiles = [
    'check_api_routing' => file_exists(__DIR__ . '/check-api-routing.php') ? 'exists' : 'missing',
    'fix_cors' => file_exists(__DIR__ . '/fix-cors.php') ? 'exists' : 'missing',
    'book' => file_exists(__DIR__ . '/book.php') ? 'exists' : 'missing',
    'admin_booking' => file_exists(__DIR__ . '/admin/booking.php') ? 'exists' : 'missing',
    'admin_test_booking' => file_exists(__DIR__ . '/admin/test-booking-api.php') ? 'exists' : 'missing',
];

// Construct response
$response = [
    'status' => 'success',
    'message' => 'Direct API connection successful',
    'timestamp' => time(),
    'server_info' => $serverInfo,
    'directory_permissions' => $dirPermissions,
    'api_files' => $apiFiles,
    'php_version' => PHP_VERSION,
    'php_sapi' => php_sapi_name(),
    'current_file' => __FILE__,
    'suggestions' => []
];

// Add suggestions based on diagnostics
if ($dirPermissions['api_dir'] !== 'readable' || $dirPermissions['admin_dir'] !== 'readable') {
    $response['suggestions'][] = "Fix directory permissions for API folders. Use 'chmod 755' on the API directories.";
}

if (in_array('missing', $apiFiles)) {
    $response['suggestions'][] = "One or more critical API files are missing. Check your installation.";
}

// Check if we have permission errors
$hasPermissionIssue = false;
foreach ($dirPermissions as $dir => $status) {
    if ($status !== 'readable') {
        $hasPermissionIssue = true;
        break;
    }
}

if ($hasPermissionIssue) {
    $response['warnings'] = "Directory permission issues detected. The web server may not have sufficient access to API directories.";
    $response['status'] = 'warning';
}

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
