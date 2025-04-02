
<?php
/**
 * check-connection.php - Check database connectivity
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Response object
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'connection' => false,
    'timestamp' => time()
];

try {
    // Define database connection with updated credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Create connection with retry mechanism
    $maxRetries = 3;
    $retryCount = 0;
    $lastError = null;
    $connected = false;
    
    while ($retryCount < $maxRetries && !$connected) {
        try {
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            // Check connection
            if ($conn->connect_error) {
                throw new Exception("Connection failed: " . $conn->connect_error);
            }
            
            // Test query
            $testResult = $conn->query("SELECT 1");
            if (!$testResult) {
                throw new Exception("Test query failed");
            }
            
            $connected = true;
            $response['status'] = 'success';
            $response['message'] = 'Database connection successful';
            $response['connection'] = true;
            
            // Get database info
            $dbInfoResult = $conn->query("SELECT VERSION() as version");
            if ($dbInfoResult && $row = $dbInfoResult->fetch_assoc()) {
                $response['version'] = $row['version'];
            }
            
            // Check tables
            $tableCountResult = $conn->query("SHOW TABLES");
            $response['tables'] = $tableCountResult ? $tableCountResult->num_rows : 0;
            
            // Close connection
            $conn->close();
            
        } catch (Exception $e) {
            $lastError = $e;
            $retryCount++;
            
            // Wait before retry
            if ($retryCount < $maxRetries) {
                usleep(500000); // 500ms
            }
        }
    }
    
    if (!$connected) {
        throw new Exception("Failed to connect to database after $maxRetries attempts: " . $lastError->getMessage());
    }
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
}

// Send response
echo json_encode($response);
exit;
