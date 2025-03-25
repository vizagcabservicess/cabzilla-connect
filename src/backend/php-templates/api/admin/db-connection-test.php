
<?php
// Simple endpoint to test database connection
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Database credentials to try
$dbCredentials = [
    // Primary credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_new_bookingdb'
    ],
    // Alternative credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_bookingdb'
    ]
];

// Try to include config files
$configFiles = [
    __DIR__ . '/../../config.php',
    __DIR__ . '/../../../config.php',
    __DIR__ . '/../../../../config.php'
];

$configLoaded = false;
foreach ($configFiles as $file) {
    if (file_exists($file)) {
        include_once $file;
        $configLoaded = true;
        break;
    }
}

$results = [
    'status' => 'testing',
    'configLoaded' => $configLoaded,
    'timestamp' => date('Y-m-d H:i:s'),
    'connections' => []
];

// Test connection using constants (if they exist)
if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS')) {
    try {
        $startTime = microtime(true);
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'DB_ constants',
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info
            ];
            
            // Test running a simple query
            $startTime = microtime(true);
            $result = $conn->query("SELECT 1 as test");
            $endTime = microtime(true);
            $queryTime = round(($endTime - $startTime) * 1000, 2);
            
            if ($result) {
                $row = $result->fetch_assoc();
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'success',
                    'time' => $queryTime . 'ms',
                    'result' => $row
                ];
            } else {
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'error',
                    'error' => $conn->error
                ];
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'DB_ constants',
                'status' => 'error',
                'error' => $conn->connect_error
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'DB_ constants',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Test connection using global variables
global $db_host, $db_name, $db_user, $db_pass;
if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
    try {
        $startTime = microtime(true);
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'global variables',
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info
            ];
            
            // Test running a simple query
            $startTime = microtime(true);
            $result = $conn->query("SELECT 1 as test");
            $endTime = microtime(true);
            $queryTime = round(($endTime - $startTime) * 1000, 2);
            
            if ($result) {
                $row = $result->fetch_assoc();
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'success',
                    'time' => $queryTime . 'ms',
                    'result' => $row
                ];
            } else {
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'error',
                    'error' => $conn->error
                ];
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'global variables',
                'status' => 'error',
                'error' => $conn->connect_error
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'global variables',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Test connections using fallback credentials
foreach ($dbCredentials as $index => $creds) {
    try {
        $startTime = microtime(true);
        $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'fallback credentials #' . ($index + 1),
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info
            ];
            
            // Test running a simple query
            $startTime = microtime(true);
            $result = $conn->query("SELECT 1 as test");
            $endTime = microtime(true);
            $queryTime = round(($endTime - $startTime) * 1000, 2);
            
            if ($result) {
                $row = $result->fetch_assoc();
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'success',
                    'time' => $queryTime . 'ms',
                    'result' => $row
                ];
                
                // If we successfully connected, also check if outstation_fares table exists
                $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
                if ($result->num_rows > 0) {
                    $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'exists';
                    
                    // Check table structure
                    $result = $conn->query("DESCRIBE outstation_fares");
                    $columns = [];
                    while ($row = $result->fetch_assoc()) {
                        $columns[] = $row;
                    }
                    $results['connections'][count($results['connections'])-1]['table_structure'] = $columns;
                } else {
                    $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'does not exist';
                }
            } else {
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'error',
                    'error' => $conn->error
                ];
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'fallback credentials #' . ($index + 1),
                'status' => 'error',
                'error' => $conn->connect_error
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'fallback credentials #' . ($index + 1),
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Check if any connection was successful
$successfulConnections = array_filter($results['connections'], function($conn) {
    return $conn['status'] === 'success';
});

$results['status'] = count($successfulConnections) > 0 ? 'success' : 'error';
$results['message'] = count($successfulConnections) > 0 
    ? 'Successfully connected to ' . count($successfulConnections) . ' database(s)' 
    : 'Failed to connect to any database';

echo json_encode($results, JSON_PRETTY_PRINT);
?>
