
<?php
// Simple test endpoint to verify authentication and API connectivity
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Cache-Control, Pragma');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the test request for debugging
error_log("API test.php endpoint accessed: " . date('Y-m-d H:i:s'));

// Log all headers for debugging
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');

// Check for token in Authorization header
$hasAuthToken = false;
$tokenValue = '';
$tokenData = null;

if (!empty($authHeader)) {
    $token = str_replace('Bearer ', '', $authHeader);
    if (!empty($token) && $token !== 'null' && $token !== 'undefined') {
        $hasAuthToken = true;
        $tokenValue = substr($token, 0, 15) . '...'; // Truncate token for security in logs
        
        // Try to decode token (if it's a base64 encoded JSON)
        try {
            $decodedToken = base64_decode($token);
            if ($decodedToken) {
                $tokenObject = json_decode($decodedToken, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $tokenData = [
                        'sub' => $tokenObject['sub'] ?? 'unknown',
                        'role' => $tokenObject['role'] ?? 'unknown',
                        'exp' => $tokenObject['exp'] ?? 0
                    ];
                }
            }
        } catch (Exception $e) {
            // Silently fail - not critical
            error_log("Token decode error: " . $e->getMessage());
        }
    }
}

// Get token from localStorage (for debugging purposes)
$localStorageCheckScript = "<script>
    document.addEventListener('DOMContentLoaded', function() {
        var token = localStorage.getItem('authToken');
        var user = localStorage.getItem('user');
        var div = document.createElement('div');
        div.innerHTML = 'localStorage authToken: ' + (token ? 'present' : 'missing') + '<br>';
        div.innerHTML += 'localStorage user: ' + (user ? 'present' : 'missing');
        document.body.appendChild(div);
    });
</script>";

// Check PHP Configuration
$phpConfig = [
    'version' => PHP_VERSION,
    'display_errors' => ini_get('display_errors'),
    'error_reporting' => ini_get('error_reporting'),
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size')
];

// Return API connection status with detailed auth info
echo json_encode([
    'status' => 'success',
    'message' => 'API connection successful',
    'timestamp' => date('Y-m-d H:i:s'),
    'auth' => [
        'hasToken' => $hasAuthToken,
        'token' => $tokenValue ? "Valid (length: " . strlen($token) . ")" : "Missing",
        'headers' => array_keys($headers),
        'authHeader' => $authHeader ? 'present' : 'missing',
        'tokenData' => $tokenData
    ],
    'debug' => [
        'check_localStorage' => $localStorageCheckScript,
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'request_uri' => $_SERVER['REQUEST_URI'],
        'php_config' => $phpConfig
    ],
    'server' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]
]);
