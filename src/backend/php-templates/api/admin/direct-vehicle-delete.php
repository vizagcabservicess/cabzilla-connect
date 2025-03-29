
<?php
// direct-vehicle-delete.php - A simplified endpoint for vehicle deletion

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.5');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle delete request: Method=$requestMethod, URI=$requestUri");

// Get the vehicle ID
$vehicleId = isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null;

// If not in query string, try to get from request body
if (!$vehicleId) {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);
    
    if ($jsonData && isset($jsonData['vehicleId'])) {
        $vehicleId = $jsonData['vehicleId'];
    } elseif ($jsonData && isset($jsonData['id'])) {
        $vehicleId = $jsonData['id'];
    } elseif (!empty($_POST['vehicleId'])) {
        $vehicleId = $_POST['vehicleId'];
    } elseif (!empty($_POST['id'])) {
        $vehicleId = $_POST['id'];
    }
}

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

error_log("[$timestamp] Attempting to delete vehicle: $vehicleId");

try {
    // 1. Remove from vehicles.json file first (local backup)
    $vehiclesFile = '../../../data/vehicles.json';
    
    if (file_exists($vehiclesFile)) {
        $existingData = file_get_contents($vehiclesFile);
        if (!empty($existingData)) {
            $vehicles = json_decode($existingData, true) ?? [];
            
            // Filter out the vehicle with matching ID
            $vehicles = array_filter($vehicles, function($vehicle) use ($vehicleId) {
                return (!isset($vehicle['id']) || $vehicle['id'] !== $vehicleId) && 
                       (!isset($vehicle['vehicleId']) || $vehicle['vehicleId'] !== $vehicleId);
            });
            
            // Save the updated vehicles list
            file_put_contents($vehiclesFile, json_encode(array_values($vehicles), JSON_PRETTY_PRINT));
            error_log("Removed vehicle $vehicleId from local JSON file");
        }
    }
    
    // 2. Now try to delete from database
    $databaseDeleted = false;
    
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        // Get database connection
        $conn = getDbConnection();
        
        if ($conn) {
            // Begin transaction
            $conn->begin_transaction();
            
            try {
                // 1. Delete from vehicle_pricing
                $stmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ? OR vehicle_type = ?");
                $stmt->bind_param("ss", $vehicleId, $vehicleId);
                $stmt->execute();
                error_log("Deleted from vehicle_pricing: " . $stmt->affected_rows . " rows");
                
                // 2. Delete from outstation_fares
                $stmt = $conn->prepare("DELETE FROM outstation_fares WHERE vehicle_id = ?");
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                error_log("Deleted from outstation_fares: " . $stmt->affected_rows . " rows");
                
                // 3. Delete from local_package_fares
                $stmt = $conn->prepare("DELETE FROM local_package_fares WHERE vehicle_id = ?");
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                error_log("Deleted from local_package_fares: " . $stmt->affected_rows . " rows");
                
                // 4. Delete from airport_transfer_fares
                $stmt = $conn->prepare("DELETE FROM airport_transfer_fares WHERE vehicle_id = ?");
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                error_log("Deleted from airport_transfer_fares: " . $stmt->affected_rows . " rows");
                
                // 5. Finally delete from vehicle_types
                $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ? OR id = ?");
                $stmt->bind_param("ss", $vehicleId, $vehicleId);
                $stmt->execute();
                error_log("Deleted from vehicle_types: " . $stmt->affected_rows . " rows");
                
                // Commit the transaction
                $conn->commit();
                $databaseDeleted = true;
                error_log("Successfully deleted vehicle $vehicleId from database");
                
            } catch (Exception $e) {
                // Rollback the transaction on error
                $conn->rollback();
                error_log("Error deleting vehicle from database: " . $e->getMessage());
            }
        } else {
            error_log("Database connection failed");
        }
    } else {
        error_log("Config file not found - unable to connect to database");
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => $databaseDeleted ? 
                     'Vehicle deleted successfully from database' : 
                     'Vehicle deleted from local storage only',
        'vehicleId' => $vehicleId,
        'databaseDeleted' => $databaseDeleted,
        'fileDeleted' => true
    ]);
    
} catch (Exception $e) {
    error_log("Error deleting vehicle: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'vehicleId' => $vehicleId
    ]);
}
