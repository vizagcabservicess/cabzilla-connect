
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
    $normalized = strtolower(str_replace(' ', '_', trim($vehicleId)));
    
    // Additional manual mappings
    $mappings = [
        'innova_hyrcoss' => 'innova_crysta',
        'innova_hycross' => 'innova_crysta',
        'innovacrystal' => 'innova_crysta',
        'innova_crystal' => 'innova_crysta',
        'innovacrystal_7seater' => 'innova_crysta',
        'innova' => 'innova_crysta',
        'crysta' => 'innova_crysta',
        'toyota_innova' => 'innova_crysta',
        'mpv' => 'MPV',
        'toyota' => 'Toyota',
        'dzire_cng' => 'Dzire CNG',
        'tempo_traveller' => 'tempo_traveller',
        'amaze' => 'amaze',
        'bus' => 'bus'
    ];
    
    // Direct replacements
    if (isset($mappings[$normalized])) {
        return $mappings[$normalized];
    }
    
    return $normalized;
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
    $price4hrs40km = 0;
    $price8hrs80km = 0;
    $price10hrs100km = 0;
    $priceExtraKm = 0;
    $priceExtraHour = 0;
    $isDefaultPricing = false;
    
    try {
        // Connect to database
        $conn = getDbConnection();
        
        // Query local_package_fares by vehicle_id (exact match first)
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = :vehicle_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':vehicle_id', $vehicleId);
        
        // Log the query
        file_put_contents($logFile, "[$timestamp] SQL Query: $query with param: $vehicleId\n", FILE_APPEND);
        
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            // No exact match, try with lowercase
            $vehicleIdLower = strtolower($vehicleId);
            
            $query = "SELECT * FROM local_package_fares WHERE LOWER(vehicle_id) = :vehicle_id_lower";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':vehicle_id_lower', $vehicleIdLower);
            
            file_put_contents($logFile, "[$timestamp] Trying lowercase SQL Query: $query with param: $vehicleIdLower\n", FILE_APPEND);
            
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$result) {
            // Still no match, try partial match
            $query = "SELECT * FROM local_package_fares WHERE 
                     LOWER(vehicle_id) LIKE :vehicle_id_like OR 
                     :vehicle_id_like LIKE CONCAT('%', LOWER(vehicle_id), '%')
                     LIMIT 1";
            
            $likeParam = "%$vehicleIdLower%";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':vehicle_id_like', $likeParam);
            
            file_put_contents($logFile, "[$timestamp] Trying partial match SQL Query: $query with param: $likeParam\n", FILE_APPEND);
            
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // Log query result
        file_put_contents($logFile, "[$timestamp] Final query result: " . json_encode($result) . "\n", FILE_APPEND);
        
        if ($result) {
            // Use database values
            $price4hrs40km = (float)$result['price_4hrs_40km'];
            $price8hrs80km = (float)$result['price_8hrs_80km'];
            $price10hrs100km = (float)$result['price_10hrs_100km'];
            $priceExtraKm = (float)$result['price_extra_km'];
            $priceExtraHour = (float)$result['price_extra_hour'];
            
            file_put_contents($logFile, "[$timestamp] Using database pricing for $vehicleId: price4hrs40km=$price4hrs40km, price8hrs80km=$price8hrs80km\n", FILE_APPEND);
        } else {
            // If no match in database, use fallback
            $isDefaultPricing = true;
            
            // Define fallback pricing based on database values
            $fallbackPricing = [
                'sedan' => ['price_4hrs_40km' => 1400, 'price_8hrs_80km' => 2400, 'price_10hrs_100km' => 3000, 'price_extra_km' => 13, 'price_extra_hour' => 300],
                'ertiga' => ['price_4hrs_40km' => 1500, 'price_8hrs_80km' => 3000, 'price_10hrs_100km' => 3500, 'price_extra_km' => 18, 'price_extra_hour' => 250],
                'innova_crysta' => ['price_4hrs_40km' => 1800, 'price_8hrs_80km' => 3500, 'price_10hrs_100km' => 4000, 'price_extra_km' => 20, 'price_extra_hour' => 400],
                'MPV' => ['price_4hrs_40km' => 2000, 'price_8hrs_80km' => 4000, 'price_10hrs_100km' => 4500, 'price_extra_km' => 22, 'price_extra_hour' => 450],
                'Toyota' => ['price_4hrs_40km' => 1400, 'price_8hrs_80km' => 2400, 'price_10hrs_100km' => 3000, 'price_extra_km' => 14, 'price_extra_hour' => 300],
                'Dzire CNG' => ['price_4hrs_40km' => 1400, 'price_8hrs_80km' => 2400, 'price_10hrs_100km' => 3000, 'price_extra_km' => 14, 'price_extra_hour' => 300],
                'tempo_traveller' => ['price_4hrs_40km' => 6500, 'price_8hrs_80km' => 6500, 'price_10hrs_100km' => 7500, 'price_extra_km' => 35, 'price_extra_hour' => 750],
                'tempo' => ['price_4hrs_40km' => 3000, 'price_8hrs_80km' => 4500, 'price_10hrs_100km' => 5500, 'price_extra_km' => 22, 'price_extra_hour' => 300],
                'luxury' => ['price_4hrs_40km' => 3500, 'price_8hrs_80km' => 5500, 'price_10hrs_100km' => 6500, 'price_extra_km' => 25, 'price_extra_hour' => 300],
                'amaze' => ['price_4hrs_40km' => 1400, 'price_8hrs_80km' => 2400, 'price_10hrs_100km' => 3000, 'price_extra_km' => 14, 'price_extra_hour' => 300],
                'bus' => ['price_4hrs_40km' => 3000, 'price_8hrs_80km' => 7000, 'price_10hrs_100km' => 9000, 'price_extra_km' => 40, 'price_extra_hour' => 900]
            ];
            
            // Try exact match first
            if (isset($fallbackPricing[$vehicleId])) {
                $price4hrs40km = $fallbackPricing[$vehicleId]['price_4hrs_40km'];
                $price8hrs80km = $fallbackPricing[$vehicleId]['price_8hrs_80km'];
                $price10hrs100km = $fallbackPricing[$vehicleId]['price_10hrs_100km'];
                $priceExtraKm = $fallbackPricing[$vehicleId]['price_extra_km'];
                $priceExtraHour = $fallbackPricing[$vehicleId]['price_extra_hour'];
            } else {
                // Try to find partial match in fallback
                foreach ($fallbackPricing as $key => $values) {
                    if (stripos($vehicleId, $key) !== false || stripos($key, $vehicleId) !== false) {
                        $price4hrs40km = $values['price_4hrs_40km'];
                        $price8hrs80km = $values['price_8hrs_80km'];
                        $price10hrs100km = $values['price_10hrs_100km'];
                        $priceExtraKm = $values['price_extra_km'];
                        $priceExtraHour = $values['price_extra_hour'];
                        break;
                    }
                }
            }
            
            // If still no pricing, use sedan as default
            if ($price4hrs40km === 0) {
                $price4hrs40km = $fallbackPricing['sedan']['price_4hrs_40km'];
                $price8hrs80km = $fallbackPricing['sedan']['price_8hrs_80km'];
                $price10hrs100km = $fallbackPricing['sedan']['price_10hrs_100km'];
                $priceExtraKm = $fallbackPricing['sedan']['price_extra_km'];
                $priceExtraHour = $fallbackPricing['sedan']['price_extra_hour'];
            }
            
            file_put_contents($logFile, "[$timestamp] Using fallback pricing for $vehicleId: price4hrs40km=$price4hrs40km, price8hrs80km=$price8hrs80km\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        // Log database error
        file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw $e;
    }
    
    // Determine base price based on package ID
    $basePrice = 0;
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
    
    // Create standardized fare object
    $fare = [
        'vehicleId' => $originalVehicleId,
        'price4hrs40km' => (float)$price4hrs40km,
        'price8hrs80km' => (float)$price8hrs80km,
        'price10hrs100km' => (float)$price10hrs100km,
        'priceExtraKm' => (float)$priceExtraKm,
        'priceExtraHour' => (float)$priceExtraHour,
        'basePrice' => (float)$basePrice,
        'totalPrice' => (float)$basePrice,
        'price' => (float)$basePrice, // Add price field for consistency
        'breakdown' => [
            $packageId => $basePrice
        ],
        'isDefaultPricing' => $isDefaultPricing,
        'dataSource' => 'database' // Add data source information for debugging
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
