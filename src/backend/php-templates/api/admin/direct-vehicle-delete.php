
<?php
// direct-vehicle-delete.php - A robust endpoint for vehicle deletion

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.7');

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
} elseif (isset($_GET['vehicle_id'])) {
    $vehicleId = $_GET['vehicle_id'];
}

// Try POST/JSON body if not in GET
if (!$vehicleId) {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);
    
    if ($jsonData && isset($jsonData['vehicleId'])) {
        $vehicleId = $jsonData['vehicleId'];
    } elseif ($jsonData && isset($jsonData['id'])) {
        $vehicleId = $jsonData['id'];
    } elseif ($jsonData && isset($jsonData['vehicle_id'])) {
        $vehicleId = $jsonData['vehicle_id'];
    } elseif (!empty($_POST['vehicleId'])) {
        $vehicleId = $_POST['vehicleId'];
    } elseif (!empty($_POST['id'])) {
        $vehicleId = $_POST['id'];
    } elseif (!empty($_POST['vehicle_id'])) {
        $vehicleId = $_POST['vehicle_id'];
    }
}

// If still no vehicle ID, return error
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required for deletion',
        'request' => [
            'method' => $requestMethod,
            'uri' => $requestUri,
            'get' => $_GET,
            'post' => $_POST,
            'json' => $jsonData ?? null
        ]
    ]);
    exit;
}

try {
    // Log which vehicle we're trying to delete
    error_log("Attempting to delete vehicle with ID: $vehicleId");
    
    // 1. First delete from vehicles.json file
    $vehiclesFile = '../../../data/vehicles.json';
    $fileDeletionResult = false;
    $originalVehicleCount = 0;
    $newVehicleCount = 0;
    
    if (file_exists($vehiclesFile)) {
        $jsonContent = file_get_contents($vehiclesFile);
        
        if (!empty($jsonContent)) {
            $vehicles = json_decode($jsonContent, true) ?? [];
            $originalVehicleCount = count($vehicles);
            
            // Log the original vehicle array for debugging
            error_log("Original vehicles in JSON: " . count($vehicles));
            
            // Filter out the vehicle with the matching ID
            $filteredVehicles = array_filter($vehicles, function($vehicle) use ($vehicleId) {
                $vehicleIdLower = strtolower($vehicleId);
                $currentIdLower = strtolower($vehicle['id']);
                $currentVehicleIdLower = strtolower($vehicle['vehicleId'] ?? '');
                
                return $currentIdLower !== $vehicleIdLower && $currentVehicleIdLower !== $vehicleIdLower;
            });
            
            $newVehicleCount = count($filteredVehicles);
            
            // If the arrays have the same count, no deletion happened, could be a case-sensitivity issue
            if ($newVehicleCount === $originalVehicleCount) {
                error_log("Warning: No vehicles were filtered out by ID $vehicleId. Trying case-insensitive match...");
                
                // Try a more lenient matching approach
                $filteredVehicles = array_filter($vehicles, function($vehicle) use ($vehicleId) {
                    $vehicleIdLower = strtolower($vehicleId);
                    $currentIdLower = strtolower($vehicle['id'] ?? '');
                    $currentVehicleIdLower = strtolower($vehicle['vehicleId'] ?? '');
                    $currentNameLower = strtolower($vehicle['name'] ?? '');
                    
                    // Check various ID formats and even name as fallback
                    return $currentIdLower !== $vehicleIdLower && 
                           $currentVehicleIdLower !== $vehicleIdLower && 
                           $currentNameLower !== $vehicleIdLower;
                });
                
                $newVehicleCount = count($filteredVehicles);
            }
            
            // Save the filtered list back to the file
            $filteredArray = array_values($filteredVehicles); // Reset array keys
            file_put_contents($vehiclesFile, json_encode($filteredArray, JSON_PRETTY_PRINT));
            $fileDeletionResult = true;
            
            error_log("Deleted vehicle $vehicleId from JSON file. Before: $originalVehicleCount, After: $newVehicleCount");
        } else {
            error_log("Warning: vehicles.json exists but is empty");
        }
    } else {
        error_log("Warning: vehicles.json does not exist");
    }
    
    // 2. Now try to delete from all possible database tables
    $databaseDeletionResult = false;
    $tablesAffected = [];
    
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
                    // 1. Delete from vehicle_pricing table
                    $stmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ?");
                    $stmt->bind_param("s", $vehicleId);
                    $stmt->execute();
                    if ($stmt->affected_rows > 0) {
                        $tablesAffected[] = 'vehicle_pricing';
                    }
                    $stmt->close();
                    
                    // 2. Delete from vehicle_types table
                    $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ? OR id = ?");
                    $stmt->bind_param("ss", $vehicleId, $vehicleId);
                    $stmt->execute();
                    if ($stmt->affected_rows > 0) {
                        $tablesAffected[] = 'vehicle_types';
                    }
                    $stmt->close();
                    
                    // 3. Delete from vehicles table if it exists
                    try {
                        $stmt = $conn->prepare("DELETE FROM vehicles WHERE vehicle_id = ? OR id = ?");
                        $stmt->bind_param("ss", $vehicleId, $vehicleId);
                        $stmt->execute();
                        if ($stmt->affected_rows > 0) {
                            $tablesAffected[] = 'vehicles';
                        }
                        $stmt->close();
                    } catch (Exception $e) {
                        // Ignore errors if vehicles table doesn't exist
                        error_log("Note: Could not delete from vehicles table: " . $e->getMessage());
                    }
                    
                    // 4. Delete from outstation_fares table if it exists
                    try {
                        $stmt = $conn->prepare("DELETE FROM outstation_fares WHERE vehicle_id = ?");
                        $stmt->bind_param("s", $vehicleId);
                        $stmt->execute();
                        if ($stmt->affected_rows > 0) {
                            $tablesAffected[] = 'outstation_fares';
                        }
                        $stmt->close();
                    } catch (Exception $e) {
                        // Ignore errors if table doesn't exist
                        error_log("Note: Could not delete from outstation_fares table: " . $e->getMessage());
                    }
                    
                    // 5. Delete from local_package_fares table if it exists
                    try {
                        $stmt = $conn->prepare("DELETE FROM local_package_fares WHERE vehicle_id = ?");
                        $stmt->bind_param("s", $vehicleId);
                        $stmt->execute();
                        if ($stmt->affected_rows > 0) {
                            $tablesAffected[] = 'local_package_fares';
                        }
                        $stmt->close();
                    } catch (Exception $e) {
                        // Ignore errors if table doesn't exist
                        error_log("Note: Could not delete from local_package_fares table: " . $e->getMessage());
                    }
                    
                    // 6. Delete from airport_transfer_fares table if it exists
                    try {
                        $stmt = $conn->prepare("DELETE FROM airport_transfer_fares WHERE vehicle_id = ?");
                        $stmt->bind_param("s", $vehicleId);
                        $stmt->execute();
                        if ($stmt->affected_rows > 0) {
                            $tablesAffected[] = 'airport_transfer_fares';
                        }
                        $stmt->close();
                    } catch (Exception $e) {
                        // Ignore errors if table doesn't exist
                        error_log("Note: Could not delete from airport_transfer_fares table: " . $e->getMessage());
                    }
                    
                    // Commit transaction
                    $conn->commit();
                    $databaseDeletionResult = count($tablesAffected) > 0;
                    
                    if ($databaseDeletionResult) {
                        error_log("Deleted vehicle $vehicleId from database tables: " . implode(', ', $tablesAffected));
                    } else {
                        error_log("No database tables were affected when trying to delete vehicle $vehicleId");
                    }
                    
                } catch (Exception $e) {
                    // Rollback on error
                    $conn->rollback();
                    error_log("Database error during deletion: " . $e->getMessage());
                    throw $e;
                }
            } else {
                throw new Exception("Failed to connect to database");
            }
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw $e;
        }
    } else {
        error_log("Config.php not found, skipping database deletion");
    }
    
    // Create cache invalidation marker to trigger client refresh
    $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
    file_put_contents($cacheMarker, time());
    
    // Create data structure for more detailed response
    $responseData = [
        'status' => ($fileDeletionResult || $databaseDeletionResult) ? 'success' : 'error',
        'message' => ($fileDeletionResult || $databaseDeletionResult) 
            ? 'Vehicle deleted successfully' 
            : 'Failed to delete vehicle',
        'vehicleId' => $vehicleId,
        'details' => [
            'file' => [
                'success' => $fileDeletionResult,
                'path' => $vehiclesFile,
                'originalCount' => $originalVehicleCount,
                'newCount' => $newVehicleCount,
                'vehiclesRemoved' => $originalVehicleCount - $newVehicleCount
            ],
            'database' => [
                'success' => $databaseDeletionResult,
                'tablesAffected' => $tablesAffected,
                'connectionSuccessful' => isset($conn) && !$conn->connect_error
            ]
        ],
        'cacheInvalidated' => true,
        'timestamp' => time()
    ];
    
    // Return appropriate status code
    if ($fileDeletionResult || $databaseDeletionResult) {
        http_response_code(200);
        echo json_encode($responseData);
        
        // Dispatch an event to the client to force frontend refresh
        error_log("Dispatching cache invalidation event to keep frontend in sync");
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
