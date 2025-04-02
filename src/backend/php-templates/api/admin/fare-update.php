
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

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'No action taken',
    'details' => []
];

// Get the trip type from the request (default to 'outstation')
$tripType = isset($_REQUEST['tripType']) ? $_REQUEST['tripType'] : 'outstation';
$vehicleId = isset($_REQUEST['vehicleId']) ? $_REQUEST['vehicleId'] : null;

// Log the request
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Fare update request: " . json_encode($_REQUEST), 3, $logDir . '/fare-update.log');

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

// Known numeric ID to vehicle_id mappings - CRITICALLY IMPORTANT FOR PREVENTING DUPLICATE VEHICLES
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',   // Map these duplicates back to proper vehicle_id
    '1271' => 'etios', // Map these duplicates back to proper vehicle_id
    '1272' => 'etios'  // Map these duplicates back to proper vehicle_id
];

// Normalize vehicle ID - critically important
if (!empty($vehicleId)) {
    // Remove "item-" prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // If this is a known numeric ID, convert it to the proper vehicle_id
    if (isset($knownMappings[$vehicleId])) {
        $originalId = $vehicleId;
        $vehicleId = $knownMappings[$vehicleId];
        error_log("[$timestamp] Converted numeric ID $originalId to vehicle_id: $vehicleId", 3, $logDir . '/fare-update.log');
        $response['details']['id_conversion'] = "Converted $originalId to $vehicleId";
    }
    
    // If this is still a numeric ID, try to look up the actual vehicle_id
    if (is_numeric($vehicleId)) {
        try {
            $conn = getDbConnection();
            $query = "SELECT vehicle_id FROM vehicles WHERE id = ? LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                if (!empty($row['vehicle_id'])) {
                    $originalId = $vehicleId;
                    $vehicleId = $row['vehicle_id'];
                    error_log("[$timestamp] Found actual vehicle_id '$vehicleId' for numeric ID $originalId", 3, $logDir . '/fare-update.log');
                    $response['details']['id_lookup'] = "Found proper ID $vehicleId for $originalId";
                }
            }
        } catch (Exception $e) {
            error_log("[$timestamp] Error looking up vehicle_id: " . $e->getMessage(), 3, $logDir . '/fare-update.log');
        }
    }
}

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
    
    // Check if vehicle exists in vehicle_types
    $checkVehicleQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkVehicleQuery);
    
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Also check if vehicle exists in vehicles table
    $checkVehiclesQuery = "SELECT id FROM vehicles WHERE vehicle_id = ?";
    $stmt2 = $conn->prepare($checkVehiclesQuery);
    
    if (!$stmt2) {
        throw new Exception("Failed to prepare vehicles check statement: " . $conn->error);
    }
    
    $stmt2->bind_param("s", $vehicleId);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    
    $vehicleInTypes = ($result->num_rows > 0);
    $vehicleInVehicles = ($result2->num_rows > 0);
    
    if (!$vehicleInTypes && !$vehicleInVehicles) {
        // Vehicle doesn't exist in either table, this is potentially dangerous
        // If it's a numeric ID, we definitely should not create a new vehicle
        if (is_numeric($vehicleId) && intval($vehicleId) > 10) {
            throw new Exception("Cannot update fares for numeric ID $vehicleId as it may create a duplicate vehicle");
        }
        
        // For non-numeric IDs or small numbers (like vehicle types 1, 2), we can create the vehicle
        $insertVehicleQuery = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active) 
                              VALUES (?, ?, ?, ?, 1, 1)";
        $stmt = $conn->prepare($insertVehicleQuery);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare vehicle insert statement: " . $conn->error);
        }
        
        $name = isset($_REQUEST['name']) ? $_REQUEST['name'] : ucfirst($vehicleId);
        $capacity = isset($_REQUEST['capacity']) ? intval($_REQUEST['capacity']) : 4;
        $luggageCapacity = isset($_REQUEST['luggageCapacity']) ? intval($_REQUEST['luggageCapacity']) : 2;
        
        $stmt->bind_param("ssii", $vehicleId, $name, $capacity, $luggageCapacity);
        $stmt->execute();
        
        $response['details']['vehicle_created'] = true;
        error_log("[$timestamp] Created new vehicle: $vehicleId", 3, $logDir . '/fare-update.log');
    }
    
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
    $response['vehicleId'] = $vehicleId; // Include the normalized vehicle ID in the response
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['details']['error_trace'] = $e->getTraceAsString();
    error_log("[$timestamp] Error in fare-update.php: " . $e->getMessage(), 3, $logDir . '/fare-update.log');
}

// Output the response
echo json_encode($response);
exit();

/**
 * Ensure all fare tables exist in the database
 */
function ensureFareTables($conn) {
    // Check if vehicle_types table exists
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
    if ($result->num_rows == 0) {
        // Create vehicle_types table
        $sql = "CREATE TABLE vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255),
            amenities TEXT,
            description TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating vehicle_types table: " . $conn->error);
        }
    }
    
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
    $basePrice = isset($data['basePrice']) ? (float)$data['basePrice'] : 
                (isset($data['oneWayBasePrice']) ? (float)$data['oneWayBasePrice'] : 0);
    
    $pricePerKm = isset($data['pricePerKm']) ? (float)$data['pricePerKm'] : 
                 (isset($data['oneWayPricePerKm']) ? (float)$data['oneWayPricePerKm'] : 0);
    
    $nightHaltCharge = isset($data['nightHaltCharge']) ? (float)$data['nightHaltCharge'] : 
                       (isset($data['nightHalt']) ? (float)$data['nightHalt'] : 0);
    
    $driverAllowance = isset($data['driverAllowance']) ? (float)$data['driverAllowance'] : 0;
    
    $roundTripBasePrice = isset($data['roundTripBasePrice']) ? (float)$data['roundTripBasePrice'] : 0;
    
    $roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? (float)$data['roundTripPricePerKm'] : 0;
    
    // Check if vehicle already exists in outstation_fares
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
    
    // Check if vehicle already exists in local_package_fares
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
    
    // Check if vehicle already exists in airport_transfer_fares
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
