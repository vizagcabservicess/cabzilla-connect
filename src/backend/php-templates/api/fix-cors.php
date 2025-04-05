
<?php
/**
 * fix-cors.php - Set proper CORS headers for preflight and test connectivity
 */

// Set HTTP 200 OK status immediately
http_response_code(200);

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'unknown',
        'timestamp' => time()
    ]);
    exit;
}

// Return CORS status and echo back any query parameters
$params = [];
if (!empty($_GET)) {
    $params['get'] = $_GET;
}

if (!empty($_POST)) {
    $params['post'] = $_POST;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonData = file_get_contents('php://input');
    if ($jsonData) {
        try {
            $params['json'] = json_decode($jsonData, true);
        } catch (Exception $e) {
            $params['raw_input'] = substr($jsonData, 0, 500);
        }
    }
}

echo json_encode([
    'status' => 'success',
    'message' => 'CORS is properly configured',
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'params' => $params,
    'timestamp' => time()
]);
