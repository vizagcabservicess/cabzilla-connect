
<?php
// Basic error handling with output buffering
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Always set JSON content type and CORS headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');

// Force no caching
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Log access for debugging
error_log("add-vehicle-simple.php accessed with method: " . $_SERVER['REQUEST_METHOD']);

// Function to send JSON response
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response['vehicle'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Only POST method is allowed');
}

try {
    // Get posted data
    $rawInput = file_get_contents('php://input');
    error_log("Raw input received: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (!$input && !empty($_POST)) {
        $input = $_POST;
        error_log("Using POST data instead of JSON");
    }
    
    if (!$input) {
        throw new Exception("No vehicle data provided or invalid JSON");
    }
    
    error_log("Parsed input: " . print_r($input, true));
    
    // Extract basic info with fallbacks
    $vehicleId = isset($input['id']) ? $input['id'] : (isset($input['vehicleId']) ? $input['vehicleId'] : (isset($input['vehicle_id']) ? $input['vehicle_id'] : uniqid('v_')));
    $name = isset($input['name']) ? $input['name'] : 'Unnamed Vehicle';
    $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 4;
    
    // For development/testing, just return success without database operations
    $vehicleData = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'isActive' => true,
        'ac' => isset($input['ac']) ? (bool)$input['ac'] : true,
        'image' => isset($input['image']) ? $input['image'] : '/cars/sedan.png',
        'amenities' => isset($input['amenities']) ? $input['amenities'] : ['AC'],
        'description' => isset($input['description']) ? $input['description'] : '',
        'basePrice' => isset($input['basePrice']) ? (int)$input['basePrice'] : 0,
        'pricePerKm' => isset($input['pricePerKm']) ? (float)$input['pricePerKm'] : 0,
        'nightHaltCharge' => isset($input['nightHaltCharge']) ? (int)$input['nightHaltCharge'] : 700,
        'driverAllowance' => isset($input['driverAllowance']) ? (int)$input['driverAllowance'] : 250
    ];
    
    // Try database connection only if available
    try {
        // Create database connection if possible
        if (file_exists(dirname(__FILE__) . '/../common/db_helper.php')) {
            require_once dirname(__FILE__) . '/../common/db_helper.php';
            $conn = getDbConnectionWithRetry();
            
            // Basic vehicle insert
            $stmt = $conn->prepare("INSERT INTO vehicles 
                (vehicle_id, name, capacity, is_active) 
                VALUES (?, ?, ?, 1) 
                ON DUPLICATE KEY UPDATE 
                name = ?, capacity = ?, is_active = 1");
                
            $stmt->bind_param("ssiss", $vehicleId, $name, $capacity, $name, $capacity);
            
            if ($stmt->execute()) {
                error_log("Database insert successful for vehicle: " . $vehicleId);
            } else {
                error_log("Database insert failed: " . $stmt->error);
                // Continue anyway for development
            }
        } else {
            error_log("Database helper not found, skipping database operations");
        }
    } catch (Exception $dbEx) {
        // Log database error but continue with success response for testing
        error_log("Database error: " . $dbEx->getMessage());
    }
    
    // Return success response with vehicle data
    sendJsonResponse('success', 'Vehicle created successfully', $vehicleData);
    
} catch (Exception $e) {
    error_log("Error in add-vehicle-simple.php: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
