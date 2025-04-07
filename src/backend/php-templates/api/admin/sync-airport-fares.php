
<?php
/**
 * Sync Airport Fares Endpoint
 * 
 * This endpoint will synchronize data between airport_transfer_fares and vehicle_pricing tables,
 * ensuring that all vehicles are represented in both tables with consistent data.
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';

// Log request
$timestamp = date('Y-m-d H:i:s');
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
file_put_contents($logFile, "[$timestamp] Sync airport fares request received\n", FILE_APPEND);

try {
    // First make sure database tables exist
    ensureDatabaseTables();
    
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Step 1: Make sure all vehicles have entries in the airport_transfer_fares table
    $vehicles = [];
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $result = $conn->query($vehiclesQuery);
    
    if (!$result) {
        throw new Exception("Failed to fetch vehicles: " . $conn->error);
    }
    
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['vehicle_id'];
        $vehicles[$vehicleId] = $row;
        
        // Check if this vehicle exists in airport_transfer_fares
        $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $checkResult = $stmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Create default entry
            $insertQuery = "
                INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param("s", $vehicleId);
            $insertStmt->execute();
            
            file_put_contents($logFile, "[$timestamp] Created default airport fare entry for $vehicleId\n", FILE_APPEND);
        }
        
        // Check if this vehicle exists in vehicle_pricing with trip_type='airport'
        $checkQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $checkResult = $stmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Create default entry
            $insertQuery = "
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, base_fare, price_per_km,
                airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                airport_extra_km_charge)
                VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param("s", $vehicleId);
            $insertStmt->execute();
            
            file_put_contents($logFile, "[$timestamp] Created default vehicle_pricing entry for $vehicleId\n", FILE_APPEND);
        }
    }
    
    // Step 2: Sync data from airport_transfer_fares to vehicle_pricing
    $syncQuery = "
        UPDATE vehicle_pricing vp
        JOIN airport_transfer_fares atf ON vp.vehicle_id = atf.vehicle_id
        SET 
            vp.airport_base_price = atf.base_price,
            vp.airport_price_per_km = atf.price_per_km,
            vp.airport_pickup_price = atf.pickup_price,
            vp.airport_drop_price = atf.drop_price,
            vp.airport_tier1_price = atf.tier1_price,
            vp.airport_tier2_price = atf.tier2_price,
            vp.airport_tier3_price = atf.tier3_price,
            vp.airport_tier4_price = atf.tier4_price,
            vp.airport_extra_km_charge = atf.extra_km_charge,
            vp.updated_at = NOW()
        WHERE vp.trip_type = 'airport'
    ";
    
    $result = $conn->query($syncQuery);
    if (!$result) {
        throw new Exception("Failed to sync airport_transfer_fares to vehicle_pricing: " . $conn->error);
    }
    
    // Step 3: Also sync from vehicle_pricing to airport_transfer_fares for any missing entries
    $reverseSyncQuery = "
        UPDATE airport_transfer_fares atf
        JOIN vehicle_pricing vp ON atf.vehicle_id = vp.vehicle_id
        SET 
            atf.base_price = CASE WHEN atf.base_price = 0 THEN vp.airport_base_price ELSE atf.base_price END,
            atf.price_per_km = CASE WHEN atf.price_per_km = 0 THEN vp.airport_price_per_km ELSE atf.price_per_km END,
            atf.pickup_price = CASE WHEN atf.pickup_price = 0 THEN vp.airport_pickup_price ELSE atf.pickup_price END,
            atf.drop_price = CASE WHEN atf.drop_price = 0 THEN vp.airport_drop_price ELSE atf.drop_price END,
            atf.tier1_price = CASE WHEN atf.tier1_price = 0 THEN vp.airport_tier1_price ELSE atf.tier1_price END,
            atf.tier2_price = CASE WHEN atf.tier2_price = 0 THEN vp.airport_tier2_price ELSE atf.tier2_price END,
            atf.tier3_price = CASE WHEN atf.tier3_price = 0 THEN vp.airport_tier3_price ELSE atf.tier3_price END,
            atf.tier4_price = CASE WHEN atf.tier4_price = 0 THEN vp.airport_tier4_price ELSE atf.tier4_price END,
            atf.extra_km_charge = CASE WHEN atf.extra_km_charge = 0 THEN vp.airport_extra_km_charge ELSE atf.extra_km_charge END,
            atf.updated_at = NOW()
        WHERE vp.trip_type = 'airport'
    ";
    
    $result = $conn->query($reverseSyncQuery);
    if (!$result) {
        throw new Exception("Failed to sync vehicle_pricing to airport_transfer_fares: " . $conn->error);
    }
    
    // Cleanup - ensure vehicle IDs are consistent
    $updateQuery = "
        UPDATE airport_transfer_fares atf
        JOIN vehicles v ON atf.vehicle_id = v.id
        SET atf.vehicle_id = v.vehicle_id
        WHERE atf.vehicle_id != v.vehicle_id
    ";
    
    $conn->query($updateQuery);
    
    // Return successful response
    sendSuccessResponse([
        'vehicleCount' => count($vehicles),
        'synced' => true,
        'vehicles' => array_keys($vehicles)
    ], 'Airport fares successfully synchronized');
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse('Failed to sync airport fares: ' . $e->getMessage());
}
