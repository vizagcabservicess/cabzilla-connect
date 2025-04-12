
<?php
// direct-airport-fares.php - Redirect to the admin endpoint for backward compatibility

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database config
require_once __DIR__ . '/../config.php';

// Create log directory
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the request for debugging
file_put_contents($logFile, "[$timestamp] Direct airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] URL parameters: " . json_encode($_GET) . "\n", FILE_APPEND);

// Function to send JSON responses
function sendJSON($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Make sure we have a vehicle ID from any possible source before forwarding
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'vehicleType', 'vehicle_type', 'cabType', 'cab_type', 'id'];

// First check URL parameters (highest priority)
foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = $_GET[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter $key: $vehicleId\n", FILE_APPEND);
        break;
    }
}

// Clean up vehicle ID if it has a prefix like 'item-'
if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

try {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Check if airport_transfer_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableResult = $conn->query($tableCheckQuery);
    
    if ($tableResult->num_rows === 0) {
        // Create the table if it doesn't exist
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Fetch the airport fares
    $query = "SELECT * FROM airport_transfer_fares";
    if ($vehicleId) {
        $query .= " WHERE vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
    }
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Failed to execute query: " . $conn->error);
    }
    
    // Format the output
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $fares[] = [
            'id' => (int)$row['id'],
            'vehicleId' => $row['vehicle_id'],
            'vehicle_id' => $row['vehicle_id'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'pickupPrice' => (float)$row['pickup_price'],
            'dropPrice' => (float)$row['drop_price'],
            'tier1Price' => (float)$row['tier1_price'],
            'tier2Price' => (float)$row['tier2_price'],
            'tier3Price' => (float)$row['tier3_price'],
            'tier4Price' => (float)$row['tier4_price'],
            'extraKmCharge' => (float)$row['extra_km_charge'],
            'updatedAt' => $row['updated_at']
        ];
    }
    
    // Return success with fares
    sendJSON([
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'data' => $fares,
        'fares' => $fares
    ]);
    
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    sendJSON([
        'status' => 'error',
        'message' => 'Failed to retrieve airport fares: ' . $e->getMessage()
    ], 500);
}
