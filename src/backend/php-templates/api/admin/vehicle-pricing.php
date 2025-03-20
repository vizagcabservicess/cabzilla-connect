<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/headers.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

// Set necessary headers for CORS and JSON responses
setHeaders();

// Connect to the database
$conn = connectToDatabase();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendEmptyResponse();
    exit;
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Log incoming request for debugging
logError("Vehicle pricing request received", [
    'method' => $method,
    'uri' => $_SERVER['REQUEST_URI'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? ''
]);

// Function to check if a vehicle exists
function vehicleExists($conn, $vehicleId) {
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare stmt for checking if vehicle exists", ['error' => $conn->error]);
        return false;
    }
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

// Function to sanitize and clean a vehicle ID
function cleanVehicleId($vehicleId) {
    // Remove 'item-' prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        return substr($vehicleId, 5);
    }
    return $vehicleId;
}

// Function to update or create outstation fares
function updateOutstationFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating outstation fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['baseFare']) || !isset($fareData['pricePerKm'])) {
        logError("Missing required fields for outstation fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for outstation fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $baseFare = floatval($fareData['baseFare']);
    $pricePerKm = floatval($fareData['pricePerKm']);
    $nightHaltCharge = isset($fareData['nightHaltCharge']) ? floatval($fareData['nightHaltCharge']) : 0;
    $driverAllowance = isset($fareData['driverAllowance']) ? floatval($fareData['driverAllowance']) : 0;
    
    // First check if vehicle exists in vehicles table, if not create it
    $vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
    $vehicleStmt = $conn->prepare($vehicleQuery);
    if (!$vehicleStmt) {
        logError("Failed to prepare statement for vehicle check", ['error' => $conn->error]);
        return false;
    }
    
    $vehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $vehicleStmt->execute();
    $vehicleResult = $vehicleStmt->get_result();
    
    if ($vehicleResult->num_rows == 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, is_active, created_at, updated_at) 
                              VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        if (!$insertVehicleStmt) {
            logError("Failed to prepare statement for vehicle insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertVehicleStmt->bind_param("sssdd", $vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm);
        $insertVehicleStmt->execute();
        logError("Created new vehicle record", ['vehicleId' => $vehicleId]);
    }
    
    // Check if record exists in outstation_fares
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for outstation fare check", ['error' => $conn->error]);
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            logError("Failed to prepare statement for outstation fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for outstation fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        $success = $insertStmt->execute();
    }
    
    if (!$success) {
        logError("Database error updating outstation fares", ['error' => $stmt->error]);
        return false;
    }
    
    // Also update the main vehicles table to keep pricing consistent
    $updateVehicleQuery = "UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ? WHERE id = ? OR vehicle_id = ?";
    $updateVehicleStmt = $conn->prepare($updateVehicleQuery);
    if (!$updateVehicleStmt) {
        logError("Failed to prepare statement for vehicle update", ['error' => $conn->error]);
        return false;
    }
    
    $updateVehicleStmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
    $updateVehicleStmt->execute();
    
    logError("Successfully updated outstation fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Function to update or create local package fares
function updateLocalFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating local fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['price8hrs80km']) || !isset($fareData['price10hrs100km']) || !isset($fareData['priceExtraKm']) || !isset($fareData['priceExtraHour'])) {
        logError("Missing required fields for local fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for local fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $price8hrs80km = floatval($fareData['price8hrs80km']);
    $price10hrs100km = floatval($fareData['price10hrs100km']);
    $priceExtraKm = floatval($fareData['priceExtraKm']);
    $priceExtraHour = floatval($fareData['priceExtraHour']);
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for local fare check", ['error' => $conn->error]);
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE local_package_fares SET price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ?, price_extra_hour = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            logError("Failed to prepare statement for local fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("dddds", $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO local_package_fares (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for local fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sdddd", $vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        $success = $insertStmt->execute();
    }
    
    if (!$success) {
        logError("Database error updating local fares", ['error' => $stmt->error]);
        return false;
    }
    
    logError("Successfully updated local fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Function to update or create airport transfer fares
function updateAirportFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating airport fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields
    if (!isset($fareData['pickupFare']) || !isset($fareData['dropFare'])) {
        logError("Missing required fields for airport fares", $fareData);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for airport fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $pickupFare = floatval($fareData['pickupFare']);
    $dropFare = floatval($fareData['dropFare']);
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for airport fare check", ['error' => $conn->error]);
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE airport_transfer_fares SET pickup_fare = ?, drop_fare = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            logError("Failed to prepare statement for airport fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("dds", $pickupFare, $dropFare, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO airport_transfer_fares (vehicle_id, pickup_fare, drop_fare, created_at, updated_at) 
                       VALUES (?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for airport fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sdd", $vehicleId, $pickupFare, $dropFare);
        $success = $insertStmt->execute();
    }
    
    if (!$success) {
        logError("Database error updating airport fares", ['error' => $stmt->error]);
        return false;
    }
    
    logError("Successfully updated airport fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Handle POST request to update pricing
if ($method === 'POST') {
    // Get request body
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Log the incoming data
    logError("Received vehicle pricing update request", $data);
    
    // Validate required fields
    if (!isset($data['vehicleId']) || !isset($data['tripType'])) {
        logError("Missing required fields in request", $data);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields: vehicleId and tripType'], 400);
        exit;
    }
    
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($data['vehicleId']);
    $tripType = $data['tripType'];
    
    // Log the cleaned data
    logError("Cleaned vehicle pricing data", ['vehicleId' => $vehicleId, 'tripType' => $tripType]);
    
    // Switch based on trip type
    $success = false;
    
    // Handle different trip types
    switch ($tripType) {
        case 'outstation':
            $success = updateOutstationFares($conn, $vehicleId, $data);
            break;
            
        case 'local':
            $success = updateLocalFares($conn, $vehicleId, $data);
            break;
            
        case 'airport':
            $success = updateAirportFares($conn, $vehicleId, $data);
            break;
            
        case 'base':
            // Handle base price updates directly in the vehicles table
            if (!isset($data['basePrice']) || !isset($data['pricePerKm'])) {
                logError("Missing required fields for base pricing", $data);
                sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for base pricing'], 400);
                exit;
            }
            
            $basePrice = floatval($data['basePrice']);
            $pricePerKm = floatval($data['pricePerKm']);
            $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 0;
            $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
            
            // Check if vehicle exists, if not add it
            $vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
            $vehicleStmt = $conn->prepare($vehicleQuery);
            if (!$vehicleStmt) {
                logError("Failed to prepare statement for vehicle check in base pricing", ['error' => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                exit;
            }
            
            $vehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
            $vehicleStmt->execute();
            $vehicleResult = $vehicleStmt->get_result();
            
            if ($vehicleResult->num_rows > 0) {
                // Update existing vehicle
                $updateQuery = "UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?";
                $updateStmt = $conn->prepare($updateQuery);
                if (!$updateStmt) {
                    logError("Failed to prepare statement for vehicle update in base pricing", ['error' => $conn->error]);
                    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                    exit;
                }
                
                $updateStmt->bind_param("ddddss", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
                $success = $updateStmt->execute();
            } else {
                // Insert new vehicle
                $name = ucfirst(str_replace('_', ' ', $vehicleId));
                $insertQuery = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
                $insertStmt = $conn->prepare($insertQuery);
                if (!$insertStmt) {
                    logError("Failed to prepare statement for vehicle insert in base pricing", ['error' => $conn->error]);
                    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                    exit;
                }
                
                $insertStmt->bind_param("sssdddd", $vehicleId, $vehicleId, $name, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                $success = $insertStmt->execute();
            }
            
            if (!$success) {
                logError("Database error updating base pricing", ['error' => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
                exit;
            }
            
            // Also update outstation_fares for consistency
            $success = updateOutstationFares($conn, $vehicleId, [
                'baseFare' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ]);
            
            break;
            
        default:
            logError("Invalid trip type", ['tripType' => $tripType]);
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
            exit;
    }
    
    if ($success) {
        sendJsonResponse(['status' => 'success', 'message' => 'Pricing updated successfully for ' . $tripType, 'vehicleId' => $vehicleId]);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to update pricing'], 500);
    }
} 
// Handle GET request to fetch pricing
else if ($method === 'GET') {
    // Get all vehicles pricing data
    $query = "SELECT id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance FROM vehicles WHERE is_active = 1 ORDER BY name";
    $result = $conn->query($query);
    
    if (!$result) {
        logError("Database error fetching vehicle pricing", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    $vehicles = [];
    
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['id'] ?? $row['vehicle_id'];
        $vehicles[] = [
            'vehicleId' => $vehicleId,
            'vehicleType' => $row['name'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'nightHaltCharge' => (float)$row['night_halt_charge'],
            'driverAllowance' => (float)$row['driver_allowance']
        ];
    }
    
    sendJsonResponse($vehicles);
} else {
    // Method not allowed
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close database connection
$conn->close();
?>
