
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config.php';

try {
    $vehicleId = isset($_GET['id']) ? $_GET['id'] : null;
    
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }
    
    $conn = getDbConnection();
    
    // Check if vehicle exists in vehicles table
    $query = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('ss', $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Vehicle not found, try to create a default entry
        $defaultName = 'Vehicle ' . $vehicleId;
        $insertQuery = "INSERT INTO vehicles (vehicle_id, name) VALUES (?, ?)";
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('ss', $vehicleId, $defaultName);
        $insertStmt->execute();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Default vehicle created',
            'vehicle' => [
                'id' => $vehicleId,
                'name' => $defaultName,
                'isNew' => true
            ]
        ]);
    } else {
        $vehicle = $result->fetch_assoc();
        echo json_encode([
            'status' => 'success',
            'vehicle' => [
                'id' => $vehicle['vehicle_id'] ?? $vehicle['id'],
                'name' => $vehicle['name'],
                'capacity' => (int)$vehicle['capacity'],
                'isActive' => (bool)$vehicle['is_active'],
                'isNew' => false
            ]
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
