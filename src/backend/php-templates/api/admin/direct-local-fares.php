
<?php
// PHP file for fetching data from local_package_fares database table
// This file retrieves real pricing data from the database

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
        'message' => 'Vehicle ID is required',
        'source' => 'error_handler'
    ]);
    exit;
}

// Log the request
error_log("Processing local fare request for vehicle ID: " . $vehicleId);

// Initialize the response data
$response = [
    'status' => 'success',
    'message' => 'Local fares retrieved successfully',
    'fares' => [],
    'source' => 'fallback_mock_data' // Default source
];

// Try to get fares from the database first
try {
    require_once '../../config.php';
    $conn = getDbConnection();
    
    if ($conn) {
        // Log connection success
        error_log("Database connection successful, querying local_package_fares for vehicle_id: " . $vehicleId);
        
        // Using the proper column names from the database schema (as shown in PHPMyAdmin)
        $stmt = $conn->prepare("SELECT 
            id,
            vehicle_id,
            price_4hrs_40km,
            price_8hrs_80km,
            price_10hrs_100km,
            price_extra_km,
            price_extra_hour
            FROM local_package_fares WHERE vehicle_id = ?");
        
        if (!$stmt) {
            error_log("Error preparing statement: " . $conn->error);
            throw new Exception("Database query preparation failed");
        }
        
        $stmt->bind_param("s", $vehicleId);
        $success = $stmt->execute();
        
        if (!$success) {
            error_log("Error executing query: " . $stmt->error);
            throw new Exception("Database query execution failed");
        }
        
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            // Found data in the database
            $row = $result->fetch_assoc();
            error_log("Found data in database for vehicle_id: " . $vehicleId . " with price_8hrs_80km: " . $row['price_8hrs_80km']);
            
            // Update response with database data
            $response['source'] = 'local_package_fares';
            $response['fares'] = [[
                'vehicleId' => $row['vehicle_id'],
                'price4hrs40km' => floatval($row['price_4hrs_40km']),
                'price8hrs80km' => floatval($row['price_8hrs_80km']),
                'price10hrs100km' => floatval($row['price_10hrs_100km']),
                'priceExtraKm' => floatval($row['price_extra_km']),
                'priceExtraHour' => floatval($row['price_extra_hour'])
            ]];
            
            // Return the data from database and exit
            echo json_encode($response);
            exit;
        } else {
            error_log("No results found in local_package_fares for vehicle_id: " . $vehicleId);
        }
    } else {
        error_log("Database connection failed");
    }
} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
}

// If we reach here, we didn't get data from the database
// Use fallback mock data
error_log("Using fallback data for vehicle_id: " . $vehicleId);

// Sample fare data based on vehicle type
switch ($vehicleId) {
    case 'sedan':
        $response['fares'] = [[
            'vehicleId' => 'sedan',
            'price4hrs40km' => 800,
            'price8hrs80km' => 1500,
            'price10hrs100km' => 1800,
            'priceExtraKm' => 12,
            'priceExtraHour' => 100
        ]];
        break;
    case 'ertiga':
        $response['fares'] = [[
            'vehicleId' => 'ertiga',
            'price4hrs40km' => 1000,
            'price8hrs80km' => 1800,
            'price10hrs100km' => 2200,
            'priceExtraKm' => 15,
            'priceExtraHour' => 120
        ]];
        break;
    case 'innova_crysta':
        $response['fares'] = [[
            'vehicleId' => 'innova_crysta',
            'price4hrs40km' => 1200,
            'price8hrs80km' => 2200,
            'price10hrs100km' => 2600,
            'priceExtraKm' => 18,
            'priceExtraHour' => 150
        ]];
        break;
    case 'tempo_traveller':
        $response['fares'] = [[
            'vehicleId' => 'tempo_traveller',
            'price4hrs40km' => 2000,
            'price8hrs80km' => 3500,
            'price10hrs100km' => 4000,
            'priceExtraKm' => 25,
            'priceExtraHour' => 200
        ]];
        break;
    default:
        // For unknown vehicles, return empty fare structure
        $response['fares'] = [[
            'vehicleId' => $vehicleId,
            'price4hrs40km' => 0,
            'price8hrs80km' => 0,
            'price10hrs100km' => 0,
            'priceExtraKm' => 0,
            'priceExtraHour' => 0
        ]];
        break;
}

// Return JSON response
echo json_encode($response);
