
<?php
// CORS headers for API endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/direct-local-fares.log';
$timestamp = date('Y-m-d H:i:s');

// Function to get database connection
function getDbConnection() {
    $host = 'localhost';
    $dbname = 'u644605165_db_be';
    $username = 'u644605165_usr_be';
    $password = 'Vizag@1213';
    
    try {
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (PDOException $e) {
        file_put_contents($GLOBALS['logFile'], "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw new Exception("Database connection error: " . $e->getMessage());
    }
}

// Normalize vehicle ID function
function normalizeVehicleId($vehicleId) {
    if (!$vehicleId) return null;
    // Convert to lowercase and replace spaces with underscores
    return strtolower(str_replace(' ', '_', trim($vehicleId)));
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $packageId = isset($_GET['package_id']) ? $_GET['package_id'] : '8hrs-80km'; // Default package
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request
    file_put_contents($logFile, "[$timestamp] Local fares request: vehicleId=$vehicleId, packageId=$packageId\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query local_package_fares by normalized vehicle_id
    $query = "SELECT vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour 
              FROM local_package_fares 
              WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :vehicle_id";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':vehicle_id', $vehicleId);
    
    // Log the query and parameters
    file_put_contents($logFile, "[$timestamp] SQL Query: $query\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Parameters: vehicleId=$vehicleId\n", FILE_APPEND);
    
    $stmt->execute();
    
    // Fetch result
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Log query result
    file_put_contents($logFile, "[$timestamp] Query result: " . json_encode($result) . "\n", FILE_APPEND);
    
    if ($result) {
        // Determine base price based on package ID
        $basePrice = 0;
        switch ($packageId) {
            case '4hrs-40km':
                $basePrice = (float)$result['price_4hrs_40km'];
                break;
            case '8hrs-80km':
                $basePrice = (float)$result['price_8hrs_80km'];
                break;
            case '10hrs-100km':
                $basePrice = (float)$result['price_10hrs_100km'];
                break;
            default:
                $basePrice = (float)$result['price_8hrs_80km']; // Default to 8hrs-80km
                break;
        }
        
        // Create standardized fare object
        $fare = [
            'vehicleId' => $result['vehicle_id'],
            'price4hrs40km' => (float)$result['price_4hrs_40km'],
            'price8hrs80km' => (float)$result['price_8hrs_80km'],
            'price10hrs100km' => (float)$result['price_10hrs_100km'],
            'priceExtraKm' => (float)$result['price_extra_km'],
            'priceExtraHour' => (float)$result['price_extra_hour'],
            'basePrice' => $basePrice,
            'totalPrice' => $basePrice,
            'breakdown' => [
                $packageId => $basePrice
            ]
        ];
        
        // Return success response with fare data
        echo json_encode([
            'status' => 'success',
            'message' => 'Local fares retrieved successfully',
            'fares' => [$fare]
        ]);
        
    } else {
        // No result found for this vehicle ID, log this
        file_put_contents($logFile, "[$timestamp] No local fare found for vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Return hardcoded sample data for testing
        $basePrice = 0;
        $price4hrs40km = 0;
        $price8hrs80km = 0;
        $price10hrs100km = 0;
        
        // Set sample prices based on vehicle ID
        if ($vehicleId == 'sedan') {
            $price4hrs40km = 800;
            $price8hrs80km = 1500;
            $price10hrs100km = 1800;
        } else if ($vehicleId == 'ertiga') {
            $price4hrs40km = 1000;
            $price8hrs80km = 1800;
            $price10hrs100km = 2200;
        } else if ($vehicleId == 'innova_crysta') {
            $price4hrs40km = 1200;
            $price8hrs80km = 2400;
            $price10hrs100km = 2800;
        } else {
            $price4hrs40km = 900;
            $price8hrs80km = 1600;
            $price10hrs100km = 2000;
        }
        
        // Determine base price based on package ID
        switch ($packageId) {
            case '4hrs-40km':
                $basePrice = $price4hrs40km;
                break;
            case '8hrs-80km':
                $basePrice = $price8hrs80km;
                break;
            case '10hrs-100km':
                $basePrice = $price10hrs100km;
                break;
            default:
                $basePrice = $price8hrs80km; // Default to 8hrs-80km
                break;
        }
        
        $fare = [
            'vehicleId' => $vehicleId,
            'price4hrs40km' => $price4hrs40km,
            'price8hrs80km' => $price8hrs80km,
            'price10hrs100km' => $price10hrs100km,
            'priceExtraKm' => 12,
            'priceExtraHour' => 100,
            'basePrice' => $basePrice,
            'totalPrice' => $basePrice,
            'breakdown' => [
                $packageId => $basePrice
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Using sample local fare data (no database record found)',
            'fares' => [$fare]
        ]);
    }
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
