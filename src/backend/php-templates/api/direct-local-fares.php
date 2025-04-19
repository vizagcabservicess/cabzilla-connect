
<?php
// Mock PHP file for direct-local-fares.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.8');
header('X-Debug-File: direct-local-fares.php');

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

// Log request for debugging
error_log("Local fare request for vehicle: $vehicleId");

try {
    // If we're not in a mock environment, try to connect to the database
    $conn = null;
    $usingDatabase = false;
    $usingMockData = true;
    
    if (function_exists('getDbConnection')) {
        try {
            $conn = getDbConnection();
            error_log("Database connection successful");
            $usingDatabase = true;
            $usingMockData = false;
        } catch (Exception $e) {
            error_log("Database connection failed: " . $e->getMessage());
        }
    }
    
    // Initialize fares array
    $localFares = [];
    
    // If we have a database connection, try to get real fare data
    if ($conn && $usingDatabase) {
        $normalizedVehicleId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // First try exact match
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if (!$result || $result->num_rows === 0) {
            // Try with normalized ID
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $normalizedVehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
        }
        
        if (!$result || $result->num_rows === 0) {
            // Try partial match using LIKE
            $likePattern = '%' . str_replace('_', '%', $normalizedVehicleId) . '%';
            $query = "SELECT * FROM local_package_fares WHERE vehicle_id LIKE ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $likePattern);
            $stmt->execute();
            $result = $stmt->get_result();
        }
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            error_log("Found fare data in database for $vehicleId: " . json_encode($row));
            
            $localFares[] = [
                'vehicleId' => $vehicleId, // Use the original vehicle ID for consistency
                'price4hrs40km' => (float)$row['price_4hrs_40km'],
                'price8hrs80km' => (float)$row['price_8hrs_80km'],
                'price10hrs100km' => (float)$row['price_10hrs_100km'],
                'priceExtraKm' => (float)$row['price_extra_km'],
                'priceExtraHour' => (float)$row['price_extra_hour']
            ];
            
            $usingMockData = false;
            error_log("Using database data for $vehicleId");
        } else {
            error_log("No database records found for $vehicleId, falling back to mock data");
            $usingMockData = true;
        }
    }
    
    // If we don't have database data, use mock data
    if ($usingMockData) {
        error_log("Using mock data for $vehicleId");
        // Normalize the vehicle ID for mock data lookup
        $normalizedId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // Define mock data based on vehicle type
        $mockFares = [
            'sedan' => [
                'price4hrs40km' => 800,
                'price8hrs80km' => 1500,
                'price10hrs100km' => 1800,
                'priceExtraKm' => 12,
                'priceExtraHour' => 100
            ],
            'ertiga' => [
                'price4hrs40km' => 1000,
                'price8hrs80km' => 1800,
                'price10hrs100km' => 2200,
                'priceExtraKm' => 15,
                'priceExtraHour' => 120
            ],
            'innova_crysta' => [
                'price4hrs40km' => 1200,
                'price8hrs80km' => 2200,
                'price10hrs100km' => 2600,
                'priceExtraKm' => 18,
                'priceExtraHour' => 150
            ],
            'tempo_traveller' => [
                'price4hrs40km' => 2000,
                'price8hrs80km' => 3500,
                'price10hrs100km' => 4000,
                'priceExtraKm' => 25,
                'priceExtraHour' => 200
            ],
            'mpv' => [
                'price4hrs40km' => 2000,
                'price8hrs80km' => 4000,
                'price10hrs100km' => 4500,
                'priceExtraKm' => 22,
                'priceExtraHour' => 450
            ],
            'toyota' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 300
            ],
            'dzire_cng' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 300
            ]
        ];
        
        // Check for direct match
        if (isset($mockFares[$normalizedId])) {
            $fare = $mockFares[$normalizedId];
            $localFares[] = array_merge(['vehicleId' => $vehicleId], $fare);
        } 
        // Check for partial matches
        else {
            $matched = false;
            foreach ($mockFares as $key => $fare) {
                if (strpos($normalizedId, $key) !== false || strpos($key, $normalizedId) !== false) {
                    $localFares[] = array_merge(['vehicleId' => $vehicleId], $fare);
                    $matched = true;
                    break;
                }
            }
            
            // If no match found, use sedan as default
            if (!$matched) {
                $localFares[] = array_merge(['vehicleId' => $vehicleId], $mockFares['sedan']);
            }
        }
    }
    
    // Return JSON response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares retrieved successfully',
        'fares' => $localFares,
        'source' => $usingMockData ? 'mock' : 'database',
        'timestamp' => time(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'normalizedId' => strtolower(str_replace(' ', '_', $vehicleId)),
            'usingDatabase' => $usingDatabase,
            'usingMockData' => $usingMockData
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in direct-local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
