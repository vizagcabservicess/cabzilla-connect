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
    
    // Check required fields
    if (!isset($fareData['baseFare']) || !isset($fareData['pricePerKm'])) {
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
    
    // Check required fields
    if (!isset($fareData['price8hrs80km']) || !isset($fareData['price10hrs100km']) || !isset($fareData['priceExtraKm']) || !isset($fareData['priceExtraHour'])) {
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
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    return true;
}

// Function to update or create airport transfer fares
function updateAirportFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Check required fields
    if (!isset($fareData['pickupFare']) || !isset($fareData['dropFare'])) {
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
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        return false;
    }
    
    return true;
}

// Function to handle tour fare updates for a specific vehicle
function updateTourFares($conn, $vehicleId, $tourId, $price) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Convert to numeric value
    $price = floatval($price);
    
    // Determine the column name based on vehicle ID
    $columnMap = [
        'sedan' => 'sedan',
        'ertiga' => 'ertiga',
        'innova' => 'innova',
        'innova_crysta' => 'innova',
        'tempo' => 'tempo',
        'luxury' => 'luxury'
    ];
    
    $columnName = $columnMap[$vehicleId] ?? null;
    
    if (!$columnName) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid vehicle ID for tour pricing: ' . $vehicleId], 400);
        return false;
    }
    
    // Check if tour exists
    $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
    $stmt->bind_param("s", $tourId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Tour not found: ' . $tourId], 404);
        return false;
    }
    
    // Update the price for this vehicle
    $sql = "UPDATE tour_fares SET " . $columnName . " = ?, updated_at = NOW() WHERE tour_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ds", $price, $tourId);
    
    if (!$stmt->execute()) {
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
    
    // Validate required fields
    if (!isset($data['vehicleId']) || !isset($data['tripType'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields: vehicleId and tripType'], 400);
        exit;
    }
    
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($data['vehicleId']);
    $tripType = $data['tripType'];
    
    // Check if vehicle exists
    if (!vehicleExists($conn, $vehicleId)) {
        sendJsonResponse(['status' => 'error', 'message' => 'Vehicle not found: ' . $vehicleId], 404);
        exit;
    }
    
    // Switch based on trip type
    $success = false;
    
    // Map trip types to their handling tables
    $tableMap = [
        'outstation' => 'outstation_fares',
        'local' => 'local_package_fares',
        'airport' => 'airport_transfer_fares',
        'tour' => 'tour_fares'
    ];
    
    $tableName = isset($tableMap[$tripType]) ? $tableMap[$tripType] : '';
    
    if (empty($tableName)) {
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
            
        case 'tour':
            // Tour fares require tourId as well
            if (!isset($data['tourId']) || !isset($data['price'])) {
                sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for tour fares: tourId and price'], 400);
                exit;
            }
            
            $success = updateTourFares($conn, $vehicleId, $data['tourId'], $data['price']);
            break;
    }
    
    if ($success) {
        sendJsonResponse(['status' => 'success', 'message' => 'Pricing updated successfully for ' . $tripType]);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to update pricing'], 500);
    }
} 
// Handle GET request to fetch pricing
else if ($method === 'GET') {
    // Get vehicle ID from query parameter
    $vehicleId = isset($_GET['vehicleId']) ? cleanVehicleId($_GET['vehicleId']) : null;
    
    if (!$vehicleId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required parameter: vehicleId'], 400);
        exit;
    }
    
    // Check if vehicle exists
    if (!vehicleExists($conn, $vehicleId)) {
        sendJsonResponse(['status' => 'error', 'message' => 'Vehicle not found: ' . $vehicleId], 404);
        exit;
    }
    
    // Fetch pricing data for all trip types
    $pricingData = [
        'vehicleId' => $vehicleId,
        'outstation' => null,
        'local' => null,
        'airport' => null
    ];
    
    // Get outstation fares
    $stmt = $conn->prepare("SELECT base_fare, price_per_km, night_halt_charge, driver_allowance FROM outstation_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $pricingData['outstation'] = [
            'baseFare' => (float)$row['base_fare'],
            'pricePerKm' => (float)$row['price_per_km'],
            'nightHaltCharge' => (float)$row['night_halt_charge'],
            'driverAllowance' => (float)$row['driver_allowance']
        ];
    }
    
    // Get local package fares
    $stmt = $conn->prepare("SELECT price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour FROM local_package_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $pricingData['local'] = [
            'price8hrs80km' => (float)$row['price_8hrs_80km'],
            'price10hrs100km' => (float)$row['price_10hrs_100km'],
            'priceExtraKm' => (float)$row['price_extra_km'],
            'priceExtraHour' => (float)$row['price_extra_hour']
        ];
    }
    
    // Get airport transfer fares
    $stmt = $conn->prepare("SELECT pickup_fare, drop_fare FROM airport_transfer_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $pricingData['airport'] = [
            'pickupFare' => (float)$row['pickup_fare'],
            'dropFare' => (float)$row['drop_fare']
        ];
    }
    
    sendJsonResponse($pricingData);
} else {
    // Method not allowed
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close database connection
$conn->close();
?>
