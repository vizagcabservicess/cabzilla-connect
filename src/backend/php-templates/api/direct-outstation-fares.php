
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
    // Convert to lowercase and replace spaces with underscores
    return strtolower(str_replace(' ', '_', trim($vehicleId)));
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 'one-way'; // Default to one-way
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request
    file_put_contents($logFile, "[$timestamp] Outstation fares request: vehicleId=$vehicleId, tripMode=$tripMode, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query outstation_fares by normalized vehicle_id
    $query = "SELECT * FROM outstation_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :vehicle_id";
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
        // Initialize fare structure
        $fare = [];
        
        // Calculate fare based on trip mode
        if ($tripMode === 'round-trip') {
            // Use round-trip pricing
            $basePrice = (float)$result['roundtrip_base_price'];
            $pricePerKm = (float)$result['roundtrip_price_per_km'];
        } else {
            // Use one-way pricing
            $basePrice = (float)$result['base_price'];
            $pricePerKm = (float)$result['price_per_km'];
        }
        
        $driverAllowance = (float)$result['driver_allowance'];
        $nightHaltCharge = (float)$result['night_halt_charge'];
        
        // Calculate distance fare (ensure minimum distance of 300 km for outstation)
        $effectiveDistance = max($distance, 300);
        $distanceFare = $effectiveDistance * $pricePerKm;
        
        // Calculate total fare
        $totalFare = $basePrice + $distanceFare + $driverAllowance;
        
        // Create fare object with complete breakdown
        $fare = [
            'vehicleId' => $result['vehicle_id'],
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'driverAllowance' => $driverAllowance,
            'nightHaltCharge' => $nightHaltCharge,
            'totalPrice' => $totalFare,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Distance charge' => $distanceFare,
                'Driver allowance' => $driverAllowance
            ]
        ];
        
        // Return success response with fare data
        echo json_encode([
            'status' => 'success',
            'message' => 'Outstation fares retrieved successfully',
            'fare' => $fare
        ]);
        
    } else {
        // No result found for this vehicle ID, log this
        file_put_contents($logFile, "[$timestamp] No outstation fare found for vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Set sample prices based on vehicle ID
        $basePrice = 0;
        $pricePerKm = 0;
        $driverAllowance = 250;
        
        if ($vehicleId == 'sedan') {
            $basePrice = 2000;
            $pricePerKm = 13;
        } else if ($vehicleId == 'ertiga') {
            $basePrice = 2500;
            $pricePerKm = 16;
        } else if ($vehicleId == 'innova_crysta') {
            $basePrice = 3000;
            $pricePerKm = 18;
        } else {
            $basePrice = 2200;
            $pricePerKm = 15;
        }
        
        // Adjust for round trip
        if ($tripMode === 'round-trip') {
            $basePrice *= 0.8; // 20% discount on base price for round trips
        }
        
        // Calculate distance fare (ensure minimum distance of 300 km for outstation)
        $effectiveDistance = max($distance, 300);
        $distanceFare = $effectiveDistance * $pricePerKm;
        
        // Calculate total fare
        $totalFare = $basePrice + $distanceFare + $driverAllowance;
        
        // Build sample fare object
        $fare = [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'driverAllowance' => $driverAllowance,
            'nightHaltCharge' => 1000,
            'totalPrice' => $totalFare,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Distance charge' => $distanceFare,
                'Driver allowance' => $driverAllowance
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Using sample outstation fare data (no database record found)',
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
