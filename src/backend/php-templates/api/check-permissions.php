
<?php
/**
 * API Directory and File Permissions Check
 * Helps identify permission issues that could be preventing API access
 */

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Force HTTP 200 status
http_response_code(200);

// Helper function to check directory permissions recursively
function checkDirectoryPermissions($dir, $depth = 0, $maxDepth = 3) {
    if ($depth >= $maxDepth || !file_exists($dir) || !is_dir($dir)) {
        return null;
    }
    
    $info = [
        'path' => $dir,
        'readable' => is_readable($dir),
        'writable' => is_writable($dir),
        'executable' => is_executable($dir),
        'permissions' => substr(sprintf('%o', fileperms($dir)), -4),
        'owner' => function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($dir))['name'] : 'unknown',
        'group' => function_exists('posix_getgrgid') ? posix_getgrgid(filegroup($dir))['name'] : 'unknown',
        'children' => []
    ];
    
    if ($info['readable'] && $depth < $maxDepth) {
        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                $path = $dir . '/' . $file;
                if (is_dir($path)) {
                    $childInfo = checkDirectoryPermissions($path, $depth + 1, $maxDepth);
                    if ($childInfo) {
                        $info['children'][] = $childInfo;
                    }
                } else if (is_file($path) && pathinfo($path, PATHINFO_EXTENSION) === 'php') {
                    $info['children'][] = [
                        'path' => $path,
                        'readable' => is_readable($path),
                        'writable' => is_writable($path),
                        'executable' => is_executable($path),
                        'permissions' => substr(sprintf('%o', fileperms($path)), -4),
                        'owner' => function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($path))['name'] : 'unknown',
                        'group' => function_exists('posix_getgrgid') ? posix_getgrgid(filegroup($path))['name'] : 'unknown'
                    ];
                }
            }
        }
    }
    
    return $info;
}

// Get server information
$serverInfo = [
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'php_version' => PHP_VERSION,
    'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
    'current_script' => __FILE__,
    'current_user' => function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : 'unknown',
    'current_group' => function_exists('posix_getgrgid') ? posix_getgrgid(posix_getegid())['name'] : 'unknown'
];

// Check important API directories
$apiRoot = __DIR__;
$adminDir = __DIR__ . '/admin';
$userDir = __DIR__ . '/user';

$directoryChecks = [
    'api_root' => checkDirectoryPermissions($apiRoot, 0, 1),
    'admin_dir' => checkDirectoryPermissions($adminDir, 0, 1),
    'user_dir' => checkDirectoryPermissions($userDir, 0, 1)
];

// Check specific critical files
$criticalFiles = [
    'check_api_routing' => __DIR__ . '/check-api-routing.php',
    'fix_cors' => __DIR__ . '/fix-cors.php',
    'book' => __DIR__ . '/book.php',
    'admin_booking' => __DIR__ . '/admin/booking.php',
    'error_php' => __DIR__ . '/error.php'
];

$fileChecks = [];
foreach ($criticalFiles as $key => $path) {
    $fileChecks[$key] = [
        'path' => $path,
        'exists' => file_exists($path),
        'readable' => file_exists($path) && is_readable($path),
        'writable' => file_exists($path) && is_writable($path),
        'executable' => file_exists($path) && is_executable($path),
        'permissions' => file_exists($path) ? substr(sprintf('%o', fileperms($path)), -4) : 'file_missing',
        'owner' => file_exists($path) && function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($path))['name'] : 'unknown',
        'group' => file_exists($path) && function_exists('posix_getgrgid') ? posix_getgrgid(filegroup($path))['name'] : 'unknown'
    ];
}

// Check htaccess files
$htaccessFiles = [
    'api_htaccess' => __DIR__ . '/.htaccess',
    'admin_htaccess' => __DIR__ . '/admin/.htaccess',
    'root_htaccess' => $_SERVER['DOCUMENT_ROOT'] . '/.htaccess'
];

$htaccessChecks = [];
foreach ($htaccessFiles as $key => $path) {
    $htaccessChecks[$key] = [
        'path' => $path,
        'exists' => file_exists($path),
        'readable' => file_exists($path) && is_readable($path),
        'writable' => file_exists($path) && is_writable($path),
        'permissions' => file_exists($path) ? substr(sprintf('%o', fileperms($path)), -4) : 'file_missing',
        'owner' => file_exists($path) && function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($path))['name'] : 'unknown',
        'group' => file_exists($path) && function_exists('posix_getgrgid') ? posix_getgrgid(filegroup($path))['name'] : 'unknown',
        'content' => file_exists($path) && is_readable($path) ? file_get_contents($path) : 'unavailable'
    ];
}

// Identify problems
$problems = [];
$suggestions = [];

// Check API directory permissions
if (!$directoryChecks['api_root']['readable'] || !$directoryChecks['api_root']['executable']) {
    $problems[] = "API directory is not readable or executable. Current permissions: " . $directoryChecks['api_root']['permissions'];
    $suggestions[] = "Set API directory permissions to 755: chmod 755 " . $apiRoot;
}

// Check Admin directory permissions
if (isset($directoryChecks['admin_dir']) && (!$directoryChecks['admin_dir']['readable'] || !$directoryChecks['admin_dir']['executable'])) {
    $problems[] = "Admin directory is not readable or executable. Current permissions: " . $directoryChecks['admin_dir']['permissions'];
    $suggestions[] = "Set Admin directory permissions to 755: chmod 755 " . $adminDir;
}

// Check file permissions for critical files
foreach ($fileChecks as $key => $check) {
    if (!$check['exists']) {
        $problems[] = "Critical file missing: " . $check['path'];
    } elseif (!$check['readable']) {
        $problems[] = "Critical file not readable: " . $check['path'];
        $suggestions[] = "Set file permissions to 644: chmod 644 " . $check['path'];
    }
}

// Prepare response
$response = [
    'status' => empty($problems) ? 'success' : 'warning',
    'message' => empty($problems) ? 'All permissions appear to be correctly set' : 'Permission issues detected',
    'timestamp' => time(),
    'server_info' => $serverInfo,
    'directory_checks' => $directoryChecks,
    'file_checks' => $fileChecks,
    'htaccess_checks' => $htaccessChecks,
    'problems' => $problems,
    'suggestions' => $suggestions
];

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
