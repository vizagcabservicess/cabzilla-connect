
<?php
// direct-airport-fares.php - Ultra simplified airport fare update endpoint
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
$logMessage = "[$timestamp] Airport fare update request received\n";
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "Headers: " . json_encode(getallheaders()) . "\n";
$logMessage .= "Raw input: $requestData\n";
$logMessage .= "GET data: " . json_encode($_GET) . "\n";
$logMessage .= "POST data: " . json_encode($_POST) . "\n";
error_log($logMessage, 3, __DIR__ . '/../direct-airport.log');

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
$pickupFare = isset($data['pickupFare']) ? $data['pickupFare'] : 
             (isset($data['pickup_fare']) ? $data['pickup_fare'] : 0);

$dropFare = isset($data['dropFare']) ? $data['dropFare'] : 
           (isset($data['drop_fare']) ? $data['drop_fare'] : 0);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

try {
    // First check if record exists in airport_transfer_fares
    $sql = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$vehicleId]);
    $exists = $stmt->fetchColumn();
    
    if ($exists) {
        // Update existing record
        $sql = "UPDATE airport_transfer_fares SET pickup_fare = ?, drop_fare = ? WHERE vehicle_id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$pickupFare, $dropFare, $vehicleId]);
    } else {
        // Insert new record
        $sql = "INSERT INTO airport_transfer_fares (vehicle_id, pickup_fare, drop_fare) VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$vehicleId, $pickupFare, $dropFare]);
    }
    
    // Always return success - handle any other errors in the catch block
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport transfer pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'pickupFare' => $pickupFare,
                'dropFare' => $dropFare
            ],
            'timestamp' => time()
        ]
    ]);
    
} catch (Exception $e) {
    // Log the error but still try to return a meaningful message
    error_log("Error updating airport fare: " . $e->getMessage());
    
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
