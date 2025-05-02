<?php
/**
 * Direct airport fares API endpoint
 * Returns airport transfer fares for vehicles
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utility
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

try {
    // Get database connection
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception('Failed to connect to database');
    }
    
    // Log request details
    file_put_contents($logFile, "[$timestamp] Processing airport fares request\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);
    
    // Get vehicle ID from request
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id'];
    
    foreach ($possibleKeys as $key) {
        if (isset($_GET[$key]) && !empty($_GET[$key])) {
            $vehicleId = $_GET[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in parameter $key: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Prepare query
    $query = "SELECT * FROM airport_transfer_fares";
    $params = [];
    $types = "";
    
    if ($vehicleId) {
        $query .= " WHERE vehicle_id = ?";
        $params[] = $vehicleId;
        $types .= "s";
        file_put_contents($logFile, "[$timestamp] Filtering by vehicle_id: $vehicleId\n", FILE_APPEND);
    }
    
    // Check if the table exists first
    $tableCheckQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    
    if (!$tableCheckResult || $tableCheckResult->num_rows === 0) {
        // Create table if it doesn't exist
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
        
        // Return an empty result rather than an error
        sendSuccessResponse(['fares' => []], 'No airport fares found (new table created)');
        exit;
    }
    
    // Prepare and execute the statement
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $fares = [];
    
    while ($row = $result->fetch_assoc()) {
        // Map database field names to camelCase for consistent API output
        $fare = array(
            'id' => $row['id'],
            'vehicleId' => $row['vehicle_id'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'pickupPrice' => (float)$row['pickup_price'],
            'dropPrice' => (float)$row['drop_price'],
            'tier1Price' => (float)$row['tier1_price'],
            'tier2Price' => (float)$row['tier2_price'],
            'tier3Price' => (float)$row['tier3_price'],
            'tier4Price' => (float)$row['tier4_price'],
            'extraKmCharge' => (float)$row['extra_km_charge'],
            // Also include snake_case for backward compatibility
            'vehicle_id' => $row['vehicle_id'],
            'base_price' => (float)$row['base_price'],
            'price_per_km' => (float)$row['price_per_km'],
            'pickup_price' => (float)$row['pickup_price'],
            'drop_price' => (float)$row['drop_price'],
            'tier1_price' => (float)$row['tier1_price'],
            'tier2_price' => (float)$row['tier2_price'],
            'tier3_price' => (float)$row['tier3_price'],
            'tier4_price' => (float)$row['tier4_price'],
            'extra_km_charge' => (float)$row['extra_km_charge']
        );
        
        if ($vehicleId) {
            // If we're querying for a specific vehicle, just return that directly
            $fares = $fare;
        } else {
            // Otherwise add to the array of fares
            $fares[] = $fare;
        }
    }
    
    // If we got a specific vehicle but no fare, create a default one for response
    if ($vehicleId && empty($fares)) {
        $fares = array(
            'vehicleId' => $vehicleId,
            'basePrice' => 0,
            'pricePerKm' => 0,
            'pickupPrice' => 0,
            'dropPrice' => 0,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0,
            // Also include snake_case for backward compatibility
            'vehicle_id' => $vehicleId,
            'base_price' => 0,
            'price_per_km' => 0,
            'pickup_price' => 0,
            'drop_price' => 0,
            'tier1_price' => 0,
            'tier2_price' => 0,
            'tier3_price' => 0,
            'tier4_price' => 0,
            'extra_km_charge' => 0
        );
    }
    
    $response = [
        'status' => 'success',
        'data' => [
            'fares' => $fares
        ],
        'message' => $vehicleId ? 'Airport fares for vehicle retrieved' : 'All airport fares retrieved'
    ];
    
    file_put_contents($logFile, "[$timestamp] Successfully retrieved airport fares\n", FILE_APPEND);
    
    // Return response as JSON
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error as JSON
    $errorResponse = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'code' => 500
    ];
    
    echo json_encode($errorResponse, JSON_PRETTY_PRINT);
}
