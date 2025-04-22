
<?php
// Enhanced logging and debugging for local fare retrieval

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Enhanced logging function
function advancedLog($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/fare_debug.log';
    
    // Append log message with timestamp
    error_log("[$timestamp] $message\n", 3, $logFile);
}

// Log initial request details
advancedLog("Request Method: " . $_SERVER['REQUEST_METHOD']);
advancedLog("Query String: " . $_SERVER['QUERY_STRING']);
advancedLog("Raw Input: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from multiple sources
$vehicleId = null;
$sources = [
    'GET' => $_GET['vehicle_id'] ?? null,
    'POST' => $_POST['vehicle_id'] ?? null,
    'JSON' => json_decode(file_get_contents('php://input'), true)['vehicle_id'] ?? null
];

foreach ($sources as $source => $value) {
    if ($value) {
        $vehicleId = $value;
        advancedLog("Vehicle ID found in $source: $vehicleId");
        break;
    }
}

if (!$vehicleId) {
    advancedLog("ERROR: No vehicle ID found in any source");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'debug' => 'No vehicle ID found in GET, POST, or JSON input'
    ]);
    exit;
}

// Sanitize vehicle ID
$vehicleId = strtolower(preg_replace("/[^a-zA-Z0-9_]/", '', $vehicleId));
advancedLog("Sanitized Vehicle ID: $vehicleId");

try {
    require_once dirname(__FILE__) . '/../../config.php';
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    advancedLog("Database connection successful");
    
    // Prepared statement to prevent SQL injection
    $stmt = $conn->prepare("SELECT 
        vehicle_id,
        price_4hrs_40km,
        price_8hrs_80km,
        price_10hrs_100km,
        price_extra_km,
        price_extra_hour
        FROM local_package_fares 
        WHERE LOWER(vehicle_id) = ?");
    
    if (!$stmt) {
        throw new Exception("Statement preparation failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    
    if (!$stmt->execute()) {
        throw new Exception("Query execution failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        advancedLog("No results found for vehicle ID: $vehicleId");
        echo json_encode([
            'status' => 'error',
            'message' => 'No fares found for this vehicle',
            'vehicle_id' => $vehicleId,
            'source' => 'local_package_fares',
            'debug' => 'No matching rows in database'
        ]);
        exit;
    }
    
    $row = $result->fetch_assoc();
    
    advancedLog("Database row found: " . json_encode($row));
    
    // Return the data from database
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares retrieved successfully from database',
        'source' => 'local_package_fares',
        'fares' => [[
            'vehicleId' => $row['vehicle_id'],
            'price4hrs40km' => floatval($row['price_4hrs_40km']),
            'price8hrs80km' => floatval($row['price_8hrs_80km']),
            'price10hrs100km' => floatval($row['price_10hrs_100km']),
            'priceExtraKm' => floatval($row['price_extra_km']),
            'priceExtraHour' => floatval($row['price_extra_hour'])
        ]]
    ]);
    
} catch (Exception $e) {
    advancedLog("CRITICAL ERROR: " . $e->getMessage());
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'source' => 'error_handler'
    ]);
} finally {
    // Close database connection
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
