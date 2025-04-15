
<?php
// Mock PHP file for direct-local-fares.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
}

// If vehicle ID is not in JSON body, check POST data
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
}

// If still no vehicleId, set a default for the mock data
if (!$vehicleId) {
    $vehicleId = 'sedan';
}

// Sample fare data based on vehicle type
$localFares = [];

// Normalize vehicle ID for consistency
$normalizedVehicleId = strtolower($vehicleId);
$matchFound = false;

// Match vehicle ID to one of our known types for the mock data
if (strpos($normalizedVehicleId, 'sedan') !== false || 
    strpos($normalizedVehicleId, 'swift') !== false || 
    strpos($normalizedVehicleId, 'dzire') !== false ||
    strpos($normalizedVehicleId, 'amaze') !== false ||
    strpos($normalizedVehicleId, 'etios') !== false) {
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'price4hrs40km' => 1200,
        'price8hrs80km' => 2000,
        'price10hrs100km' => 2500,
        'priceExtraKm' => 12,
        'priceExtraHour' => 100
    ];
    $matchFound = true;
} 

if (strpos($normalizedVehicleId, 'ertiga') !== false || 
    strpos($normalizedVehicleId, 'suv') !== false) {
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'price4hrs40km' => 1500,
        'price8hrs80km' => 2500,
        'price10hrs100km' => 3000,
        'priceExtraKm' => 15,
        'priceExtraHour' => 120
    ];
    $matchFound = true;
}

if (strpos($normalizedVehicleId, 'innova') !== false || 
    strpos($normalizedVehicleId, 'crysta') !== false ||
    strpos($normalizedVehicleId, 'hycross') !== false ||
    strpos($normalizedVehicleId, 'mpv') !== false) {
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'price4hrs40km' => 1800,
        'price8hrs80km' => 3000,
        'price10hrs100km' => 3500,
        'priceExtraKm' => 18,
        'priceExtraHour' => 150
    ];
    $matchFound = true;
}

if (strpos($normalizedVehicleId, 'tempo') !== false || 
    strpos($normalizedVehicleId, 'traveller') !== false) {
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'price4hrs40km' => 2500,
        'price8hrs80km' => 4000,
        'price10hrs100km' => 5000,
        'priceExtraKm' => 25,
        'priceExtraHour' => 200
    ];
    $matchFound = true;
}

// Default for any other vehicle
if (!$matchFound) {
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'price4hrs40km' => 1500,
        'price8hrs80km' => 2500,
        'price10hrs100km' => 3000,
        'priceExtraKm' => 15,
        'priceExtraHour' => 120
    ];
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Local fares retrieved successfully',
    'fares' => $localFares,
    'timestamp' => time()
]);
