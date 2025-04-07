
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

// Check if an updated raw input was provided by the forwarding script
if (isset($GLOBALS['__UPDATED_RAW_INPUT']) && !empty($GLOBALS['__UPDATED_RAW_INPUT'])) {
    $rawInput = $GLOBALS['__UPDATED_RAW_INPUT'];
    file_put_contents($logFile, "[$timestamp] Using updated raw input from forwarding script: $rawInput\n", FILE_APPEND);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data - check various sources
    $postData = $_POST;
    file_put_contents($logFile, "[$timestamp] POST data: " . print_r($postData, true) . "\n", FILE_APPEND);
    
    // If no POST data, try to get it from the request body
    if (empty($postData)) {
        if (!empty($rawInput)) {
            $jsonData = json_decode($rawInput, true);
            $jsonError = json_last_error();
            
            if ($jsonError !== JSON_ERROR_NONE) {
                file_put_contents($logFile, "[$timestamp] JSON decode error: " . json_last_error_msg() . "\n", FILE_APPEND);
                
                // Try to handle non-JSON data (might be URL encoded or form data)
                parse_str($rawInput, $parsedData);
                if (!empty($parsedData)) {
                    $postData = $parsedData;
                    file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                } else {
                    throw new Exception('Invalid input format: ' . json_last_error_msg() . ' - Input: ' . substr($rawInput, 0, 200));
                }
            } else {
                $postData = $jsonData;
                file_put_contents($logFile, "[$timestamp] Successfully parsed JSON data\n", FILE_APPEND);
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
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id', 'cabType'];
    
    foreach ($possibleKeys as $key) {
        if (isset($postData[$key]) && !empty($postData[$key])) {
            $vehicleId = trim($postData[$key]);
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in key '$key': $vehicleId\n", FILE_APPEND);
            break;
        }
    }

    // If still no vehicle ID found, check in request parameters
    if (!$vehicleId) {
        foreach ($possibleKeys as $key) {
            if (isset($_REQUEST[$key]) && !empty($_REQUEST[$key])) {
                $vehicleId = trim($_REQUEST[$key]);
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in REQUEST parameter '$key': $vehicleId\n", FILE_APPEND);
                break;
            }
        }
    }

    if (!$vehicleId) {
        // Detailed error message with all available data
        file_put_contents($logFile, "[$timestamp] ERROR: No vehicle ID found. POST:" . print_r($_POST, true) . 
            " GET:" . print_r($_GET, true) . " REQUEST:" . print_r($_REQUEST, true) . "\n", FILE_APPEND);
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

    // Log fare data for debugging
    file_put_contents($logFile, "[$timestamp] Fare data to save: " . json_encode([
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
    ]) . "\n", FILE_APPEND);
    
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
