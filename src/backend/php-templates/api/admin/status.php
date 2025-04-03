
<?php
// status.php - A simple endpoint to check API status with database connectivity test

// Set CORS headers to allow requests from anywhere
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit();
}

// Set content type
header('Content-Type: application/json');

// Include database helper if available
$dbConnection = null;
$dbStatus = 'unknown';
$dbMessage = '';
$vehicleCount = 0;

if (file_exists(dirname(__FILE__) . '/../common/db_helper.php')) {
    require_once(dirname(__FILE__) . '/../common/db_helper.php');
    try {
        $dbResult = checkDatabaseConnection();
        $dbStatus = $dbResult['status'];
        $dbMessage = $dbResult['message'] ?? '';
        if (isset($dbResult['tables']['vehicles']['count'])) {
            $vehicleCount = $dbResult['tables']['vehicles']['count'];
        }
    } catch (Exception $e) {
        $dbStatus = 'error';
        $dbMessage = $e->getMessage();
    }
}

// Basic API status response
$response = [
    'status' => 'success',
    'message' => 'API is operational',
    'timestamp' => time(),
    'server_time' => date('Y-m-d H:i:s'),
    'database' => [
        'status' => $dbStatus,
        'message' => $dbMessage,
        'vehicle_count' => $vehicleCount
    ],
    'server_info' => [
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'hostname' => gethostname(),
        'domain' => $_SERVER['HTTP_HOST'] ?? 'Unknown'
    ]
];

// Output as JSON
echo json_encode($response);
