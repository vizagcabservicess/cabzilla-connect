
<?php
// direct-local-fares.php - Direct access endpoint for local fares

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

// If a specific vehicle ID is provided, return only that vehicle's fare
if ($vehicleId) {
    switch ($vehicleId) {
        case 'sedan':
            $localFares[] = [
                'vehicleId' => 'sedan',
                'price4hrs40km' => 800,
                'price8hrs80km' => 1500,
                'price10hrs100km' => 1800,
                'priceExtraKm' => 12,
                'priceExtraHour' => 100,
                'driverAllowance' => 250
            ];
            break;
        case 'ertiga':
            $localFares[] = [
                'vehicleId' => 'ertiga',
                'price4hrs40km' => 1000,
                'price8hrs80km' => 1800,
                'price10hrs100km' => 2200,
                'priceExtraKm' => 15,
                'priceExtraHour' => 120,
                'driverAllowance' => 250
            ];
            break;
        case 'innova_crysta':
            $localFares[] = [
                'vehicleId' => 'innova_crysta',
                'price4hrs40km' => 1200,
                'price8hrs80km' => 2200,
                'price10hrs100km' => 2600,
                'priceExtraKm' => 18,
                'priceExtraHour' => 150,
                'driverAllowance' => 300
            ];
            break;
        default:
            // For unknown vehicles, return empty fare structure
            $localFares[] = [
                'vehicleId' => $vehicleId,
                'price4hrs40km' => 0,
                'price8hrs80km' => 0,
                'price10hrs100km' => 0,
                'priceExtraKm' => 0,
                'priceExtraHour' => 0,
                'driverAllowance' => 250
            ];
            break;
    }
} else {
    // Return fares for all vehicles
    $localFares = [
        [
            'vehicleId' => 'sedan',
            'price4hrs40km' => 800,
            'price8hrs80km' => 1500,
            'price10hrs100km' => 1800,
            'priceExtraKm' => 12,
            'priceExtraHour' => 100,
            'driverAllowance' => 250
        ],
        [
            'vehicleId' => 'ertiga',
            'price4hrs40km' => 1000,
            'price8hrs80km' => 1800,
            'price10hrs100km' => 2200,
            'priceExtraKm' => 15,
            'priceExtraHour' => 120,
            'driverAllowance' => 250
        ],
        [
            'vehicleId' => 'innova_crysta',
            'price4hrs40km' => 1200,
            'price8hrs80km' => 2200,
            'price10hrs100km' => 2600,
            'priceExtraKm' => 18,
            'priceExtraHour' => 150,
            'driverAllowance' => 300
        ],
        [
            'vehicleId' => 'tempo_traveller',
            'price4hrs40km' => 2000,
            'price8hrs80km' => 3500,
            'price10hrs100km' => 4000,
            'priceExtraKm' => 25,
            'priceExtraHour' => 200,
            'driverAllowance' => 350
        ]
    ];
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Local package fares retrieved successfully',
    'fares' => $localFares
]);
