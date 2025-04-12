
<?php
/**
 * Airport fares update API endpoint
 * Updates airport transfer fares for a specific vehicle
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../../config.php';

// Function to send JSON response
function sendSuccessResponse($data, $message = 'Success') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function sendErrorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);
    exit;
}

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);

// Get request data and debug
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: $rawInput\n", FILE_APPEND);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data
    $postData = $_POST;
    
    // If no POST data, try to get it from the request body
    if (empty($postData)) {
        $json = file_get_contents('php://input');
        
        if (!empty($json)) {
            $postData = json_decode($json, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // Try to handle non-JSON data (might be URL encoded or form data)
                parse_str($json, $parsedData);
                if (!empty($parsedData)) {
                    $postData = $parsedData;
                    file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                } else {
                    throw new Exception('Invalid input format: ' . json_last_error_msg() . ' - Input: ' . substr($json, 0, 100));
                }
            }
        } else {
            throw new Exception('No data received in request body');
        }
    }
    
    // Check if data is in a nested 'data' property (common when sent from frontend)
    if (isset($postData['data']) && is_array($postData['data'])) {
        $postData = $postData['data'];
        file_put_contents($logFile, "[$timestamp] Using nested data property\n", FILE_APPEND);
    }
    
    file_put_contents($logFile, "[$timestamp] Parsed data: " . json_encode($postData) . "\n", FILE_APPEND);

    // Check required fields - look for vehicle ID in multiple possible fields
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id'];
    
    foreach ($possibleKeys as $key) {
        if (isset($postData[$key]) && !empty($postData[$key])) {
            $vehicleId = trim($postData[$key]);
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in key '$key': $vehicleId\n", FILE_APPEND);
            break;
        }
    }

    if (!$vehicleId) {
        file_put_contents($logFile, "[$timestamp] ERROR: Vehicle ID not found in request data. Available keys: " . 
            implode(", ", array_keys($postData)) . "\n", FILE_APPEND);
        throw new Exception('Vehicle ID is required');
    }

    // Extract fare data - support various naming conventions
    $basePrice = isset($postData['basePrice']) ? floatval($postData['basePrice']) : 0;
    $pricePerKm = isset($postData['pricePerKm']) ? floatval($postData['pricePerKm']) : 0;
    $pickupPrice = isset($postData['pickupPrice']) ? floatval($postData['pickupPrice']) : 0;
    $dropPrice = isset($postData['dropPrice']) ? floatval($postData['dropPrice']) : 0;
    $tier1Price = isset($postData['tier1Price']) ? floatval($postData['tier1Price']) : 0;
    $tier2Price = isset($postData['tier2Price']) ? floatval($postData['tier2Price']) : 0;
    $tier3Price = isset($postData['tier3Price']) ? floatval($postData['tier3Price']) : 0;
    $tier4Price = isset($postData['tier4Price']) ? floatval($postData['tier4Price']) : 0;
    $extraKmCharge = isset($postData['extraKmCharge']) ? floatval($postData['extraKmCharge']) : 0;
    
    // Connect to the database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Check if airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    if (!$checkResult || $checkResult->num_rows === 0) {
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

    // Insert or update airport_transfer_fares table
    $updateSql = "
        INSERT INTO airport_transfer_fares 
        (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
        updated_at = NOW()
    ";
    
    $stmt = $conn->prepare($updateSql);
    if (!$stmt) {
        throw new Exception("Prepare update statement failed: " . $conn->error);
    }
    
    $stmt->bind_param(
        "sddddddddd", 
        $vehicleId, 
        $basePrice, 
        $pricePerKm, 
        $pickupPrice, 
        $dropPrice, 
        $tier1Price, 
        $tier2Price, 
        $tier3Price, 
        $tier4Price, 
        $extraKmCharge
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update airport_transfer_fares: " . $stmt->error);
    }
    
    file_put_contents($logFile, "[$timestamp] Updated airport_transfer_fares for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Create a response with all relevant data
    sendSuccessResponse([
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'basePrice' => (float)$basePrice,
        'pricePerKm' => (float)$pricePerKm,
        'pickupPrice' => (float)$pickupPrice,
        'dropPrice' => (float)$dropPrice,
        'tier1Price' => (float)$tier1Price,
        'tier2Price' => (float)$tier2Price,
        'tier3Price' => (float)$tier3Price,
        'tier4Price' => (float)$tier4Price,
        'extraKmCharge' => (float)$extraKmCharge
    ], 'Airport fare updated successfully');
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
