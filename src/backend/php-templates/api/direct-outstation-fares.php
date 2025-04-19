
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

$logFile = $logDir . '/direct-outstation-fares.log';
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
    $tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 
               (isset($_GET['tripMode']) ? $_GET['tripMode'] : 'one-way');
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Log original vehicle ID before normalization
    $originalVehicleId = $vehicleId;
    file_put_contents($logFile, "[$timestamp] Original vehicle ID: $originalVehicleId\n", FILE_APPEND);
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request with normalized ID
    file_put_contents($logFile, "[$timestamp] Outstation fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, tripMode=$tripMode, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Default pricing by vehicle type (used if not in database)
    $defaultPricing = [
        'sedan' => ['basePrice' => 4200, 'pricePerKm' => 14, 'driverAllowance' => 250],
        'ertiga' => ['basePrice' => 5400, 'pricePerKm' => 18, 'driverAllowance' => 250],
        'innova_crysta' => ['basePrice' => 6000, 'pricePerKm' => 20, 'driverAllowance' => 250],
        'luxury' => ['basePrice' => 8000, 'pricePerKm' => 25, 'driverAllowance' => 300],
        'tempo' => ['basePrice' => 9000, 'pricePerKm' => 22, 'driverAllowance' => 300]
    ];
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query outstation_fares by normalized vehicle_id
    $query = "SELECT * FROM outstation_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = LOWER(:vehicle_id)";
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
    $driverAllowance = 250;
    
    if ($result) {
        // Use database values
        $basePrice = (float)$result['base_price'] ?? 0;
        $pricePerKm = (float)$result['price_per_km'] ?? 0;
        $driverAllowance = (float)$result['driver_allowance'] ?? 250;
        
        file_put_contents($logFile, "[$timestamp] Using database pricing: basePrice=$basePrice, pricePerKm=$pricePerKm, driverAllowance=$driverAllowance\n", FILE_APPEND);
    } else {
        // Use default pricing based on vehicle type
        $useDefaultPricing = true;
        
        // Get default pricing for vehicle type if available, otherwise use sedan
        $vehicleType = isset($defaultPricing[$vehicleId]) ? $vehicleId : 'sedan';
        $basePrice = $defaultPricing[$vehicleType]['basePrice'];
        $pricePerKm = $defaultPricing[$vehicleType]['pricePerKm'];
        $driverAllowance = $defaultPricing[$vehicleType]['driverAllowance'];
        
        file_put_contents($logFile, "[$timestamp] Using default pricing for $vehicleType: basePrice=$basePrice, pricePerKm=$pricePerKm, driverAllowance=$driverAllowance\n", FILE_APPEND);
    }
    
    // Calculate total price
    $minimumKm = 300; // minimum distance covered for base price
    $calculatedPrice = 0;
    
    if ($tripMode === 'round-trip') {
        // For round-trip, calculate with the total distance
        $effectiveDistance = $distance * 2;
        $roundTripPerKm = $pricePerKm * 0.85; // 15% discount for round trip
        $roundTripBase = $basePrice * 0.9; // 10% discount on base price
        
        if ($effectiveDistance < $minimumKm) {
            $calculatedPrice = $roundTripBase + $driverAllowance;
        } else {
            $extraDistance = $effectiveDistance - $minimumKm;
            $extraDistanceFare = $extraDistance * $roundTripPerKm;
            $calculatedPrice = $roundTripBase + $extraDistanceFare + $driverAllowance;
        }
    } else {
        // For one-way trips, calculate with double distance (for driver's return)
        $effectiveDistance = $distance * 2;
        
        if ($effectiveDistance > $minimumKm) {
            $extraDistance = $effectiveDistance - $minimumKm;
            $extraDistanceFare = $extraDistance * $pricePerKm;
            $calculatedPrice = $basePrice + $extraDistanceFare + $driverAllowance;
        } else {
            $calculatedPrice = $basePrice + $driverAllowance;
        }
    }
    
    // Round the price to nearest 10
    $calculatedPrice = ceil($calculatedPrice / 10) * 10;
    
    // Log the final calculation
    file_put_contents($logFile, "[$timestamp] Final calculated price: $calculatedPrice\n", FILE_APPEND);
    
    // Format fare breakdown
    $fare = [
        'vehicleId' => $originalVehicleId,
        'basePrice' => $basePrice,
        'totalPrice' => $calculatedPrice,
        'price' => $calculatedPrice, // Additional property for consistency
        'pricePerKm' => $pricePerKm,
        'driverAllowance' => $driverAllowance,
        'tripMode' => $tripMode,
        'distance' => $distance,
        'breakdown' => [
            'Base fare' => $basePrice,
            'Distance charge' => $calculatedPrice - $basePrice - $driverAllowance,
            'Driver allowance' => $driverAllowance
        ],
        'isDefaultPricing' => $useDefaultPricing
    ];
    
    // Return success response with fare data
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares retrieved successfully',
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
