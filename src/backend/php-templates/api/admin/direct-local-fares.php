
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

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// First try to get fares from the local_package_fares table
$conn = null;
$fromDatabase = false;
$sourceTable = "local_package_fares";

try {
    require_once '../../config.php';
    $conn = getDbConnection();
    
    if ($conn) {
        // Query for the vehicle's fare data from the local_package_fares table
        $stmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            $localFares = [[
                'vehicleId' => $row['vehicle_id'],
                'price4hrs40km' => floatval($row['price_4hrs_40km']),
                'price8hrs80km' => floatval($row['price_8hrs_80km']),
                'price10hrs100km' => floatval($row['price_10hrs_100km']),
                'priceExtraKm' => floatval($row['price_extra_km']),
                'priceExtraHour' => floatval($row['price_extra_hour'])
            ]];
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Local fares retrieved successfully from database',
                'fares' => $localFares,
                'source' => $sourceTable
            ]);
            exit;
        }
    }
} catch (Exception $e) {
    // Log error but continue to fallback data
    error_log("Error querying database for local fares: " . $e->getMessage());
}

// Sample fare data based on vehicle type (fallback if database query fails)
$localFares = [];
$sourceTable = "fallback_mock_data";

switch ($vehicleId) {
    case 'sedan':
        $localFares[] = [
            'vehicleId' => 'sedan',
            'price4hrs40km' => 800,
            'price8hrs80km' => 1500,
            'price10hrs100km' => 1800,
            'priceExtraKm' => 12,
            'priceExtraHour' => 100
        ];
        break;
    case 'ertiga':
        $localFares[] = [
            'vehicleId' => 'ertiga',
            'price4hrs40km' => 1000,
            'price8hrs80km' => 1800,
            'price10hrs100km' => 2200,
            'priceExtraKm' => 15,
            'priceExtraHour' => 120
        ];
        break;
    case 'innova_crysta':
        $localFares[] = [
            'vehicleId' => 'innova_crysta',
            'price4hrs40km' => 1200,
            'price8hrs80km' => 2200,
            'price10hrs100km' => 2600,
            'priceExtraKm' => 18,
            'priceExtraHour' => 150
        ];
        break;
    case 'tempo_traveller':
        $localFares[] = [
            'vehicleId' => 'tempo_traveller',
            'price4hrs40km' => 2000,
            'price8hrs80km' => 3500,
            'price10hrs100km' => 4000,
            'priceExtraKm' => 25,
            'priceExtraHour' => 200
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
            'priceExtraHour' => 0
        ];
        break;
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Local fares retrieved successfully',
    'fares' => $localFares,
    'source' => $sourceTable
]);
