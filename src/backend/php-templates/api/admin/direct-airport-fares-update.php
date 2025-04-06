
<?php
/**
 * Direct Airport Fares Update API
 * 
 * This API endpoint updates or creates airport transfer fares for a specific vehicle.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Turn off displaying errors directly, but log them
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_update.log';
ini_set('error_log', $logFile);
$timestamp = date('Y-m-d H:i:s');

// Get JSON data
$inputJSON = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: " . $inputJSON . "\n", FILE_APPEND);

try {
    $input = json_decode($inputJSON, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    // Check for required fields
    if (!isset($input['vehicleId'])) {
        throw new Exception('Vehicle ID is required');
    }
    
    // Get vehicle ID
    $vehicleId = $input['vehicleId'];
    
    // Ensure vehicleId is not empty
    if (empty($vehicleId)) {
        throw new Exception('Vehicle ID cannot be empty');
    }
    
    file_put_contents($logFile, "[$timestamp] Update airport fares request for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Include database connection
    require_once dirname(__FILE__) . '/../../config.php';
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception('Failed to connect to database');
    }
    
    // Check if the airport_transfer_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $tableExists = $tableResult && $tableResult->num_rows > 0;
    
    // Create the table if it doesn't exist
    if (!$tableExists) {
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
                night_charges DECIMAL(10,2) DEFAULT 0,
                extra_waiting_charges DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createTableQuery)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Check if columns exist and add them if they don't
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added night_charges column\n", FILE_APPEND);
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column\n", FILE_APPEND);
    }
    
    // Extract values with fallbacks to ensure we have valid values
    $basePrice = isset($input['basePrice']) ? floatval($input['basePrice']) : 0;
    $pricePerKm = isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0;
    $pickupPrice = isset($input['pickupPrice']) ? floatval($input['pickupPrice']) : 0;
    $dropPrice = isset($input['dropPrice']) ? floatval($input['dropPrice']) : 0;
    $tier1Price = isset($input['tier1Price']) ? floatval($input['tier1Price']) : 0;
    $tier2Price = isset($input['tier2Price']) ? floatval($input['tier2Price']) : 0;
    $tier3Price = isset($input['tier3Price']) ? floatval($input['tier3Price']) : 0;
    $tier4Price = isset($input['tier4Price']) ? floatval($input['tier4Price']) : 0;
    $extraKmCharge = isset($input['extraKmCharge']) ? floatval($input['extraKmCharge']) : 0;
    $nightCharges = isset($input['nightCharges']) ? floatval($input['nightCharges']) : 0;
    $extraWaitingCharges = isset($input['extraWaitingCharges']) ? floatval($input['extraWaitingCharges']) : 0;
    
    // Log all values for debugging
    file_put_contents($logFile, "[$timestamp] Using values: base_price=$basePrice, price_per_km=$pricePerKm, pickup_price=$pickupPrice, drop_price=$dropPrice, tier1_price=$tier1Price, tier2_price=$tier2Price, tier3_price=$tier3Price, tier4_price=$tier4Price, extra_km_charge=$extraKmCharge, night_charges=$nightCharges, extra_waiting_charges=$extraWaitingCharges\n", FILE_APPEND);
    
    // Check if record exists
    $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $exists = $result && $result->num_rows > 0;
    $stmt->close();
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE for both insert and update cases
    $query = "
        INSERT INTO airport_transfer_fares 
        (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
         tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
         night_charges, extra_waiting_charges, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
        base_price = VALUES(base_price),
        price_per_km = VALUES(price_per_km),
        pickup_price = VALUES(pickup_price),
        drop_price = VALUES(drop_price),
        tier1_price = VALUES(tier1_price),
        tier2_price = VALUES(tier2_price),
        tier3_price = VALUES(tier3_price),
        tier4_price = VALUES(tier4_price),
        extra_km_charge = VALUES(extra_km_charge),
        night_charges = VALUES(night_charges),
        extra_waiting_charges = VALUES(extra_waiting_charges),
        updated_at = CURRENT_TIMESTAMP
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("sddddddddddd", 
        $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
        $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge,
        $nightCharges, $extraWaitingCharges);
    
    $success = $stmt->execute();
    $affected_rows = $stmt->affected_rows;
    $stmt->close();
    
    if ($success) {
        file_put_contents($logFile, "[$timestamp] Successfully " . ($exists ? "updated" : "created") . " airport fare entry for vehicle: $vehicleId (Affected rows: $affected_rows)\n", FILE_APPEND);
        
        // Return success response
        $response = [
            'status' => 'success',
            'message' => 'Airport fares ' . ($exists ? 'updated' : 'created') . ' successfully',
            'vehicle_id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'data' => [
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'pickupPrice' => $pickupPrice,
                'dropPrice' => $dropPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge,
                'nightCharges' => $nightCharges,
                'extraWaitingCharges' => $extraWaitingCharges
            ]
        ];
        
        echo json_encode($response, JSON_PRETTY_PRINT);
    } else {
        throw new Exception("Failed to " . ($exists ? "update" : "create") . " airport fares: " . $conn->error);
    }
    
    // Close the database connection
    $conn->close();
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response with HTTP 400 status code
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
