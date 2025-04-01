
<?php
/**
 * direct-vehicle-delete.php - Delete a vehicle from all related tables
 */

// Set ultra-aggressive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');

// Handle OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful'
    ]);
    exit;
}

// Check if the request method is DELETE or POST
if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST', 'GET'])) {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Only DELETE, POST, or GET requests are accepted.',
        'received' => $_SERVER['REQUEST_METHOD']
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

try {
    // Get the vehicle ID from the URL or POST data
    $vehicleId = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Try to parse from URL path
        $pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
        $vehicleId = end($pathParts);
        
        // If not found in path, check query string
        if (!$vehicleId || $vehicleId === 'direct-vehicle-delete.php') {
            parse_str($_SERVER['QUERY_STRING'], $params);
            $vehicleId = $params['id'] ?? $params['vehicleId'] ?? null;
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // For POST, check both POST data and query string
        $vehicleId = $_POST['id'] ?? $_POST['vehicleId'] ?? null;
        
        if (!$vehicleId) {
            // Try to get from query string
            parse_str($_SERVER['QUERY_STRING'], $params);
            $vehicleId = $params['id'] ?? $params['vehicleId'] ?? null;
        }
        
        if (!$vehicleId) {
            // Try to parse JSON input
            $jsonData = file_get_contents('php://input');
            if ($jsonData) {
                $data = json_decode($jsonData, true);
                $vehicleId = $data['id'] ?? $data['vehicleId'] ?? null;
            }
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // For GET, check query string
        $vehicleId = $_GET['id'] ?? $_GET['vehicleId'] ?? null;
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID not provided. Please specify id or vehicleId.");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Start transaction - we'll either delete from all tables or none
    $conn->begin_transaction();
    
    try {
        // Create an array to track which tables were affected
        $affectedTables = [];
        
        // 1. Delete from vehicle_types
        $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'vehicle_types';
        }
        
        // 2. Delete from vehicles table
        $stmt = $conn->prepare("DELETE FROM vehicles WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'vehicles';
        }
        
        // 3. Delete from vehicle_pricing
        $stmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'vehicle_pricing';
        }
        
        // 4. Delete from outstation_fares
        $stmt = $conn->prepare("DELETE FROM outstation_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'outstation_fares';
        }
        
        // 5. Delete from local_package_fares
        $stmt = $conn->prepare("DELETE FROM local_package_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'local_package_fares';
        }
        
        // 6. Delete from airport_transfer_fares
        $stmt = $conn->prepare("DELETE FROM airport_transfer_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $affectedTables[] = 'airport_transfer_fares';
        }
        
        // We won't consider it an error if no tables were affected,
        // as the user may be trying to delete a vehicle that doesn't exist
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => "Vehicle with ID '$vehicleId' deleted successfully",
            'details' => [
                'vehicleId' => $vehicleId,
                'tables_affected' => $affectedTables,
                'tables_checked' => ['vehicle_types', 'vehicles', 'vehicle_pricing', 'outstation_fares', 'local_package_fares', 'airport_transfer_fares']
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log error
    error_log("Error deleting vehicle: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'trace' => $e->getTraceAsString()
    ]);
}
