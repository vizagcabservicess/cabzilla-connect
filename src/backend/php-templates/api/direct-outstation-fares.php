
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
        'amaze' => 'sedan',
        'dzire_cng' => 'sedan',
        'mpv' => 'tempo',
        'tempo_traveller' => 'tempo'
    ];
    
    foreach ($mappings as $key => $value) {
        if (strpos($normalized, $key) !== false || $normalized === $key) {
            file_put_contents($GLOBALS['logFile'], "[$timestamp] Outstation: Mapped vehicle ID from '$normalized' to '$value'\n", FILE_APPEND);
            return $value;
        }
    }
    
    return $normalized;
}

// Get default pricing function
function getDefaultPricing($vehicleId) {
    // Default pricing by vehicle type (used if not in database)
    $defaultPricing = [
        'sedan' => ['basePrice' => 4200, 'pricePerKm' => 14, 'driverAllowance' => 250],
        'ertiga' => ['basePrice' => 5400, 'pricePerKm' => 18, 'driverAllowance' => 250],
        'innova_crysta' => ['basePrice' => 6000, 'pricePerKm' => 20, 'driverAllowance' => 250],
        'luxury' => ['basePrice' => 8000, 'pricePerKm' => 25, 'driverAllowance' => 300],
        'tempo' => ['basePrice' => 9000, 'pricePerKm' => 22, 'driverAllowance' => 300],
        'bus' => ['basePrice' => 12000, 'pricePerKm' => 28, 'driverAllowance' => 350],
        'van' => ['basePrice' => 7000, 'pricePerKm' => 20, 'driverAllowance' => 300]
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
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : 
                (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);
    $originalVehicleId = isset($_GET['original_vehicle_id']) ? $_GET['original_vehicle_id'] : $vehicleId;
    $tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 
               (isset($_GET['tripMode']) ? $_GET['tripMode'] : 'one-way');
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Ensure we have a minimum distance
    if ($distance <= 0) {
        $distance = 150; // Default distance if none specified
    }
    
    // Log original vehicle ID before normalization
    file_put_contents($logFile, "[$timestamp] Original vehicle ID: $originalVehicleId\n", FILE_APPEND);
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request with normalized ID
    file_put_contents($logFile, "[$timestamp] Outstation fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, tripMode=$tripMode, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Variables to store pricing information
    $useDefaultPricing = false;
    $basePrice = 0;
    $pricePerKm = 0;
    $driverAllowance = 250;
    
    try {
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
        
        if ($result) {
            // Use database values
            $basePrice = (float)$result['base_price'] ?? 0;
            $pricePerKm = (float)$result['price_per_km'] ?? 0;
            $driverAllowance = (float)$result['driver_allowance'] ?? 250;
            
            file_put_contents($logFile, "[$timestamp] Using database pricing: basePrice=$basePrice, pricePerKm=$pricePerKm, driverAllowance=$driverAllowance\n", FILE_APPEND);
        } else {
            // Try with partial match
            $query = "SELECT * FROM outstation_fares WHERE LOWER(vehicle_id) LIKE :vehicle_id_like LIMIT 1";
            $likeParam = "%" . str_replace('_', '%', $vehicleId) . "%";
            
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':vehicle_id_like', $likeParam);
            
            file_put_contents($logFile, "[$timestamp] Trying partial match SQL Query: $query with $likeParam\n", FILE_APPEND);
            
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                // Use partial match values
                $basePrice = (float)$result['base_price'] ?? 0;
                $pricePerKm = (float)$result['price_per_km'] ?? 0;
                $driverAllowance = (float)$result['driver_allowance'] ?? 250;
                
                file_put_contents($logFile, "[$timestamp] Using partial match database pricing: basePrice=$basePrice, pricePerKm=$pricePerKm\n", FILE_APPEND);
            }
        }
    } catch (Exception $e) {
        // Log database error but continue with default pricing
        file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . " - Using default pricing\n", FILE_APPEND);
    }
    
    // Check if we got valid pricing from the database
    if ($basePrice <= 0 || $pricePerKm <= 0) {
        $useDefaultPricing = true;
        
        // Get default pricing based on vehicle type
        $defaultPricing = getDefaultPricing($vehicleId);
        $basePrice = $defaultPricing['basePrice'];
        $pricePerKm = $defaultPricing['pricePerKm'];
        $driverAllowance = $defaultPricing['driverAllowance'];
        
        file_put_contents($logFile, "[$timestamp] Using default pricing for $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, driverAllowance=$driverAllowance\n", FILE_APPEND);
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
        // For one-way trips, calculate with driver's return journey
        $effectiveDistance = max($distance, $minimumKm / 2);
        
        if ($effectiveDistance > $minimumKm / 2) {
            $extraDistance = ($effectiveDistance * 2) - $minimumKm;
            if ($extraDistance > 0) {
                $extraDistanceFare = $extraDistance * $pricePerKm;
                $calculatedPrice = $basePrice + $extraDistanceFare + $driverAllowance;
            } else {
                $calculatedPrice = $basePrice + $driverAllowance;
            }
        } else {
            $calculatedPrice = $basePrice + $driverAllowance;
        }
    }
    
    // Round the price to nearest 10
    $calculatedPrice = ceil($calculatedPrice / 10) * 10;
    
    // Ensure we have a minimum price
    if ($calculatedPrice < 1000) {
        $calculatedPrice = $basePrice > 1000 ? $basePrice : 3000;
        file_put_contents($logFile, "[$timestamp] Calculated price was too low, using minimum price: $calculatedPrice\n", FILE_APPEND);
    }
    
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
        'fare' => $fare,
        'fares' => [$fare] // Add fares array for consistency with CabList expectations
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
