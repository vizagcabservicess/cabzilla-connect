
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

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
require_once __DIR__ . '/../utils/database.php';

// Run the DB setup SQL to ensure all tables exist
include_once __DIR__ . '/db_setup.php';

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data
    $postData = $_POST;
    
    // If no POST data, try to get it from the request body
    if (empty($postData)) {
        $json = file_get_contents('php://input');
        file_put_contents($logFile, "[$timestamp] Raw input: $json\n", FILE_APPEND);
        
        if (!empty($json)) {
            $postData = json_decode($json, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // Try to handle non-JSON data (might be URL encoded or form data)
                parse_str($json, $parsedData);
                if (!empty($parsedData)) {
                    $postData = $parsedData;
                    file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                } else {
                    throw new Exception('Invalid input format: ' . json_last_error_msg());
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
    
    // Check if __data field exists (used by directVehicleOperation)
    if (isset($postData['__data']) && is_array($postData['__data'])) {
        $postData = $postData['__data'];
        file_put_contents($logFile, "[$timestamp] Using __data field\n", FILE_APPEND);
    }
    
    file_put_contents($logFile, "[$timestamp] Parsed data: " . json_encode($postData) . "\n", FILE_APPEND);

    // Check required fields - look for vehicle ID in multiple possible fields
    $vehicleId = null;
    if (isset($postData['vehicleId']) && !empty($postData['vehicleId'])) {
        $vehicleId = trim($postData['vehicleId']);
    } elseif (isset($postData['vehicle_id']) && !empty($postData['vehicle_id'])) {
        $vehicleId = trim($postData['vehicle_id']);
    } elseif (isset($postData['id']) && !empty($postData['id'])) {
        $vehicleId = trim($postData['id']);
    }

    if (!$vehicleId) {
        // Detailed logging of all available keys to debug the issue
        file_put_contents($logFile, "[$timestamp] ERROR: Vehicle ID not found in request data. Available keys: " . 
            implode(", ", array_keys($postData)) . "\n", FILE_APPEND);
        throw new Exception('Vehicle ID is required');
    }

    file_put_contents($logFile, "[$timestamp] Found vehicle ID: $vehicleId\n", FILE_APPEND);

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
    $response = [
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'vehicle_id' => $vehicleId,
        'data' => [
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge
        ],
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
