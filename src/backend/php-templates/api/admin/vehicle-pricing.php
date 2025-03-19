
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

// Debug logging
error_log("Vehicle pricing endpoint called. Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request headers: " . json_encode(getallheaders()));
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("POST data: " . file_get_contents('php://input'));
}

// Check if user is authenticated and is admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

// Authenticate user - more lenient for testing
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    try {
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $userId = $payload['user_id'];
            $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        }
    } catch (Exception $e) {
        error_log("JWT verification error: " . $e->getMessage());
        // Continue execution, we'll check isAdmin below
    }
}

// For development, allow access without auth
$allowDevAccess = true; // Set to false in production

// Log authentication attempt for debugging
error_log("vehicle-pricing.php auth check", 0);
error_log(json_encode(['isAdmin' => $isAdmin, 'userId' => $userId, 'allowDevAccess' => $allowDevAccess]), 0);

if (!$isAdmin && !$allowDevAccess) {
    sendJsonResponse(['status' => 'error', 'message' => 'Administrator access required'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    error_log("Database connection failed in vehicle-pricing.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Handle GET requests - get all vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        error_log("Processing GET request for vehicle pricing");
        
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

        error_log("Retrieved " . count($pricing) . " vehicle pricing records");
        
        // If no records, return fallback data
        if (empty($pricing)) {
            $pricing = getFallbackVehiclePricing();
            error_log("No vehicle pricing found, using fallback data");
        }

        sendJsonResponse(['status' => 'success', 'data' => $pricing, 'timestamp' => time()]);
        exit;
    } catch (Exception $e) {
        error_log("Error fetching vehicle pricing: " . $e->getMessage());
        
        // Return fallback data on error
        $pricing = getFallbackVehiclePricing();
        sendJsonResponse([
            'status' => 'warning', 
            'message' => 'Error fetching from database, using fallback data', 
            'data' => $pricing,
            'timestamp' => time()
        ]);
        exit;
    }
}

// Handle POST requests - update vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the JSON data from the request
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Log the input data
    error_log("Vehicle pricing update request: " . json_encode($input));
    
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
        // First check if the vehicle type exists in vehicle_types table
        $vehicleCheckStmt = $conn->prepare("SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?");
        $vehicleCheckStmt->bind_param("s", $vehicleType);
        $vehicleCheckStmt->execute();
        $vehicleCheckResult = $vehicleCheckStmt->get_result();
        
        if ($vehicleCheckResult->num_rows === 0) {
            // Try to insert the vehicle if it doesn't exist
            try {
                $vehicleInsertStmt = $conn->prepare("INSERT INTO vehicle_types (vehicle_id, name, is_active) VALUES (?, ?, 1)");
                $vehicleInsertStmt->bind_param("ss", $vehicleType, $vehicleType);
                $vehicleInsertStmt->execute();
                error_log("Created missing vehicle type: " . $vehicleType);
            } catch (Exception $e) {
                error_log("Could not create vehicle type: " . $e->getMessage());
                sendJsonResponse(['status' => 'error', 'message' => 'Vehicle type does not exist and could not be created'], 404);
                exit;
            }
        }
        
        // Check if the vehicle type exists in pricing table
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
        $checkStmt->bind_param("s", $vehicleType);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW()
                WHERE vehicle_type = ?
            ");
            $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleType);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update vehicle pricing: " . $stmt->error);
            }
            
            error_log("Vehicle pricing updated successfully: " . json_encode([
                'vehicleType' => $vehicleType,
                'basePrice' => $basePrice, 
                'pricePerKm' => $pricePerKm
            ]));
            
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
                INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->bind_param("sdddd", $vehicleType, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to create vehicle pricing: " . $stmt->error);
            }
            
            $newId = $conn->insert_id;
            error_log("New vehicle pricing created: " . json_encode([
                'id' => $newId,
                'vehicleType' => $vehicleType,
                'basePrice' => $basePrice, 
                'pricePerKm' => $pricePerKm
            ]));
            
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
        error_log("Error updating vehicle pricing: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
    
    exit;
}

// If we get here, the method is not supported
sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed: ' . $_SERVER['REQUEST_METHOD']], 405);

// Helper function for fallback data
function getFallbackVehiclePricing() {
    return [
        [
            'id' => 1,
            'vehicleType' => 'sedan',
            'basePrice' => 4200,
            'pricePerKm' => 14,
            'nightHaltCharge' => 700,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 2,
            'vehicleType' => 'ertiga',
            'basePrice' => 5400,
            'pricePerKm' => 18,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 3,
            'vehicleType' => 'innova_crysta',
            'basePrice' => 6000,
            'pricePerKm' => 20,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ]
    ];
}
