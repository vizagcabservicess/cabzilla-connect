
<?php
/**
 * Direct Airport Fares Update API
 * Handles direct updates to the airport_transfer_fares table
 * Creates the table and entries if they don't exist
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation');

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

// Log function for debugging
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Get request data
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$forceCreation = isset($_SERVER['HTTP_X_FORCE_CREATION']) && $_SERVER['HTTP_X_FORCE_CREATION'] === 'true';

logMessage("Request: $requestMethod $requestUri");
logMessage("Force creation: " . ($forceCreation ? 'true' : 'false'));

// Get input data from various sources
$inputData = file_get_contents('php://input');
$jsonData = json_decode($inputData, true);

// Use POST or GET data as fallback
$requestData = $jsonData ?? $_POST ?? $_GET ?? [];

logMessage("Input data: " . print_r($requestData, true));

// Default fare values for vehicle types
$defaultFares = [
    'sedan' => [
        'basePrice' => 3000, 'pricePerKm' => 12, 'pickupPrice' => 800, 'dropPrice' => 800,
        'tier1Price' => 600, 'tier2Price' => 800, 'tier3Price' => 1000, 'tier4Price' => 1200, 'extraKmCharge' => 12
    ],
    'ertiga' => [
        'basePrice' => 3500, 'pricePerKm' => 15, 'pickupPrice' => 1000, 'dropPrice' => 1000,
        'tier1Price' => 800, 'tier2Price' => 1000, 'tier3Price' => 1200, 'tier4Price' => 1400, 'extraKmCharge' => 15
    ],
    'innova_crysta' => [
        'basePrice' => 4000, 'pricePerKm' => 17, 'pickupPrice' => 1200, 'dropPrice' => 1200,
        'tier1Price' => 1000, 'tier2Price' => 1200, 'tier3Price' => 1400, 'tier4Price' => 1600, 'extraKmCharge' => 17
    ],
    'innova_hycross' => [
        'basePrice' => 4500, 'pricePerKm' => 18, 'pickupPrice' => 1200, 'dropPrice' => 1200,
        'tier1Price' => 1000, 'tier2Price' => 1200, 'tier3Price' => 1400, 'tier4Price' => 1600, 'extraKmCharge' => 18
    ],
    'dzire_cng' => [
        'basePrice' => 3200, 'pricePerKm' => 13, 'pickupPrice' => 800, 'dropPrice' => 800,
        'tier1Price' => 600, 'tier2Price' => 800, 'tier3Price' => 1000, 'tier4Price' => 1200, 'extraKmCharge' => 13
    ],
    'luxury' => [
        'basePrice' => 7000, 'pricePerKm' => 22, 'pickupPrice' => 2500, 'dropPrice' => 2500,
        'tier1Price' => 2000, 'tier2Price' => 2200, 'tier3Price' => 2500, 'tier4Price' => 3000, 'extraKmCharge' => 22
    ],
    'tempo' => [
        'basePrice' => 6000, 'pricePerKm' => 19, 'pickupPrice' => 2000, 'dropPrice' => 2000,
        'tier1Price' => 1600, 'tier2Price' => 1800, 'tier3Price' => 2000, 'tier4Price' => 2500, 'extraKmCharge' => 19
    ],
    'tempo_traveller' => [
        'basePrice' => 6000, 'pricePerKm' => 19, 'pickupPrice' => 2000, 'dropPrice' => 2000,
        'tier1Price' => 1600, 'tier2Price' => 1800, 'tier3Price' => 2000, 'tier4Price' => 2500, 'extraKmCharge' => 19
    ],
    'toyota' => [
        'basePrice' => 4500, 'pricePerKm' => 18, 'pickupPrice' => 1200, 'dropPrice' => 1200,
        'tier1Price' => 1000, 'tier2Price' => 1200, 'tier3Price' => 1400, 'tier4Price' => 1600, 'extraKmCharge' => 18
    ],
    'default' => [
        'basePrice' => 3500, 'pricePerKm' => 15, 'pickupPrice' => 1000, 'dropPrice' => 1000,
        'tier1Price' => 800, 'tier2Price' => 1000, 'tier3Price' => 1200, 'tier4Price' => 1400, 'extraKmCharge' => 15
    ]
];

// ID mappings for numeric IDs
$numericIdMap = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'innova_crysta',
    '592' => 'tempo',
    '1270' => 'tempo',
    '1271' => 'dzire_cng',
    '1272' => 'innova_hycross'
];

try {
    // Check if vehicle ID is provided
    $vehicleId = $requestData['vehicleId'] ?? $requestData['vehicle_id'] ?? null;
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Normalize vehicle ID
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Map numeric IDs to string IDs
    if (is_numeric($vehicleId) && isset($numericIdMap[$vehicleId])) {
        $originalId = $vehicleId;
        $vehicleId = $numericIdMap[$vehicleId];
        logMessage("Mapped numeric ID $originalId to $vehicleId");
    }
    
    // Extract fare values with fallbacks
    $basePrice = floatval($requestData['basePrice'] ?? $requestData['base_price'] ?? 0);
    $pricePerKm = floatval($requestData['pricePerKm'] ?? $requestData['price_per_km'] ?? 0);
    $pickupPrice = floatval($requestData['pickupPrice'] ?? $requestData['pickup_price'] ?? 0);
    $dropPrice = floatval($requestData['dropPrice'] ?? $requestData['drop_price'] ?? 0);
    $tier1Price = floatval($requestData['tier1Price'] ?? $requestData['tier1_price'] ?? 0);
    $tier2Price = floatval($requestData['tier2Price'] ?? $requestData['tier2_price'] ?? 0);
    $tier3Price = floatval($requestData['tier3Price'] ?? $requestData['tier3_price'] ?? 0);
    $tier4Price = floatval($requestData['tier4Price'] ?? $requestData['tier4_price'] ?? 0);
    $extraKmCharge = floatval($requestData['extraKmCharge'] ?? $requestData['extra_km_charge'] ?? 0);
    
    // Always try to apply defaults if values are missing/zero
    $forceCreation = true;
    
    // Apply defaults if values are missing/zero and force creation is enabled
    if ($forceCreation) {
        $defaultKey = isset($defaultFares[$vehicleId]) ? $vehicleId : 'default';
        $defaults = $defaultFares[$defaultKey];
        
        if ($basePrice == 0) $basePrice = $defaults['basePrice'];
        if ($pricePerKm == 0) $pricePerKm = $defaults['pricePerKm'];
        if ($pickupPrice == 0) $pickupPrice = $defaults['pickupPrice'];
        if ($dropPrice == 0) $dropPrice = $defaults['dropPrice'];
        if ($tier1Price == 0) $tier1Price = $defaults['tier1Price'];
        if ($tier2Price == 0) $tier2Price = $defaults['tier2Price'];
        if ($tier3Price == 0) $tier3Price = $defaults['tier3Price'];
        if ($tier4Price == 0) $tier4Price = $defaults['tier4Price'];
        if ($extraKmCharge == 0) $extraKmCharge = $defaults['extraKmCharge'];
    }
    
    // Database operations
    require_once __DIR__ . '/../../config.php';
    
    if (!function_exists('getDbConnection')) {
        throw new Exception("Database configuration not found");
    }
    
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure the airport_transfer_fares table exists
    $checkTableSql = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableResult = $conn->query($checkTableSql);
    
    if ($tableResult->num_rows === 0) {
        // Create the table
        $createTableSql = "
            CREATE TABLE `airport_transfer_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `price_per_km` decimal(5,2) NOT NULL DEFAULT 0.00,
                `pickup_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `drop_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier1_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier2_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier3_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `tier4_price` decimal(10,2) NOT NULL DEFAULT 0.00,
                `extra_km_charge` decimal(5,2) NOT NULL DEFAULT 0.00,
                `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        logMessage("Created airport_transfer_fares table");
    }
    
    // Check if vehicle exists in the database
    $checkVehicleSql = "SELECT id FROM vehicles WHERE vehicle_id = ? OR id = ?";
    $checkStmt = $conn->prepare($checkVehicleSql);
    $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Vehicle not found, create it
        $insertVehicleSql = "INSERT INTO vehicles (vehicle_id, name, is_active) VALUES (?, ?, 1)";
        $insertStmt = $conn->prepare($insertVehicleSql);
        $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
        $insertStmt->bind_param("ss", $vehicleId, $vehicleName);
        
        if (!$insertStmt->execute()) {
            logMessage("Warning: Failed to create vehicle: " . $insertStmt->error);
        } else {
            logMessage("Created new vehicle: $vehicleId");
        }
    }
    
    // Check if fare exists for this vehicle
    $checkFareSql = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
    $checkFareStmt = $conn->prepare($checkFareSql);
    $checkFareStmt->bind_param("s", $vehicleId);
    $checkFareStmt->execute();
    $checkFareResult = $checkFareStmt->get_result();
    
    if ($checkFareResult->num_rows === 0) {
        // Insert new fare entry
        $insertSql = "
            INSERT INTO airport_transfer_fares (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $conn->prepare($insertSql);
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
            throw new Exception("Failed to insert airport fare: " . $stmt->error);
        }
        
        logMessage("Created new airport fare entry for $vehicleId");
    } else {
        // Update existing fare entry
        $updateSql = "
            UPDATE airport_transfer_fares 
            SET 
                base_price = ?, 
                price_per_km = ?,
                pickup_price = ?,
                drop_price = ?,
                tier1_price = ?,
                tier2_price = ?,
                tier3_price = ?,
                tier4_price = ?,
                extra_km_charge = ?,
                updated_at = NOW()
            WHERE vehicle_id = ?
        ";
        
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param(
            "ddddddddds",
            $basePrice,
            $pricePerKm,
            $pickupPrice,
            $dropPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge,
            $vehicleId
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update airport fare: " . $stmt->error);
        }
        
        logMessage("Updated airport fare entry for $vehicleId");
    }
    
    // Also update vehicle_pricing table for compatibility
    $tripType = 'airport-transfer';
    
    // Check if entry exists in vehicle_pricing
    $checkPricingSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?";
    $checkPricingStmt = $conn->prepare($checkPricingSql);
    $checkPricingStmt->bind_param("ss", $vehicleId, $tripType);
    $checkPricingStmt->execute();
    $checkPricingResult = $checkPricingStmt->get_result();
    
    if ($checkPricingResult->num_rows === 0) {
        // Insert new entry
        $insertPricingSql = "
            INSERT INTO vehicle_pricing (
                vehicle_id,
                trip_type,
                base_fare,
                price_per_km
            ) VALUES (?, ?, ?, ?)
        ";
        
        $pricingStmt = $conn->prepare($insertPricingSql);
        $pricingStmt->bind_param(
            "ssdd",
            $vehicleId,
            $tripType,
            $basePrice,
            $pricePerKm
        );
        
        if (!$pricingStmt->execute()) {
            logMessage("Warning: Failed to insert pricing entry: " . $pricingStmt->error);
        } else {
            logMessage("Created pricing entry for $vehicleId with trip type $tripType");
        }
    } else {
        // Update existing entry
        $updatePricingSql = "
            UPDATE vehicle_pricing
            SET
                base_fare = ?,
                price_per_km = ?,
                updated_at = NOW()
            WHERE vehicle_id = ? AND trip_type = ?
        ";
        
        $pricingStmt = $conn->prepare($updatePricingSql);
        $pricingStmt->bind_param(
            "ddss",
            $basePrice,
            $pricePerKm,
            $vehicleId,
            $tripType
        );
        
        if (!$pricingStmt->execute()) {
            logMessage("Warning: Failed to update pricing entry: " . $pricingStmt->error);
        } else {
            logMessage("Updated pricing entry for $vehicleId with trip type $tripType");
        }
    }
    
    // Trigger sync to ensure all vehicle records are properly updated
    $syncCommand = "php " . __DIR__ . "/sync-airport-fares.php";
    if (function_exists('exec')) {
        @exec($syncCommand . " > /dev/null 2>&1 &");
        logMessage("Triggered background sync with exec");
    } else {
        // Try alternative method using file_get_contents with a timeout
        $syncUrl = "http" . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . 
                  "://" . $_SERVER['HTTP_HOST'] . 
                  dirname($_SERVER['REQUEST_URI']) . "/sync-airport-fares.php";
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 1, // 1 second timeout to avoid blocking
                'header' => "X-Force-Creation: true\r\n"
            ]
        ]);
        
        @file_get_contents($syncUrl, false, $context);
        logMessage("Triggered background sync with HTTP request");
    }
    
    // Success response
    echo json_encode([
        'status' => 'success',
        'message' => "Airport fare updated successfully for $vehicleId",
        'data' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
