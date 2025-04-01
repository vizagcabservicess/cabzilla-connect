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
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    $response['message'] = 'Only POST or DELETE methods are allowed';
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
    
    // Check URL parameters
    if (isset($_GET['vehicleId']) && !empty($_GET['vehicleId'])) {
        $vehicleId = $_GET['vehicleId'];
        logMessage("Found vehicle ID in query parameters: $vehicleId");
    }
    else if (isset($_GET['id']) && !empty($_GET['id'])) {
        $vehicleId = $_GET['id'];
        logMessage("Found vehicle ID as 'id' in query parameters: $vehicleId");
    }
    else if (isset($_GET['vehicle_id']) && !empty($_GET['vehicle_id'])) {
        $vehicleId = $_GET['vehicle_id'];
        logMessage("Found vehicle ID as 'vehicle_id' in query parameters: $vehicleId");
    }
    // Otherwise try to get from body
    else {
        $rawData = file_get_contents('php://input');
        $jsonData = json_decode($rawData, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            // Try all possible field names
            $possibleFields = ['vehicleId', 'id', 'vehicle_id'];
            foreach ($possibleFields as $field) {
                if (isset($jsonData[$field])) {
                    $vehicleId = $jsonData[$field];
                    logMessage("Found vehicle ID in JSON body as '$field': $vehicleId");
                    break;
                }
            }
        }
        // Try POST data if no JSON
        else if (isset($_POST['vehicleId'])) {
            $vehicleId = $_POST['vehicleId'];
            logMessage("Found vehicle ID in POST body: $vehicleId");
        }
        else if (isset($_POST['id'])) {
            $vehicleId = $_POST['id'];
            logMessage("Found vehicle ID as 'id' in POST body: $vehicleId");
        }
        else if (isset($_POST['vehicle_id'])) {
            $vehicleId = $_POST['vehicle_id'];
            logMessage("Found vehicle ID as 'vehicle_id' in POST body: $vehicleId");
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Try checking vehicle_types table as fallback
            $checkTypeQuery = "SELECT * FROM vehicle_types WHERE vehicle_id = ?";
            $checkTypeStmt = $conn->prepare($checkTypeQuery);
            $checkTypeStmt->bind_param('s', $vehicleId);
            $checkTypeStmt->execute();
            $checkTypeResult = $checkTypeStmt->get_result();
            
            if ($checkTypeResult->num_rows === 0) {
                throw new Exception("Vehicle with ID '$vehicleId' not found");
            } else {
                $vehicleData = $checkTypeResult->fetch_assoc();
            }
        } else {
            $vehicleData = $checkResult->fetch_assoc();
        }
        
        // Store vehicle name for response
        $vehicleName = $vehicleData['name'];
        
        // Delete from all tables to ensure complete removal
        $tables = [
            'vehicles',
            'vehicle_types',
            'vehicle_pricing',
            'local_package_fares',
            'airport_transfer_fares',
            'outstation_fares'
        ];
        
        foreach ($tables as $table) {
            $deleteQuery = "DELETE FROM $table WHERE vehicle_id = ?";
            $deleteStmt = $conn->prepare($deleteQuery);
            
            if ($deleteStmt) {
                $deleteStmt->bind_param('s', $vehicleId);
                $deleteStmt->execute();
                logMessage("Deleted from $table: " . $deleteStmt->affected_rows . " row(s)");
            } else {
                logMessage("Table $table might not exist, skipping");
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['status'] = 'success';
        $response['message'] = "Vehicle '$vehicleName' deleted successfully";
        $response['vehicleId'] = $vehicleId;
        
        logMessage("Vehicle '$vehicleName' deleted successfully with ID: $vehicleId");
        
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
