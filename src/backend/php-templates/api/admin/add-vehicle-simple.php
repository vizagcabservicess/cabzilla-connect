
<?php
// Mock PHP file for add-vehicle-simple.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Please use POST.'
    ]);
    exit;
}

require_once '../../config.php';

try {
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // If no JSON data, try POST data
    if (!$data) {
        $data = $_POST;
    }
    
    // Validate required fields
    if (empty($data['vehicleId']) && empty($data['vehicle_id'])) {
        throw new Exception('Vehicle ID is required');
    }
    
    if (empty($data['name'])) {
        throw new Exception('Vehicle name is required');
    }
    
    // Normalize data
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : $data['vehicle_id'];
    $name = $data['name'];
    $capacity = isset($data['capacity']) ? intval($data['capacity']) : 4;
    $luggageCapacity = isset($data['luggageCapacity']) ? intval($data['luggageCapacity']) : 2;
    $ac = isset($data['ac']) ? (bool)$data['ac'] : true;
    $isActive = isset($data['isActive']) ? (bool)$data['isActive'] : true;
    
    // Create database connection
    $conn = getDbConnection();
    
    // Check if vehicle already exists
    $checkStmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        // Vehicle already exists
        throw new Exception('Vehicle with this ID already exists');
    }
    
    // Insert new vehicle
    $stmt = $conn->prepare("INSERT INTO vehicles (vehicle_id, name, capacity, luggage_capacity, ac, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $acInt = $ac ? 1 : 0;
    $isActiveInt = $isActive ? 1 : 0;
    $stmt->bind_param('ssiiii', $vehicleId, $name, $capacity, $luggageCapacity, $acInt, $isActiveInt);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create vehicle: ' . $conn->error);
    }
    
    // Return success response
    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle created successfully',
        'vehicle' => [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => $name,
            'capacity' => $capacity,
            'luggageCapacity' => $luggageCapacity,
            'ac' => $ac,
            'isActive' => $isActive
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
