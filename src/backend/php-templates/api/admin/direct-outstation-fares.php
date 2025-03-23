
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
    error_log("Database connection successful", 3, __DIR__ . '/../logs/direct-fares.log');
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Extract data from all possible sources for maximum compatibility
$data = [];

// Try JSON first
$json_data = json_decode($requestData, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
    error_log("Parsed input as JSON", 3, __DIR__ . '/../logs/direct-fares.log');
} 
// Then try POST data
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data", 3, __DIR__ . '/../logs/direct-fares.log');
} 
// Then try GET data
else if (!empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data", 3, __DIR__ . '/../logs/direct-fares.log');
}
// Finally try parsing raw input as form data
else {
    parse_str($requestData, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
        error_log("Parsed input as form data", 3, __DIR__ . '/../logs/direct-fares.log');
    }
}

// Dump the extracted data for debugging
error_log("Extracted data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');

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
} else if (isset($data['vehicle'])) {
    $vehicleId = $data['vehicle'];
} else if (isset($data['vehicleType'])) {
    $vehicleId = $data['vehicleType'];
}

// Clean vehicleId - remove "item-" prefix if exists
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks
$baseFare = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
           (isset($data['baseFare']) ? $data['baseFare'] : 
           (isset($data['basePrice']) ? $data['basePrice'] : 
           (isset($data['base_price']) ? $data['base_price'] : 
           (isset($data['base_fare']) ? $data['base_fare'] : 0))));
           
$pricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
             (isset($data['pricePerKm']) ? $data['pricePerKm'] : 
             (isset($data['price_per_km']) ? $data['price_per_km'] : 
             (isset($data['per_km_price']) ? $data['per_km_price'] : 0)));

// Extract driver allowance and night halt
$driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 
                  (isset($data['driver_allowance']) ? $data['driver_allowance'] : 
                  (isset($data['allowance']) ? $data['allowance'] : 0));

$nightHalt = isset($data['nightHalt']) ? $data['nightHalt'] : 
            (isset($data['night_halt']) ? $data['night_halt'] : 
            (isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 
            (isset($data['night_halt_charge']) ? $data['night_halt_charge'] : 0)));

// Extract round trip data if available
$roundtripBaseFare = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : 
                    (isset($data['roundtripBasePrice']) ? $data['roundtripBasePrice'] : 
                    (isset($data['roundtrip_base_price']) ? $data['roundtrip_base_price'] : 
                    (isset($data['roundtrip_base_fare']) ? $data['roundtrip_base_fare'] : 0)));
                    
$roundtripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : 
                      (isset($data['roundtripPricePerKm']) ? $data['roundtripPricePerKm'] : 
                      (isset($data['roundtrip_price_per_km']) ? $data['roundtrip_price_per_km'] : 
                      (isset($data['roundtrip_per_km_price']) ? $data['roundtrip_per_km_price'] : 0)));

// Simple validation
if (empty($vehicleId)) {
    error_log("Vehicle ID is missing", 3, __DIR__ . '/../logs/direct-fares.log');
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Log the received values
error_log("Vehicle ID: $vehicleId, Base Fare: $baseFare, Per KM: $pricePerKm, Driver Allowance: $driverAllowance, Night Halt: $nightHalt, Round Base: $roundtripBaseFare, Round Per KM: $roundtripPricePerKm", 3, __DIR__ . '/../logs/direct-fares.log');

try {
    // First check if this vehicle exists
    $checkSql = "SELECT COUNT(*) FROM vehicles WHERE id = ? OR vehicle_id = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([$vehicleId, $vehicleId]);
    $vehicleExists = ($checkStmt->fetchColumn() > 0);
    
    if (!$vehicleExists) {
        // Create a new vehicle if it doesn't exist
        $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
        $insertVehicleSql = "INSERT INTO vehicles 
            (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
        $insertVehicleStmt = $pdo->prepare($insertVehicleSql);
        $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm, $nightHalt, $driverAllowance]);
        error_log("Created new vehicle: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    }
    
    // First try updating the vehicle_pricing table (new schema)
    try {
        $sql = "UPDATE vehicle_pricing SET 
                base_price = ?, 
                price_per_km = ?,
                driver_allowance = ?,
                night_halt_charge = ?,
                roundtrip_base_price = ?,
                roundtrip_price_per_km = ? 
                WHERE vehicle_type = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$baseFare, $pricePerKm, $driverAllowance, $nightHalt, $roundtripBaseFare, $roundtripPricePerKm, $vehicleId]);
        $rowCount = $stmt->rowCount();
        
        // If no rows updated, insert a new record
        if ($rowCount === 0) {
            $insertSql = "INSERT INTO vehicle_pricing 
                (vehicle_type, base_price, price_per_km, driver_allowance, night_halt_charge, roundtrip_base_price, roundtrip_price_per_km) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([$vehicleId, $baseFare, $pricePerKm, $driverAllowance, $nightHalt, $roundtripBaseFare, $roundtripPricePerKm]);
            error_log("Inserted new vehicle into vehicle_pricing: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
        } else {
            error_log("Updated vehicle_pricing for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error updating vehicle_pricing: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
        // Continue to fallbacks
    }
    
    // Also try updating the outstation_fares table (legacy schema)
    try {
        $checkOutstationSql = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
        $checkOutstationStmt = $pdo->prepare($checkOutstationSql);
        $checkOutstationStmt->execute([$vehicleId]);
        $outstationExists = $checkOutstationStmt->fetch();
        
        if ($outstationExists) {
            $updateOutstationSql = "UPDATE outstation_fares SET 
                base_fare = ?, 
                price_per_km = ?, 
                driver_allowance = ?, 
                night_halt_charge = ? 
                WHERE vehicle_id = ?";
            $updateOutstationStmt = $pdo->prepare($updateOutstationSql);
            $updateOutstationStmt->execute([$baseFare, $pricePerKm, $driverAllowance, $nightHalt, $vehicleId]);
            error_log("Updated outstation_fares for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
        } else {
            $insertOutstationSql = "INSERT INTO outstation_fares 
                (vehicle_id, base_fare, price_per_km, driver_allowance, night_halt_charge) 
                VALUES (?, ?, ?, ?, ?)";
            $insertOutstationStmt = $pdo->prepare($insertOutstationSql);
            $insertOutstationStmt->execute([$vehicleId, $baseFare, $pricePerKm, $driverAllowance, $nightHalt]);
            error_log("Inserted new record into outstation_fares for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
        }
    } catch (PDOException $e) {
        error_log("Error updating outstation_fares: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
        // Continue to next fallback
    }
    
    // Also update the vehicles table (primary table)
    try {
        $updateVehiclesSql = "UPDATE vehicles SET 
            base_price = ?, 
            price_per_km = ?, 
            driver_allowance = ?, 
            night_halt_charge = ? 
            WHERE id = ? OR vehicle_id = ?";
        $updateVehiclesStmt = $pdo->prepare($updateVehiclesSql);
        $updateVehiclesStmt->execute([$baseFare, $pricePerKm, $driverAllowance, $nightHalt, $vehicleId, $vehicleId]);
        error_log("Updated vehicles table for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
    } catch (PDOException $e) {
        error_log("Error updating vehicles table: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
        // Continue anyway
    }
    
    // If we got here, at least one operation succeeded
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle pricing updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pricing' => [
                'baseFare' => (float)$baseFare,
                'pricePerKm' => (float)$pricePerKm,
                'driverAllowance' => (float)$driverAllowance,
                'nightHalt' => (float)$nightHalt,
                'roundtripBaseFare' => (float)$roundtripBaseFare,
                'roundtripPricePerKm' => (float)$roundtripPricePerKm
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Critical error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'driverAllowance' => $driverAllowance,
            'nightHalt' => $nightHalt,
            'roundtripBaseFare' => $roundtripBaseFare,
            'roundtripPricePerKm' => $roundtripPricePerKm
        ]
    ]);
}
?>
