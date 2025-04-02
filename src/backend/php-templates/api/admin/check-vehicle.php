
<?php
/**
 * check-vehicle.php - Check if a vehicle exists without modifying it
 * Used to validate vehicle IDs before performing operations
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request for debugging
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Vehicle check request: " . $_SERVER['QUERY_STRING'], 3, $logDir . '/check-vehicle.log');

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be'; 
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (Exception $e) {
        throw new Exception("Database connection error: " . $e->getMessage());
    }
}

// CRITICAL FIX: Expanded list of known vehicle ID mappings - needed to prevent duplicates
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',   // Map these duplicates back to proper vehicle IDs
    '1271' => 'etios', // Map these duplicates back to proper vehicle IDs
    '1272' => 'etios', // Map these duplicates back to proper vehicle IDs
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios'
];

// Extract vehicle ID from request
$vehicleId = null;
if (isset($_GET['vehicleId'])) {
    $vehicleId = $_GET['vehicleId'];
} else if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
} else if (isset($_GET['vehicle_id'])) {
    $vehicleId = $_GET['vehicle_id'];
}

// CRITICAL FIX: Improved vehicle ID normalization with explicit rejection
if (!empty($vehicleId)) {
    // Record the original ID for logging
    $originalId = $vehicleId;
    
    // Remove "item-" prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
        error_log("[$timestamp] Removed 'item-' prefix: $vehicleId", 3, $logDir . '/check-vehicle.log');
    }
    
    // ABSOLUTELY CRITICAL: If numeric, NEVER allow this ID to proceed without mapping
    if (is_numeric($vehicleId)) {
        error_log("[$timestamp] Numeric ID detected: $vehicleId - must map or reject", 3, $logDir . '/check-vehicle.log');
        
        // Check our known mappings first
        if (isset($knownMappings[$vehicleId])) {
            $mappedId = $knownMappings[$vehicleId];
            error_log("[$timestamp] Mapped numeric ID $vehicleId to {$mappedId}", 3, $logDir . '/check-vehicle.log');
            $vehicleId = $mappedId;
        }
        // If numeric and not in mappings, try to look up actual vehicle_id
        else {
            try {
                $conn = getDbConnection();
                
                // Try to find the actual vehicle_id for this numeric ID
                $query = "SELECT vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1";
                $stmt = $conn->prepare($query);
                $stmt->execute([$vehicleId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // If found, use the actual vehicle_id 
                if ($result && !empty($result['vehicle_id']) && !is_numeric($result['vehicle_id'])) {
                    error_log("[$timestamp] Found actual vehicle_id '{$result['vehicle_id']}' for numeric ID $vehicleId", 3, $logDir . '/check-vehicle.log');
                    $vehicleId = $result['vehicle_id'];
                }
                // If no proper vehicle_id but we have a non-numeric name, use that
                else if ($result && !empty($result['name']) && !is_numeric($result['name'])) {
                    error_log("[$timestamp] Using name '{$result['name']}' for numeric ID $vehicleId", 3, $logDir . '/check-vehicle.log');
                    $vehicleId = $result['name'];
                }
                // CRITICAL: Any numeric ID that isn't mapped and doesn't have a proper name must be rejected
                else {
                    error_log("[$timestamp] WARNING: Numeric ID $vehicleId cannot be used - rejected", 3, $logDir . '/check-vehicle.log');
                    
                    echo json_encode([
                        'status' => 'error',
                        'exists' => false,
                        'isNumericId' => true,
                        'originalId' => $originalId,
                        'message' => "Cannot use numeric ID '$vehicleId' as a vehicle identifier. Please use a proper vehicle ID."
                    ]);
                    exit;
                }
                
                // Close connection
                $conn = null;
            } catch (Exception $e) {
                error_log("[$timestamp] Error while looking up vehicle_id: " . $e->getMessage(), 3, $logDir . '/check-vehicle.log');
                throw $e;
            }
        }
    }
}

try {
    // Check if vehicle ID is provided
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // CRITICAL: Double-check that we don't have a numeric ID at this point
    if (is_numeric($vehicleId)) {
        error_log("[$timestamp] REJECTED vehicle ID is still numeric: $vehicleId", 3, $logDir . '/check-vehicle.log');
        echo json_encode([
            'status' => 'error',
            'exists' => false,
            'isNumericId' => true,
            'message' => "Cannot use numeric ID '$vehicleId' as a vehicle identifier. Please use a proper vehicle ID."
        ]);
        exit;
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query to check if vehicle exists - First try to match by vehicle_id which is preferred
    $query = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute([$vehicleId]);
    $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Return appropriate response
    if ($vehicle) {
        echo json_encode([
            'status' => 'success',
            'exists' => true,
            'vehicle' => [
                'id' => $vehicle['id'],
                'vehicle_id' => $vehicle['vehicle_id'],
                'name' => $vehicle['name']
            ],
            'originalVehicleId' => $vehicleId,
            'message' => "Vehicle found"
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'exists' => false,
            'vehicleId' => $vehicleId,
            'message' => "Vehicle with ID '$vehicleId' not found"
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
