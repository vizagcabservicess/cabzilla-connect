
<?php
// Mock PHP file for add-vehicle-simple.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is valid
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST'
    ]);
    exit;
}

// Get the raw input JSON data
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

// If JSON decode failed, try to parse POST form data
if (!$vehicleData) {
    $vehicleData = $_POST;
}

// Check if required vehicle data is provided
if (
    !isset($vehicleData['vehicleId']) && 
    !isset($vehicleData['vehicle_id']) && 
    !isset($vehicleData['id']) && 
    !isset($vehicleData['name'])
) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID or name is required'
    ]);
    exit;
}

// Get the vehicle ID from various possible fields or generate one
$vehicleId = isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : 
            (isset($vehicleData['vehicle_id']) ? $vehicleData['vehicle_id'] : 
            (isset($vehicleData['id']) ? $vehicleData['id'] : 
            strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $vehicleData['name']))));

// In a real environment, this would add the vehicle to the database
// For this mock, we'll just return a success response

// Return success response with added vehicle data
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle added successfully',
    'vehicle' => [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $vehicleData['name'] ?? '',
        'capacity' => $vehicleData['capacity'] ?? 4,
        'luggageCapacity' => $vehicleData['luggageCapacity'] ?? 2,
        'price' => $vehicleData['price'] ?? 0,
        'basePrice' => $vehicleData['basePrice'] ?? $vehicleData['price'] ?? 0,
        'pricePerKm' => $vehicleData['pricePerKm'] ?? 0,
        'image' => $vehicleData['image'] ?? '',
        'amenities' => $vehicleData['amenities'] ?? ['AC'],
        'description' => $vehicleData['description'] ?? '',
        'ac' => isset($vehicleData['ac']) ? $vehicleData['ac'] : true,
        'nightHaltCharge' => $vehicleData['nightHaltCharge'] ?? 700,
        'driverAllowance' => $vehicleData['driverAllowance'] ?? 250,
        'isActive' => isset($vehicleData['isActive']) ? $vehicleData['isActive'] : true,
        'createdAt' => date('Y-m-d H:i:s')
    ]
]);
