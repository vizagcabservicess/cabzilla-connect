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
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating outstation fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    // Also update the main vehicles table to keep pricing consistent
    $stmt = $conn->prepare("UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ? WHERE id = ? OR vehicle_id = ?");
    $stmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
    $stmt->execute();
    
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
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE local_package_fares SET price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ?, price_extra_hour = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("dddds", $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO local_package_fares (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sdddd", $vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating local fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
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
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE airport_transfer_fares SET pickup_fare = ?, drop_fare = ?, updated_at = NOW() WHERE vehicle_id = ?");
        $stmt->bind_param("dds", $pickupFare, $dropFare, $vehicleId);
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO airport_transfer_fares (vehicle_id, pickup_fare, drop_fare, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("sdd", $vehicleId, $pickupFare, $dropFare);
    }
    
    if (!$stmt->execute()) {
        logError("Database error updating airport fares", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
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
    
    // Check if vehicle exists - skip this check to allow new vehicles
    /*if (!vehicleExists($conn, $vehicleId)) {
        logError("Vehicle not found", ['vehicleId' => $vehicleId]);
        sendJsonResponse(['status' => 'error', 'message' => 'Vehicle not found: ' . $vehicleId], 404);
        exit;
    }*/
    
    // Switch based on trip type
    $success = false;
    
    // Map trip types to their handling tables
    $tableMap = [
        'outstation' => 'outstation_fares',
        'local' => 'local_package_fares',
        'airport' => 'airport_transfer_fares',
        'base' => 'vehicles',
        'tour' => 'tour_fares'
    ];
    
    $tableName = isset($tableMap[$tripType]) ? $tableMap[$tripType] : '';
    
    if (empty($tableName)) {
        logError("Invalid trip type", ['tripType' => $tripType]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
        exit;
    }
    
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
            $stmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
            $stmt->bind_param("ss", $vehicleId, $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing vehicle
                $stmt = $conn->prepare("UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?");
                $stmt->bind_param("ddddss", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
            } else {
                // Insert new vehicle
                $stmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())");
                $name = ucfirst(str_replace('_', ' ', $vehicleId));
                $stmt->bind_param("sssdddd", $vehicleId, $vehicleId, $name, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            }
            
            $success = $stmt->execute();
            if (!$success) {
                logError("Database error updating base pricing", ['error' => $stmt->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
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
