
<?php
/**
 * direct-check-connection.php - Direct database connection check
 * This provides an alternative way to check database connections
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Debug, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to log information
function logConnectionCheck($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/db-connection-check.log');
}

// Initialize response
$response = [
    'status' => 'error',
    'connection' => false,
    'message' => 'Unknown error',
    'timestamp' => time(),
    'debug_info' => []
];

// Get output buffer to capture any PHP errors/warnings
ob_start();

try {
    logConnectionCheck("Starting direct database connection check");
    
    // Try with first set of credentials
    $dbHost1 = 'localhost';
    $dbName1 = 'u64460565_db_be';
    $dbUser1 = 'u64460565_usr_be';
    $dbPass1 = 'Vizag@1213';
    
    $conn1 = null;
    $connectionSuccess = false;
    
    // First try with mysqli
    try {
        logConnectionCheck("Trying mysqli connection to $dbHost1/$dbName1 with user $dbUser1");
        $conn1 = new mysqli($dbHost1, $dbUser1, $dbPass1, $dbName1);
        
        if (!$conn1->connect_error) {
            logConnectionCheck("Successfully connected with mysqli");
            $response['debug_info'][] = "Successful mysqli connection to $dbHost1/$dbName1";
            $connectionSuccess = true;
            
            // Test a simple query
            $versionResult = $conn1->query("SELECT VERSION() as version");
            if ($versionResult && $row = $versionResult->fetch_assoc()) {
                $version = $row['version'];
                $response['debug_info'][] = "MySQL version: $version";
                $response['version'] = $version;
            }
            
            // Check vehicles table
            $tablesResult = $conn1->query("SHOW TABLES LIKE 'vehicles'");
            if ($tablesResult && $tablesResult->num_rows > 0) {
                $response['debug_info'][] = "Vehicles table exists";
                
                // Get column info
                $columnsResult = $conn1->query("DESCRIBE vehicles");
                if ($columnsResult) {
                    $columns = [];
                    while ($column = $columnsResult->fetch_assoc()) {
                        $columns[] = $column['Field'];
                    }
                    $response['debug_info'][] = count($columns) . " columns found in vehicles table";
                    $response['columns'] = $columns;
                }
            } else {
                $response['debug_info'][] = "Vehicles table does not exist";
            }
        } else {
            logConnectionCheck("Failed to connect with mysqli: " . $conn1->connect_error);
            $response['debug_info'][] = "Failed mysqli connection: " . $conn1->connect_error;
        }
    } catch (Exception $e) {
        logConnectionCheck("Exception in mysqli connection: " . $e->getMessage());
        $response['debug_info'][] = "Exception in mysqli connection: " . $e->getMessage();
    }
    
    // If mysqli failed, try with PDO
    if (!$connectionSuccess) {
        try {
            logConnectionCheck("Trying PDO connection");
            $dsn = "mysql:host=$dbHost1;dbname=$dbName1;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $pdoConn = new PDO($dsn, $dbUser1, $dbPass1, $options);
            
            logConnectionCheck("Successfully connected with PDO");
            $response['debug_info'][] = "Successful PDO connection to $dbHost1/$dbName1";
            $connectionSuccess = true;
            
            // Test a simple query
            $stmt = $pdoConn->query("SELECT VERSION() as version");
            if ($stmt) {
                $row = $stmt->fetch();
                $version = $row['version'];
                $response['debug_info'][] = "MySQL version (PDO): $version";
                $response['version'] = $version;
            }
            
            // Close PDO connection
            $pdoConn = null;
        } catch (PDOException $e) {
            logConnectionCheck("PDO exception: " . $e->getMessage());
            $response['debug_info'][] = "PDO exception: " . $e->getMessage();
        }
    }
    
    // If all connection attempts failed, try with corrected database name (u64460565_db_be)
    if (!$connectionSuccess) {
        try {
            $correctedDbName = 'u64460565_db_be';
            logConnectionCheck("Trying with corrected database name: $correctedDbName");
            
            $conn2 = new mysqli($dbHost1, $dbUser1, $dbPass1, $correctedDbName);
            
            if (!$conn2->connect_error) {
                logConnectionCheck("Successfully connected with corrected database name");
                $response['debug_info'][] = "Successful connection with corrected DB name: $correctedDbName";
                $connectionSuccess = true;
                
                // Save the correct DB name for later reference
                $response['corrected_db_name'] = $correctedDbName;
                
                // Close the connection
                $conn2->close();
            } else {
                logConnectionCheck("Failed with corrected DB name: " . $conn2->connect_error);
                $response['debug_info'][] = "Failed with corrected DB name: " . $conn2->connect_error;
            }
        } catch (Exception $e) {
            logConnectionCheck("Exception with corrected DB name: " . $e->getMessage());
            $response['debug_info'][] = "Exception with corrected DB name: " . $e->getMessage();
        }
    }
    
    // Set the final response status
    if ($connectionSuccess) {
        $response['status'] = 'success';
        $response['connection'] = true;
        $response['message'] = 'Database connection successful';
        
        // Close mysqli connection if still open
        if ($conn1 instanceof mysqli) {
            $conn1->close();
        }
    } else {
        $response['message'] = 'All database connection attempts failed';
        
        // Check for common error patterns
        $errorLog = implode(' ', $response['debug_info']);
        if (stripos($errorLog, 'Access denied') !== false) {
            $response['error_type'] = 'credentials';
            $response['suggestion'] = 'Check database username and password';
        } elseif (stripos($errorLog, 'unknown database') !== false) {
            $response['error_type'] = 'database_name';
            $response['suggestion'] = 'Check database name';
        } elseif (stripos($errorLog, 'connect') !== false) {
            $response['error_type'] = 'connection';
            $response['suggestion'] = 'Check database host and port';
        }
    }
    
} catch (Exception $e) {
    logConnectionCheck("Top-level exception: " . $e->getMessage());
    $response['message'] = 'Exception during connection check: ' . $e->getMessage();
    $response['exception'] = $e->getMessage();
}

// Get any output from the buffer
$output = ob_get_clean();
if (!empty($output)) {
    logConnectionCheck("Output buffer: " . $output);
    $response['output_buffer'] = $output;
}

// Send response
echo json_encode($response, JSON_PRETTY_PRINT);
