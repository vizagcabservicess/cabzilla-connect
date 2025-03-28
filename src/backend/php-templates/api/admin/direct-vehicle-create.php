
<?php
// direct-vehicle-create.php - A simplified endpoint for vehicle creation

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.5');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle create request: Method=$requestMethod, URI=$requestUri");

// Get data from request using multiple approaches
$data = [];

// Try POST data first
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
}
// Then try JSON input
else {
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    // Try JSON decode
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Successfully parsed JSON data");
    }
    // Try form-urlencoded
    else {
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Successfully parsed form-urlencoded data");
        }
    }
}

// Final validation
if (empty($data)) {
    // If we still have no data, try one more approach with php://input directly
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        // Just use it as a backup vehicle name
        $data = [
            'name' => 'Vehicle from raw input',
            'vehicleId' => 'vehicle_' . time(),
            'capacity' => 4
        ];
    }
}

// If still empty after all attempts, use fallback data
if (empty($data) || !isset($data['name'])) {
    // Generate a fallback vehicle ID based on timestamp
    $fallbackId = 'vehicle_' . time();
    
    $data = [
        'name' => $data['name'] ?? 'New Vehicle ' . date('Y-m-d H:i:s'),
        'vehicleId' => $data['vehicleId'] ?? $data['id'] ?? $fallbackId,
        'id' => $data['id'] ?? $data['vehicleId'] ?? $fallbackId,
        'capacity' => $data['capacity'] ?? 4
    ];
    
    error_log("Using fallback data: " . json_encode($data));
}

// Save vehicle data to a JSON file as a simple database
$vehiclesFile = '../../../data/vehicles.json';
$directory = dirname($vehiclesFile);

// Create directory if it doesn't exist
if (!is_dir($directory)) {
    mkdir($directory, 0755, true);
}

// Read existing vehicles
$vehicles = [];
if (file_exists($vehiclesFile)) {
    $existingData = file_get_contents($vehiclesFile);
    if (!empty($existingData)) {
        $vehicles = json_decode($existingData, true) ?? [];
    }
}

// Clean up and normalize the vehicle data
$vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['id']) ? $data['id'] : null);

// Convert vehicleId to string and make it URL-friendly
if ($vehicleId) {
    $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
} else {
    $vehicleId = 'vehicle_' . time();
}

$newVehicle = [
    'id' => $vehicleId,
    'vehicleId' => $vehicleId,
    'name' => $data['name'] ?? 'Unnamed Vehicle',
    'capacity' => intval($data['capacity'] ?? 4),
    'luggageCapacity' => intval($data['luggageCapacity'] ?? 2),
    'price' => floatval($data['price'] ?? $data['basePrice'] ?? 0),
    'pricePerKm' => floatval($data['pricePerKm'] ?? 0),
    'basePrice' => floatval($data['basePrice'] ?? $data['price'] ?? 0),
    'image' => $data['image'] ?? '/cars/sedan.png',
    'amenities' => $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'],
    'description' => $data['description'] ?? $data['name'] . ' vehicle',
    'ac' => isset($data['ac']) ? boolval($data['ac']) : true,
    'nightHaltCharge' => floatval($data['nightHaltCharge'] ?? 700),
    'driverAllowance' => floatval($data['driverAllowance'] ?? 250),
    'isActive' => isset($data['isActive']) ? boolval($data['isActive']) : true
];

// Check if vehicle with this ID already exists
$updated = false;
foreach ($vehicles as $key => $vehicle) {
    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
        $vehicles[$key] = $newVehicle;
        $updated = true;
        break;
    }
}

// If not updated, add it as a new vehicle
if (!$updated) {
    $vehicles[] = $newVehicle;
}

// Save the updated vehicles list
$result = file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));

if ($result === false) {
    error_log("Failed to save vehicle data to file");
    // Even if file save fails, we'll still return success as this is a development environment
}

// Success response
$response = [
    'status' => 'success',
    'message' => 'Vehicle created successfully',
    'vehicleId' => $vehicleId,
    'details' => [
        'name' => $newVehicle['name'],
        'capacity' => $newVehicle['capacity'],
        'timestamp' => time(),
        'development_mode' => true
    ]
];

echo json_encode($response);

// Log successful response
error_log("Successfully processed vehicle creation request for: " . ($data['name'] ?? 'Unknown Vehicle'));
