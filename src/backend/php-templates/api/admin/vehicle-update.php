
<?php
// Mock PHP file for vehicle-update.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is valid
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST or PUT'
    ]);
    exit;
}

// Get the raw input JSON data
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

// Check if vehicle data is valid
if (!$vehicleData) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON data'
    ]);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Get the vehicle ID from various possible fields
$vehicleId = isset($vehicleData['id']) ? $vehicleData['id'] : 
            (isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['vehicle_id']);

// In a real environment, this would update the vehicle in the database
// For this mock, we'll just return a success response

// Return success response with updated vehicle data
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully',
    'vehicle' => [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $vehicleData['name'] ?? '',
        'capacity' => $vehicleData['capacity'] ?? 0,
        'luggageCapacity' => $vehicleData['luggageCapacity'] ?? 0,
        'price' => $vehicleData['price'] ?? 0,
        'basePrice' => $vehicleData['basePrice'] ?? $vehicleData['price'] ?? 0,
        'pricePerKm' => $vehicleData['pricePerKm'] ?? 0,
        'image' => $vehicleData['image'] ?? '',
        'amenities' => $vehicleData['amenities'] ?? [],
        'description' => $vehicleData['description'] ?? '',
        'ac' => $vehicleData['ac'] ?? true,
        'nightHaltCharge' => $vehicleData['nightHaltCharge'] ?? 0,
        'driverAllowance' => $vehicleData['driverAllowance'] ?? 0,
        'isActive' => $vehicleData['isActive'] ?? true,
        'updatedAt' => date('Y-m-d H:i:s')
    ]
]);
