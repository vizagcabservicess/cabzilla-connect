
<?php
/**
 * direct-vehicle-delete.php - Delete a vehicle from all related tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-vehicle-delete.log');
}

// Log request information
logMessage("Vehicle delete request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Allow POST/DELETE methods
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    $response['message'] = 'Only POST, DELETE, or GET methods are allowed';
    echo json_encode($response);
    exit;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

try {
    // Get vehicle ID from request parameters or body
    $vehicleId = null;
    
    // Check URL parameters - try multiple common parameter names
    $possibleParams = ['vehicleId', 'vehicle_id', 'id', 'vehicle-id', 'cab_id', 'cabId'];
    
    foreach ($possibleParams as $param) {
        if (isset($_GET[$param]) && !empty($_GET[$param])) {
            $vehicleId = $_GET[$param];
            logMessage("Found vehicle ID in query parameter '$param': $vehicleId");
            break;
        }
    }
    
    // If not found in GET, check POST data
    if (!$vehicleId) {
        $rawData = file_get_contents('php://input');
        if (!empty($rawData)) {
            $jsonData = json_decode($rawData, true);
            
            if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                foreach ($possibleParams as $param) {
                    if (isset($jsonData[$param]) && !empty($jsonData[$param])) {
                        $vehicleId = $jsonData[$param];
                        logMessage("Found vehicle ID in JSON body parameter '$param': $vehicleId");
                        break;
                    }
                }
            } else {
                // Try to parse as URL-encoded
                parse_str($rawData, $parsedData);
                if (is_array($parsedData)) {
                    foreach ($possibleParams as $param) {
                        if (isset($parsedData[$param]) && !empty($parsedData[$param])) {
                            $vehicleId = $parsedData[$param];
                            logMessage("Found vehicle ID in URL-encoded data parameter '$param': $vehicleId");
                            break;
                        }
                    }
                }
            }
        }
        
        // Check POST directly as fallback
        if (!$vehicleId) {
            foreach ($possibleParams as $param) {
                if (isset($_POST[$param]) && !empty($_POST[$param])) {
                    $vehicleId = $_POST[$param];
                    logMessage("Found vehicle ID in POST data parameter '$param': $vehicleId");
                    break;
                }
            }
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required. Please check your request.");
    }
    
    logMessage("Final vehicle ID to delete: $vehicleId");
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Instead of checking first, try direct delete from all tables
        $tables = [
            'vehicles',
            'vehicle_types',
            'vehicle_pricing',
            'local_package_fares',
            'airport_transfer_fares',
            'outstation_fares'
        ];
        
        $deleted = false;
        
        foreach ($tables as $table) {
            // Check if the table exists first
            $tableCheckResult = $conn->query("SHOW TABLES LIKE '$table'");
            if ($tableCheckResult->num_rows == 0) {
                logMessage("Table $table does not exist, skipping");
                continue;
            }
            
            $deleteQuery = "DELETE FROM $table WHERE vehicle_id = ? OR id = ?";
            $deleteStmt = $conn->prepare($deleteQuery);
            
            if ($deleteStmt) {
                $deleteStmt->bind_param('ss', $vehicleId, $vehicleId);
                $deleteStmt->execute();
                $affectedRows = $deleteStmt->affected_rows;
                logMessage("Deleted from $table: $affectedRows row(s)");
                
                if ($affectedRows > 0) {
                    $deleted = true;
                }
                $deleteStmt->close();
            } else {
                logMessage("Error preparing delete statement for $table: " . $conn->error);
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['status'] = 'success';
        $response['message'] = "Vehicle '$vehicleId' deleted successfully";
        $response['vehicleId'] = $vehicleId;
        $response['deleted'] = $deleted;
        
        logMessage("Vehicle deletion process completed for ID: $vehicleId");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error deleting vehicle: " . $e->getMessage());
}

// Send response
echo json_encode($response);
?>
