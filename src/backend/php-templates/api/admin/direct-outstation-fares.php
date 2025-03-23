
<?php
// direct-outstation-fares.php - Ultra simplified direct outstation fare update endpoint
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
error_log("[$timestamp] Direct outstation fare update request received", 3, __DIR__ . '/../logs/direct-fares.log');
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
$baseFare = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
           (isset($data['baseFare']) ? $data['baseFare'] : 
           (isset($data['basePrice']) ? $data['basePrice'] : 
           (isset($data['base_price']) ? $data['base_price'] : 0)));
           
$pricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
             (isset($data['pricePerKm']) ? $data['pricePerKm'] : 
             (isset($data['price_per_km']) ? $data['price_per_km'] : 0));

// Extract round trip data if available
$roundtripBaseFare = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : 
                    (isset($data['roundtripBasePrice']) ? $data['roundtripBasePrice'] : 0);
                    
$roundtripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : 
                      (isset($data['roundtripPricePerKm']) ? $data['roundtripPricePerKm'] : 0);

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, Base Fare: $baseFare, Per KM: $pricePerKm, Round Base: $roundtripBaseFare, Round Per KM: $roundtripPricePerKm", 3, __DIR__ . '/../logs/direct-fares.log');

try {
    // First try updating the vehicle_pricing table
    $sql = "UPDATE vehicle_pricing SET 
            base_price = ?, 
            price_per_km = ?,
            roundtrip_base_price = ?,
            roundtrip_price_per_km = ? 
            WHERE vehicle_type = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$baseFare, $pricePerKm, $roundtripBaseFare, $roundtripPricePerKm, $vehicleId]);
    $rowCount = $stmt->rowCount();
    
    // If no rows updated, insert a new record
    if ($rowCount === 0) {
        $insertSql = "INSERT INTO vehicle_pricing 
            (vehicle_type, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km) 
            VALUES (?, ?, ?, ?, ?)";
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([$vehicleId, $baseFare, $pricePerKm, $roundtripBaseFare, $roundtripPricePerKm]);
        error_log("Inserted new vehicle into vehicle_pricing: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    } else {
        error_log("Updated vehicle_pricing for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    }
    
    // Also update the vehicles table for backward compatibility
    $vehiclesUpdateSql = "UPDATE vehicles SET base_price = ?, price_per_km = ? WHERE id = ? OR vehicle_id = ?";
    $vehiclesStmt = $pdo->prepare($vehiclesUpdateSql);
    $vehiclesStmt->execute([$baseFare, $pricePerKm, $vehicleId, $vehicleId]);
    
    if ($vehiclesStmt->rowCount() === 0) {
        // Insert into vehicles table if not exists
        $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
        $insertVehiclesSql = "INSERT INTO vehicles 
            (id, vehicle_id, name, base_price, price_per_km, is_active) 
            VALUES (?, ?, ?, ?, ?, 1)";
        $insertVehiclesStmt = $pdo->prepare($insertVehiclesSql);
        $insertVehiclesStmt->execute([$vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm]);
        error_log("Inserted new vehicle into vehicles table: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    } else {
        error_log("Updated vehicles table for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    }
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'baseFare' => $baseFare,
                'pricePerKm' => $pricePerKm,
                'roundtripBaseFare' => $roundtripBaseFare,
                'roundtripPricePerKm' => $roundtripPricePerKm
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
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'roundtripBaseFare' => $roundtripBaseFare,
            'roundtripPricePerKm' => $roundtripPricePerKm
        ]
    ]);
}
?>
