
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
logError("vehicles.php request", ['method' => $_SERVER['REQUEST_METHOD'], 'request' => $_SERVER]);

// Connect to database
$conn = getDbConnection();

if (!$conn) {
    logError("Database connection failed", ['error' => mysqli_connect_error()]);
    sendJsonResponse(['error' => 'Database connection failed: ' . mysqli_connect_error()], 500);
    exit;
}

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
    
    // Convert values to appropriate types
    $basePrice = floatval($input['basePrice']);
    $pricePerKm = floatval($input['pricePerKm']);
    $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
    $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
    
    // Bind parameters
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
    // Get all vehicle types with their pricing data
    $stmt = $conn->prepare("
        SELECT 
            vt.id, 
            vt.vehicle_id, 
            vt.name, 
            vt.capacity, 
            vt.luggage_capacity,
            vt.ac, 
            vt.image, 
            vt.amenities, 
            vt.description, 
            vt.is_active,
            vp.base_price, 
            vp.price_per_km, 
            vp.night_halt_charge, 
            vp.driver_allowance,
            vp.vehicle_type
        FROM 
            vehicle_types vt
        LEFT JOIN 
            vehicle_pricing vp ON vt.vehicle_id = vp.vehicle_type
        WHERE 
            vt.is_active = 1
        ORDER BY 
            vt.id
    ");
    
    if (!$stmt) {
        logError("SQL prepare error", ['error' => $conn->error]);
        sendJsonResponse(['error' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    if (!$stmt->execute()) {
        logError("SQL execute error", ['error' => $stmt->error]);
        sendJsonResponse(['error' => 'Failed to execute query: ' . $stmt->error], 500);
        exit;
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logError("SQL result error", ['error' => $stmt->error]);
        sendJsonResponse(['error' => 'Failed to get result: ' . $stmt->error], 500);
        exit;
    }

    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        // Parse amenities from JSON string or comma-separated list
        $amenities = [];
        if (!empty($row['amenities'])) {
            $decoded = json_decode($row['amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $amenities = $decoded;
            } else {
                $amenities = array_map('trim', explode(',', $row['amenities']));
            }
        }
        
        // Format vehicle data with consistent property names for frontend
        $vehicle = [
            'id' => $row['vehicle_id'], 
            'name' => $row['name'],
            'capacity' => intval($row['capacity']),
            'luggageCapacity' => intval($row['luggage_capacity']),
            'price' => floatval($row['base_price'] ?? 0),
            'basePrice' => floatval($row['base_price'] ?? 0),
            'pricePerKm' => floatval($row['price_per_km'] ?? 0),
            'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
            'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
            'image' => $row['image'],
            'amenities' => $amenities,
            'description' => $row['description'],
            'ac' => (bool)$row['ac'],
            'vehicleType' => $row['vehicle_type'] ?? $row['vehicle_id']
        ];
        
        $vehicles[] = $vehicle;
    }

    // Log success for debugging
    logError("Vehicles data response success", ['count' => count($vehicles)]);
    
    // Send response with proper content type
    header('Content-Type: application/json');
    echo json_encode($vehicles);
    exit;
    
} catch (Exception $e) {
    logError("Error fetching vehicles", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch vehicles: ' . $e->getMessage()], 500);
}

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
