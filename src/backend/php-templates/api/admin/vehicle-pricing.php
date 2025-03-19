
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if user is authenticated and is admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Administrator access required'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Handle GET requests - get all vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get vehicle pricing records
        $stmt = $conn->prepare("SELECT * FROM vehicle_pricing ORDER BY vehicle_type");
        $stmt->execute();
        $result = $stmt->get_result();

        $pricing = [];
        while ($row = $result->fetch_assoc()) {
            $pricing[] = [
                'id' => intval($row['id']),
                'vehicleType' => $row['vehicle_type'],
                'basePrice' => floatval($row['base_price']),
                'pricePerKm' => floatval($row['price_per_km']),
                'nightHaltCharge' => floatval($row['night_halt_charge']),
                'driverAllowance' => floatval($row['driver_allowance']),
                'isActive' => (bool)($row['is_active'] ?? 1)
            ];
        }

        sendJsonResponse(['status' => 'success', 'data' => $pricing]);
        exit;
    } catch (Exception $e) {
        logError("Error fetching vehicle pricing", ['error' => $e->getMessage()]);
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to fetch vehicle pricing: ' . $e->getMessage()], 500);
        exit;
    }
}

// Handle POST requests - update vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the JSON data from the request
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Log the input data
    logError("Vehicle pricing update request", ['input' => $input]);
    
    // Validate input
    if (!$input || !isset($input['vehicleType']) || !isset($input['basePrice']) || !isset($input['pricePerKm'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields (vehicleType, basePrice, pricePerKm)'], 400);
        exit;
    }
    
    // Convert numeric values
    $basePrice = floatval($input['basePrice']);
    $pricePerKm = floatval($input['pricePerKm']);
    $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
    $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
    $vehicleType = $input['vehicleType'];
    
    try {
        // Check if the vehicle type exists
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
        $checkStmt->bind_param("s", $vehicleType);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
                WHERE vehicle_type = ?
            ");
            $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleType);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update vehicle pricing: " . $stmt->error);
            }
            
            // Get the updated record
            $getStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ?");
            $getStmt->bind_param("s", $vehicleType);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $updatedRecord = $result->fetch_assoc();
            
            $response = [
                'id' => intval($updatedRecord['id']),
                'vehicleType' => $updatedRecord['vehicle_type'],
                'basePrice' => floatval($updatedRecord['base_price']),
                'pricePerKm' => floatval($updatedRecord['price_per_km']),
                'nightHaltCharge' => floatval($updatedRecord['night_halt_charge']),
                'driverAllowance' => floatval($updatedRecord['driver_allowance'])
            ];
            
            sendJsonResponse(['status' => 'success', 'message' => 'Vehicle pricing updated successfully', 'data' => $response]);
        } else {
            // Insert new record
            $stmt = $conn->prepare("
                INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            ");
            $stmt->bind_param("sdddd", $vehicleType, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to create vehicle pricing: " . $stmt->error);
            }
            
            $newId = $conn->insert_id;
            
            $response = [
                'id' => $newId,
                'vehicleType' => $vehicleType,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ];
            
            sendJsonResponse(['status' => 'success', 'message' => 'Vehicle pricing created successfully', 'data' => $response]);
        }
    } catch (Exception $e) {
        logError("Error updating vehicle pricing", ['error' => $e->getMessage()]);
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
    
    exit;
}

sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
