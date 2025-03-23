
<?php
// direct-local-fares.php - Ultra simplified local fare update endpoint
// Maximum compatibility, minimal error checking, pure database operation

// Set CORS headers for all cases
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
$logMessage = "[$timestamp] Local fare update request received\n";
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "Headers: " . json_encode(getallheaders()) . "\n";
$logMessage .= "Raw input: $requestData\n";
$logMessage .= "GET data: " . json_encode($_GET) . "\n";
$logMessage .= "POST data: " . json_encode($_POST) . "\n";
error_log($logMessage, 3, __DIR__ . '/../direct-local.log');

// Database connection - hardcoded for maximum reliability
try {
    $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Get data from all possible sources - maximum flexibility
$data = [];

// Try JSON first
$json_data = json_decode($requestData, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
    error_log("Using JSON data");
} 
// Then try POST data
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data");
} 
// Then try GET data
else if (!empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data");
}
// Finally try parsing raw input as form data
else {
    parse_str($requestData, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
        error_log("Using parsed form data");
    }
}

// Extract vehicle ID from all possible sources
$vehicleId = null;
if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['id'])) {
    $vehicleId = $data['id'];
} else if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks
$price8hrs80km = isset($data['hr8km80Price']) ? $data['hr8km80Price'] : 
                (isset($data['price8hrs80km']) ? $data['price8hrs80km'] : 
                (isset($data['hr8Km80']) ? $data['hr8Km80'] : 0));

$price10hrs100km = isset($data['hr10km100Price']) ? $data['hr10km100Price'] : 
                  (isset($data['price10hrs100km']) ? $data['price10hrs100km'] : 
                  (isset($data['hr10Km100']) ? $data['hr10Km100'] : 0));

$priceExtraKm = isset($data['extraKmRate']) ? $data['extraKmRate'] : 
               (isset($data['priceExtraKm']) ? $data['priceExtraKm'] : 0);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

try {
    // First check if record exists in local_trip_packages
    $sql = "SELECT id FROM local_trip_packages WHERE vehicle_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$vehicleId]);
    $exists = $stmt->fetchColumn();
    
    if ($exists) {
        // Update existing record
        $sql = "UPDATE local_trip_packages SET price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ? WHERE vehicle_id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$price8hrs80km, $price10hrs100km, $priceExtraKm, $vehicleId]);
    } else {
        // Insert new record
        $sql = "INSERT INTO local_trip_packages (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km) VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm]);
    }
    
    // Always return success - handle any other errors in the catch block
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Local package pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'price8hrs80km' => $price8hrs80km,
                'price10hrs100km' => $price10hrs100km,
                'priceExtraKm' => $priceExtraKm
            ],
            'timestamp' => time()
        ]
    ]);
    
} catch (Exception $e) {
    // Log the error but still try to return a meaningful message
    error_log("Error updating local fare: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'data' => $data
        ]
    ]);
}
?>
