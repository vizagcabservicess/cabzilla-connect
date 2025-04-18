
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

// Sample fare data based on vehicle type
$localFares = [];

switch ($vehicleId) {
    case 'sedan':
        $localFares[] = [
            'vehicleId' => 'sedan',
            'price4hrs40km' => 1500,
            'price8hrs80km' => 2500,
            'price10hrs100km' => 3200,
            'extraKmRate' => 15,
            'extraHourRate' => 150
        ];
        break;
    case 'ertiga':
        $localFares[] = [
            'vehicleId' => 'ertiga',
            'price4hrs40km' => 1700,
            'price8hrs80km' => 2700,
            'price10hrs100km' => 3500,
            'extraKmRate' => 18,
            'extraHourRate' => 200
        ];
        break;
    case 'innova_crysta':
        $localFares[] = [
            'vehicleId' => 'innova_crysta',
            'price4hrs40km' => 2000,
            'price8hrs80km' => 3000,
            'price10hrs100km' => 3800,
            'extraKmRate' => 20,
            'extraHourRate' => 250
        ];
        break;
    case 'tempo_traveller':
        $localFares[] = [
            'vehicleId' => 'tempo_traveller',
            'price4hrs40km' => 2500,
            'price8hrs80km' => 4000,
            'price10hrs100km' => 5000,
            'extraKmRate' => 22,
            'extraHourRate' => 250
        ];
        break;
    default:
        // If no specific vehicle ID was provided or it doesn't match any known type,
        // return all vehicle fares
        if (!$vehicleId) {
            $localFares = [
                [
                    'vehicleId' => 'sedan',
                    'price4hrs40km' => 1500,
                    'price8hrs80km' => 2500,
                    'price10hrs100km' => 3200,
                    'extraKmRate' => 15,
                    'extraHourRate' => 150
                ],
                [
                    'vehicleId' => 'ertiga',
                    'price4hrs40km' => 1700,
                    'price8hrs80km' => 2700,
                    'price10hrs100km' => 3500,
                    'extraKmRate' => 18,
                    'extraHourRate' => 200
                ],
                [
                    'vehicleId' => 'innova_crysta',
                    'price4hrs40km' => 2000,
                    'price8hrs80km' => 3000,
                    'price10hrs100km' => 3800,
                    'extraKmRate' => 20,
                    'extraHourRate' => 250
                ],
                [
                    'vehicleId' => 'tempo_traveller',
                    'price4hrs40km' => 2500,
                    'price8hrs80km' => 4000,
                    'price10hrs100km' => 5000,
                    'extraKmRate' => 22,
                    'extraHourRate' => 250
                ]
            ];
        } else {
            // For unknown vehicles, return empty fare structure
            $localFares[] = [
                'vehicleId' => $vehicleId,
                'price4hrs40km' => 0,
                'price8hrs80km' => 0,
                'price10hrs100km' => 0,
                'extraKmRate' => 0,
                'extraHourRate' => 0
            ];
        }
        break;
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Local package fares retrieved successfully',
    'fares' => $localFares
]);
