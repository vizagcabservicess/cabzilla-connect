<?php
/**
 * Direct API Test
 * Checks if the API and database are working correctly
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/api_test_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] API test request received\n", FILE_APPEND);

try {
    // Check if we have a database connection
    $dbConnected = false;
    $dbError = null;
    
    try {
        // If we have a config file, try to use it
        if (file_exists(__DIR__ . '/../../config.php')) {
            require_once __DIR__ . '/../../config.php';
            $db = getDbConnection();
            $dbConnected = $db !== null;
        } else {
            // Otherwise, create a simple database connection test
            $host = 'localhost';
            $dbname = 'cab_booking';
            $username = 'cab_user';
            $password = 'cab_password';
            
            // Try to connect with PDO
            try {
                $db = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
                $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $dbConnected = true;
            } catch (PDOException $e) {
                // Try with mysqli as a fallback
                try {
                    $mysqli = new mysqli($host, $username, $password, $dbname);
                    if ($mysqli->connect_error) {
                        throw new Exception($mysqli->connect_error);
                    }
                    $dbConnected = true;
                    $mysqli->close();
                } catch (Exception $e2) {
                    $dbError = "PDO: " . $e->getMessage() . ", MySQLi: " . $e2->getMessage();
                }
            }
        }
    } catch (Exception $e) {
        $dbError = $e->getMessage();
    }
    
    // Build a response
    $response = [
        'status' => 'success',
        'api' => [
            'timestamp' => time(),
            'date' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION,
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
        ],
        'database' => [
            'connected' => $dbConnected,
            'error' => $dbError
        ],
        'environment' => [
            'server_name' => $_SERVER['SERVER_NAME'] ?? 'Unknown',
            'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
            'is_preview' => isset($_SERVER['HTTP_HOST']) && (strpos($_SERVER['HTTP_HOST'], 'preview') !== false)
        ]
    ];
    
    // If we have a database connection, try to get some basic info
    if ($dbConnected && isset($db)) {
        try {
            // Check if vehicles table exists and count rows
            $query = "SHOW TABLES LIKE 'vehicles'";
            $stmt = $db->prepare($query);
            $stmt->execute();
            $hasVehiclesTable = $stmt->rowCount() > 0;
            
            if ($hasVehiclesTable) {
                $query = "SELECT COUNT(*) FROM vehicles";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $vehicleCount = $stmt->fetchColumn();
                
                $response['database']['tables'] = [
                    'vehicles' => [
                        'exists' => true,
                        'rows' => $vehicleCount
                    ]
                ];
                
                // Check airport_transfer_fares table
                $query = "SHOW TABLES LIKE 'airport_transfer_fares'";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $hasAirportTable = $stmt->rowCount() > 0;
                
                $response['database']['tables']['airport_transfer_fares'] = [
                    'exists' => $hasAirportTable
                ];
                
                if ($hasAirportTable) {
                    $query = "SELECT COUNT(*) FROM airport_transfer_fares";
                    $stmt = $db->prepare($query);
                    $stmt->execute();
                    $airportCount = $stmt->fetchColumn();
                    $response['database']['tables']['airport_transfer_fares']['rows'] = $airportCount;
                }
            } else {
                $response['database']['tables'] = [
                    'vehicles' => ['exists' => false]
                ];
            }
        } catch (Exception $e) {
            $response['database']['table_error'] = $e->getMessage();
        }
    }
    
    echo json_encode($response);
    file_put_contents($logFile, "[$timestamp] API test completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Ensure proper JSON error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
