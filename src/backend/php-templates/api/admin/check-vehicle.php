
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

// Known vehicle ID mappings
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania'
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

// Normalize vehicle ID
if (!empty($vehicleId)) {
    // Remove "item-" prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Map numeric IDs to known vehicle_ids
    if (is_numeric($vehicleId) && isset($knownMappings[$vehicleId])) {
        $vehicleId = $knownMappings[$vehicleId];
    }
}

try {
    // Check if vehicle ID is provided
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query to check if vehicle exists
    $query = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute([$vehicleId, $vehicleId]);
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
