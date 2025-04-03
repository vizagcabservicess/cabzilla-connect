
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
            'priceOneWay' => 1500,
            'priceRoundTrip' => 2800,
            'nightCharges' => 300,
            'extraWaitingCharges' => 100
        ];
        break;
    case 'ertiga':
        $airportFares[] = [
            'vehicleId' => 'ertiga',
            'priceOneWay' => 1800,
            'priceRoundTrip' => 3400,
            'nightCharges' => 400,
            'extraWaitingCharges' => 120
        ];
        break;
    case 'innova_crysta':
        $airportFares[] = [
            'vehicleId' => 'innova_crysta',
            'priceOneWay' => 2200,
            'priceRoundTrip' => 4000,
            'nightCharges' => 500,
            'extraWaitingCharges' => 150
        ];
        break;
    case 'tempo_traveller':
        $airportFares[] = [
            'vehicleId' => 'tempo_traveller',
            'priceOneWay' => 3500,
            'priceRoundTrip' => 6500,
            'nightCharges' => 700,
            'extraWaitingCharges' => 200
        ];
        break;
    default:
        // For unknown vehicles, return empty fare structure
        $airportFares[] = [
            'vehicleId' => $vehicleId,
            'priceOneWay' => 0,
            'priceRoundTrip' => 0,
            'nightCharges' => 0,
            'extraWaitingCharges' => 0
        ];
        break;
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares retrieved successfully',
    'fares' => $airportFares
]);
