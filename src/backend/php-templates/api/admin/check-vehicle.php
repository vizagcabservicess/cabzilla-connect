
<?php
// Mock PHP file for check-vehicle.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if vehicle ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

$vehicleId = $_GET['id'];

// List of valid vehicle IDs for demonstration
$validVehicleIds = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'luxury'];

// Check if the vehicle exists
$exists = in_array($vehicleId, $validVehicleIds);

if ($exists) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle exists',
        'vehicle' => [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'exists' => true
        ]
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle not found',
        'vehicle' => [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'exists' => false
        ]
    ]);
}
