
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

// Expanded list of known vehicle ID mappings - CRITICAL for preventing duplicates
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',   // Map these duplicates back to proper vehicle IDs
    '1271' => 'etios', // Map these duplicates back to proper vehicle IDs
    '1272' => 'etios', // Map these duplicates back to proper vehicle IDs
    // Add any other numeric IDs that have appeared as duplicates
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios'
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

// Improved vehicle ID normalization
if (!empty($vehicleId)) {
    // Remove "item-" prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // CRITICAL CHANGE: If this is a numeric ID, ALWAYS check if it's in our mapping
    // This prevents creation of duplicate vehicles with numeric names
    if (is_numeric($vehicleId)) {
        // Log the original numeric ID for debugging
        error_log("[$timestamp] Received numeric vehicle ID: $vehicleId", 3, $logDir . '/check-vehicle.log');
        
        // First check our known mappings
        if (isset($knownMappings[$vehicleId])) {
            $originalId = $vehicleId;
            $vehicleId = $knownMappings[$vehicleId];
            error_log("[$timestamp] Mapped numeric ID $originalId to {$vehicleId}", 3, $logDir . '/check-vehicle.log');
        }
        // If it's not in our mappings but still numeric, try to look up the actual vehicle_id
        else {
            try {
                $conn = getDbConnection();
                
                // Try to find the actual vehicle_id for this numeric ID (might be internal database ID)
                $query = "SELECT vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1";
                $stmt = $conn->prepare($query);
                $stmt->execute([$vehicleId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // If found, use the actual vehicle_id instead
                if ($result && !empty($result['vehicle_id'])) {
                    $originalId = $vehicleId;
                    $vehicleId = $result['vehicle_id'];
                    error_log("[$timestamp] Found actual vehicle_id '$vehicleId' for numeric ID $originalId", 3, $logDir . '/check-vehicle.log');
                }
                // If no vehicle_id but we have a name, use that (fallback)
                else if ($result && !empty($result['name'])) {
                    $originalId = $vehicleId;
                    $vehicleId = $result['name'];
                    error_log("[$timestamp] Using name '{$vehicleId}' for numeric ID $originalId", 3, $logDir . '/check-vehicle.log');
                }
                // If numeric ID is large, this is probably an internal ID - BLOCK it from creating a vehicle
                else if (intval($vehicleId) > 10) { // Threshold of 10 to allow small numbers that might be legitimate
                    error_log("[$timestamp] WARNING: Large numeric ID $vehicleId could create a duplicate vehicle - will be rejected", 3, $logDir . '/check-vehicle.log');
                    // Instead of returning an error immediately, we'll let the code continue
                    // but flag this as an invalid ID in the response
                }
                
                // Close connection
                $conn = null;
            } catch (Exception $e) {
                error_log("[$timestamp] Error while looking up vehicle_id: " . $e->getMessage(), 3, $logDir . '/check-vehicle.log');
            }
        }
    }
}

try {
    // Check if vehicle ID is provided
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // CRITICAL: Block pure numeric IDs that are larger than 10 and not in our known mappings
    if (is_numeric($vehicleId) && intval($vehicleId) > 10 && !isset($knownMappings[$vehicleId])) {
        error_log("[$timestamp] REJECTED numeric vehicle ID: $vehicleId to prevent duplicate creation", 3, $logDir . '/check-vehicle.log');
        echo json_encode([
            'status' => 'error',
            'exists' => false,
            'isNumericId' => true, // Flag to indicate this is a problematic numeric ID
            'message' => "Cannot use numeric ID '$vehicleId' directly as a vehicle identifier. Please use the proper vehicle ID instead."
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
    
    // If not found by vehicle_id, try by id as fallback
    if (!$vehicle && is_numeric($vehicleId)) {
        $query = "SELECT id, vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
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
            'originalVehicleId' => $vehicleId, // Include the original ID for debugging
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
