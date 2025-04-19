
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
    
    // If it's "innova_crysta" or similar variations, standardize it
    if (strpos($normalized, 'innova') !== false) {
        return 'innova_crysta';
    }
    
    return $normalized;
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : 
                (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Log the original vehicle ID
    $originalVehicleId = $vehicleId;
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request
    file_put_contents($logFile, "[$timestamp] Airport fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query airport_transfer_fares by normalized vehicle_id
    $query = "SELECT * FROM airport_transfer_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :vehicle_id";
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
        // Determine pricing based on distance tiers
        $basePrice = (float)$result['base_price'];
        $pickupPrice = (float)$result['pickup_price'];
        $dropPrice = (float)$result['drop_price'];
        $pricePerKm = (float)$result['price_per_km'];
        $extraKmCharge = (float)$result['extra_km_charge'] ?: $pricePerKm;
        
        // Get tier prices
        $tier1Price = (float)$result['tier1_price'] ?: 800;
        $tier2Price = (float)$result['tier2_price'] ?: 1200;
        $tier3Price = (float)$result['tier3_price'] ?: 1800;
        $tier4Price = (float)$result['tier4_price'] ?: 2500;
        
        // Calculate total price based on distance tiers
        $calculatedFare = 0;
        
        if ($distance <= 10) {
            $calculatedFare = $tier1Price;
        } else if ($distance <= 20) {
            $calculatedFare = $tier2Price;
        } else if ($distance <= 30) {
            $calculatedFare = $tier3Price;
        } else {
            $calculatedFare = $tier4Price;
            
            // Add extra km costs if distance exceeds 30 km
            if ($distance > 30) {
                $extraKm = $distance - 30;
                $extraKmCost = $extraKm * $extraKmCharge;
                $calculatedFare += $extraKmCost;
            }
        }
        
        // Add airport fees
        $calculatedFare += $dropPrice > 0 ? $dropPrice : $pickupPrice;
        
        // Add driver allowance if applicable
        $driverAllowance = 250;
        $calculatedFare += $driverAllowance;
        
        // Create fare object with complete breakdown
        $fare = [
            'vehicleId' => $result['vehicle_id'],
            'basePrice' => $basePrice,
            'totalPrice' => $calculatedFare,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'pricePerKm' => $pricePerKm,
            'extraKmCharge' => $extraKmCharge,
            'distance' => $distance,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Airport fees' => ($dropPrice > 0 ? $dropPrice : $pickupPrice),
                'Driver allowance' => $driverAllowance,
                'Extra distance charge' => ($distance > 30) ? ($distance - 30) * $extraKmCharge : 0
            ]
        ];
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Airport fares retrieved successfully',
            'fare' => $fare
        ]);
        
    } else {
        // No result found for this vehicle ID, log this
        file_put_contents($logFile, "[$timestamp] No airport fare found for vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Try to find any matching vehicle in database for debugging
        $allVehiclesQuery = "SELECT vehicle_id FROM airport_transfer_fares";
        $allVehiclesStmt = $conn->prepare($allVehiclesQuery);
        $allVehiclesStmt->execute();
        $allVehicles = $allVehiclesStmt->fetchAll(PDO::FETCH_COLUMN);
        
        file_put_contents($logFile, "[$timestamp] All vehicles in database: " . implode(", ", $allVehicles) . "\n", FILE_APPEND);
        
        // Default pricing based on vehicle type
        $defaultPricing = [];
        switch ($vehicleId) {
            case 'sedan':
                $defaultPricing = [
                    'basePrice' => 800, 
                    'pickupPrice' => 200, 
                    'dropPrice' => 200,
                    'pricePerKm' => 14
                ];
                break;
            case 'ertiga':
                $defaultPricing = [
                    'basePrice' => 1200, 
                    'pickupPrice' => 300, 
                    'dropPrice' => 300,
                    'pricePerKm' => 18
                ];
                break;
            case 'innova_crysta':
                $defaultPricing = [
                    'basePrice' => 1500, 
                    'pickupPrice' => 400, 
                    'dropPrice' => 400,
                    'pricePerKm' => 20
                ];
                break;
            default:
                $defaultPricing = [
                    'basePrice' => 1000, 
                    'pickupPrice' => 250, 
                    'dropPrice' => 250,
                    'pricePerKm' => 15
                ];
        }
        
        // Calculate fare with default pricing
        $basePrice = $defaultPricing['basePrice'];
        $pickupPrice = $defaultPricing['pickupPrice'];
        $dropPrice = $defaultPricing['dropPrice'];
        $pricePerKm = $defaultPricing['pricePerKm'];
        
        $calculatedFare = $basePrice;
        
        // Add extra km charge if distance exceeds 15 km
        if ($distance > 15) {
            $extraKm = $distance - 15;
            $extraKmCost = $extraKm * $pricePerKm;
            $calculatedFare += $extraKmCost;
        }
        
        // Add airport fees
        $calculatedFare += $pickupPrice;
        
        // Add driver allowance
        $driverAllowance = 250;
        $calculatedFare += $driverAllowance;
        
        // Log the default pricing calculation
        file_put_contents($logFile, "[$timestamp] Using default pricing for $vehicleId: " . json_encode($defaultPricing) . "\n", FILE_APPEND);
        file_put_contents($logFile, "[$timestamp] Calculated default price: $calculatedFare\n", FILE_APPEND);
        
        // Return fare with default pricing
        $fare = [
            'vehicleId' => $originalVehicleId,
            'basePrice' => $basePrice,
            'totalPrice' => $calculatedFare,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'pricePerKm' => $pricePerKm,
            'distance' => $distance,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Airport fees' => $pickupPrice,
                'Driver allowance' => $driverAllowance,
                'Extra distance charge' => ($distance > 15) ? ($distance - 15) * $pricePerKm : 0
            ],
            'isDefaultPricing' => true
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Using default airport fares for this vehicle',
            'fare' => $fare
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
