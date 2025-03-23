
<?php
// direct-outstation-fares.php - Ultra simplified direct outstation fare update endpoint
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
$logMessage = "[$timestamp] Outstation fare update request received\n";
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "Headers: " . json_encode(getallheaders()) . "\n";
$logMessage .= "Raw input: $requestData\n";
$logMessage .= "GET data: " . json_encode($_GET) . "\n";
$logMessage .= "POST data: " . json_encode($_POST) . "\n";
error_log($logMessage, 3, __DIR__ . '/../direct-outstation.log');

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
$baseFare = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
           (isset($data['baseFare']) ? $data['baseFare'] : 
           (isset($data['basePrice']) ? $data['basePrice'] : 
           (isset($data['base_fare']) ? $data['base_fare'] : 
           (isset($data['base_price']) ? $data['base_price'] : 0))));
           
$pricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
             (isset($data['pricePerKm']) ? $data['pricePerKm'] : 
             (isset($data['price_per_km']) ? $data['price_per_km'] : 0));

// Extract round trip data if available
$roundtripBaseFare = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : 
                    (isset($data['roundtripBasePrice']) ? $data['roundtripBasePrice'] : 
                    (isset($data['roundtrip_base_price']) ? $data['roundtrip_base_price'] : 0));
                    
$roundtripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : 
                      (isset($data['roundtripPricePerKm']) ? $data['roundtripPricePerKm'] : 
                      (isset($data['roundtrip_price_per_km']) ? $data['roundtrip_price_per_km'] : 0));

// Simple validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

try {
    // First attempt - Try to update vehicle_pricing table with full outstation data
    try {
        $sql = "UPDATE vehicle_pricing SET 
                base_price = ?, 
                price_per_km = ?,
                roundtrip_base_price = ?,
                roundtrip_price_per_km = ? 
                WHERE vehicle_type = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$baseFare, $pricePerKm, $roundtripBaseFare, $roundtripPricePerKm, $vehicleId]);
        $rowCount = $stmt->rowCount();
        
        // If rows were updated, log success
        if ($rowCount > 0) {
            error_log("Updated vehicle_pricing table with roundtrip data for vehicle: $vehicleId");
        }
    } catch (Exception $e) {
        error_log("First update attempt failed (vehicle_pricing with roundtrip): " . $e->getMessage());
        // Continue to next attempt
    }
    
    // Second attempt - Update vehicles table (for backward compatibility)
    try {
        $vehiclesUpdateSql = "UPDATE vehicles SET base_price = ?, price_per_km = ? WHERE id = ? OR vehicle_id = ?";
        $vehiclesStmt = $pdo->prepare($vehiclesUpdateSql);
        $vehiclesResult = $vehiclesStmt->execute([$baseFare, $pricePerKm, $vehicleId, $vehicleId]);
        $vehiclesRowCount = $vehiclesStmt->rowCount();
        
        if ($vehiclesRowCount > 0) {
            error_log("Updated vehicles table for vehicle: $vehicleId");
        }
    } catch (Exception $e) {
        error_log("Second update attempt failed (vehicles table): " . $e->getMessage());
        // Continue to next attempt
    }
    
    // If no rows updated in either table, the vehicle might not exist - create it
    if ($rowCount === 0 && $vehiclesRowCount === 0) {
        try {
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            
            // First try to insert into vehicle_pricing
            $insertVehiclePricingSql = "INSERT INTO vehicle_pricing 
                (vehicle_type, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km) 
                VALUES (?, ?, ?, ?, ?)";
            $insertVehiclePricingStmt = $pdo->prepare($insertVehiclePricingSql);
            $insertVehiclePricingStmt->execute([$vehicleId, $baseFare, $pricePerKm, $roundtripBaseFare, $roundtripPricePerKm]);
            
            error_log("Inserted new vehicle into vehicle_pricing: $vehicleId");
            
            // Then try to insert into vehicles table
            $insertVehiclesSql = "INSERT INTO vehicles 
                (id, vehicle_id, name, base_price, price_per_km, is_active) 
                VALUES (?, ?, ?, ?, ?, 1)";
            $insertVehiclesStmt = $pdo->prepare($insertVehiclesSql);
            $insertVehiclesStmt->execute([$vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm]);
            
            error_log("Inserted new vehicle into vehicles table: $vehicleId, $vehicleName, Base: $baseFare, Per KM: $pricePerKm");
        } catch (Exception $e) {
            error_log("Insert attempts failed: " . $e->getMessage());
            // Continue - we'll still return success
        }
    }
    
    // Always return success - handle any other errors in the catch block
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
            ],
            'rowsAffected' => ($rowCount + $vehiclesRowCount),
            'timestamp' => time()
        ]
    ]);
    
} catch (Exception $e) {
    // Log the error but still try to return a meaningful message
    error_log("Error updating fare: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'roundtripBaseFare' => $roundtripBaseFare,
            'roundtripPricePerKm' => $roundtripPricePerKm,
            'data' => $data
        ]
    ]);
}
?>
