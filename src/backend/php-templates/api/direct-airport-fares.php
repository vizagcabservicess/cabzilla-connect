
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

$logFile = $logDir . '/direct-airport-fares.log';
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
    
    // Convert to lowercase and replace spaces and special chars with underscores
    $normalized = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', trim($vehicleId)));
    
    // Handle specific mappings
    $mappings = [
        'innova' => 'innova_crysta',
        'innova_hyrcross' => 'innova_crysta',
        'innova_hycross' => 'innova_crysta',
        'innovacrystal' => 'innova_crysta',
        'innovacrystal_7seater' => 'innova_crysta',
        'crysta' => 'innova_crysta',
        'suzuki_ertiga' => 'ertiga',
        'maruti_ertiga' => 'ertiga',
        'ertigaac' => 'ertiga',
        'dzire' => 'sedan',
        'swift_dzire' => 'sedan',
        'etios' => 'sedan',
        'toyota_etios' => 'sedan',
        'honda_amaze' => 'sedan',
        'amaze' => 'sedan'
    ];
    
    foreach ($mappings as $key => $value) {
        if (strpos($normalized, $key) !== false) {
            return $value;
        }
    }
    
    return $normalized;
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : 
                (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Log original vehicle ID before normalization
    $originalVehicleId = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Original vehicle ID: $originalVehicleId\n", FILE_APPEND);
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request with normalized ID
    file_put_contents($logFile, "[$timestamp] Airport fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Default pricing by vehicle type
    $defaultPricing = [
        'sedan' => [
            'basePrice' => 1000, 
            'pricePerKm' => 14,
            'airportFee' => 200, 
            'tier1Price' => 800,  // 0-10 KM
            'tier2Price' => 1200, // 11-20 KM
            'tier3Price' => 1800, // 21-30 KM
            'tier4Price' => 2500, // 31+ KM
            'extraKmCharge' => 14
        ],
        'ertiga' => [
            'basePrice' => 1200, 
            'pricePerKm' => 18,
            'airportFee' => 300,
            'tier1Price' => 1000,  // 0-10 KM
            'tier2Price' => 1400,  // 11-20 KM
            'tier3Price' => 2000,  // 21-30 KM
            'tier4Price' => 2800,  // 31+ KM
            'extraKmCharge' => 18
        ],
        'innova_crysta' => [
            'basePrice' => 1500, 
            'pricePerKm' => 20,
            'airportFee' => 400,
            'tier1Price' => 1200,  // 0-10 KM
            'tier2Price' => 1800,  // 11-20 KM
            'tier3Price' => 2400,  // 21-30 KM
            'tier4Price' => 3200,  // 31+ KM
            'extraKmCharge' => 20
        ],
        'luxury' => [
            'basePrice' => 2000, 
            'pricePerKm' => 25,
            'airportFee' => 500,
            'tier1Price' => 1500,  // 0-10 KM
            'tier2Price' => 2200,  // 11-20 KM
            'tier3Price' => 3000,  // 21-30 KM
            'tier4Price' => 4000,  // 31+ KM
            'extraKmCharge' => 25
        ],
        'tempo' => [
            'basePrice' => 2500, 
            'pricePerKm' => 22,
            'airportFee' => 500,
            'tier1Price' => 2000,  // 0-10 KM
            'tier2Price' => 2800,  // 11-20 KM
            'tier3Price' => 3800,  // 21-30 KM
            'tier4Price' => 5000,  // 31+ KM
            'extraKmCharge' => 22
        ]
    ];
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query airport_transfer_fares by normalized vehicle_id
    $query = "SELECT * FROM airport_transfer_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = LOWER(:vehicle_id)";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':vehicle_id', $vehicleId);
    
    // Log the query
    file_put_contents($logFile, "[$timestamp] SQL Query: $query\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Parameters: vehicleId=$vehicleId\n", FILE_APPEND);
    
    $stmt->execute();
    
    // Fetch result
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Log query result
    file_put_contents($logFile, "[$timestamp] Query result: " . json_encode($result) . "\n", FILE_APPEND);
    
    // Variables to store pricing information
    $useDefaultPricing = false;
    $basePrice = 0;
    $pricePerKm = 0;
    $airportFee = 0;
    $tier1Price = 0;
    $tier2Price = 0;
    $tier3Price = 0;
    $tier4Price = 0;
    $extraKmCharge = 0;
    
    if ($result) {
        // Use database values
        $basePrice = (float)$result['base_price'] ?? 0;
        $pricePerKm = (float)$result['price_per_km'] ?? 0;
        $airportFee = (float)$result['pickup_price'] ?? 0;
        $tier1Price = (float)$result['tier1_price'] ?? 800;
        $tier2Price = (float)$result['tier2_price'] ?? 1200;
        $tier3Price = (float)$result['tier3_price'] ?? 1800;
        $tier4Price = (float)$result['tier4_price'] ?? 2500;
        $extraKmCharge = (float)$result['extra_km_charge'] ?? $pricePerKm;
        
        file_put_contents($logFile, "[$timestamp] Using database pricing: basePrice=$basePrice, pricePerKm=$pricePerKm, airportFee=$airportFee\n", FILE_APPEND);
    } else {
        // Use default pricing based on vehicle type
        $useDefaultPricing = true;
        
        // Get default pricing for vehicle type if available, otherwise use sedan
        $vehicleType = isset($defaultPricing[$vehicleId]) ? $vehicleId : 'sedan';
        $pricing = $defaultPricing[$vehicleType];
        
        $basePrice = $pricing['basePrice'];
        $pricePerKm = $pricing['pricePerKm'];
        $airportFee = $pricing['airportFee'];
        $tier1Price = $pricing['tier1Price'];
        $tier2Price = $pricing['tier2Price'];
        $tier3Price = $pricing['tier3Price'];
        $tier4Price = $pricing['tier4Price'];
        $extraKmCharge = $pricing['extraKmCharge'];
        
        file_put_contents($logFile, "[$timestamp] Using default pricing for $vehicleType: basePrice=$basePrice, pricePerKm=$pricePerKm, airportFee=$airportFee\n", FILE_APPEND);
    }
    
    // Calculate total price based on distance tiers
    $calculatedFare = 0;
    
    if ($distance <= 10) {
        $calculatedFare = $tier1Price;
        file_put_contents($logFile, "[$timestamp] Using tier1 price: $tier1Price for distance $distance km\n", FILE_APPEND);
    } else if ($distance <= 20) {
        $calculatedFare = $tier2Price;
        file_put_contents($logFile, "[$timestamp] Using tier2 price: $tier2Price for distance $distance km\n", FILE_APPEND);
    } else if ($distance <= 30) {
        $calculatedFare = $tier3Price;
        file_put_contents($logFile, "[$timestamp] Using tier3 price: $tier3Price for distance $distance km\n", FILE_APPEND);
    } else {
        $calculatedFare = $tier4Price;
        
        // Add extra km costs if distance exceeds 30 km
        if ($distance > 30) {
            $extraKm = $distance - 30;
            $extraKmCost = $extraKm * $extraKmCharge;
            $calculatedFare += $extraKmCost;
            file_put_contents($logFile, "[$timestamp] Using tier4 price: $tier4Price plus extra $extraKm km at $extraKmCharge per km = $extraKmCost\n", FILE_APPEND);
        }
    }
    
    // Add airport fees
    $calculatedFare += $airportFee;
    
    // Add driver allowance if applicable
    $driverAllowance = 250;
    $calculatedFare += $driverAllowance;
    
    // Round the price to nearest 10
    $calculatedFare = ceil($calculatedFare / 10) * 10;
    
    // Log the final calculation
    file_put_contents($logFile, "[$timestamp] Final calculated price: $calculatedFare\n", FILE_APPEND);
    
    // Create fare object with complete breakdown
    $fare = [
        'vehicleId' => $originalVehicleId,
        'basePrice' => $basePrice,
        'totalPrice' => $calculatedFare,
        'price' => $calculatedFare, // Additional property for consistency
        'pickupPrice' => $airportFee,
        'dropPrice' => $airportFee,
        'pricePerKm' => $pricePerKm,
        'extraKmCharge' => $extraKmCharge,
        'distance' => $distance,
        'breakdown' => [
            'Base fare' => $tier1Price,
            'Airport fees' => $airportFee,
            'Driver allowance' => $driverAllowance,
            'Extra distance charge' => ($distance > 30) ? ($distance - 30) * $extraKmCharge : 0
        ],
        'isDefaultPricing' => $useDefaultPricing
    ];
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'fare' => $fare
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
