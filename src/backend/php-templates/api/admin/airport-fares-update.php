
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

// Handle preflight OPTIONS request
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

$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';

// Run the DB setup to ensure all tables exist
if (function_exists('ensureDatabaseTables')) {
    ensureDatabaseTables();
}

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);

// Get request data and debug
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: $rawInput\n", FILE_APPEND);

// Define default values for all fields
$defaultValues = [
    'basePrice' => 0,
    'base_price' => 0,
    'pricePerKm' => 0,
    'price_per_km' => 0,
    'pickupPrice' => 0,
    'pickup_price' => 0,
    'dropPrice' => 0,
    'drop_price' => 0,
    'tier1Price' => 0,
    'tier1_price' => 0,
    'tier2Price' => 0,
    'tier2_price' => 0,
    'tier3Price' => 0,
    'tier3_price' => 0,
    'tier4Price' => 0,
    'tier4_price' => 0,
    'extraKmCharge' => 0,
    'extra_km_charge' => 0
];

// Check if an updated raw input was provided by the forwarding script
if (isset($GLOBALS['__UPDATED_RAW_INPUT']) && !empty($GLOBALS['__UPDATED_RAW_INPUT'])) {
    $rawInput = $GLOBALS['__UPDATED_RAW_INPUT'];
    file_put_contents($logFile, "[$timestamp] Using updated raw input from forwarding script: $rawInput\n", FILE_APPEND);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Extract data from all possible sources
    $postData = $_POST;
    $jsonData = null;
    
    // Add default values to POST data
    $postData = array_merge($defaultValues, $postData);
    
    file_put_contents($logFile, "[$timestamp] POST data: " . print_r($postData, true) . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] GET data: " . print_r($_GET, true) . "\n", FILE_APPEND);
    
    // If there's raw input, try to parse it as JSON
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        $jsonError = json_last_error();
        
        if ($jsonError === JSON_ERROR_NONE) {
            file_put_contents($logFile, "[$timestamp] Successfully parsed JSON data\n", FILE_APPEND);
            
            // Add default values to JSON data
            $jsonData = array_merge($defaultValues, $jsonData);
            
            file_put_contents($logFile, "[$timestamp] JSON data with defaults: " . print_r($jsonData, true) . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] JSON parse error: " . json_last_error_msg() . "\n", FILE_APPEND);
            
            // Try to parse as URL encoded data
            parse_str($rawInput, $parsedData);
            if (!empty($parsedData)) {
                file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                
                // Add default values to parsed data
                $parsedData = array_merge($defaultValues, $parsedData);
                
                file_put_contents($logFile, "[$timestamp] URL encoded data with defaults: " . print_r($parsedData, true) . "\n", FILE_APPEND);
                
                // Add this data to our collection
                $postData = array_merge($postData, $parsedData);
            }
        }
    }
    
    // Collect data from all sources in order of preference
    $mergedData = [];
    
    // 1. JSON data (highest priority)
    if ($jsonData) {
        $mergedData = $jsonData;
        
        // Check for nested data within JSON
        if (isset($jsonData['data']) && is_array($jsonData['data'])) {
            // Add default values to nested data
            $jsonData['data'] = array_merge($defaultValues, $jsonData['data']);
            $mergedData = array_merge($mergedData, $jsonData['data']);
        }
        if (isset($jsonData['__data']) && is_array($jsonData['__data'])) {
            // Add default values to nested data
            $jsonData['__data'] = array_merge($defaultValues, $jsonData['__data']);
            $mergedData = array_merge($mergedData, $jsonData['__data']);
        }
    }
    
    // 2. POST data
    $mergedData = array_merge($mergedData, $postData);
    
    // 3. GET parameters (lowest priority, but might contain vehicleId)
    // Add default values to GET data
    $_GET = array_merge($defaultValues, $_GET);
    $mergedData = array_merge($_GET, $mergedData);
    
    // Make sure all merged data has default values
    $mergedData = array_merge($defaultValues, $mergedData);
    
    file_put_contents($logFile, "[$timestamp] Merged data from all sources: " . print_r($mergedData, true) . "\n", FILE_APPEND);

    // Find the vehicle ID in the merged data or any of the possible sources
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicleid', 'vehicle-id', 'id', 'cabType', 'cab_type', 'carId', 'car_id'];
    
    foreach ($possibleKeys as $key) {
        if (isset($mergedData[$key]) && !empty($mergedData[$key])) {
            $vehicleId = trim($mergedData[$key]);
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in merged data key '$key': $vehicleId\n", FILE_APPEND);
            break;
        }
    }

    // If still no vehicle ID, check in request parameters and headers
    if (!$vehicleId) {
        foreach ($possibleKeys as $key) {
            if (isset($_REQUEST[$key]) && !empty($_REQUEST[$key])) {
                $vehicleId = trim($_REQUEST[$key]);
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in REQUEST parameter '$key': $vehicleId\n", FILE_APPEND);
                break;
            }
        }
    }
    
    // Check in HTTP headers as a last resort
    if (!$vehicleId) {
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_X_VEHICLE') === 0 && !empty($value)) {
                $vehicleId = trim($value);
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in HTTP header: $vehicleId\n", FILE_APPEND);
                break;
            }
        }
    }

    if (!$vehicleId) {
        // Detailed error message with all available data
        file_put_contents($logFile, "[$timestamp] ERROR: No vehicle ID found in any source\n", FILE_APPEND);
        throw new Exception('Vehicle ID is required but not found in request data or URL');
    }

    // Normalize vehicle ID
    $originalVehicleId = $vehicleId;
    
    // If it has a prefix like 'item-', remove it
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    if ($originalVehicleId !== $vehicleId) {
        file_put_contents($logFile, "[$timestamp] Normalized vehicle ID from '$originalVehicleId' to '$vehicleId'\n", FILE_APPEND);
    }
    
    // Add the vehicleId to mergedData to ensure it's available for later use
    $mergedData['vehicleId'] = $vehicleId;
    $mergedData['vehicle_id'] = $vehicleId;

    // Extract fare data with defaults - check all possible variations of field names
    $basePrice = getNumberValue($mergedData, ['basePrice', 'base_price', 'baseprice', 'base-price'], 0);
    $pricePerKm = getNumberValue($mergedData, ['pricePerKm', 'price_per_km', 'priceperkm', 'price-per-km'], 0);
    $pickupPrice = getNumberValue($mergedData, ['pickupPrice', 'pickup_price', 'pickupprice', 'pickup-price'], 0);
    $dropPrice = getNumberValue($mergedData, ['dropPrice', 'drop_price', 'dropprice', 'drop-price'], 0);
    $tier1Price = getNumberValue($mergedData, ['tier1Price', 'tier_1_price', 'tier1price', 'tier-1-price'], 0);
    $tier2Price = getNumberValue($mergedData, ['tier2Price', 'tier_2_price', 'tier2price', 'tier-2-price'], 0);
    $tier3Price = getNumberValue($mergedData, ['tier3Price', 'tier_3_price', 'tier3price', 'tier-3-price'], 0);
    $tier4Price = getNumberValue($mergedData, ['tier4Price', 'tier_4_price', 'tier4price', 'tier-4-price'], 0);
    $extraKmCharge = getNumberValue($mergedData, ['extraKmCharge', 'extra_km_charge', 'extrakmcharge', 'extra-km-charge'], 0);

    // Log fare data for debugging
    $fareData = [
        'vehicleId' => $vehicleId,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'pickupPrice' => $pickupPrice,
        'dropPrice' => $dropPrice,
        'tier1Price' => $tier1Price,
        'tier2Price' => $tier2Price,
        'tier3Price' => $tier3Price,
        'tier4Price' => $tier4Price,
        'extraKmCharge' => $extraKmCharge
    ];
    
    file_put_contents($logFile, "[$timestamp] Extracted fare data: " . json_encode($fareData) . "\n", FILE_APPEND);
    
    // Connect to the database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for this connection - CRITICAL FIX
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    $conn->query("SET CHARACTER SET utf8mb4");
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // First ensure the vehicle exists in vehicles table
    $checkVehicleQuery = "SELECT vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ?";
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
    
    // Check if airport_transfer_fares table exists, create it if not
    try {
        $tableCheckSql = "SHOW TABLES LIKE 'airport_transfer_fares'";
        $tableResult = $conn->query($tableCheckSql);
        
        if ($tableResult->num_rows == 0) {
            // Table doesn't exist, create it
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
                  `base_price` decimal(10,2) DEFAULT 0.00,
                  `price_per_km` decimal(10,2) DEFAULT 0.00,
                  `pickup_price` decimal(10,2) DEFAULT 0.00,
                  `drop_price` decimal(10,2) DEFAULT 0.00,
                  `tier1_price` decimal(10,2) DEFAULT 0.00,
                  `tier2_price` decimal(10,2) DEFAULT 0.00,
                  `tier3_price` decimal(10,2) DEFAULT 0.00,
                  `tier4_price` decimal(10,2) DEFAULT 0.00,
                  `extra_km_charge` decimal(10,2) DEFAULT 0.00,
                  `created_at` timestamp NULL DEFAULT current_timestamp(),
                  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `vehicle_id` (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            if (!$conn->query($createTableSql)) {
                throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
            }
            
            file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        // Just log the error but continue - we'll attempt the insert anyway
        file_put_contents($logFile, "[$timestamp] Warning: Table check failed: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // Use a transaction to ensure all updates happen together
    $conn->begin_transaction();
    
    try {
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
        
        // Now sync with vehicle_pricing table (for compatibility)
        $syncVPSql = "
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
        
        $syncVPStmt = $conn->prepare($syncVPSql);
        if ($syncVPStmt) {
            $syncVPStmt->bind_param(
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
            
            $syncVPStmt->execute();
            file_put_contents($logFile, "[$timestamp] Synced data to vehicle_pricing table for vehicle: $vehicleId\n", FILE_APPEND);
        }
        
        // Commit the transaction
        $conn->commit();
        file_put_contents($logFile, "[$timestamp] Transaction committed successfully\n", FILE_APPEND);
        
        // Create a response with all relevant data
        $responseData = [
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
        ];
        
        file_put_contents($logFile, "[$timestamp] Success response: " . json_encode($responseData) . "\n", FILE_APPEND);
        sendSuccessResponse($responseData, 'Airport fare updated successfully');
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        file_put_contents($logFile, "[$timestamp] Transaction rolled back due to error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw $e;
    }
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] ERROR TRACE: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}

/**
 * Helper function to get a numeric value from an array using multiple possible keys
 */
function getNumberValue($data, $possibleKeys, $default = 0) {
    foreach ($possibleKeys as $key) {
        if (isset($data[$key]) && (is_numeric($data[$key]) || is_string($data[$key]))) {
            $value = $data[$key];
            if (is_string($value) && trim($value) === '') {
                return $default;
            }
            return floatval($value);
        }
    }
    return $default;
}
