
<?php
// direct-airport-fares.php - Ultra simplified direct airport fare update endpoint
// No configuration files, no includes, pure standalone script

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
error_log("[$timestamp] Direct airport fare update request received", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("Method: " . $_SERVER['REQUEST_METHOD'] . "\n", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("Raw input: $requestData\n", 3, __DIR__ . '/../logs/direct-fares.log');

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
} 
// Then try POST data
else if (!empty($_POST)) {
    $data = $_POST;
} 
// Then try GET data
else if (!empty($_GET)) {
    $data = $_GET;
}
// Finally try parsing raw input as form data
else {
    parse_str($requestData, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
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
$basePrice = isset($data['basePrice']) ? $data['basePrice'] : 
            (isset($data['base_price']) ? $data['base_price'] : 0);
$pricePerKm = isset($data['pricePerKm']) ? $data['pricePerKm'] : 
              (isset($data['price_per_km']) ? $data['price_per_km'] : 0);
$dropPrice = isset($data['dropPrice']) ? $data['dropPrice'] : 
            (isset($data['drop_price']) ? $data['drop_price'] : 0);
$pickupPrice = isset($data['pickupPrice']) ? $data['pickupPrice'] : 
              (isset($data['pickup_price']) ? $data['pickup_price'] : 0);
$tier1Price = isset($data['tier1Price']) ? $data['tier1Price'] : 
             (isset($data['tier_1_price']) ? $data['tier_1_price'] : 0);
$tier2Price = isset($data['tier2Price']) ? $data['tier2Price'] : 
             (isset($data['tier_2_price']) ? $data['tier_2_price'] : 0);
$tier3Price = isset($data['tier3Price']) ? $data['tier3Price'] : 
             (isset($data['tier_3_price']) ? $data['tier_3_price'] : 0);
$tier4Price = isset($data['tier4Price']) ? $data['tier4Price'] : 
             (isset($data['tier_4_price']) ? $data['tier_4_price'] : 0);
$extraKmCharge = isset($data['extraKmCharge']) ? $data['extraKmCharge'] : 
                (isset($data['extra_km_charge']) ? $data['extra_km_charge'] : 0);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, Base Price: $basePrice, Drop: $dropPrice, Pickup: $pickupPrice", 3, __DIR__ . '/../logs/direct-fares.log');

try {
    // First try updating the vehicle_pricing table
    $sql = "UPDATE vehicle_pricing SET 
            airport_base_price = ?, 
            airport_price_per_km = ?,
            airport_drop_price = ?,
            airport_pickup_price = ?,
            airport_tier1_price = ?,
            airport_tier2_price = ?,
            airport_tier3_price = ?,
            airport_tier4_price = ?,
            airport_extra_km_charge = ?
            WHERE vehicle_type = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $basePrice, 
        $pricePerKm, 
        $dropPrice, 
        $pickupPrice, 
        $tier1Price, 
        $tier2Price, 
        $tier3Price, 
        $tier4Price, 
        $extraKmCharge, 
        $vehicleId
    ]);
    $rowCount = $stmt->rowCount();
    
    // If no rows updated, insert a new record
    if ($rowCount === 0) {
        $insertSql = "INSERT INTO vehicle_pricing 
            (vehicle_type, airport_base_price, airport_price_per_km, airport_drop_price, airport_pickup_price, 
             airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, airport_extra_km_charge) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $dropPrice, 
            $pickupPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge
        ]);
        error_log("Inserted new vehicle into vehicle_pricing for airport: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    } else {
        error_log("Updated vehicle_pricing for airport: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    }
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'dropPrice' => $dropPrice,
                'pickupPrice' => $pickupPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm
        ]
    ]);
}
?>
