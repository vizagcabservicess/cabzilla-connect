
<?php
/**
 * Enhanced direct database connectivity check with comprehensive diagnostics
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Logging function
function logConnectionDetails($message, $details = []) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/connection_diagnostics_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($details)) {
        $logEntry .= " - " . json_encode($details);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
}

// Comprehensive connection check
function runComprehensiveDatabaseCheck() {
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    $diagnostics = [
        'connection_attempt' => [
            'host' => $dbHost,
            'database' => $dbName,
            'user' => $dbUser
        ],
        'system_checks' => [],
        'connection_status' => 'failed',
        'error_details' => null
    ];
    
    // System level checks
    $diagnostics['system_checks']['php_version'] = PHP_VERSION;
    $diagnostics['system_checks']['mysqli_extension'] = extension_loaded('mysqli') ? 'loaded' : 'not_loaded';
    
    try {
        // Attempt connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            $diagnostics['connection_status'] = 'connection_error';
            $diagnostics['error_details'] = [
                'error_code' => $conn->connect_errno,
                'error_message' => $conn->connect_error
            ];
            
            logConnectionDetails('Connection Failed', $diagnostics['error_details']);
            return $diagnostics;
        }
        
        // Additional checks
        $diagnostics['connection_status'] = 'successful';
        $diagnostics['server_info'] = $conn->server_info;
        $diagnostics['client_info'] = $conn->client_info;
        
        // Check tables
        $tableQuery = $conn->query("SHOW TABLES");
        $diagnostics['tables'] = [];
        while ($row = $tableQuery->fetch_array()) {
            $diagnostics['tables'][] = $row[0];
        }
        
        // Close connection
        $conn->close();
        
        logConnectionDetails('Connection Successful', [
            'tables' => $diagnostics['tables']
        ]);
        
        return $diagnostics;
    } catch (Exception $e) {
        $diagnostics['connection_status'] = 'exception';
        $diagnostics['error_details'] = [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ];
        
        logConnectionDetails('Connection Exception', $diagnostics['error_details']);
        return $diagnostics;
    }
}

// Handle the request
try {
    $result = runComprehensiveDatabaseCheck();
    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'fatal_error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
