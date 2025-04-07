
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Debug-Endpoint: direct-airport-fares');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

// Log this request
file_put_contents($logFile, "[$timestamp] Direct airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);

// Initialize response array
$response = [
    'status' => 'error',
    'message' => 'No vehicle ID provided',
    'debug' => [
        'get_params' => $_GET,
        'timestamp' => $timestamp
    ]
];

// Get vehicle ID from query parameters - support multiple parameter names
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'id'];

foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = trim($_GET[$key]);
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in '$key': $vehicleId\n", FILE_APPEND);
        break;
    }
}

if (!$vehicleId) {
    file_put_contents($logFile, "[$timestamp] No vehicle ID found in request\n", FILE_APPEND);
    echo json_encode($response);
    exit;
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Run the DB setup SQL to ensure all tables exist
    include_once __DIR__ . '/db_setup.php';
    file_put_contents($logFile, "[$timestamp] Initialized database tables\n", FILE_APPEND);

    // First ensure the vehicle exists in vehicles table
    $checkVehicleQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ?";
    $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
    
    if (!$checkVehicleStmt) {
        throw new Exception("Prepare statement failed for vehicle check: " . $conn->error);
    }
    
    $checkVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkVehicleStmt->execute();
    $checkVehicleResult = $checkVehicleStmt->get_result();
    
    // If vehicle doesn't exist, create it
    if ($checkVehicleResult->num_rows === 0) {
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        
        $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, is_active) VALUES (?, ?, ?, 1)";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        
        if (!$insertVehicleStmt) {
            throw new Exception("Prepare statement failed for vehicle insert: " . $conn->error);
        }
        
        $insertVehicleStmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        
        file_put_contents($logFile, "[$timestamp] Created new vehicle: $vehicleId, $vehicleName\n", FILE_APPEND);
    } else {
        $vehicleRow = $checkVehicleResult->fetch_assoc();
        file_put_contents($logFile, "[$timestamp] Found existing vehicle: " . json_encode($vehicleRow) . "\n", FILE_APPEND);
    }
    
    // Now get airport fare for this vehicle
    $query = "
        SELECT 
            id,
            vehicle_id,
            base_price,
            price_per_km,
            pickup_price,
            drop_price,
            tier1_price,
            tier2_price,
            tier3_price,
            tier4_price,
            extra_km_charge
        FROM 
            airport_transfer_fares
        WHERE 
            vehicle_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $fare = null;
    
    if ($result && $result->num_rows > 0) {
        // Fetch existing fare data
        $row = $result->fetch_assoc();
        $fare = [
            'vehicleId' => $row['vehicle_id'],
            'vehicle_id' => $row['vehicle_id'],
            'basePrice' => floatval($row['base_price']),
            'pricePerKm' => floatval($row['price_per_km']),
            'pickupPrice' => floatval($row['pickup_price']),
            'dropPrice' => floatval($row['drop_price']),
            'tier1Price' => floatval($row['tier1_price']),
            'tier2Price' => floatval($row['tier2_price']),
            'tier3Price' => floatval($row['tier3_price']),
            'tier4Price' => floatval($row['tier4_price']),
            'extraKmCharge' => floatval($row['extra_km_charge'])
        ];
        
        file_put_contents($logFile, "[$timestamp] Found existing fare data for vehicle: $vehicleId\n", FILE_APPEND);
    } else {
        // No existing data, insert default values
        $insertQuery = "
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at) 
            VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            throw new Exception("Prepare insert statement failed: " . $conn->error);
        }
        
        $insertStmt->bind_param("s", $vehicleId);
        $insertStmt->execute();
        
        // Define default fare data
        $fare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'basePrice' => 0,
            'pricePerKm' => 0,
            'pickupPrice' => 0,
            'dropPrice' => 0,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0
        ];
        
        file_put_contents($logFile, "[$timestamp] Created default fare data for vehicle: $vehicleId\n", FILE_APPEND);
    }
    
    // Close database connection
    $conn->close();
    
    // Return fare data
    $response = [
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'fares' => [$fare],
        'debug' => [
            'vehicle_id' => $vehicleId,
            'timestamp' => time()
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'debug' => [
            'vehicle_id' => $vehicleId,
            'timestamp' => time()
        ]
    ]);
}
