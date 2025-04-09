
<?php
/**
 * direct-check-connection.php - Simple test for database connection
 */

// Set headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate');

// Enable error reporting for diagnosis
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple log function
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] $message");
    
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/direct_connection_test.log';
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Initialize response
$response = [
    'status' => 'error',
    'connection' => false,
    'message' => 'Connection test not started',
    'timestamp' => time(),
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'php_version' => PHP_VERSION
];

try {
    logMessage("Starting direct connection test");
    
    // Define database credentials directly
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Attempt mysqli connection
    logMessage("Attempting mysqli connection");
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        $response['message'] = 'Connection error: ' . $conn->connect_error;
        $response['error_details'] = $conn->connect_error;
        logMessage("Connection failed: " . $conn->connect_error);
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Connection succeeded - now test a simple query
    logMessage("Connection successful, testing query");
    $result = $conn->query("SELECT 1 as test");
    
    if (!$result) {
        $response['message'] = 'Query test failed: ' . $conn->error;
        logMessage("Query test failed: " . $conn->error);
        throw new Exception("Query test failed: " . $conn->error);
    }
    
    $row = $result->fetch_assoc();
    
    if ($row['test'] == 1) {
        $response['status'] = 'success';
        $response['connection'] = true;
        $response['message'] = 'Database connection and query test successful';
        logMessage("Query test successful");
        
        // Check for bookings table
        $tablesResult = $conn->query("SHOW TABLES LIKE 'bookings'");
        $response['bookings_table_exists'] = $tablesResult->num_rows > 0;
        
        if ($response['bookings_table_exists']) {
            // Get table structure
            $structureResult = $conn->query("DESCRIBE bookings");
            $columns = [];
            while ($col = $structureResult->fetch_assoc()) {
                $columns[] = $col['Field'];
            }
            $response['bookings_columns'] = $columns;
            $response['bookings_column_count'] = count($columns);
            
            // Get row count
            $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
            $countRow = $countResult->fetch_assoc();
            $response['bookings_count'] = (int)$countRow['count'];
            
            logMessage("Bookings table exists with {$response['bookings_count']} rows");
        } else {
            logMessage("Bookings table does not exist");
        }
    } else {
        $response['message'] = 'Query returned unexpected result';
        logMessage("Query returned unexpected result: " . print_r($row, true));
    }
    
    // Close the connection
    $conn->close();
    
} catch (Exception $e) {
    $response['message'] = 'Exception: ' . $e->getMessage();
    $response['exception'] = $e->getMessage();
    $response['trace'] = $e->getTraceAsString();
    logMessage("Exception: " . $e->getMessage());
}

// Return the result as JSON
echo json_encode($response, JSON_PRETTY_PRINT);
