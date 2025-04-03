
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Enable error reporting for debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log request details
error_log("Vehicle create request received: " . $_SERVER['REQUEST_METHOD']);
error_log("Request body: " . file_get_contents('php://input'));

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Only POST method is allowed'
    ]);
    exit;
}

// Get vehicle data from the request
try {
    // Get posted data
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input && !empty($_POST)) {
        $input = $_POST;
    }
    
    // If no data found, return error
    if (!$input) {
        throw new Exception("No vehicle data provided");
    }
    
    // Extract basic vehicle info with fallbacks
    $vehicleId = $input['id'] ?? $input['vehicleId'] ?? $input['vehicle_id'] ?? uniqid('v_');
    $name = $input['name'] ?? 'Unnamed Vehicle';
    $capacity = (int)($input['capacity'] ?? 4);
    
    // Attempt to use db_helper if available
    if (file_exists(dirname(__FILE__) . '/../common/db_helper.php')) {
        require_once dirname(__FILE__) . '/../common/db_helper.php';
        $conn = getDbConnectionWithRetry();
    } else {
        // Create database connection
        require_once '../../config.php';
        $conn = getDbConnection();
    }
    
    // Insert or update vehicle
    $stmt = $conn->prepare("INSERT INTO vehicles 
        (vehicle_id, name, capacity, is_active) 
        VALUES (?, ?, ?, 1) 
        ON DUPLICATE KEY UPDATE name = ?, capacity = ?, is_active = 1");
    
    $stmt->bind_param('ssiss', $vehicleId, $name, $capacity, $name, $capacity);
    
    if ($stmt->execute()) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle created successfully',
            'vehicle' => [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'capacity' => $capacity,
                'isActive' => true
            ]
        ]);
    } else {
        throw new Exception("Database error: " . $stmt->error);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
