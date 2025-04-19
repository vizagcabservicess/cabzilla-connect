
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
    // Convert to lowercase and replace spaces with underscores
    return strtolower(str_replace(' ', '_', trim($vehicleId)));
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Normalize vehicle ID
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request
    file_put_contents($logFile, "[$timestamp] Airport fares request: vehicleId=$vehicleId\n", FILE_APPEND);
    
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
        // Calculate total price
        $basePrice = (float)$result['base_price'];
        $pickupPrice = (float)$result['pickup_price'];
        $dropPrice = (float)$result['drop_price'];
        $totalPrice = $basePrice + $pickupPrice + $dropPrice;
        
        // Create fare object with complete breakdown
        $fare = [
            'vehicleId' => $result['vehicle_id'],
            'basePrice' => $basePrice,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'pricePerKm' => (float)$result['price_per_km'],
            'tier1Price' => (float)$result['tier1_price'],
            'tier2Price' => (float)$result['tier2_price'],
            'tier3Price' => (float)$result['tier3_price'],
            'tier4Price' => (float)$result['tier4_price'],
            'extraKmCharge' => (float)$result['extra_km_charge'],
            'totalPrice' => $totalPrice,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Airport pickup fee' => $pickupPrice,
                'Airport drop fee' => $dropPrice
            ]
        ];
        
        // Return success response with fare data
        echo json_encode([
            'status' => 'success',
            'message' => 'Airport fares retrieved successfully',
            'fare' => $fare
        ]);
        
    } else {
        // No result found for this vehicle ID, log this
        file_put_contents($logFile, "[$timestamp] No airport fare found for vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Return hardcoded sample data for testing
        $fare = [
            'vehicleId' => $vehicleId,
            'basePrice' => 800,
            'pickupPrice' => 100,
            'dropPrice' => 100,
            'pricePerKm' => 14,
            'extraKmCharge' => 12,
            'totalPrice' => 1000,
            'breakdown' => [
                'Base fare' => 800,
                'Airport pickup fee' => 100,
                'Airport drop fee' => 100
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Using sample airport fare data (no database record found)',
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
