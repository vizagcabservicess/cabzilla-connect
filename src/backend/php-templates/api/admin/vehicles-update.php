
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
        $isAdmin = true;
    }
}

if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle GET request for fetching vehicles
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM vehicle_types ORDER BY name");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $vehicles = [];
        while ($row = $result->fetch_assoc()) {
            // Convert amenities from text to array if it exists
            if ($row['amenities']) {
                $row['amenities'] = explode(', ', $row['amenities']);
            } else {
                $row['amenities'] = [];
            }
            
            // Ensure name is always a string, use vehicle_id as fallback
            if (empty($row['name']) || $row['name'] === '0') {
                $row['name'] = $row['vehicle_id'];
            }
            
            // Convert ac to boolean
            $row['ac'] = (bool)$row['ac'];
            
            // Get pricing information
            $pricingStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ?");
            $pricingStmt->bind_param("s", $row['vehicle_id']);
            $pricingStmt->execute();
            $pricingResult = $pricingStmt->get_result();
            $pricing = $pricingResult->fetch_assoc();
            
            // Add pricing info to vehicle data
            if ($pricing) {
                $row['basePrice'] = floatval($pricing['base_price']);
                $row['pricePerKm'] = floatval($pricing['price_per_km']);
                $row['nightHaltCharge'] = floatval($pricing['night_halt_charge']);
                $row['driverAllowance'] = floatval($pricing['driver_allowance']);
            }
            
            $vehicles[] = $row;
        }
        
        sendJsonResponse($vehicles);
    }
    // Handle POST request for updating vehicles
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['vehicleId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle ID is required'], 400);
            exit;
        }
        
        $vehicleId = $requestData['vehicleId'];
        $name = isset($requestData['name']) ? $requestData['name'] : '';
        $capacity = isset($requestData['capacity']) ? intval($requestData['capacity']) : 4;
        $luggageCapacity = isset($requestData['luggageCapacity']) ? intval($requestData['luggageCapacity']) : 2;
        $ac = isset($requestData['ac']) ? ($requestData['ac'] ? 1 : 0) : 1;
        $image = isset($requestData['image']) ? $requestData['image'] : '/cars/sedan.png';
        $amenities = isset($requestData['amenities']) ? implode(', ', $requestData['amenities']) : '';
        $description = isset($requestData['description']) ? $requestData['description'] : '';
        $isActive = isset($requestData['isActive']) ? ($requestData['isActive'] ? 1 : 0) : 1;
        
        // Update vehicle in the database
        $stmt = $conn->prepare("
            UPDATE vehicle_types 
            SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                image = ?, amenities = ?, description = ?, is_active = ?, 
                updated_at = NOW()
            WHERE vehicle_id = ?
        ");
        $stmt->bind_param("siissssis", $name, $capacity, $luggageCapacity, $ac, $image, $amenities, $description, $isActive, $vehicleId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update vehicle: " . $conn->error);
        }
        
        if ($stmt->affected_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle not found'], 404);
            exit;
        }
        
        // Update pricing if provided
        if (isset($requestData['basePrice']) || isset($requestData['pricePerKm']) || 
            isset($requestData['nightHaltCharge']) || isset($requestData['driverAllowance'])) {
            
            $basePrice = isset($requestData['basePrice']) ? floatval($requestData['basePrice']) : 0;
            $pricePerKm = isset($requestData['pricePerKm']) ? floatval($requestData['pricePerKm']) : 0;
            $nightHaltCharge = isset($requestData['nightHaltCharge']) ? floatval($requestData['nightHaltCharge']) : 0;
            $driverAllowance = isset($requestData['driverAllowance']) ? floatval($requestData['driverAllowance']) : 0;
            
            // Check if pricing entry exists
            $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing pricing
                $pricingStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, 
                        updated_at = NOW()
                    WHERE vehicle_type = ?
                ");
                $pricingStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            } else {
                // Insert new pricing - removed is_active column from INSERT
                $pricingStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $pricingStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            }
            
            $pricingSuccess = $pricingStmt->execute();
            if (!$pricingSuccess) {
                throw new Exception("Failed to update vehicle pricing: " . $conn->error);
            }
        }
        
        // Get the updated vehicle
        $stmt = $conn->prepare("SELECT * FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedVehicle = $result->fetch_assoc();
        
        // Get pricing information
        $pricingStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ?");
        $pricingStmt->bind_param("s", $vehicleId);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();
        $pricing = $pricingResult->fetch_assoc();
        
        // Add pricing info to vehicle data
        if ($pricing) {
            $updatedVehicle['basePrice'] = floatval($pricing['base_price']);
            $updatedVehicle['pricePerKm'] = floatval($pricing['price_per_km']);
            $updatedVehicle['nightHaltCharge'] = floatval($pricing['night_halt_charge']);
            $updatedVehicle['driverAllowance'] = floatval($pricing['driver_allowance']);
        }
        
        if ($updatedVehicle['amenities']) {
            $updatedVehicle['amenities'] = explode(', ', $updatedVehicle['amenities']);
        } else {
            $updatedVehicle['amenities'] = [];
        }
        
        // Ensure name is always a string, use vehicle_id as fallback
        if (empty($updatedVehicle['name']) || $updatedVehicle['name'] === '0') {
            $updatedVehicle['name'] = $updatedVehicle['vehicle_id'];
        }
        
        $updatedVehicle['ac'] = (bool)$updatedVehicle['ac'];
        $updatedVehicle['isActive'] = (bool)$updatedVehicle['is_active'];
        
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Vehicle updated successfully', 
            'data' => $updatedVehicle
        ]);
    }
    // Handle PUT request for adding a new vehicle
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['vehicleId']) || !isset($requestData['name'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle ID and name are required'], 400);
            exit;
        }
        
        $vehicleId = $requestData['vehicleId'];
        $name = $requestData['name'];
        $capacity = isset($requestData['capacity']) ? intval($requestData['capacity']) : 4;
        $luggageCapacity = isset($requestData['luggageCapacity']) ? intval($requestData['luggageCapacity']) : 2;
        $ac = isset($requestData['ac']) ? ($requestData['ac'] ? 1 : 0) : 1;
        $image = isset($requestData['image']) ? $requestData['image'] : '/cars/sedan.png';
        $amenities = isset($requestData['amenities']) ? implode(', ', $requestData['amenities']) : '';
        $description = isset($requestData['description']) ? $requestData['description'] : '';
        $isActive = isset($requestData['isActive']) ? ($requestData['isActive'] ? 1 : 0) : 1;
        
        // Check if vehicle already exists
        $stmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle with this ID already exists'], 409);
            exit;
        }
        
        // Insert new vehicle
        $stmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("siiisssis", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenities, $description, $isActive);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to add new vehicle: " . $conn->error);
        }
        
        $newId = $conn->insert_id;
        
        // Add pricing information if provided
        if (isset($requestData['basePrice']) || isset($requestData['pricePerKm']) || 
            isset($requestData['nightHaltCharge']) || isset($requestData['driverAllowance'])) {
            
            $basePrice = isset($requestData['basePrice']) ? floatval($requestData['basePrice']) : 0;
            $pricePerKm = isset($requestData['pricePerKm']) ? floatval($requestData['pricePerKm']) : 0;
            $nightHaltCharge = isset($requestData['nightHaltCharge']) ? floatval($requestData['nightHaltCharge']) : 0;
            $driverAllowance = isset($requestData['driverAllowance']) ? floatval($requestData['driverAllowance']) : 0;
            
            // Insert new pricing - removed is_active from INSERT
            $pricingStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance)
                VALUES (?, ?, ?, ?, ?)
            ");
            $pricingStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            $pricingSuccess = $pricingStmt->execute();
            
            if (!$pricingSuccess) {
                throw new Exception("Failed to add vehicle pricing: " . $conn->error);
            }
        }
        
        // Get the newly created vehicle
        $stmt = $conn->prepare("SELECT * FROM vehicle_types WHERE id = ?");
        $stmt->bind_param("i", $newId);
        $stmt->execute();
        $result = $stmt->get_result();
        $newVehicle = $result->fetch_assoc();
        
        // Get pricing information
        $pricingStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ?");
        $pricingStmt->bind_param("s", $vehicleId);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();
        $pricing = $pricingResult->fetch_assoc();
        
        // Add pricing info to vehicle data
        if ($pricing) {
            $newVehicle['basePrice'] = floatval($pricing['base_price']);
            $newVehicle['pricePerKm'] = floatval($pricing['price_per_km']);
            $newVehicle['nightHaltCharge'] = floatval($pricing['night_halt_charge']);
            $newVehicle['driverAllowance'] = floatval($pricing['driver_allowance']);
        }
        
        if ($newVehicle['amenities']) {
            $newVehicle['amenities'] = explode(', ', $newVehicle['amenities']);
        } else {
            $newVehicle['amenities'] = [];
        }
        
        // Ensure name is always a string, use vehicle_id as fallback
        if (empty($newVehicle['name']) || $newVehicle['name'] === '0') {
            $newVehicle['name'] = $newVehicle['vehicle_id'];
        }
        
        $newVehicle['ac'] = (bool)$newVehicle['ac'];
        $newVehicle['isActive'] = (bool)$newVehicle['is_active'];
        
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'New vehicle added successfully', 
            'data' => $newVehicle
        ]);
    }
    // Handle DELETE request to delete a vehicle
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Get vehicle ID from query string
        $vehicleId = isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null;
        
        if (!$vehicleId) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle ID is required'], 400);
            exit;
        }
        
        // Check if vehicle exists
        $stmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle not found'], 404);
            exit;
        }
        
        // Delete the vehicle's pricing first due to foreign key constraints
        $pricingStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_type = ?");
        $pricingStmt->bind_param("s", $vehicleId);
        $pricingStmt->execute();
        
        // Delete the vehicle
        $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to delete vehicle: " . $conn->error);
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Vehicle deleted successfully']);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in vehicles-update endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
