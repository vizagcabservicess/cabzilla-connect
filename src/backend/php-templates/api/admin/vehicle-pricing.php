<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/headers.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

// Set necessary headers for CORS and JSON responses with more permissive settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Force-Refresh');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json');

// For preflight OPTIONS request - respond immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect to the database
$conn = connectToDatabase();

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Log incoming request for debugging
error_log("Vehicle pricing request received: " . $method . " " . $_SERVER['REQUEST_URI']);

// Function to check if a vehicle exists
function vehicleExists($conn, $vehicleId) {
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    if (!$stmt) {
        error_log("Prepare failed for vehicle exists check: " . $conn->error);
        return false;
    }
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    if (!$stmt->execute()) {
        error_log("Execute failed for vehicle exists check: " . $stmt->error);
        return false;
    }
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
    error_log("Updating outstation fares for " . $vehicleId . ": " . json_encode($fareData));
    
    // Check required fields
    if (!isset($fareData['basePrice']) || !isset($fareData['pricePerKm'])) {
        error_log("Missing required fields for outstation fares: " . json_encode($fareData));
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for outstation fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $baseFare = floatval($fareData['basePrice']);
    $pricePerKm = floatval($fareData['pricePerKm']);
    $nightHaltCharge = isset($fareData['nightHaltCharge']) ? floatval($fareData['nightHaltCharge']) : 0;
    $driverAllowance = isset($fareData['driverAllowance']) ? floatval($fareData['driverAllowance']) : 0;
    
    try {
        // First check if the vehicle exists, if not create it
        if (!vehicleExists($conn, $vehicleId)) {
            $vehicleName = isset($fareData['name']) ? $fareData['name'] : ucfirst(str_replace('_', ' ', $vehicleId));
            $stmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for vehicle insert: " . $conn->error);
                throw new Exception("Database error preparing vehicle insert");
            }
            $stmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
            if (!$stmt->execute()) {
                error_log("Execute failed for vehicle insert: " . $stmt->error);
                // Continue anyway as the vehicle might exist in a different format
            }
        }
        
        // Check if record exists in outstation_fares
        $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
        if (!$stmt) {
            error_log("Prepare failed for outstation fares check: " . $conn->error);
            throw new Exception("Database error preparing outstation fares check");
        }
        $stmt->bind_param("s", $vehicleId);
        if (!$stmt->execute()) {
            error_log("Execute failed for outstation fares check: " . $stmt->error);
            throw new Exception("Database error executing outstation fares check");
        }
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?");
            if (!$stmt) {
                error_log("Prepare failed for outstation fares update: " . $conn->error);
                throw new Exception("Database error preparing outstation fares update");
            }
            $stmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
        } else {
            // Insert new record
            $stmt = $conn->prepare("INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for outstation fares insert: " . $conn->error);
                throw new Exception("Database error preparing outstation fares insert");
            }
            $stmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        }
        
        if (!$stmt->execute()) {
            error_log("Execute failed for outstation fares: " . $stmt->error);
            throw new Exception("Database error executing outstation fares operation");
        }
        
        // Also update the main vehicles table to keep pricing consistent
        $stmt = $conn->prepare("UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ? WHERE id = ? OR vehicle_id = ?");
        if (!$stmt) {
            error_log("Prepare failed for vehicles update: " . $conn->error);
            throw new Exception("Database error preparing vehicles update");
        }
        $stmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
        if (!$stmt->execute()) {
            error_log("Execute failed for vehicles update: " . $stmt->error);
            // This is not critical so we'll continue
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Exception in updateOutstationFares: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        return false;
    }
}

// Function to update or create local package fares
function updateLocalFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    error_log("Updating local fares for " . $vehicleId . ": " . json_encode($fareData));
    
    // Check required fields
    if (!isset($fareData['hr8km80Price']) || !isset($fareData['hr10km100Price']) || !isset($fareData['extraKmRate'])) {
        error_log("Missing required fields for local fares: " . json_encode($fareData));
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for local fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $price8hrs80km = floatval($fareData['hr8km80Price']);
    $price10hrs100km = floatval($fareData['hr10km100Price']);
    $priceExtraKm = floatval($fareData['extraKmRate']);
    $priceExtraHour = isset($fareData['extraHourRate']) ? floatval($fareData['extraHourRate']) : 0;
    
    try {
        // First check if the vehicle exists, if not create it
        if (!vehicleExists($conn, $vehicleId)) {
            $vehicleName = isset($fareData['name']) ? $fareData['name'] : ucfirst(str_replace('_', ' ', $vehicleId));
            $stmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for vehicle insert: " . $conn->error);
                throw new Exception("Database error preparing vehicle insert");
            }
            $stmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
            if (!$stmt->execute()) {
                error_log("Execute failed for vehicle insert: " . $stmt->error);
                // Continue anyway as the vehicle might exist in a different format
            }
        }
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
        if (!$stmt) {
            error_log("Prepare failed for local fares check: " . $conn->error);
            throw new Exception("Database error preparing local fares check");
        }
        $stmt->bind_param("s", $vehicleId);
        if (!$stmt->execute()) {
            error_log("Execute failed for local fares check: " . $stmt->error);
            throw new Exception("Database error executing local fares check");
        }
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("UPDATE local_package_fares SET price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ?, price_extra_hour = ?, updated_at = NOW() WHERE vehicle_id = ?");
            if (!$stmt) {
                error_log("Prepare failed for local fares update: " . $conn->error);
                throw new Exception("Database error preparing local fares update");
            }
            $stmt->bind_param("dddds", $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
        } else {
            // Insert new record
            $stmt = $conn->prepare("INSERT INTO local_package_fares (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for local fares insert: " . $conn->error);
                throw new Exception("Database error preparing local fares insert");
            }
            $stmt->bind_param("sdddd", $vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        }
        
        if (!$stmt->execute()) {
            error_log("Execute failed for local fares: " . $stmt->error);
            throw new Exception("Database error executing local fares operation");
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Exception in updateLocalFares: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        return false;
    }
}

// Function to update or create airport transfer fares
function updateAirportFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    error_log("Updating airport fares for " . $vehicleId . ": " . json_encode($fareData));
    
    // Check required fields
    if (!isset($fareData['basePrice']) || !isset($fareData['pricePerKm'])) {
        error_log("Missing required fields for airport fares: " . json_encode($fareData));
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields for airport fares'], 400);
        return false;
    }
    
    // Convert to numeric values
    $basePrice = floatval($fareData['basePrice']);
    $pricePerKm = floatval($fareData['pricePerKm']);
    $airportFee = isset($fareData['airportFee']) ? floatval($fareData['airportFee']) : 0;
    
    try {
        // First check if the vehicle exists, if not create it
        if (!vehicleExists($conn, $vehicleId)) {
            $vehicleName = isset($fareData['name']) ? $fareData['name'] : ucfirst(str_replace('_', ' ', $vehicleId));
            $stmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for vehicle insert: " . $conn->error);
                throw new Exception("Database error preparing vehicle insert");
            }
            $stmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
            if (!$stmt->execute()) {
                error_log("Execute failed for vehicle insert: " . $stmt->error);
                // Continue anyway as the vehicle might exist in a different format
            }
        }
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
        if (!$stmt) {
            error_log("Prepare failed for airport fares check: " . $conn->error);
            throw new Exception("Database error preparing airport fares check");
        }
        $stmt->bind_param("s", $vehicleId);
        if (!$stmt->execute()) {
            error_log("Execute failed for airport fares check: " . $stmt->error);
            throw new Exception("Database error executing airport fares check");
        }
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("UPDATE airport_transfer_fares SET base_price = ?, price_per_km = ?, airport_fee = ?, updated_at = NOW() WHERE vehicle_id = ?");
            if (!$stmt) {
                error_log("Prepare failed for airport fares update: " . $conn->error);
                throw new Exception("Database error preparing airport fares update");
            }
            $stmt->bind_param("ddds", $basePrice, $pricePerKm, $airportFee, $vehicleId);
        } else {
            // Insert new record
            $stmt = $conn->prepare("INSERT INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, airport_fee, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
            if (!$stmt) {
                error_log("Prepare failed for airport fares insert: " . $conn->error);
                throw new Exception("Database error preparing airport fares insert");
            }
            $stmt->bind_param("sddd", $vehicleId, $basePrice, $pricePerKm, $airportFee);
        }
        
        if (!$stmt->execute()) {
            error_log("Execute failed for airport fares: " . $stmt->error);
            throw new Exception("Database error executing airport fares operation");
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Exception in updateAirportFares: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        return false;
    }
}

// Handle POST request to update pricing
if ($method === 'POST') {
    try {
        // Get request body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        // Log the incoming data
        error_log("Received vehicle pricing update request: " . json_encode($data));
        
        // Validate required fields
        if (!isset($data['vehicleId']) || !isset($data['tripType'])) {
            error_log("Missing required fields in request: " . json_encode($data));
            sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields: vehicleId and tripType'], 400);
            exit;
        }
        
        // Clean the vehicle ID
        $vehicleId = cleanVehicleId($data['vehicleId']);
        $tripType = $data['tripType'];
        
        // Log the cleaned data
        error_log("Cleaned vehicle pricing data: " . $vehicleId . ", " . $tripType);
        
        // Handle different trip types
        $success = false;
        
        // Map front-end trip types to their handling functions
        $tripTypeMap = [
            'outstation-one-way' => 'updateOutstationFares',
            'outstation-round-trip' => 'updateOutstationFares',
            'outstation' => 'updateOutstationFares',
            'base' => 'updateOutstationFares', // Map base to outstation for compatibility
            'local' => 'updateLocalFares',
            'airport' => 'updateAirportFares'
        ];
        
        if (!isset($tripTypeMap[$tripType])) {
            error_log("Invalid trip type: " . $tripType);
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
            exit;
        }
        
        // Call the appropriate function based on trip type
        $handlerFunction = $tripTypeMap[$tripType];
        $success = $handlerFunction($conn, $vehicleId, $data);
        
        if ($success) {
            sendJsonResponse([
                'status' => 'success', 
                'message' => "Pricing updated successfully for $tripType", 
                'vehicleId' => $vehicleId,
                'timestamp' => time()
            ]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to update pricing'], 500);
        }
    } catch (Exception $e) {
        error_log("Exception in POST handler: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => 'Exception: ' . $e->getMessage()], 500);
    }
} 
// Handle GET request to fetch pricing
else if ($method === 'GET') {
    try {
        // Get all vehicles pricing data
        $query = "SELECT v.id, v.vehicle_id, v.name, v.base_price, v.price_per_km, v.night_halt_charge, v.driver_allowance, v.is_active
                FROM vehicles v 
                WHERE 1=1 ";
                
        // Only include active vehicles if specified
        if (isset($_GET['activeOnly']) && $_GET['activeOnly'] === 'true') {
            $query .= " AND v.is_active = 1";
        }
        
        $query .= " ORDER BY v.name";
        
        error_log("Executing query: " . $query);
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Database error fetching vehicle pricing: " . $conn->error);
        }
        
        $vehicles = [];
        
        while ($row = $result->fetch_assoc()) {
            $vehicleId = !empty($row['vehicle_id']) ? $row['vehicle_id'] : $row['id'];
            $isActive = isset($row['is_active']) ? (bool)$row['is_active'] : true;
            
            // Use a consistent naming convention for the vehicle
            $name = !empty($row['name']) ? $row['name'] : ucfirst(str_replace('_', ' ', $vehicleId));
            
            $vehicles[] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'vehicleType' => $name,
                'basePrice' => (float)($row['base_price'] ?? 0),
                'pricePerKm' => (float)($row['price_per_km'] ?? 0),
                'nightHaltCharge' => (float)($row['night_halt_charge'] ?? 0),
                'driverAllowance' => (float)($row['driver_allowance'] ?? 0),
                'isActive' => $isActive
            ];
        }
        
        error_log("Found " . count($vehicles) . " vehicles");
        sendJsonResponse($vehicles);
    } catch (Exception $e) {
        error_log("Exception in GET handler: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => 'Exception: ' . $e->getMessage()], 500);
    }
} else {
    // Method not allowed
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close database connection
$conn->close();
?>
