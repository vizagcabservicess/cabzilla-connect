
<?php
// Prevent any output before headers
ob_start();

// Set JSON content type and CORS headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');

// Enable error reporting but don't display errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Function to send JSON response and exit
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
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input && !empty($_POST)) {
        $input = $_POST;
    }
    
    if (!$input) {
        throw new Exception("No vehicle data provided");
    }
    
    // Extract basic info
    $vehicleId = $input['id'] ?? $input['vehicleId'] ?? $input['vehicle_id'] ?? uniqid('v_');
    $name = $input['name'] ?? 'Unnamed Vehicle';
    $capacity = (int)($input['capacity'] ?? 4);
    
    // Create database connection
    if (file_exists(dirname(__FILE__) . '/../common/db_helper.php')) {
        require_once dirname(__FILE__) . '/../common/db_helper.php';
        $conn = getDbConnectionWithRetry();
    } else {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
    }
    
    // Basic vehicle insert
    $stmt = $conn->prepare("INSERT INTO vehicles 
        (vehicle_id, name, capacity, is_active) 
        VALUES (?, ?, ?, 1) 
        ON DUPLICATE KEY UPDATE 
        name = ?, capacity = ?, is_active = 1");
        
    $stmt->bind_param("ssiss", $vehicleId, $name, $capacity, $name, $capacity);
    
    if ($stmt->execute()) {
        sendJsonResponse('success', 'Vehicle created successfully', [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => $name,
            'capacity' => $capacity,
            'isActive' => true
        ]);
    } else {
        throw new Exception("Database error: " . $stmt->error);
    }
    
} catch (Exception $e) {
    error_log("Error in add-vehicle-simple.php: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
