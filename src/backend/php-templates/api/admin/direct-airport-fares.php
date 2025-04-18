
<?php
// Mock PHP file for direct-airport-fares.php
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

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Sample fare data based on vehicle type
$airportFares = [];

switch ($vehicleId) {
    case 'sedan':
        $airportFares[] = [
            'vehicleId' => 'sedan',
            'tier1Price' => 800,
            'tier2Price' => 1200,
            'tier3Price' => 1600,
            'tier4Price' => 2000,
            'extraKmCharge' => 12
        ];
        break;
    case 'ertiga':
        $airportFares[] = [
            'vehicleId' => 'ertiga',
            'tier1Price' => 1000,
            'tier2Price' => 1500,
            'tier3Price' => 2000,
            'tier4Price' => 2500,
            'extraKmCharge' => 15
        ];
        break;
    case 'innova_crysta':
        $airportFares[] = [
            'vehicleId' => 'innova_crysta',
            'tier1Price' => 1200,
            'tier2Price' => 1800,
            'tier3Price' => 2400,
            'tier4Price' => 3000,
            'extraKmCharge' => 18
        ];
        break;
    case 'tempo_traveller':
        $airportFares[] = [
            'vehicleId' => 'tempo_traveller',
            'tier1Price' => 2000,
            'tier2Price' => 2500,
            'tier3Price' => 3000,
            'tier4Price' => 4000,
            'extraKmCharge' => 25
        ];
        break;
    default:
        // For unknown vehicles, return empty fare structure
        $airportFares[] = [
            'vehicleId' => $vehicleId,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0
        ];
        break;
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Airport transfer fares retrieved successfully',
    'fares' => $airportFares
]);
