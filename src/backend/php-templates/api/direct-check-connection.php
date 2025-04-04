
<?php
/**
 * direct-check-connection.php - Direct database connectivity checker
 * This file provides a simple endpoint to check database connection status
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to log errors
function logError($message) {
    $logDir = dirname(__FILE__) . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/db_connection_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] $message\n", 3, $logFile);
}

try {
    logError("Direct connection check started");
    
    // Try main credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    logError("Attempting connection with credentials: $dbUser@$dbHost/$dbName");
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Get database version
    $versionResult = $conn->query("SELECT VERSION() as version");
    $version = null;
    if ($versionResult && $row = $versionResult->fetch_assoc()) {
        $version = $row['version'];
    }
    
    // Check if vehicles table exists
    $checkTable = $conn->query("SHOW TABLES LIKE 'vehicles'");
    $tableExists = ($checkTable->num_rows > 0);
    
    // If table exists, get column count
    $columnCount = 0;
    $columns = [];
    
    if ($tableExists) {
        $columnsResult = $conn->query("DESCRIBE vehicles");
        while ($column = $columnsResult->fetch_assoc()) {
            $columnCount++;
            $columns[] = $column['Field'];
        }
    }
    
    // Close connection
    $conn->close();
    
    // Return success response
    $response = [
        'status' => 'success',
        'connection' => true,
        'message' => 'Database connection successful',
        'server_version' => $version,
        'database' => $dbName,
        'tables' => [
            'vehicles' => [
                'exists' => $tableExists,
                'column_count' => $columnCount,
                'columns' => $columns
            ]
        ],
        'timestamp' => time()
    ];
    
    logError("Connection successful: " . json_encode($response));
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    logError("Connection failed: " . $errorMessage);
    
    // Try to provide a more user-friendly error message
    $friendlyMessage = $errorMessage;
    if (strpos($errorMessage, "Access denied") !== false) {
        $friendlyMessage = "Access denied error. Database credentials are incorrect. Please verify username and password.";
    } else if (strpos($errorMessage, "Unknown database") !== false) {
        $friendlyMessage = "Database '$dbName' does not exist. Please check the database name.";
    } else if (strpos($errorMessage, "Connection refused") !== false) {
        $friendlyMessage = "Connection to database server refused. Please check that the database server is running and accessible.";
    }
    
    echo json_encode([
        'status' => 'error',
        'connection' => false,
        'message' => $friendlyMessage,
        'technical_details' => $errorMessage,
        'credentials_used' => [
            'host' => $dbHost,
            'database' => $dbName,
            'user' => $dbUser
        ],
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
