
<?php
/**
 * Airport fares update API endpoint
 * Updates airport transfer fares for a specific vehicle
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Clear any existing output buffers to prevent contamination
if (ob_get_length()) ob_clean();

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

// Function to safely output response
function outputResponse($data) {
    global $logFile, $timestamp;
    
    // Log the response
    file_put_contents($logFile, "[$timestamp] Response: " . json_encode($data) . "\n", FILE_APPEND);
    
    // Clear any buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    
    // Output JSON
    echo json_encode($data);
    exit;
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET data: " . json_encode($_GET) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] POST data: " . json_encode($_POST) . "\n", FILE_APPEND);

// Initialize airport fare tables
try {
    // This will create and initialize all needed tables
    require_once __DIR__ . '/initialize-airport-fares.php';
    file_put_contents($logFile, "[$timestamp] Airport fare tables initialized\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Warning: Failed to initialize airport fare tables: " . $e->getMessage() . "\n", FILE_APPEND);
}

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

try {
    // Get raw input data
    $rawInput = file_get_contents('php://input');
    file_put_contents($logFile, "[$timestamp] Raw input: $rawInput\n", FILE_APPEND);
    
    // Check if an updated raw input was provided by the forwarding script
    if (isset($GLOBALS['__UPDATED_RAW_INPUT']) && !empty($GLOBALS['__UPDATED_RAW_INPUT'])) {
        $rawInput = $GLOBALS['__UPDATED_RAW_INPUT'];
        file_put_contents($logFile, "[$timestamp] Using updated raw input from forwarding script: $rawInput\n", FILE_APPEND);
    }
    
    // Add default values to POST data
    $_POST = array_merge($defaultValues, $_POST);
    file_put_contents($logFile, "[$timestamp] POST data with defaults: " . json_encode($_POST) . "\n", FILE_APPEND);
    
    // Add default values to GET data
    $_GET = array_merge($defaultValues, $_GET);
    file_put_contents($logFile, "[$timestamp] GET data with defaults: " . json_encode($_GET) . "\n", FILE_APPEND);
    
    // Extract data from all possible sources
    $postData = $_POST;
    $jsonData = null;
    
    // If there's raw input, try to parse it as JSON
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        $jsonError = json_last_error();
        
        if ($jsonError === JSON_ERROR_NONE) {
            file_put_contents($logFile, "[$timestamp] Successfully parsed JSON data\n", FILE_APPEND);
            
            // Add default values to JSON data
            $jsonData = array_merge($defaultValues, $jsonData);
            
            // Check for nested data within JSON
            if (isset($jsonData['data']) && is_array($jsonData['data'])) {
                $jsonData['data'] = array_merge($defaultValues, $jsonData['data']);
            }
            
            file_put_contents($logFile, "[$timestamp] JSON data with defaults: " . json_encode($jsonData) . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] JSON parse error: " . json_last_error_msg() . "\n", FILE_APPEND);
            
            // Try to parse as URL encoded data
            parse_str($rawInput, $parsedData);
            if (!empty($parsedData)) {
                file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                
                // Add default values to parsed data
                $parsedData = array_merge($defaultValues, $parsedData);
                file_put_contents($logFile, "[$timestamp] URL encoded data with defaults: " . json_encode($parsedData) . "\n", FILE_APPEND);
                
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
            $mergedData = array_merge($mergedData, $jsonData['data']);
        }
        if (isset($jsonData['__data']) && is_array($jsonData['__data'])) {
            $mergedData = array_merge($mergedData, $jsonData['__data']);
        }
    }
    
    // 2. POST data
    $mergedData = array_merge($mergedData, $postData);
    
    // 3. GET parameters (lowest priority, but might contain vehicleId)
    $mergedData = array_merge($_GET, $mergedData);
    
    // Make sure all merged data has default values
    $mergedData = array_merge($defaultValues, $mergedData);
    
    file_put_contents($logFile, "[$timestamp] Merged data from all sources: " . json_encode($mergedData) . "\n", FILE_APPEND);
    
    // Find the vehicle ID in the merged data
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicleid', 'vehicle-id', 'id', 'cabType', 'cab_type'];
    
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
    
    // Use a dummy vehicle ID for testing if none was provided
    if (!$vehicleId) {
        $vehicleId = 'default_vehicle';
        file_put_contents($logFile, "[$timestamp] Using default vehicle ID for testing: $vehicleId\n", FILE_APPEND);
    }
    
    // Clean up vehicle ID if it has a prefix like 'item-'
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
        file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
    }
    
    // Extract fare values
    $basePrice = isset($mergedData['basePrice']) ? (float)$mergedData['basePrice'] : 
                (isset($mergedData['base_price']) ? (float)$mergedData['base_price'] : 0);
    
    $pricePerKm = isset($mergedData['pricePerKm']) ? (float)$mergedData['pricePerKm'] : 
                 (isset($mergedData['price_per_km']) ? (float)$mergedData['price_per_km'] : 0);
    
    $pickupPrice = isset($mergedData['pickupPrice']) ? (float)$mergedData['pickupPrice'] : 
                  (isset($mergedData['pickup_price']) ? (float)$mergedData['pickup_price'] : 0);
    
    $dropPrice = isset($mergedData['dropPrice']) ? (float)$mergedData['dropPrice'] : 
               (isset($mergedData['drop_price']) ? (float)$mergedData['drop_price'] : 0);
    
    $tier1Price = isset($mergedData['tier1Price']) ? (float)$mergedData['tier1Price'] : 
                (isset($mergedData['tier1_price']) ? (float)$mergedData['tier1_price'] : 0);
    
    $tier2Price = isset($mergedData['tier2Price']) ? (float)$mergedData['tier2Price'] : 
                (isset($mergedData['tier2_price']) ? (float)$mergedData['tier2_price'] : 0);
    
    $tier3Price = isset($mergedData['tier3Price']) ? (float)$mergedData['tier3Price'] : 
                (isset($mergedData['tier3_price']) ? (float)$mergedData['tier3_price'] : 0);
    
    $tier4Price = isset($mergedData['tier4Price']) ? (float)$mergedData['tier4Price'] : 
                (isset($mergedData['tier4_price']) ? (float)$mergedData['tier4_price'] : 0);
    
    $extraKmCharge = isset($mergedData['extraKmCharge']) ? (float)$mergedData['extraKmCharge'] : 
                    (isset($mergedData['extra_km_charge']) ? (float)$mergedData['extra_km_charge'] : 0);
    
    file_put_contents($logFile, "[$timestamp] Extracted values: basePrice=$basePrice, pricePerKm=$pricePerKm, pickupPrice=$pickupPrice, dropPrice=$dropPrice, tier1Price=$tier1Price, tier2Price=$tier2Price, tier3Price=$tier3Price, tier4Price=$tier4Price, extraKmCharge=$extraKmCharge\n", FILE_APPEND);
    
    // Create a database connection
    try {
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception("Failed to connect to database");
        }
        
        // Set collation explicitly for the entire connection
        $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        // First try to update the airport_transfer_fares table
        $sql = "INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price), 
                price_per_km = VALUES(price_per_km), 
                pickup_price = VALUES(pickup_price), 
                drop_price = VALUES(drop_price), 
                tier1_price = VALUES(tier1_price), 
                tier2_price = VALUES(tier2_price), 
                tier3_price = VALUES(tier3_price), 
                tier4_price = VALUES(tier4_price), 
                extra_km_charge = VALUES(extra_km_charge)";
        
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Database prepare error: " . $conn->error);
        }
        
        $stmt->bind_param("sddddddddd", 
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
        
        $result = $stmt->execute();
        
        if (!$result) {
            throw new Exception("Failed to update airport_transfer_fares: " . $stmt->error);
        }
        
        $affectedRows = $stmt->affected_rows;
        file_put_contents($logFile, "[$timestamp] Updated airport_transfer_fares table: " . ($affectedRows > 0 ? "$affectedRows rows affected" : "No changes") . "\n", FILE_APPEND);
        
        // Now update the vehicle_pricing table
        $sqlVehiclePricing = "INSERT INTO vehicle_pricing 
                             (vehicle_id, trip_type, 
                              airport_base_price, airport_price_per_km, airport_pickup_price, 
                              airport_drop_price, airport_tier1_price, airport_tier2_price, 
                              airport_tier3_price, airport_tier4_price, airport_extra_km_charge) 
                             VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                             ON DUPLICATE KEY UPDATE 
                             airport_base_price = VALUES(airport_base_price), 
                             airport_price_per_km = VALUES(airport_price_per_km), 
                             airport_pickup_price = VALUES(airport_pickup_price), 
                             airport_drop_price = VALUES(airport_drop_price), 
                             airport_tier1_price = VALUES(airport_tier1_price), 
                             airport_tier2_price = VALUES(airport_tier2_price), 
                             airport_tier3_price = VALUES(airport_tier3_price), 
                             airport_tier4_price = VALUES(airport_tier4_price), 
                             airport_extra_km_charge = VALUES(airport_extra_km_charge)";
        
        $stmtVP = $conn->prepare($sqlVehiclePricing);
        
        if (!$stmtVP) {
            throw new Exception("Database prepare error for vehicle_pricing: " . $conn->error);
        }
        
        $stmtVP->bind_param("sddddddddd", 
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
        
        $resultVP = $stmtVP->execute();
        
        if (!$resultVP) {
            throw new Exception("Failed to update vehicle_pricing: " . $stmtVP->error);
        }
        
        $affectedRowsVP = $stmtVP->affected_rows;
        file_put_contents($logFile, "[$timestamp] Updated vehicle_pricing table: " . ($affectedRowsVP > 0 ? "$affectedRowsVP rows affected" : "No changes") . "\n", FILE_APPEND);
        
        // Update the fares cache and return a success response
        $cacheFile = __DIR__ . '/../../cache/airport_fares_' . $vehicleId . '.json';
        $fareData = [
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge,
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'status' => 'active',
            'last_updated' => date('Y-m-d H:i:s')
        ];
        
        file_put_contents($cacheFile, json_encode($fareData, JSON_PRETTY_PRINT));
        file_put_contents($logFile, "[$timestamp] Updated fare cache file: $cacheFile\n", FILE_APPEND);
        
        // Return success response
        outputResponse([
            'status' => 'success',
            'message' => 'Airport fares updated successfully',
            'data' => [
                'vehicle_id' => $vehicleId,
                'base_price' => $basePrice,
                'price_per_km' => $pricePerKm,
                'pickup_price' => $pickupPrice,
                'drop_price' => $dropPrice,
                'tier1_price' => $tier1Price,
                'tier2_price' => $tier2Price,
                'tier3_price' => $tier3Price,
                'tier4_price' => $tier4Price,
                'extra_km_charge' => $extraKmCharge
            ]
        ]);
        
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . "\n", FILE_APPEND);
        outputResponse([
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage(),
            'code' => 500
        ]);
    }
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    outputResponse([
        'status' => 'error',
        'message' => 'Error updating airport fares: ' . $e->getMessage(),
        'code' => 500
    ]);
}
