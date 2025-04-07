
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
        $vehicleId = $postData['vehicleId'];
    } elseif (isset($postData['vehicle_id']) && !empty($postData['vehicle_id'])) {
        $vehicleId = $postData['vehicle_id'];
    } elseif (isset($postData['id']) && !empty($postData['id'])) {
        $vehicleId = $postData['id'];
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
    
    // Check if airport_transfer_fares table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $airportTableExists = $checkTableStmt->num_rows > 0;
    
    if (!$airportTableExists) {
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
    
    // Check if vehicle exists in vehicles table, add it if it doesn't
    $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ? OR id = ?");
    $checkVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Create a default vehicle entry if it doesn't exist
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleSql = "
            INSERT INTO vehicles 
            (vehicle_id, name, is_active) 
            VALUES (?, ?, 1)
        ";
        
        $insertVehicleStmt = $conn->prepare($insertVehicleSql);
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        
        file_put_contents($logFile, "[$timestamp] Created new vehicle entry for: $vehicleId\n", FILE_APPEND);
    }
    
    // Begin a transaction to ensure data integrity
    $conn->begin_transaction();
    
    try {
        // Update airport_transfer_fares table
        $updateAirportFaresSql = "
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
        
        $updateAirportFaresStmt = $conn->prepare($updateAirportFaresSql);
        $updateAirportFaresStmt->bind_param(
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
        
        if (!$updateAirportFaresStmt->execute()) {
            throw new Exception("Failed to update airport_transfer_fares: " . $updateAirportFaresStmt->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Updated airport_transfer_fares for vehicle: $vehicleId\n", FILE_APPEND);
        
        // Also update vehicle_pricing table for compatibility
        $updateVehiclePricingSql = "
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, 
            airport_drop_price, airport_tier1_price, airport_tier2_price, airport_tier3_price, 
            airport_tier4_price, airport_extra_km_charge, updated_at) 
            VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            airport_base_price = VALUES(airport_base_price),
            airport_price_per_km = VALUES(airport_price_per_km),
            airport_pickup_price = VALUES(airport_pickup_price),
            airport_drop_price = VALUES(airport_drop_price),
            airport_tier1_price = VALUES(airport_tier1_price),
            airport_tier2_price = VALUES(airport_tier2_price),
            airport_tier3_price = VALUES(airport_tier3_price),
            airport_tier4_price = VALUES(airport_tier4_price),
            airport_extra_km_charge = VALUES(airport_extra_km_charge),
            updated_at = NOW()
        ";
        
        $updateVehiclePricingStmt = $conn->prepare($updateVehiclePricingSql);
        $updateVehiclePricingStmt->bind_param(
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
        
        if (!$updateVehiclePricingStmt->execute()) {
            throw new Exception("Failed to update vehicle_pricing: " . $updateVehiclePricingStmt->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Updated vehicle_pricing for vehicle: $vehicleId\n", FILE_APPEND);
        
        // Commit the transaction
        $conn->commit();
        
        file_put_contents($logFile, "[$timestamp] Successfully updated airport fares for vehicle: $vehicleId\n", FILE_APPEND);
        
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
        
        echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
    } catch (Exception $e) {
        // Roll back the transaction on error
        $conn->rollback();
        throw $e;
    }
    
    // Close database connection
    $conn->close();
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
