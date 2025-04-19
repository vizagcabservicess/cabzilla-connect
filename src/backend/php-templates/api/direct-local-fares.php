
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

// Get default package pricing for a vehicle type
function getDefaultPackagePricing($vehicleId) {
    $defaultPricing = [
        'sedan' => [
            'price_4hrs_40km' => 1400,
            'price_8hrs_80km' => 2400, 
            'price_10hrs_100km' => 3000,
            'price_extra_km' => 14,
            'price_extra_hour' => 250
        ],
        'ertiga' => [
            'price_4hrs_40km' => 1500,
            'price_8hrs_80km' => 3000,
            'price_10hrs_100km' => 3500,
            'price_extra_km' => 18,
            'price_extra_hour' => 300
        ],
        'innova_crysta' => [
            'price_4hrs_40km' => 1800,
            'price_8hrs_80km' => 3500,
            'price_10hrs_100km' => 4000,
            'price_extra_km' => 20,
            'price_extra_hour' => 350
        ],
        'luxury' => [
            'price_4hrs_40km' => 3500,
            'price_8hrs_80km' => 5500,
            'price_10hrs_100km' => 6500,
            'price_extra_km' => 25,
            'price_extra_hour' => 400
        ],
        'tempo' => [
            'price_4hrs_40km' => 3000,
            'price_8hrs_80km' => 4500,
            'price_10hrs_100km' => 5500,
            'price_extra_km' => 22,
            'price_extra_hour' => 350
        ],
        'bus' => [
            'price_4hrs_40km' => 3000,
            'price_8hrs_80km' => 7000,
            'price_10hrs_100km' => 9000,
            'price_extra_km' => 28,
            'price_extra_hour' => 400
        ],
        'mpv' => [
            'price_4hrs_40km' => 2000,
            'price_8hrs_80km' => 4000,
            'price_10hrs_100km' => 4500,
            'price_extra_km' => 22,
            'price_extra_hour' => 450
        ],
        'toyota' => [
            'price_4hrs_40km' => 1400,
            'price_8hrs_80km' => 2400,
            'price_10hrs_100km' => 3000,
            'price_extra_km' => 14,
            'price_extra_hour' => 300
        ],
        'dzire_cng' => [
            'price_4hrs_40km' => 1400,
            'price_8hrs_80km' => 2400,
            'price_10hrs_100km' => 3000,
            'price_extra_km' => 14,
            'price_extra_hour' => 300
        ],
        'tempo_traveller' => [
            'price_4hrs_40km' => 6500,
            'price_8hrs_80km' => 6500,
            'price_10hrs_100km' => 7500,
            'price_extra_km' => 35,
            'price_extra_hour' => 750
        ],
        'amaze' => [
            'price_4hrs_40km' => 1400,
            'price_8hrs_80km' => 2400,
            'price_10hrs_100km' => 3000,
            'price_extra_km' => 14,
            'price_extra_hour' => 300
        ]
    ];
    
    // Check if we have a direct match
    if (isset($defaultPricing[$vehicleId])) {
        return $defaultPricing[$vehicleId];
    }
    
    // Check for partial match
    foreach ($defaultPricing as $key => $pricing) {
        if (strpos($vehicleId, $key) !== false) {
            return $pricing;
        }
    }
    
    // Return sedan pricing as default
    return $defaultPricing['sedan'];
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $packageId = isset($_GET['package_id']) ? $_GET['package_id'] : '8hrs-80km'; // Default package
    
    // Log original vehicle ID before normalization
    file_put_contents($logFile, "[$timestamp] Original vehicle ID: $vehicleId\n", FILE_APPEND);
    
    // Normalize vehicle ID
    $originalVehicleId = $vehicleId;
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request with normalized ID
    file_put_contents($logFile, "[$timestamp] Local fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, packageId=$packageId\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Variables to store pricing information
    $useDefaultPricing = false;
    $price4hrs40km = 0;
    $price8hrs80km = 0;
    $price10hrs100km = 0;
    $priceExtraKm = 0;
    $priceExtraHour = 0;
    
    try {
        // Connect to database
        $conn = getDbConnection();
        
        // Query local_package_fares by normalized vehicle_id
        $query = "SELECT * FROM local_package_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :vehicle_id";
        
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
            // Use database values
            $price4hrs40km = (float)$result['price_4hrs_40km'] ?? 0;
            $price8hrs80km = (float)$result['price_8hrs_80km'] ?? 0;
            $price10hrs100km = (float)$result['price_10hrs_100km'] ?? 0;
            $priceExtraKm = (float)$result['price_extra_km'] ?? 0;
            $priceExtraHour = (float)$result['price_extra_hour'] ?? 0;
            
            file_put_contents($logFile, "[$timestamp] Using database pricing: price4hrs40km=$price4hrs40km, price8hrs80km=$price8hrs80km\n", FILE_APPEND);
        } else {
            // If no direct match, try partial match in database
            $query = "SELECT * FROM local_package_fares WHERE LOWER(vehicle_id) LIKE :vehicle_id_like LIMIT 1";
            $likeParam = "%" . str_replace('_', '%', $vehicleId) . "%";
            
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':vehicle_id_like', $likeParam);
            
            file_put_contents($logFile, "[$timestamp] Trying partial match SQL Query: $query with parameter $likeParam\n", FILE_APPEND);
            
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                // Use partial match values
                $price4hrs40km = (float)$result['price_4hrs_40km'] ?? 0;
                $price8hrs80km = (float)$result['price_8hrs_80km'] ?? 0;
                $price10hrs100km = (float)$result['price_10hrs_100km'] ?? 0;
                $priceExtraKm = (float)$result['price_extra_km'] ?? 0;
                $priceExtraHour = (float)$result['price_extra_hour'] ?? 0;
                
                file_put_contents($logFile, "[$timestamp] Using partial match database pricing: price4hrs40km=$price4hrs40km, price8hrs80km=$price8hrs80km\n", FILE_APPEND);
            }
        }
    } catch (Exception $e) {
        // Log database error but continue with default pricing
        file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . " - Using default pricing\n", FILE_APPEND);
    }
    
    // Check if we got valid pricing from the database
    if ($price4hrs40km <= 0 || $price8hrs80km <= 0 || $price10hrs100km <= 0) {
        $useDefaultPricing = true;
        
        // Get default pricing for the vehicle type
        $defaultPackagePricing = getDefaultPackagePricing($vehicleId);
        $price4hrs40km = $defaultPackagePricing['price_4hrs_40km'];
        $price8hrs80km = $defaultPackagePricing['price_8hrs_80km'];
        $price10hrs100km = $defaultPackagePricing['price_10hrs_100km'];
        $priceExtraKm = $defaultPackagePricing['price_extra_km'];
        $priceExtraHour = $defaultPackagePricing['price_extra_hour'];
        
        file_put_contents($logFile, "[$timestamp] Using default package pricing for $vehicleId: price4hrs40km=$price4hrs40km, price8hrs80km=$price8hrs80km\n", FILE_APPEND);
    }
    
    // Determine base price based on package ID
    $basePrice = 0;
    switch ($packageId) {
        case '4hrs-40km':
            $basePrice = (float)$price4hrs40km;
            break;
        case '8hrs-80km':
            $basePrice = (float)$price8hrs80km;
            break;
        case '10hrs-100km':
            $basePrice = (float)$price10hrs100km;
            break;
        default:
            $basePrice = (float)$price8hrs80km; // Default to 8hrs-80km
            break;
    }
    
    // Create standardized fare object
    $fare = [
        'vehicleId' => $originalVehicleId,
        'price4hrs40km' => (float)$price4hrs40km,
        'price8hrs80km' => (float)$price8hrs80km,
        'price10hrs100km' => (float)$price10hrs100km,
        'priceExtraKm' => (float)$priceExtraKm,
        'priceExtraHour' => (float)$priceExtraHour,
        'basePrice' => $basePrice,
        'totalPrice' => $basePrice,
        'price' => $basePrice, // Add price field for consistency
        'breakdown' => [
            $packageId => $basePrice
        ],
        'isDefaultPricing' => $useDefaultPricing
    ];
    
    // Return success response with fare data
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares retrieved successfully',
        'fare' => $fare, // Include single fare object for consistency
        'fares' => [$fare] // Include fares array for backward compatibility
    ]);
    
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
