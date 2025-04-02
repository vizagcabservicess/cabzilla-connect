<?php
/**
 * direct-vehicle-delete.php - Direct implementation for vehicle deletion
 * This provides robust error handling for vehicle deletion
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/vehicle-delete.log');
}

// Log request information
logMessage("Vehicle delete request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Request URI: " . $_SERVER['REQUEST_URI']);
logMessage("Request body: " . file_get_contents('php://input'));

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
    
    // Extract vehicle ID from various sources
    $vehicleId = null;
    
    // Check request method to determine how to get the vehicle ID
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Try to parse JSON body first
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true);
        
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            if (isset($jsonData['id'])) {
                $vehicleId = $jsonData['id'];
            } else if (isset($jsonData['vehicleId'])) {
                $vehicleId = $jsonData['vehicleId'];
            } else if (isset($jsonData['vehicle_id'])) {
                $vehicleId = $jsonData['vehicle_id'];
            }
        }
        
        // Try POST data if no ID found in JSON
        if (empty($vehicleId)) {
            if (isset($_POST['id'])) {
                $vehicleId = $_POST['id'];
            } else if (isset($_POST['vehicleId'])) {
                $vehicleId = $_POST['vehicleId'];
            } else if (isset($_POST['vehicle_id'])) {
                $vehicleId = $_POST['vehicle_id'];
            }
        }
    }
    
    // Try GET parameters as a last resort
    if (empty($vehicleId)) {
        if (isset($_GET['id'])) {
            $vehicleId = $_GET['id'];
        } else if (isset($_GET['vehicleId'])) {
            $vehicleId = $_GET['vehicleId'];
        } else if (isset($_GET['vehicle_id'])) {
            $vehicleId = $_GET['vehicle_id'];
        }
    }
    
    // Extract from URL if still not found
    if (empty($vehicleId)) {
        $uri = $_SERVER['REQUEST_URI'];
        if (preg_match('/\/([^\/\?]+)(?:\?|$)/', $uri, $matches)) {
            $vehicleId = $matches[1];
        }
    }
    
    // Check if ID was found
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    logMessage("Attempting to delete vehicle with ID: " . $vehicleId);
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // First check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE id = ? OR vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        
        if (!$checkStmt) {
            throw new Exception("Error preparing check query: " . $conn->error);
        }
        
        $checkStmt->bind_param('ss', $vehicleId, $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("Vehicle with ID '$vehicleId' not found");
        }
        
        // Get vehicle details before deletion
        $vehicle = $result->fetch_assoc();
        $vehicleName = $vehicle['name'];
        
        // Delete from vehicles table
        $deleteQuery = "DELETE FROM vehicles WHERE id = ? OR vehicle_id = ?";
        $deleteStmt = $conn->prepare($deleteQuery);
        
        if (!$deleteStmt) {
            throw new Exception("Error preparing delete query: " . $conn->error);
        }
        
        $deleteStmt->bind_param('ss', $vehicleId, $vehicleId);
        if (!$deleteStmt->execute()) {
            throw new Exception("Error executing delete: " . $deleteStmt->error);
        }
        
        $rowsAffected = $deleteStmt->affected_rows;
        logMessage("Deleted from vehicles table: $rowsAffected rows affected");
        
        // Try to delete from vehicle_types if table exists
        try {
            $checkTypesTable = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
            if ($checkTypesTable->num_rows > 0) {
                $typeDeleteQuery = "DELETE FROM vehicle_types WHERE id = ? OR vehicle_id = ?";
                $typeDeleteStmt = $conn->prepare($typeDeleteQuery);
                $typeDeleteStmt->bind_param('ss', $vehicleId, $vehicleId);
                $typeDeleteStmt->execute();
                $typeRowsAffected = $typeDeleteStmt->affected_rows;
                logMessage("Deleted from vehicle_types table: $typeRowsAffected rows affected");
            }
        } catch (Exception $e) {
            logMessage("Notice: Could not delete from vehicle_types: " . $e->getMessage());
            // Continue with transaction, this is not critical
        }
        
        // Try to delete from outstation_fares if table exists
        try {
            $checkFaresTable = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
            if ($checkFaresTable->num_rows > 0) {
                $faresDeleteQuery = "DELETE FROM outstation_fares WHERE vehicle_id = ?";
                $faresDeleteStmt = $conn->prepare($faresDeleteQuery);
                $faresDeleteStmt->bind_param('s', $vehicleId);
                $faresDeleteStmt->execute();
                $faresRowsAffected = $faresDeleteStmt->affected_rows;
                logMessage("Deleted from outstation_fares table: $faresRowsAffected rows affected");
            }
        } catch (Exception $e) {
            logMessage("Notice: Could not delete from outstation_fares: " . $e->getMessage());
            // Continue with transaction, this is not critical
        }
        
        // Try to delete from vehicle_pricing if table exists
        try {
            $checkPricingTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
            if ($checkPricingTable->num_rows > 0) {
                $pricingDeleteQuery = "DELETE FROM vehicle_pricing WHERE vehicle_id = ?";
                $pricingDeleteStmt = $conn->prepare($pricingDeleteQuery);
                $pricingDeleteStmt->bind_param('s', $vehicleId);
                $pricingDeleteStmt->execute();
                $pricingRowsAffected = $pricingDeleteStmt->affected_rows;
                logMessage("Deleted from vehicle_pricing table: $pricingRowsAffected rows affected");
            }
        } catch (Exception $e) {
            logMessage("Notice: Could not delete from vehicle_pricing: " . $e->getMessage());
            // Continue with transaction, this is not critical
        }
        
        // Commit transaction
        $conn->commit();
        
        // Build success response
        $response = [
            'status' => 'success',
            'message' => "Vehicle '$vehicleName' deleted successfully",
            'vehicleId' => $vehicleId,
            'rowsAffected' => $rowsAffected,
            'timestamp' => time()
        ];
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = "Error deleting vehicle: " . $e->getMessage();
    $response['error'] = $e->getMessage();
    logMessage("Error deleting vehicle: " . $e->getMessage());
}

// Send response
logMessage("Sending response: " . json_encode($response));
echo json_encode($response);
?>
