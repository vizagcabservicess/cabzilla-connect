
<?php
/**
 * Sync Airport Fares API
 * Syncs data between vehicles, vehicle_pricing, and airport_transfer_fares tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Sync airport fares request received\n", FILE_APPEND);

// Initialize tables to ensure they exist
ensureDatabaseTables();

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for this connection - CRITICAL FIX
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    $conn->query("SET CHARACTER SET utf8mb4");
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // First sync: Get all vehicles from vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Failed to query vehicles: " . $conn->error);
    }
    
    $syncCount = 0;
    $vehicles = [];
    
    // Begin transaction for all sync operations
    $conn->begin_transaction();
    
    try {
        // Phase 1: Collect all vehicles
        while ($row = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $row['vehicle_id'];
            $vehicles[] = $vehicleId;
            
            // Insert default entry into airport_transfer_fares if it doesn't exist
            $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
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
                
                $syncCount++;
                file_put_contents($logFile, "[$timestamp] Created default airport fare entry for vehicle: $vehicleId\n", FILE_APPEND);
            }
            
            // Ensure entry exists in vehicle_pricing
            $checkVPQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
            $checkVPStmt = $conn->prepare($checkVPQuery);
            $checkVPStmt->bind_param("s", $vehicleId);
            $checkVPStmt->execute();
            $checkVPResult = $checkVPStmt->get_result();
            
            if ($checkVPResult->num_rows === 0) {
                // Create default entry
                $insertVPQuery = "
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, 
                    airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                    airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, airport_extra_km_charge)
                    VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ";
                
                $insertVPStmt = $conn->prepare($insertVPQuery);
                $insertVPStmt->bind_param("s", $vehicleId);
                $insertVPStmt->execute();
                
                $syncCount++;
                file_put_contents($logFile, "[$timestamp] Created default vehicle_pricing entry for airport trip type and vehicle: $vehicleId\n", FILE_APPEND);
            }
        }
        
        // Phase 2: Sync from vehicle_pricing to airport_transfer_fares (if data exists in vehicle_pricing but not in airport_transfer_fares)
        $syncVPQuery = "
            UPDATE airport_transfer_fares atf
            JOIN vehicle_pricing vp ON atf.vehicle_id = vp.vehicle_id AND vp.trip_type = 'airport'
            SET 
                atf.base_price = vp.airport_base_price,
                atf.price_per_km = vp.airport_price_per_km,
                atf.pickup_price = vp.airport_pickup_price,
                atf.drop_price = vp.airport_drop_price,
                atf.tier1_price = vp.airport_tier1_price,
                atf.tier2_price = vp.airport_tier2_price,
                atf.tier3_price = vp.airport_tier3_price,
                atf.tier4_price = vp.airport_tier4_price,
                atf.extra_km_charge = vp.airport_extra_km_charge,
                atf.updated_at = NOW()
            WHERE 
                (atf.base_price = 0 AND vp.airport_base_price > 0) OR
                (atf.price_per_km = 0 AND vp.airport_price_per_km > 0) OR
                (atf.pickup_price = 0 AND vp.airport_pickup_price > 0) OR
                (atf.drop_price = 0 AND vp.airport_drop_price > 0) OR
                (atf.tier1_price = 0 AND vp.airport_tier1_price > 0) OR
                (atf.tier2_price = 0 AND vp.airport_tier2_price > 0) OR
                (atf.tier3_price = 0 AND vp.airport_tier3_price > 0) OR
                (atf.tier4_price = 0 AND vp.airport_tier4_price > 0) OR
                (atf.extra_km_charge = 0 AND vp.airport_extra_km_charge > 0)
        ";
        
        $conn->query($syncVPQuery);
        $vpSyncCount = $conn->affected_rows;
        
        if ($vpSyncCount > 0) {
            $syncCount += $vpSyncCount;
            file_put_contents($logFile, "[$timestamp] Synced $vpSyncCount records from vehicle_pricing to airport_transfer_fares\n", FILE_APPEND);
        }
        
        // Phase 3: Sync from airport_transfer_fares to vehicle_pricing
        $syncATFQuery = "
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
            WHERE 
                vp.trip_type = 'airport' AND (
                    vp.airport_base_price != atf.base_price OR
                    vp.airport_price_per_km != atf.price_per_km OR
                    vp.airport_pickup_price != atf.pickup_price OR
                    vp.airport_drop_price != atf.drop_price OR
                    vp.airport_tier1_price != atf.tier1_price OR
                    vp.airport_tier2_price != atf.tier2_price OR
                    vp.airport_tier3_price != atf.tier3_price OR
                    vp.airport_tier4_price != atf.tier4_price OR
                    vp.airport_extra_km_charge != atf.extra_km_charge
                )
        ";
        
        $conn->query($syncATFQuery);
        $atfSyncCount = $conn->affected_rows;
        
        if ($atfSyncCount > 0) {
            $syncCount += $atfSyncCount;
            file_put_contents($logFile, "[$timestamp] Synced $atfSyncCount records from airport_transfer_fares to vehicle_pricing\n", FILE_APPEND);
        }
        
        // Commit all changes
        $conn->commit();
        file_put_contents($logFile, "[$timestamp] Transaction committed successfully\n", FILE_APPEND);
        
        // Count total records in airport_transfer_fares
        $countQuery = "SELECT COUNT(*) as total FROM airport_transfer_fares";
        $countResult = $conn->query($countQuery);
        $totalCount = $countResult->fetch_assoc()['total'];
        
        // Return success response
        sendSuccessResponse([
            'syncCount' => $syncCount,
            'totalRecords' => $totalCount,
            'vehicles' => $vehicles
        ], 'Airport fares synced successfully');
        
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
