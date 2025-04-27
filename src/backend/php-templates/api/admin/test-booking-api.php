
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Clear any buffer
if (ob_get_level()) ob_end_clean();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Time execution
$startTime = microtime(true);

// Generate response data
$response = [
    'status' => 'success',
    'message' => 'API is operational',
    'timestamp' => date('Y-m-d H:i:s'),
    'server_time' => time(),
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getRequestHeaders(),
    'php_version' => phpversion(),
    'database_test' => testDatabaseConnection(),
    'execution_time' => 0 // Will be updated
];

// Test database connection
function testDatabaseConnection() {
    try {
        $conn = getDbConnection();
        if ($conn && $conn->ping()) {
            $tables = [];
            $result = $conn->query("SHOW TABLES");
            while ($row = $result->fetch_array()) {
                $tables[] = $row[0];
            }
            $conn->close();
            return [
                'status' => 'connected',
                'tables_found' => count($tables),
                'tables' => $tables
            ];
        } else {
            return [
                'status' => 'error',
                'message' => 'Could not establish database connection'
            ];
        }
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// Get request headers
function getRequestHeaders() {
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (substr($key, 0, 5) === 'HTTP_') {
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
            $headers[$header] = $value;
        }
    }
    return $headers;
}

// Calculate execution time
$response['execution_time'] = microtime(true) - $startTime;

// Return response
echo json_encode($response, JSON_PRETTY_PRINT);
exit;
