
<?php
// vehicles-update.php - Endpoint for creating and updating vehicles

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

// Get the raw input and try to parse it as JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// If JSON parsing failed, try POST/GET data
if (json_last_error() !== JSON_ERROR_NONE) {
    $data = $_REQUEST;
}

// Debug information
$response['debug'] = [
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'request_params' => $_REQUEST,
    'post_data' => $_POST,
    'timestamp' => date('Y-m-d H:i:s')
];

// Extract vehicle ID from all possible sources
$vehicleId = null;
if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['id'])) {
    $vehicleId = $data['id'];
}

// Check for create new vehicle mode
$isNewVehicle = isset($data['isNew']) && $data['isNew'] === true;

// If it's a new vehicle and no vehicleId provided, generate one
if ($isNewVehicle && empty($vehicleId)) {
    // Generate a vehicle_id based on name or use a random one
    if (!empty($data['name'])) {
        // Convert name to lowercase, replace spaces with underscores
        $vehicleId = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $data['name']));
        // Ensure uniqueness by adding timestamp if needed
        if (strlen($vehicleId) < 3) {
            $vehicleId .= '_' . time();
        }
    } else {
        // Fallback to a random vehicle ID
        $vehicleId = 'vehicle_' . time();
    }
    
    $response['details']['generated_id'] = true;
}

// Extract other vehicle data
$name = isset($data['name']) ? $data['name'] : '';
$capacity = isset($data['capacity']) ? intval($data['capacity']) : 4;
$luggageCapacity = isset($data['luggageCapacity']) ? intval($data['luggageCapacity']) : 2;
$ac = isset($data['ac']) ? intval($data['ac']) : 1;
$isActive = isset($data['isActive']) ? intval($data['isActive']) : 1;
$image = isset($data['image']) ? $data['image'] : '';
$amenities = isset($data['amenities']) ? $data['amenities'] : '';
$description = isset($data['description']) ? $data['description'] : '';

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Validate required parameters
if (!$vehicleId) {
    $response['message'] = 'Missing required parameter: vehicleId';
    echo json_encode($response);
    exit();
}

// Convert amenities to a JSON string if it's an array
if (is_array($amenities)) {
    $amenities = json_encode($amenities);
}

try {
    // Connect to the database
    $conn = getDbConnection();
    
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
    
    // Check if vehicle exists
    $checkQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkQuery);
    
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Vehicle exists, update it
        $updateQuery = "UPDATE vehicle_types SET 
                       name = ?, 
                       capacity = ?, 
                       luggage_capacity = ?, 
                       ac = ?, 
                       is_active = ?,
                       image = ?,
                       amenities = ?,
                       description = ?
                       WHERE vehicle_id = ?";
        
        $stmt = $conn->prepare($updateQuery);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        $stmt->bind_param("siiiissss", $name, $capacity, $luggageCapacity, $ac, $isActive, $image, $amenities, $description, $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $response['status'] = 'success';
            $response['message'] = 'Vehicle updated successfully';
            $response['details']['updated'] = true;
        } else {
            $response['status'] = 'success';
            $response['message'] = 'No changes made to vehicle';
            $response['details']['unchanged'] = true;
        }
    } else {
        // Vehicle doesn't exist, create it
        $insertQuery = "INSERT INTO vehicle_types (
                       vehicle_id, name, capacity, luggage_capacity, ac, is_active, image, amenities, description
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($insertQuery);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        $stmt->bind_param("ssiiiisss", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $isActive, $image, $amenities, $description);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $vehicleTypeId = $stmt->insert_id;
            $response['status'] = 'success';
            $response['message'] = 'Vehicle created successfully';
            $response['details']['created'] = true;
            $response['details']['id'] = $vehicleTypeId;
            $response['details']['vehicle_id'] = $vehicleId;
        } else {
            throw new Exception("Failed to insert vehicle: " . $conn->error);
        }
    }
    
    // Create default fare entries if they don't exist
    
    // Outstation fares
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Default outstation fares
        $basePrice = 2500;
        $pricePerKm = 14;
        $nightHaltCharge = 700;
        $driverAllowance = 250;
        $roundTripBasePrice = 2000;
        $roundTripPricePerKm = 12;
        
        if (stripos($vehicleId, 'ertiga') !== false) {
            $basePrice = 3200;
            $pricePerKm = 18;
            $nightHaltCharge = 1000;
            $roundTripBasePrice = 2800;
            $roundTripPricePerKm = 16;
        } else if (stripos($vehicleId, 'innova') !== false) {
            $basePrice = 3800;
            $pricePerKm = 20;
            $nightHaltCharge = 1000;
            $roundTripBasePrice = 3400;
            $roundTripPricePerKm = 18;
        }
        
        // Check if outstation_fares table has base_price or base_fare column
        $columnsResult = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'base_price'");
        if ($columnsResult->num_rows > 0) {
            $insertQuery = "INSERT INTO outstation_fares (
                           vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                           roundtrip_base_price, roundtrip_price_per_km
                           ) VALUES (?, ?, ?, ?, ?, ?, ?)";
        } else {
            $insertQuery = "INSERT INTO outstation_fares (
                           vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, 
                           roundtrip_base_price, roundtrip_price_per_km
                           ) VALUES (?, ?, ?, ?, ?, ?, ?)";
        }
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("sdddddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, 
                          $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm);
        $stmt->execute();
        
        $response['details']['outstation_fares_created'] = true;
    }
    
    // Local package fares
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Default local package fares
        $price4hrs40km = 1600;
        $price8hrs80km = 2800;
        $price10hrs100km = 3400;
        $priceExtraKm = 14;
        $priceExtraHour = 150;
        
        if (stripos($vehicleId, 'ertiga') !== false) {
            $price4hrs40km = 2200;
            $price8hrs80km = 3800;
            $price10hrs100km = 4400;
            $priceExtraKm = 18;
            $priceExtraHour = 200;
        } else if (stripos($vehicleId, 'innova') !== false) {
            $price4hrs40km = 2600;
            $price8hrs80km = 4400;
            $price10hrs100km = 5000;
            $priceExtraKm = 20;
            $priceExtraHour = 250;
        }
        
        $insertQuery = "INSERT INTO local_package_fares (
                       vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                       price_extra_km, price_extra_hour
                       ) VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, 
                          $priceExtraKm, $priceExtraHour);
        $stmt->execute();
        
        $response['details']['local_fares_created'] = true;
    }
    
    // Airport transfer fares
    $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Default airport fares
        $basePrice = 1500;
        $pricePerKm = 14;
        $pickupPrice = 1600;
        $dropPrice = 1500;
        $tier1Price = 1600;
        $tier2Price = 1800;
        $tier3Price = 2200;
        $tier4Price = 2600;
        $extraKmCharge = 14;
        
        if (stripos($vehicleId, 'ertiga') !== false) {
            $basePrice = 2000;
            $pricePerKm = 18;
            $pickupPrice = 2000;
            $dropPrice = 1900;
            $tier1Price = 2000;
            $tier2Price = 2200;
            $tier3Price = 2600;
            $tier4Price = 3000;
            $extraKmCharge = 18;
        } else if (stripos($vehicleId, 'innova') !== false) {
            $basePrice = 2500;
            $pricePerKm = 20;
            $pickupPrice = 2400;
            $dropPrice = 2300;
            $tier1Price = 2400;
            $tier2Price = 2600;
            $tier3Price = 3000;
            $tier4Price = 3400;
            $extraKmCharge = 20;
        }
        
        $insertQuery = "INSERT INTO airport_transfer_fares (
                       vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                       tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("sddddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                           $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
        $stmt->execute();
        
        $response['details']['airport_fares_created'] = true;
    }
    
    // Also make sure the vehicle exists in vehicle_pricing for compatibility
    $stmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? OR vehicle_type = ?");
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Default pricing in vehicle_pricing
        $insertQuery = "INSERT INTO vehicle_pricing (
                       vehicle_id, vehicle_type, trip_type
                       ) VALUES (?, ?, 'all')";
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("ss", $vehicleId, $vehicleId);
        $stmt->execute();
        
        $response['details']['vehicle_pricing_created'] = true;
    }
    
    // Output the response
    echo json_encode($response);
    exit();
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['details']['error_trace'] = $e->getTraceAsString();
    
    echo json_encode($response);
    exit();
}
