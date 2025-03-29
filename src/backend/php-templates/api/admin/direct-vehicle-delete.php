
<?php
// direct-vehicle-delete.php - A simplified endpoint for vehicle deletion

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.6');

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

// Get vehicle ID from various possible sources
$vehicleId = null;

// Try GET parameter
if (isset($_GET['vehicleId'])) {
    $vehicleId = $_GET['vehicleId'];
} elseif (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

// Try POST/JSON body if not in GET
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

// If still no vehicle ID, return error
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required for deletion'
    ]);
    exit;
}

try {
    // 1. First delete from vehicles.json file
    $vehiclesFile = '../../../data/vehicles.json';
    $fileDeletionResult = false;
    
    if (file_exists($vehiclesFile)) {
        $jsonContent = file_get_contents($vehiclesFile);
        
        if (!empty($jsonContent)) {
            $vehicles = json_decode($jsonContent, true) ?? [];
            
            // Filter out the vehicle with the matching ID
            $filteredVehicles = array_filter($vehicles, function($vehicle) use ($vehicleId) {
                return $vehicle['id'] !== $vehicleId && $vehicle['vehicleId'] !== $vehicleId;
            });
            
            // Save the filtered list back to the file
            file_put_contents($vehiclesFile, json_encode(array_values($filteredVehicles), JSON_PRETTY_PRINT));
            $fileDeletionResult = true;
            
            error_log("Deleted vehicle $vehicleId from JSON file");
        }
    }
    
    // 2. Now try to delete from database
    $databaseDeletionResult = false;
    
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        try {
            // Use database connection helper if available
            if (function_exists('getDbConnection')) {
                $conn = getDbConnection();
            } else {
                // Fall back to direct connection
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            }
            
            if ($conn && !$conn->connect_error) {
                // Begin transaction
                $conn->begin_transaction();
                
                try {
                    // Delete from vehicle_pricing table
                    $stmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ?");
                    $stmt->bind_param("s", $vehicleId);
                    $stmt->execute();
                    
                    // Delete from vehicle_types table
                    $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
                    $stmt->bind_param("s", $vehicleId);
                    $stmt->execute();
                    
                    // Commit transaction
                    $conn->commit();
                    $databaseDeletionResult = true;
                    
                    error_log("Deleted vehicle $vehicleId from database tables");
                    
                } catch (Exception $e) {
                    // Rollback on error
                    $conn->rollback();
                    error_log("Database error during deletion: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
        }
    }
    
    // Return success response if either file or database deletion was successful
    if ($fileDeletionResult || $databaseDeletionResult) {
        // Create cache invalidation marker to trigger client refresh
        $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
        file_put_contents($cacheMarker, time());
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle deleted successfully',
            'vehicleId' => $vehicleId,
            'fileDeletion' => $fileDeletionResult,
            'databaseDeletion' => $databaseDeletionResult,
            'timestamp' => time()
        ]);
    } else {
        throw new Exception("Failed to delete vehicle from any storage");
    }
    
} catch (Exception $e) {
    // Log and return error
    error_log("Error deleting vehicle: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error deleting vehicle: ' . $e->getMessage(),
        'vehicleId' => $vehicleId,
        'timestamp' => time()
    ]);
}
