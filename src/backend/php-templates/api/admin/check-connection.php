<?php
/**
 * check-connection.php - Check database connectivity
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

try {
    // Use the reusable database connection checker
    $connectionStatus = checkDatabaseConnection();
    
    // If not connected, try alternative credentials
    if (!$connectionStatus['connection']) {
        // Try alternative connection with direct credentials
        try {
            $dbHost = 'localhost';
            $dbName = 'u64460565_db_be';
            $dbUser = 'u64460565_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if (!$conn->connect_error) {
                $dbInfoResult = $conn->query("SELECT VERSION() as version");
                if ($dbInfoResult && $row = $dbInfoResult->fetch_assoc()) {
                    $connectionStatus['version'] = $row['version'];
                }
                
                $connectionStatus['status'] = 'success';
                $connectionStatus['connection'] = true;
                $connectionStatus['message'] = 'Connected with alternative credentials';
                
                // Close connection
                $conn->close();
            }
        } catch (Exception $e) {
            // Alternative connection also failed, keep original error
        }
    }
    
    // Add database info if connected
    if ($connectionStatus['connection']) {
        // Get detailed connection info
        $conn = getDbConnectionWithRetry(2);
        
        // Check vehicles table structure
        $structureResult = $conn->query("DESCRIBE vehicles");
        if ($structureResult) {
            $fields = [];
            while ($field = $structureResult->fetch_assoc()) {
                $fields[] = $field['Field'];
            }
            $connectionStatus['structure'] = [
                'vehicles' => [
                    'fields' => $fields,
                    'field_count' => count($fields)
                ]
            ];
        }
        
        // Close connection
        $conn->close();
    }
    
    // Send the response
    echo json_encode($connectionStatus, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'connection' => false,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
