<?php
// direct-outstation-fares.php - Ultra simple direct outstation fare update endpoint
// Stripped-down version with maximum compatibility and minimal error sources

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('X-Debug: Direct outstation fares endpoint accessed');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database connection parameters - direct connection for maximum reliability
$db_host = 'localhost';
$db_name = 'u644605165_new_bookingdb';
$db_user = 'u644605165_new_bookingusr';
$db_pass = 'Vizag@1213';

// Log the request for debugging
$timestamp = date('Y-m-d H:i:s');
$logMessage = "[$timestamp] Direct outstation fares update request received\n";
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "Headers: " . json_encode(getallheaders()) . "\n";
$logMessage .= "Raw input: " . file_get_contents('php://input') . "\n";
$logMessage .= "POST data: " . json_encode($_POST) . "\n"; 
$logMessage .= "GET data: " . json_encode($_GET) . "\n";
error_log($logMessage, 3, __DIR__ . '/../direct-fares.log');

// Connect to database directly (no include files)
try {
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    if ($conn->connect_error) {
        error_log("Database connection failed: " . $conn->connect_error);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed', 'error' => $conn->connect_error]);
        exit;
    }
} catch (Exception $e) {
    error_log("Database connection exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed', 'error' => $e->getMessage()]);
    exit;
}

// Parse input data from all possible sources
$data = [];

// Try JSON
$json_input = file_get_contents('php://input');
$json_data = json_decode($json_input, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
    error_log("Using JSON data: " . json_encode($data));
} 
// Try POST
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
} 
// Try GET as last resort
else if (!empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data: " . json_encode($data));
}
// Try parsing raw input as form data
else {
    parse_str($json_input, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
        error_log("Using parsed form data: " . json_encode($data));
    }
}

// Extract vehicle ID from all possible sources with fallbacks
$vehicleId = null;
if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['id'])) {
    $vehicleId = $data['id'];
} else if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
} else if (isset($_GET['vehicleId'])) {
    $vehicleId = $_GET['vehicleId'];
}

// Clean vehicleId - remove "item-" prefix if exists
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks for maximum compatibility
$baseFare = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
           (isset($data['baseFare']) ? $data['baseFare'] : 
           (isset($data['basePrice']) ? $data['basePrice'] : 
           (isset($data['base_fare']) ? $data['base_fare'] : 
           (isset($data['base_price']) ? $data['base_price'] : 0))));
           
$pricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
             (isset($data['pricePerKm']) ? $data['pricePerKm'] : 
             (isset($data['price_per_km']) ? $data['price_per_km'] : 
             (isset($data['rate_per_km']) ? $data['rate_per_km'] : 0)));

// For night halt charge and driver allowance
$nightHaltCharge = isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 
                  (isset($data['night_halt_charge']) ? $data['night_halt_charge'] : 0);
                  
$driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 
                  (isset($data['driver_allowance']) ? $data['driver_allowance'] : 0);

if (empty($vehicleId)) {
    error_log("No vehicle ID found in request");
    http_response_code(400);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Vehicle ID is required', 
        'received_data' => $data,
        'debug' => [
            'post' => $_POST,
            'get' => $_GET,
            'raw' => file_get_contents('php://input')
        ]
    ]);
    exit;
}

// First, check if vehicle exists in vehicles table
$vehicleExists = false;
$vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
$stmt = $conn->prepare($vehicleQuery);
if ($stmt) {
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicleExists = ($result->num_rows > 0);
    $stmt->close();
}

// If vehicle doesn't exist, create it
if (!$vehicleExists) {
    $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
    $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
    $insertStmt = $conn->prepare($insertVehicleQuery);
    if ($insertStmt) {
        $insertStmt->bind_param("sssdddd", $vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        $insertStmt->execute();
        $insertStmt->close();
        error_log("Created new vehicle: $vehicleId with name $vehicleName");
    } else {
        error_log("Error preparing statement to insert vehicle: " . $conn->error);
    }
}

// Then update outstation_fares table
$outstationFareExists = false;
$checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
$stmt = $conn->prepare($checkQuery);
if ($stmt) {
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $outstationFareExists = ($result->num_rows > 0);
    $stmt->close();
}

$success = false;
if ($outstationFareExists) {
    // Update existing outstation fare record
    $updateQuery = "UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?";
    $updateStmt = $conn->prepare($updateQuery);
    if ($updateStmt) {
        $updateStmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
        $success = $updateStmt->execute();
        $updateStmt->close();
    } else {
        error_log("Error preparing statement to update outstation_fares: " . $conn->error);
    }
} else {
    // Insert new outstation fare record
    $insertQuery = "INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
    $insertStmt = $conn->prepare($insertQuery);
    if ($insertStmt) {
        $insertStmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        $success = $insertStmt->execute();
        $insertStmt->close();
    } else {
        error_log("Error preparing statement to insert outstation_fares: " . $conn->error);
    }
}

// Also update the main vehicles table to keep pricing consistent
$updateVehicleQuery = "UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?";
$updateVehicleStmt = $conn->prepare($updateVehicleQuery);
if ($updateVehicleStmt) {
    $updateVehicleStmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
    $updateVehicleSuccess = $updateVehicleStmt->execute();
    $updateVehicleStmt->close();
    
    if ($updateVehicleSuccess) {
        error_log("Successfully updated vehicles table for $vehicleId");
    } else {
        error_log("Failed to update vehicles table: " . $conn->error);
    }
}

// Return response
if ($success) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'baseFare' => floatval($baseFare),
            'pricePerKm' => floatval($pricePerKm),
            'nightHaltCharge' => floatval($nightHaltCharge),
            'driverAllowance' => floatval($driverAllowance)
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Failed to update outstation fares', 
        'error' => $conn->error,
        'debug' => [
            'vehicleId' => $vehicleId,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'data' => $data
        ]
    ]);
}

// Close connection
$conn->close();
?>
