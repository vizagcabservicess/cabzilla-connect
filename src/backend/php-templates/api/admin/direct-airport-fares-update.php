
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Debug-Endpoint: direct-airport-fares-update');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Direct airport fares update request received\n", FILE_APPEND);

// Try to get raw input for more detailed logging
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);

// Decode the JSON input
$data = null;
if (!empty($rawInput)) {
    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        file_put_contents($logFile, "[$timestamp] Error decoding JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
        // Try to fallback to POST data
        $data = $_POST;
    }
}

if (empty($data)) {
    $data = $_POST;
}

// Log the parsed data
file_put_contents($logFile, "[$timestamp] Parsed data: " . json_encode($data) . "\n", FILE_APPEND);

// Get vehicle ID from multiple possible fields
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'id', 'vehicle-id'];

foreach ($possibleKeys as $key) {
    if (isset($data[$key]) && !empty($data[$key])) {
        $vehicleId = $data[$key];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in '$key': $vehicleId\n", FILE_APPEND);
        break;
    }
}

// If still not found, check nested data structure
if (!$vehicleId && isset($data['data']) && is_array($data['data'])) {
    foreach ($possibleKeys as $key) {
        if (isset($data['data'][$key]) && !empty($data['data'][$key])) {
            $vehicleId = $data['data'][$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in data['$key']: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
}

// Last resort - check URL parameters
if (!$vehicleId) {
    foreach ($possibleKeys as $key) {
        if (isset($_GET[$key]) && !empty($_GET[$key])) {
            $vehicleId = $_GET[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in GET parameter '$key': $vehicleId\n", FILE_APPEND);
            break;
        }
    }
}

// For testing/preview mode, use a default vehicle ID if not provided
$isPreviewMode = false;
if (isset($_SERVER['HTTP_HOST']) && (
    strpos($_SERVER['HTTP_HOST'], 'lovableproject.com') !== false ||
    strpos($_SERVER['HTTP_HOST'], 'localhost') !== false ||
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false
)) {
    $isPreviewMode = true;
    if (!$vehicleId) {
        $vehicleId = 'sedan';
        file_put_contents($logFile, "[$timestamp] Using default vehicleId 'sedan' in preview mode\n", FILE_APPEND);
    }
}

if (!$vehicleId) {
    file_put_contents($logFile, "[$timestamp] ERROR: No vehicle ID found in request\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'debug' => [
            'parsed_data' => $data,
            'timestamp' => $timestamp
        ]
    ]);
    exit;
}

// Clean up vehicle ID if it has a prefix like 'item-'
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
    file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Extract fare data from the request with multiple field name support
$pickupPrice = isset($data['pickupPrice']) ? floatval($data['pickupPrice']) : 
             (isset($data['pickup']) ? floatval($data['pickup']) : 0);

$dropPrice = isset($data['dropPrice']) ? floatval($data['dropPrice']) : 
           (isset($data['drop']) ? floatval($data['drop']) : 0);

$tier1Price = isset($data['tier1Price']) ? floatval($data['tier1Price']) : 
            (isset($data['tier1']) ? floatval($data['tier1']) : 0);

$tier2Price = isset($data['tier2Price']) ? floatval($data['tier2Price']) : 
            (isset($data['tier2']) ? floatval($data['tier2']) : 0);

$tier3Price = isset($data['tier3Price']) ? floatval($data['tier3Price']) : 
            (isset($data['tier3']) ? floatval($data['tier3']) : 0);

$tier4Price = isset($data['tier4Price']) ? floatval($data['tier4Price']) : 
            (isset($data['tier4']) ? floatval($data['tier4']) : 0);

$extraKmCharge = isset($data['extraKmCharge']) ? floatval($data['extraKmCharge']) : 0;
$basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
$pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;

// Create fare data object with all possible field names
$fareData = [
    'vehicleId' => $vehicleId,
    'vehicle_id' => $vehicleId,
    'pickupPrice' => $pickupPrice,
    'dropPrice' => $dropPrice,
    'pickup' => $pickupPrice,
    'drop' => $dropPrice,
    'tier1Price' => $tier1Price,
    'tier2Price' => $tier2Price,
    'tier3Price' => $tier3Price,
    'tier4Price' => $tier4Price,
    'tier1' => $tier1Price,
    'tier2' => $tier2Price,
    'tier3' => $tier3Price,
    'tier4' => $tier4Price,
    'extraKmCharge' => $extraKmCharge,
    'basePrice' => $basePrice,
    'pricePerKm' => $pricePerKm
];

// Check for zero values and set defaults if needed
if ($basePrice <= 0) {
    $fareData['basePrice'] = getDefaultBasePrice($vehicleId);
    file_put_contents($logFile, "[$timestamp] Using default base price: {$fareData['basePrice']}\n", FILE_APPEND);
}

if ($pricePerKm <= 0) {
    $fareData['pricePerKm'] = getDefaultPricePerKm($vehicleId);
    file_put_contents($logFile, "[$timestamp] Using default price per km: {$fareData['pricePerKm']}\n", FILE_APPEND);
}

// Update database if available
$databaseUpdated = false;
try {
    // Try to include database configuration
    $dbConfig = __DIR__ . '/../../config.php';
    
    if (file_exists($dbConfig)) {
        require_once $dbConfig;
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn) {
                file_put_contents($logFile, "[$timestamp] Database connection established\n", FILE_APPEND);
                
                // Check if airport_transfer_fares table exists
                $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
                $checkResult = $conn->query($checkTableQuery);
                
                if ($checkResult && $checkResult->num_rows > 0) {
                    // Check if record exists
                    $checkVehicleQuery = "SELECT vehicle_id FROM airport_transfer_fares WHERE vehicle_id = ?";
                    $checkStmt = $conn->prepare($checkVehicleQuery);
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                    $exists = $checkResult->num_rows > 0;
                    $checkStmt->close();
                    
                    if ($exists) {
                        // Update existing record
                        $updateQuery = "UPDATE airport_transfer_fares SET 
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
                            WHERE vehicle_id = ?";
                            
                        $stmt = $conn->prepare($updateQuery);
                        $stmt->bind_param(
                            "ddddddddds",
                            $fareData['basePrice'],
                            $fareData['pricePerKm'],
                            $fareData['pickupPrice'],
                            $fareData['dropPrice'],
                            $fareData['tier1Price'], 
                            $fareData['tier2Price'],
                            $fareData['tier3Price'],
                            $fareData['tier4Price'],
                            $fareData['extraKmCharge'],
                            $vehicleId
                        );
                        $stmt->execute();
                        $stmt->close();
                        
                        file_put_contents($logFile, "[$timestamp] Updated airport fares in database for $vehicleId\n", FILE_APPEND);
                    } else {
                        // Insert new record
                        $insertQuery = "INSERT INTO airport_transfer_fares (
                            vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                            tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, 
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                        
                        $stmt = $conn->prepare($insertQuery);
                        $stmt->bind_param(
                            "sddddddddd",
                            $vehicleId,
                            $fareData['basePrice'],
                            $fareData['pricePerKm'],
                            $fareData['pickupPrice'],
                            $fareData['dropPrice'],
                            $fareData['tier1Price'], 
                            $fareData['tier2Price'],
                            $fareData['tier3Price'],
                            $fareData['tier4Price'],
                            $fareData['extraKmCharge']
                        );
                        $stmt->execute();
                        $stmt->close();
                        
                        file_put_contents($logFile, "[$timestamp] Inserted new airport fares in database for $vehicleId\n", FILE_APPEND);
                    }
                    
                    $databaseUpdated = true;
                } else {
                    // Create the table
                    $createTableQuery = "CREATE TABLE IF NOT EXISTS airport_transfer_fares (
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
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                    
                    $conn->query($createTableQuery);
                    
                    // Insert the record
                    $insertQuery = "INSERT INTO airport_transfer_fares (
                        vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, 
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                    
                    $stmt = $conn->prepare($insertQuery);
                    $stmt->bind_param(
                        "sddddddddd",
                        $vehicleId,
                        $fareData['basePrice'],
                        $fareData['pricePerKm'],
                        $fareData['pickupPrice'],
                        $fareData['dropPrice'],
                        $fareData['tier1Price'], 
                        $fareData['tier2Price'],
                        $fareData['tier3Price'],
                        $fareData['tier4Price'],
                        $fareData['extraKmCharge']
                    );
                    $stmt->execute();
                    $stmt->close();
                    
                    file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table and inserted record for $vehicleId\n", FILE_APPEND);
                    $databaseUpdated = true;
                }
                
                // Update vehicle_pricing table for compatibility
                $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
                $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
                
                if ($checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0) {
                    // Check if record exists
                    $checkVehiclePricingRecordQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
                    $checkVehiclePricingStmt = $conn->prepare($checkVehiclePricingRecordQuery);
                    $checkVehiclePricingStmt->bind_param("s", $vehicleId);
                    $checkVehiclePricingStmt->execute();
                    $checkVehiclePricingResult = $checkVehiclePricingStmt->get_result();
                    $vehiclePricingExists = $checkVehiclePricingResult->num_rows > 0;
                    $checkVehiclePricingStmt->close();
                    
                    if ($vehiclePricingExists) {
                        // Update existing record
                        $updateVehiclePricingQuery = "UPDATE vehicle_pricing SET 
                            airport_base_price = ?, 
                            airport_price_per_km = ?, 
                            airport_pickup_price = ?, 
                            airport_drop_price = ?, 
                            airport_tier1_price = ?, 
                            airport_tier2_price = ?, 
                            airport_tier3_price = ?, 
                            airport_tier4_price = ?, 
                            airport_extra_km_charge = ?,
                            updated_at = NOW()
                            WHERE vehicle_id = ? AND trip_type = 'airport'";
                            
                        $updateVehiclePricingStmt = $conn->prepare($updateVehiclePricingQuery);
                        $updateVehiclePricingStmt->bind_param(
                            "ddddddddds",
                            $fareData['basePrice'],
                            $fareData['pricePerKm'],
                            $fareData['pickupPrice'],
                            $fareData['dropPrice'],
                            $fareData['tier1Price'], 
                            $fareData['tier2Price'],
                            $fareData['tier3Price'],
                            $fareData['tier4Price'],
                            $fareData['extraKmCharge'],
                            $vehicleId
                        );
                        $updateVehiclePricingStmt->execute();
                        $updateVehiclePricingStmt->close();
                        
                        file_put_contents($logFile, "[$timestamp] Updated airport fares in vehicle_pricing table for $vehicleId\n", FILE_APPEND);
                    } else {
                        // Insert new record
                        $tripType = 'airport';
                        $insertVehiclePricingQuery = "INSERT INTO vehicle_pricing (
                            vehicle_id, trip_type, airport_base_price, airport_price_per_km, 
                            airport_pickup_price, airport_drop_price, 
                            airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                            airport_extra_km_charge, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                        
                        $insertVehiclePricingStmt = $conn->prepare($insertVehiclePricingQuery);
                        $insertVehiclePricingStmt->bind_param(
                            "ssdddddddd",
                            $vehicleId,
                            $tripType,
                            $fareData['basePrice'],
                            $fareData['pricePerKm'],
                            $fareData['pickupPrice'],
                            $fareData['dropPrice'],
                            $fareData['tier1Price'], 
                            $fareData['tier2Price'],
                            $fareData['tier3Price'],
                            $fareData['tier4Price'],
                            $fareData['extraKmCharge']
                        );
                        $insertVehiclePricingStmt->execute();
                        $insertVehiclePricingStmt->close();
                        
                        file_put_contents($logFile, "[$timestamp] Inserted airport fares in vehicle_pricing table for $vehicleId\n", FILE_APPEND);
                    }
                }
            } else {
                file_put_contents($logFile, "[$timestamp] Failed to establish database connection\n", FILE_APPEND);
            }
        }
    }
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . "\n", FILE_APPEND);
}

// Log the fare data
file_put_contents($logFile, "[$timestamp] Fare data to save: " . json_encode($fareData) . "\n", FILE_APPEND);

// Load persistent vehicle data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true) ?: [];
            file_put_contents($logFile, "[$timestamp] Loaded persistent data with " . count($persistentData) . " vehicles\n", FILE_APPEND);
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Error parsing persistent data: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
}

// Update or append airport fares in persistent data
$vehicleUpdated = false;
foreach ($persistentData as &$vehicle) {
    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
        $vehicle['airportFares'] = $fareData;
        $vehicleUpdated = true;
        file_put_contents($logFile, "[$timestamp] Updated airport fares for existing vehicle $vehicleId\n", FILE_APPEND);
        break;
    }
}

// If vehicle not found, add it to the persistent data
if (!$vehicleUpdated) {
    $newVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
        'airportFares' => $fareData
    ];
    $persistentData[] = $newVehicle;
    file_put_contents($logFile, "[$timestamp] Added new vehicle $vehicleId with airport fares\n", FILE_APPEND);
}

// Save updated persistent data
if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
    file_put_contents($logFile, "[$timestamp] Saved updated persistent data\n", FILE_APPEND);
} else {
    file_put_contents($logFile, "[$timestamp] ERROR: Failed to save persistent data\n", FILE_APPEND);
}

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares updated successfully',
    'vehicleId' => $vehicleId,
    'data' => $fareData,
    'databaseUpdated' => $databaseUpdated
]);

// Helper function to get default base price based on vehicle type
function getDefaultBasePrice($vehicleId) {
    $basePrice = 3500; // Default value
    
    switch (strtolower($vehicleId)) {
        case 'sedan':
            $basePrice = 3000;
            break;
        case 'ertiga':
            $basePrice = 3500;
            break;
        case 'innova_crysta':
        case 'innova_hycross':
        case 'innova crysta':
        case 'innova hycross':
            $basePrice = 4000;
            break;
        case 'dzire_cng':
        case 'dzire cng':
        case 'swift_dzire':
        case 'swift dzire':
            $basePrice = 3200;
            break;
        case 'luxury':
            $basePrice = 7000;
            break;
        case 'tempo':
        case 'tempo_traveller':
        case 'tempo traveller':
            $basePrice = 6000;
            break;
        case 'toyota':
            $basePrice = 4500;
            break;
    }
    
    return $basePrice;
}

// Helper function to get default price per km based on vehicle type
function getDefaultPricePerKm($vehicleId) {
    $pricePerKm = 15; // Default value
    
    switch (strtolower($vehicleId)) {
        case 'sedan':
            $pricePerKm = 12;
            break;
        case 'ertiga':
            $pricePerKm = 15;
            break;
        case 'innova_crysta':
        case 'innova_hycross':
        case 'innova crysta':
        case 'innova hycross':
            $pricePerKm = 17;
            break;
        case 'dzire_cng':
        case 'dzire cng':
        case 'swift_dzire':
        case 'swift dzire':
            $pricePerKm = 13;
            break;
        case 'luxury':
            $pricePerKm = 22;
            break;
        case 'tempo':
        case 'tempo_traveller':
        case 'tempo traveller':
            $pricePerKm = 19;
            break;
        case 'toyota':
            $pricePerKm = 18;
            break;
    }
    
    return $pricePerKm;
}
