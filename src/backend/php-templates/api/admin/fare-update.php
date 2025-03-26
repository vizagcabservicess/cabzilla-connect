
<?php
// fare-update.php - Universal fare update endpoint

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include necessary files
require_once '../../config.php';

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'No action taken',
    'details' => []
];

// Get the trip type from the request (default to 'outstation')
$tripType = isset($_REQUEST['tripType']) ? $_REQUEST['tripType'] : 'outstation';
$vehicleId = isset($_REQUEST['vehicleId']) ? $_REQUEST['vehicleId'] : null;

// Debug information
$response['debug'] = [
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'request_params' => $_REQUEST,
    'trip_type' => $tripType,
    'vehicle_id' => $vehicleId,
    'post_data' => $_POST,
    'timestamp' => date('Y-m-d H:i:s')
];

// Validate required parameters
if (!$vehicleId) {
    $response['message'] = 'Missing required parameter: vehicleId';
    echo json_encode($response);
    exit();
}

try {
    // Connect to the database
    $conn = getDbConnection();
    
    // Ensure tables exist
    ensureFareTables($conn);
    
    // Update fares based on trip type
    switch ($tripType) {
        case 'outstation':
            updateOutstationFares($conn, $vehicleId, $_REQUEST);
            break;
        case 'local':
            updateLocalFares($conn, $vehicleId, $_REQUEST);
            break;
        case 'airport':
            updateAirportFares($conn, $vehicleId, $_REQUEST);
            break;
        default:
            throw new Exception("Invalid trip type: $tripType");
    }
    
    $response['status'] = 'success';
    $response['message'] = "Successfully updated $tripType fares for $vehicleId";
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['details']['error_trace'] = $e->getTraceAsString();
}

// Output the response
echo json_encode($response);
exit();

/**
 * Ensure all fare tables exist in the database
 */
function ensureFareTables($conn) {
    // Check if outstation_fares table exists
    $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($result->num_rows == 0) {
        // Create outstation_fares table
        $sql = "CREATE TABLE outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
            roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
            roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating outstation_fares table: " . $conn->error);
        }
    }
    
    // Check if local_package_fares table exists
    $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($result->num_rows == 0) {
        // Create local_package_fares table
        $sql = "CREATE TABLE local_package_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating local_package_fares table: " . $conn->error);
        }
    }
    
    // Check if airport_transfer_fares table exists
    $result = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    if ($result->num_rows == 0) {
        // Create airport_transfer_fares table
        $sql = "CREATE TABLE airport_transfer_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating airport_transfer_fares table: " . $conn->error);
        }
    }
}

/**
 * Update outstation fares
 */
function updateOutstationFares($conn, $vehicleId, $data) {
    // Get parameters from request
    $basePrice = isset($data['basePrice']) ? (float)$data['basePrice'] : 0;
    $pricePerKm = isset($data['pricePerKm']) ? (float)$data['pricePerKm'] : 0;
    $nightHaltCharge = isset($data['nightHaltCharge']) ? (float)$data['nightHaltCharge'] : 
                       (isset($data['nightHalt']) ? (float)$data['nightHalt'] : 0);
    $driverAllowance = isset($data['driverAllowance']) ? (float)$data['driverAllowance'] : 0;
    $roundTripBasePrice = isset($data['roundTripBasePrice']) ? (float)$data['roundTripBasePrice'] : 0;
    $roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? (float)$data['roundTripPricePerKm'] : 0;
    
    // Check if vehicle already exists
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE outstation_fares SET 
            base_price = ?, 
            price_per_km = ?, 
            night_halt_charge = ?, 
            driver_allowance = ?, 
            roundtrip_base_price = ?, 
            roundtrip_price_per_km = ? 
            WHERE vehicle_id = ?");
        
        $stmt->bind_param(
            "dddddds", 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance, 
            $roundTripBasePrice, 
            $roundTripPricePerKm, 
            $vehicleId
        );
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO outstation_fares (
            vehicle_id, 
            base_price, 
            price_per_km, 
            night_halt_charge, 
            driver_allowance, 
            roundtrip_base_price, 
            roundtrip_price_per_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "sdddddd", 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance, 
            $roundTripBasePrice, 
            $roundTripPricePerKm
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error updating outstation fares: " . $stmt->error);
    }
}

/**
 * Update local package fares
 */
function updateLocalFares($conn, $vehicleId, $data) {
    // Get parameters from request
    $price4hr = isset($data['price4hr']) ? (float)$data['price4hr'] : 0;
    $price8hr = isset($data['price8hr']) ? (float)$data['price8hr'] : 0;
    $price10hr = isset($data['price10hr']) ? (float)$data['price10hr'] : 0;
    $extraKm = isset($data['extraKm']) ? (float)$data['extraKm'] : 0;
    $extraHour = isset($data['extraHour']) ? (float)$data['extraHour'] : 0;
    
    // Check if vehicle already exists
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE local_package_fares SET 
            price_4hrs_40km = ?, 
            price_8hrs_80km = ?, 
            price_10hrs_100km = ?, 
            price_extra_km = ?, 
            price_extra_hour = ? 
            WHERE vehicle_id = ?");
        
        $stmt->bind_param(
            "ddddds", 
            $price4hr, 
            $price8hr, 
            $price10hr, 
            $extraKm, 
            $extraHour, 
            $vehicleId
        );
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO local_package_fares (
            vehicle_id, 
            price_4hrs_40km, 
            price_8hrs_80km, 
            price_10hrs_100km, 
            price_extra_km, 
            price_extra_hour
        ) VALUES (?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "sddddd", 
            $vehicleId, 
            $price4hr, 
            $price8hr, 
            $price10hr, 
            $extraKm, 
            $extraHour
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error updating local package fares: " . $stmt->error);
    }
}

/**
 * Update airport transfer fares
 */
function updateAirportFares($conn, $vehicleId, $data) {
    // Get parameters from request
    $basePrice = isset($data['basePrice']) ? (float)$data['basePrice'] : 0;
    $pricePerKm = isset($data['pricePerKm']) ? (float)$data['pricePerKm'] : 0;
    $pickupPrice = isset($data['pickupPrice']) ? (float)$data['pickupPrice'] : 0;
    $dropPrice = isset($data['dropPrice']) ? (float)$data['dropPrice'] : 0;
    $tier1Price = isset($data['tier1Price']) ? (float)$data['tier1Price'] : 0;
    $tier2Price = isset($data['tier2Price']) ? (float)$data['tier2Price'] : 0;
    $tier3Price = isset($data['tier3Price']) ? (float)$data['tier3Price'] : 0;
    $tier4Price = isset($data['tier4Price']) ? (float)$data['tier4Price'] : 0;
    $extraKmCharge = isset($data['extraKmCharge']) ? (float)$data['extraKmCharge'] : 0;
    
    // Check if vehicle already exists
    $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE airport_transfer_fares SET 
            base_price = ?, 
            price_per_km = ?, 
            pickup_price = ?, 
            drop_price = ?, 
            tier1_price = ?, 
            tier2_price = ?, 
            tier3_price = ?, 
            tier4_price = ?, 
            extra_km_charge = ? 
            WHERE vehicle_id = ?");
        
        $stmt->bind_param(
            "ddddddddds", 
            $basePrice, 
            $pricePerKm, 
            $pickupPrice, 
            $dropPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge, 
            $vehicleId
        );
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO airport_transfer_fares (
            vehicle_id, 
            base_price, 
            price_per_km, 
            pickup_price, 
            drop_price, 
            tier1_price, 
            tier2_price, 
            tier3_price, 
            tier4_price, 
            extra_km_charge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "sdddddddd",
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $pickupPrice, 
            $dropPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error updating airport transfer fares: " . $stmt->error);
    }
}
