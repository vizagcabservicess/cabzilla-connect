
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

// ENHANCED: More comprehensive ID mapping with all known numeric IDs and additional common IDs
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '3' => 'innova',
    '4' => 'crysta',
    '5' => 'tempo',
    '6' => 'bus',
    '7' => 'van',
    '8' => 'suv',
    '9' => 'traveller',
    '10' => 'luxury',
    '180' => 'etios',
    '592' => 'urbania',
    '1266' => 'mpv',
    '1270' => 'mpv',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    '1281' => 'mpv',
    '1282' => 'sedan',
    '1283' => 'sedan',
    '1284' => 'etios',
    '1285' => 'etios',
    '1286' => 'etios',
    '1287' => 'etios',
    '1288' => 'etios',
    '1289' => 'etios',
    '1290' => 'etios',
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '103' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga',
    '202' => 'ertiga',
    '300' => 'innova',
    '301' => 'innova',
    '302' => 'innova',
    '400' => 'crysta',
    '401' => 'crysta',
    '402' => 'crysta',
    '500' => 'tempo',
    '501' => 'tempo',
    '502' => 'tempo'
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

// Log the original ID
$originalId = $vehicleId;
error_log("[$timestamp] Original vehicle ID: $originalId", 3, $logDir . '/check-vehicle.log');

// Remove "item-" prefix if it exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    error_log("[$timestamp] Removed 'item-' prefix: $vehicleId", 3, $logDir . '/check-vehicle.log');
}

// ENHANCED: Check for comma-separated lists and extract first ID
if (strpos($vehicleId, ',') !== false) {
    $idParts = explode(',', $vehicleId);
    $oldId = $vehicleId;
    $vehicleId = trim($idParts[0]);
    error_log("[$timestamp] Found comma-separated list, using first ID: $vehicleId", 3, $logDir . '/check-vehicle.log');
}

// CRITICAL: Numeric ID detection and rejection/mapping
if (is_numeric($vehicleId)) {
    error_log("[$timestamp] Numeric ID detected: $vehicleId - applying mapping", 3, $logDir . '/check-vehicle.log');
    
    // Check our known mappings first
    if (isset($knownMappings[$vehicleId])) {
        $mappedId = $knownMappings[$vehicleId];
        error_log("[$timestamp] Mapped numeric ID $vehicleId to {$mappedId}", 3, $logDir . '/check-vehicle.log');
        $vehicleId = $mappedId;
    }
    // REJECT any unmapped numeric IDs
    else {
        error_log("[$timestamp] REJECTED: Unmapped numeric ID $vehicleId is not allowed", 3, $logDir . '/check-vehicle.log');
        echo json_encode([
            'status' => 'error',
            'exists' => false,
            'isNumericId' => true,
            'originalId' => $originalId,
            'message' => "Cannot use numeric ID '$vehicleId'. Please use a proper vehicle ID like 'sedan', 'ertiga', etc."
        ]);
        exit;
    }
}

// Make sure we have a vehicle ID at this point
if (empty($vehicleId)) {
    error_log("[$timestamp] Empty vehicle ID after processing", 3, $logDir . '/check-vehicle.log');
    echo json_encode([
        'status' => 'error',
        'exists' => false,
        'message' => "Vehicle ID is required"
    ]);
    exit;
}

// Normalize vehicle ID (convert to lowercase)
$vehicleId = strtolower($vehicleId);
error_log("[$timestamp] Normalized vehicle ID to lowercase: $vehicleId", 3, $logDir . '/check-vehicle.log');

// FINAL CHECK: Make sure we don't have a numeric ID at this point
if (is_numeric($vehicleId)) {
    error_log("[$timestamp] CRITICAL FAILURE: Vehicle ID is still numeric after processing: $vehicleId", 3, $logDir . '/check-vehicle.log');
    echo json_encode([
        'status' => 'error',
        'exists' => false,
        'isNumericId' => true,
        'message' => "Cannot use numeric ID '$vehicleId'. This is a critical error."
    ]);
    exit;
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    // CRITICAL FIX: Always query by vehicle_id, NEVER by the numeric id column
    $query = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute([$vehicleId]);
    $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // If not found, make one final attempt with a case-insensitive search
    if (!$vehicle) {
        $query = "SELECT id, vehicle_id, name FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?) LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Return appropriate response
    if ($vehicle) {
        error_log("[$timestamp] Vehicle found: " . json_encode($vehicle), 3, $logDir . '/check-vehicle.log');
        echo json_encode([
            'status' => 'success',
            'exists' => true,
            'vehicle' => [
                'id' => $vehicle['vehicle_id'], // CRITICAL FIX: Always return vehicle_id as the id
                'vehicle_id' => $vehicle['vehicle_id'],
                'name' => $vehicle['name'],
                'db_id' => $vehicle['id'] // Include the database ID for debugging but don't use it for operations
            ],
            'originalVehicleId' => $originalId,
            'message' => "Vehicle found"
        ]);
    } else {
        error_log("[$timestamp] Vehicle not found with ID: $vehicleId", 3, $logDir . '/check-vehicle.log');
        echo json_encode([
            'status' => 'error',
            'exists' => false,
            'vehicleId' => $vehicleId,
            'originalId' => $originalId,
            'message' => "Vehicle with ID '$vehicleId' not found"
        ]);
    }
} catch (Exception $e) {
    error_log("[$timestamp] Error checking vehicle: " . $e->getMessage(), 3, $logDir . '/check-vehicle.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
