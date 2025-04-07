
<?php
/**
 * Direct API Test Endpoint
 * 
 * This endpoint tests API connectivity and database access
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once dirname(__FILE__) . '/../../config.php';

// Log setup
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/api_test_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

file_put_contents($logFile, "[$timestamp] API test request received\n", FILE_APPEND);

try {
    // 1. Test basic PHP functionality
    $phpInfo = [
        'version' => phpversion(),
        'extensions' => get_loaded_extensions(),
        'mysqli_available' => extension_loaded('mysqli'),
        'json_available' => extension_loaded('json'),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
    ];
    
    file_put_contents($logFile, "[$timestamp] PHP Info: " . json_encode($phpInfo) . "\n", FILE_APPEND);
    
    // 2. Test database connection
    $dbInfo = [
        'connected' => false,
        'host' => $DB_HOST,
        'database' => $DB_NAME,
        'tables' => []
    ];
    
    try {
        $conn = getDbConnection();
        
        if ($conn) {
            $dbInfo['connected'] = true;
            
            // Get list of tables
            $tablesResult = $conn->query("SHOW TABLES");
            
            if ($tablesResult) {
                while ($table = $tablesResult->fetch_array()) {
                    $dbInfo['tables'][] = $table[0];
                }
            }
            
            // Check if airport_transfer_fares table exists
            $airportFaresExists = in_array('airport_transfer_fares', $dbInfo['tables']);
            $dbInfo['airport_transfer_fares_exists'] = $airportFaresExists;
            
            // If the table exists, check content
            if ($airportFaresExists) {
                $countResult = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares");
                if ($countResult) {
                    $count = $countResult->fetch_assoc();
                    $dbInfo['airport_transfer_fares_count'] = $count['count'];
                }
            }
            
            // Check vehicles table
            $vehiclesExists = in_array('vehicles', $dbInfo['tables']);
            $dbInfo['vehicles_exists'] = $vehiclesExists;
            
            if ($vehiclesExists) {
                $vehicleCountResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
                if ($vehicleCountResult) {
                    $vehicleCount = $vehicleCountResult->fetch_assoc();
                    $dbInfo['vehicles_count'] = $vehicleCount['count'];
                }
            }
        }
    } catch (Exception $dbError) {
        $dbInfo['error'] = $dbError->getMessage();
    }
    
    file_put_contents($logFile, "[$timestamp] DB Info: " . json_encode($dbInfo) . "\n", FILE_APPEND);

    // Return all test results
    $response = [
        'status' => 'success',
        'message' => 'API test completed successfully',
        'timestamp' => time(),
        'php' => $phpInfo,
        'database' => $dbInfo,
        'request' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'headers' => getallheaders()
        ]
    ];
    
    echo json_encode($response);
    file_put_contents($logFile, "[$timestamp] Test completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
