
<?php
require_once '../../config.php';

// Log the request method for debugging
logError("vehicles.php request method", ['method' => $_SERVER['REQUEST_METHOD']]);

// Allow GET, POST and OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    logError("Method not allowed", ['method' => $_SERVER['REQUEST_METHOD']]);
    sendJsonResponse(['error' => 'Method not allowed'], 405);
    exit;
}

// Connect to database
$conn = getDbConnection();

// Handle POST requests for updating vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the JSON data from the request
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Log the input data
    logError("Vehicle pricing update request", ['input' => $input]);
    
    // Validate input
    if (!$input || !isset($input['vehicleType']) || !isset($input['basePrice']) || !isset($input['pricePerKm'])) {
        sendJsonResponse(['error' => 'Invalid input data'], 400);
        exit;
    }
    
    // Prepare statement to update vehicle pricing
    $stmt = $conn->prepare("
        UPDATE vehicle_pricing 
        SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
        WHERE vehicle_type = ?
    ");
    
    if (!$stmt) {
        logError("SQL prepare error", ['error' => $conn->error]);
        sendJsonResponse(['error' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    // Convert values to appropriate types - ensure we're using proper numeric types
    $basePrice = floatval($input['basePrice']);
    $pricePerKm = floatval($input['pricePerKm']);
    $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
    $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
    
    // Bind parameters - note the parameter types (dddds) - d for double (float), s for string
    $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $input['vehicleType']);
    
    // Execute statement
    if (!$stmt->execute()) {
        logError("SQL execute error", ['error' => $stmt->error]);
        sendJsonResponse(['error' => 'Failed to update vehicle pricing: ' . $stmt->error], 500);
        exit;
    }
    
    // Check if any rows were affected
    if ($stmt->affected_rows === 0) {
        // No rows updated, check if the vehicle type exists
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?");
        $checkStmt->bind_param("s", $input['vehicleType']);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] === 0) {
            // Vehicle type doesn't exist, create it
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            ");
            
            $insertStmt->bind_param("sdddd", $input['vehicleType'], $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$insertStmt->execute()) {
                logError("SQL insert error", ['error' => $insertStmt->error]);
                sendJsonResponse(['error' => 'Failed to insert vehicle pricing: ' . $insertStmt->error], 500);
                exit;
            }
            
            sendJsonResponse(['message' => 'Vehicle pricing created successfully', 'vehicleType' => $input['vehicleType']]);
            exit;
        } else {
            // Vehicle type exists but no change in values
            sendJsonResponse(['message' => 'No changes made to vehicle pricing', 'vehicleType' => $input['vehicleType']]);
            exit;
        }
    }
    
    sendJsonResponse(['message' => 'Vehicle pricing updated successfully', 'vehicleType' => $input['vehicleType']]);
    exit;
}

// Handle GET requests
try {
    // Get all vehicle pricing
    $stmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE is_active = 1 ORDER BY id");
    $stmt->execute();
    $result = $stmt->get_result();

    $vehiclePricing = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to actual numbers and ensure all fields are typed correctly
        $pricing = [
            'id' => intval($row['id']),
            'vehicleType' => $row['vehicle_type'],
            'basePrice' => floatval($row['base_price']),
            'pricePerKm' => floatval($row['price_per_km']),
            'nightHaltCharge' => floatval($row['night_halt_charge']),
            'driverAllowance' => floatval($row['driver_allowance']),
            'isActive' => (bool)$row['is_active'] // Convert to boolean
        ];
        
        $vehiclePricing[] = $pricing;
    }

    // Log the response for debugging
    logError("Vehicle pricing GET response", ['count' => count($vehiclePricing)]);

    // Send response as a simple array, not an object with numbered keys
    sendJsonResponse($vehiclePricing);
} catch (Exception $e) {
    logError("Error fetching vehicle pricing", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch vehicle pricing: ' . $e->getMessage()], 500);
}

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
