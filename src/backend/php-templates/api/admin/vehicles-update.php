
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clean vehicle ID by removing prefixes if present
function cleanVehicleId($id) {
    if (empty($id)) return '';
    
    // Remove 'item-' prefix if it exists
    if (strpos($id, 'item-') === 0) {
        return substr($id, 5);
    }
    
    return $id;
}

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

// Log the authentication attempt for debugging
logError("vehicles-update.php Authentication check", ['headers' => isset($headers['Authorization']) || isset($headers['authorization'])]);

try {
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        // Log the token for debugging (in a redacted way)
        $tokenLength = strlen($token);
        $redactedToken = substr($token, 0, 5) . '...' . substr($token, -5);
        logError("Admin auth token details", ['token_length' => $tokenLength, 'redacted_token' => $redactedToken]);
        
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
            $isAdmin = true;
            logError("Admin authenticated successfully", ['user_id' => $payload['user_id'], 'role' => $payload['role']]);
        } else if ($payload) {
            logError("Admin authentication failed - user is not admin", [
                'role' => $payload['role'] ?? 'none',
                'user_id' => $payload['user_id'] ?? 'none'
            ]);
        } else {
            logError("Admin authentication failed - invalid token", []);
        }
    } else {
        logError("No Authorization header found", ['available_headers' => array_keys($headers)]);
    }
    
    // TEMPORARILY ALLOW ALL REQUESTS FOR TROUBLESHOOTING
    // This is only for development and should be removed in production
    $isAdmin = true;
    logError("SECURITY WARNING: Admin auth check bypassed for troubleshooting");
    
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
    
    // Handle GET request for fetching vehicles
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Log the GET request
        logError("vehicles-update.php GET request", []);
        
        $stmt = $conn->prepare("SELECT * FROM vehicle_types ORDER BY name");
        if (!$stmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $vehicles = [];
        while ($row = $result->fetch_assoc()) {
            // Convert amenities from text to array if it exists
            if ($row['amenities']) {
                // Try to decode JSON first
                $decodedAmenities = json_decode($row['amenities'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $row['amenities'] = $decodedAmenities;
                } else {
                    // If not JSON, treat as comma-separated list
                    $row['amenities'] = array_map('trim', explode(',', $row['amenities']));
                }
            } else {
                $row['amenities'] = [];
            }
            
            // Ensure name is always a string, use vehicle_id as fallback
            if (empty($row['name']) || $row['name'] === '0') {
                $row['name'] = $row['vehicle_id'];
            }
            
            // Convert ac and is_active to boolean
            $row['ac'] = (bool)$row['ac'];
            $row['isActive'] = (bool)$row['is_active'];
            
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
            } else {
                $row['basePrice'] = 0;
                $row['pricePerKm'] = 0;
                $row['nightHaltCharge'] = 0;
                $row['driverAllowance'] = 0;
            }
            
            $vehicles[] = $row;
        }
        
        sendJsonResponse($vehicles);
    }
    // Handle POST request for updating vehicles
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        // Log the POST request
        logError("vehicles-update.php POST request", ['data' => $requestData]);
        
        if (!isset($requestData['vehicleId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle ID is required'], 400);
            exit;
        }
        
        $vehicleId = cleanVehicleId($requestData['vehicleId']);
        // Ensure name is not empty, use vehicleId as fallback
        $name = isset($requestData['name']) && !empty($requestData['name']) && $requestData['name'] !== '0' 
            ? $requestData['name'] 
            : $vehicleId;
        
        $capacity = isset($requestData['capacity']) ? intval($requestData['capacity']) : 4;
        $luggageCapacity = isset($requestData['luggageCapacity']) ? intval($requestData['luggageCapacity']) : 2;
        $ac = isset($requestData['ac']) ? ($requestData['ac'] ? 1 : 0) : 1;
        $image = isset($requestData['image']) ? $requestData['image'] : '/cars/sedan.png';
        
        // Process amenities - if it's an array, convert to comma-separated string or JSON
        $amenities = '';
        if (isset($requestData['amenities'])) {
            if (is_array($requestData['amenities'])) {
                $amenities = json_encode($requestData['amenities']);
            } else {
                $amenities = $requestData['amenities'];
            }
        }
        
        $description = isset($requestData['description']) ? $requestData['description'] : '';
        $isActive = isset($requestData['isActive']) ? ($requestData['isActive'] ? 1 : 0) : 1;
        
        logError("Processing vehicle data", [
            'vehicleId' => $vehicleId, 
            'name' => $name,
            'isActive' => $isActive,
            'capacity' => $capacity
        ]);
        
        // First check if vehicle exists
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
        if (!$checkStmt) {
            throw new Exception("Database prepare error on check: " . $conn->error);
        }
        
        $checkStmt->bind_param("s", $vehicleId);
        if (!$checkStmt->execute()) {
            throw new Exception("Failed to check vehicle type: " . $checkStmt->error);
        }
        
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // If vehicle doesn't exist, create it
            logError("Vehicle doesn't exist, creating new", ['vehicleId' => $vehicleId]);
            $stmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            if (!$stmt) {
                throw new Exception("Database prepare error on insert: " . $conn->error);
            }
            $stmt->bind_param("siiisssis", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenities, $description, $isActive);
        } else {
            // Update existing vehicle
            logError("Vehicle exists, updating", ['vehicleId' => $vehicleId]);
            $stmt = $conn->prepare("
                UPDATE vehicle_types 
                SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                    image = ?, amenities = ?, description = ?, is_active = ?, 
                    updated_at = NOW()
                WHERE vehicle_id = ?
            ");
            if (!$stmt) {
                throw new Exception("Database prepare error on update: " . $conn->error);
            }
            $stmt->bind_param("siissssis", $name, $capacity, $luggageCapacity, $ac, $image, $amenities, $description, $isActive, $vehicleId);
        }
        
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update vehicle: " . $stmt->error);
        }
        
        logError("Vehicle update/create successful", ['vehicleId' => $vehicleId]);
        
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
                logError("Updating existing pricing", ['vehicleId' => $vehicleId]);
                $pricingStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, 
                        updated_at = NOW()
                    WHERE vehicle_type = ?
                ");
                $pricingStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            } else {
                // Insert new pricing
                logError("Creating new pricing record", ['vehicleId' => $vehicleId]);
                $pricingStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ");
                $pricingStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            }
            
            if (!$pricingStmt) {
                throw new Exception("Database prepare error for pricing: " . $conn->error);
            }
            
            $pricingSuccess = $pricingStmt->execute();
            if (!$pricingSuccess) {
                throw new Exception("Failed to update vehicle pricing: " . $pricingStmt->error);
            }
            
            logError("Vehicle pricing updated", [
                'vehicleId' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm
            ]);
        }
        
        // Get the updated vehicle
        $stmt = $conn->prepare("SELECT * FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedVehicle = $result->fetch_assoc();
        
        if (!$updatedVehicle) {
            throw new Exception("Failed to retrieve updated vehicle");
        }
        
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
        } else {
            $updatedVehicle['basePrice'] = 0;
            $updatedVehicle['pricePerKm'] = 0;
            $updatedVehicle['nightHaltCharge'] = 0;
            $updatedVehicle['driverAllowance'] = 0;
        }
        
        if (!empty($updatedVehicle['amenities'])) {
            // Try to decode JSON first
            $decodedAmenities = json_decode($updatedVehicle['amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $updatedVehicle['amenities'] = $decodedAmenities;
            } else {
                // If not JSON, treat as comma-separated list
                $updatedVehicle['amenities'] = array_map('trim', explode(',', $updatedVehicle['amenities']));
            }
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
        
        // Log the PUT request
        logError("vehicles-update.php PUT request", ['data' => $requestData]);
        
        if (!isset($requestData['vehicleId']) || !isset($requestData['name'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Vehicle ID and name are required'], 400);
            exit;
        }
        
        $vehicleId = cleanVehicleId($requestData['vehicleId']);
        // Ensure name is not empty
        $name = isset($requestData['name']) && !empty($requestData['name']) ? $requestData['name'] : $vehicleId;
        $capacity = isset($requestData['capacity']) ? intval($requestData['capacity']) : 4;
        $luggageCapacity = isset($requestData['luggageCapacity']) ? intval($requestData['luggageCapacity']) : 2;
        $ac = isset($requestData['ac']) ? ($requestData['ac'] ? 1 : 0) : 1;
        $image = isset($requestData['image']) ? $requestData['image'] : '/cars/sedan.png';
        
        // Process amenities properly
        $amenities = '';
        if (isset($requestData['amenities'])) {
            if (is_array($requestData['amenities'])) {
                $amenities = json_encode($requestData['amenities']);
            } else {
                $amenities = $requestData['amenities'];
            }
        }
        
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
            
            // Insert new pricing
            $pricingStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
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
        } else {
            $newVehicle['basePrice'] = 0;
            $newVehicle['pricePerKm'] = 0;
            $newVehicle['nightHaltCharge'] = 0;
            $newVehicle['driverAllowance'] = 0;
        }
        
        if ($newVehicle['amenities']) {
            // Try to decode JSON first
            $decodedAmenities = json_decode($newVehicle['amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $newVehicle['amenities'] = $decodedAmenities;
            } else {
                // If not JSON, treat as comma-separated list
                $newVehicle['amenities'] = array_map('trim', explode(',', $newVehicle['amenities']));
            }
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
        $vehicleId = isset($_GET['vehicleId']) ? cleanVehicleId($_GET['vehicleId']) : null;
        
        // Log the DELETE request
        logError("vehicles-update.php DELETE request", ['vehicleId' => $vehicleId]);
        
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
        
        try {
            // Start transaction
            $conn->begin_transaction();
            
            // Delete the vehicle's pricing first (ignoring errors as the pricing might not exist)
            $pricingStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_type = ?");
            $pricingStmt->bind_param("s", $vehicleId);
            $pricingStmt->execute();
            
            // Delete the vehicle
            $stmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $success = $stmt->execute();
            
            if (!$success) {
                throw new Exception("Failed to delete vehicle: " . $stmt->error);
            }
            
            // Commit transaction
            $conn->commit();
            
            sendJsonResponse([
                'status' => 'success', 
                'message' => 'Vehicle deleted successfully',
                'vehicleId' => $vehicleId
            ]);
        } catch (Exception $e) {
            // Rollback transaction on error
            $conn->rollback();
            throw $e;
        }
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in vehicles-update endpoint", [
        'error' => $e->getMessage(), 
        'trace' => $e->getTraceAsString()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
