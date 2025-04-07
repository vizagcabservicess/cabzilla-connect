
<?php
/**
 * Sync Airport Fares - Synchronizes data between vehicle tables and fare tables
 * This ensures all vehicles have corresponding fare entries
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log function to help with debugging
function logMessage($message) {
    global $logDir, $logFile, $timestamp;
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Run the database setup to ensure all tables exist
require_once __DIR__ . '/db_setup.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection successful");
    
    // Initialize counters for reporting
    $synced_count = 0;
    $errors = [];
    $vehicles_synced = [];
    
    // First, get all vehicles from the vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Failed to query vehicles: " . $conn->error);
    }
    
    if ($vehiclesResult->num_rows > 0) {
        logMessage("Found {$vehiclesResult->num_rows} active vehicles");
        
        // Loop through all vehicles and ensure they have entries in fare tables
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $vehicle['vehicle_id'] ?? $vehicle['id'];
            
            if (empty($vehicleId)) {
                continue;
            }
            
            // Ensure this vehicle has an entry in airport_transfer_fares
            $checkAirportQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
            $checkAirportStmt = $conn->prepare($checkAirportQuery);
            
            if (!$checkAirportStmt) {
                $errors[] = "Failed to prepare check statement for vehicle $vehicleId: " . $conn->error;
                continue;
            }
            
            $checkAirportStmt->bind_param("s", $vehicleId);
            $checkAirportStmt->execute();
            $checkAirportResult = $checkAirportStmt->get_result();
            
            // If no entry exists, insert a default one
            if ($checkAirportResult->num_rows === 0) {
                $insertAirportQuery = "
                    INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ";
                
                $insertAirportStmt = $conn->prepare($insertAirportQuery);
                
                if (!$insertAirportStmt) {
                    $errors[] = "Failed to prepare insert statement for vehicle $vehicleId: " . $conn->error;
                    continue;
                }
                
                $insertAirportStmt->bind_param("s", $vehicleId);
                
                if ($insertAirportStmt->execute()) {
                    logMessage("Added default airport fare entry for vehicle: $vehicleId");
                    $synced_count++;
                    $vehicles_synced[] = $vehicleId;
                } else {
                    $errors[] = "Failed to insert airport fare for vehicle $vehicleId: " . $insertAirportStmt->error;
                }
            } else {
                logMessage("Airport fare entry already exists for vehicle: $vehicleId");
            }
            
            // Now ensure this vehicle has an entry in vehicle_pricing for airport trip type
            $checkVPQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
            $checkVPStmt = $conn->prepare($checkVPQuery);
            
            if (!$checkVPStmt) {
                $errors[] = "Failed to prepare check VP statement for vehicle $vehicleId: " . $conn->error;
                continue;
            }
            
            $checkVPStmt->bind_param("s", $vehicleId);
            $checkVPStmt->execute();
            $checkVPResult = $checkVPStmt->get_result();
            
            // If no entry exists, insert a default one
            if ($checkVPResult->num_rows === 0) {
                $insertVPQuery = "
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, airport_base_price, airport_price_per_km, 
                    airport_pickup_price, airport_drop_price, airport_tier1_price, 
                    airport_tier2_price, airport_tier3_price, airport_tier4_price,
                    airport_extra_km_charge)
                    VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ";
                
                $insertVPStmt = $conn->prepare($insertVPQuery);
                
                if (!$insertVPStmt) {
                    $errors[] = "Failed to prepare insert VP statement for vehicle $vehicleId: " . $conn->error;
                    continue;
                }
                
                $insertVPStmt->bind_param("s", $vehicleId);
                
                if ($insertVPStmt->execute()) {
                    logMessage("Added default vehicle_pricing entry for vehicle: $vehicleId");
                    if (!in_array($vehicleId, $vehicles_synced)) {
                        $synced_count++;
                        $vehicles_synced[] = $vehicleId;
                    }
                } else {
                    $errors[] = "Failed to insert vehicle_pricing for vehicle $vehicleId: " . $insertVPStmt->error;
                }
            } else {
                logMessage("Vehicle pricing entry already exists for vehicle: $vehicleId");
            }
        }
    } else {
        logMessage("No active vehicles found in the database");
    }
    
    // Second step: Sync data between tables
    // From airport_transfer_fares to vehicle_pricing
    $syncToVPQuery = "
        INSERT INTO vehicle_pricing (
            vehicle_id, trip_type, airport_base_price, airport_price_per_km, 
            airport_pickup_price, airport_drop_price, airport_tier1_price,
            airport_tier2_price, airport_tier3_price, airport_tier4_price,
            airport_extra_km_charge, updated_at
        )
        SELECT 
            atf.vehicle_id,
            'airport',
            atf.base_price,
            atf.price_per_km,
            atf.pickup_price,
            atf.drop_price,
            atf.tier1_price,
            atf.tier2_price,
            atf.tier3_price,
            atf.tier4_price,
            atf.extra_km_charge,
            NOW()
        FROM 
            airport_transfer_fares atf
        ON DUPLICATE KEY UPDATE
            airport_base_price = atf.base_price,
            airport_price_per_km = atf.price_per_km,
            airport_pickup_price = atf.pickup_price,
            airport_drop_price = atf.drop_price,
            airport_tier1_price = atf.tier1_price,
            airport_tier2_price = atf.tier2_price,
            airport_tier3_price = atf.tier3_price,
            airport_tier4_price = atf.tier4_price,
            airport_extra_km_charge = atf.extra_km_charge,
            updated_at = NOW()
    ";
    
    if ($conn->query($syncToVPQuery)) {
        logMessage("Synced data from airport_transfer_fares to vehicle_pricing");
    } else {
        $errors[] = "Failed to sync from airport_transfer_fares to vehicle_pricing: " . $conn->error;
    }
    
    // From vehicle_pricing to airport_transfer_fares
    $syncFromVPQuery = "
        INSERT INTO airport_transfer_fares (
            vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
            tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at
        )
        SELECT 
            vp.vehicle_id,
            vp.airport_base_price,
            vp.airport_price_per_km,
            vp.airport_pickup_price,
            vp.airport_drop_price,
            vp.airport_tier1_price,
            vp.airport_tier2_price,
            vp.airport_tier3_price,
            vp.airport_tier4_price,
            vp.airport_extra_km_charge,
            NOW()
        FROM 
            vehicle_pricing vp
        WHERE
            vp.trip_type = 'airport'
        ON DUPLICATE KEY UPDATE
            base_price = vp.airport_base_price,
            price_per_km = vp.airport_price_per_km,
            pickup_price = vp.airport_pickup_price,
            drop_price = vp.airport_drop_price,
            tier1_price = vp.airport_tier1_price,
            tier2_price = vp.airport_tier2_price,
            tier3_price = vp.airport_tier3_price,
            tier4_price = vp.airport_tier4_price,
            extra_km_charge = vp.airport_extra_km_charge,
            updated_at = NOW()
    ";
    
    if ($conn->query($syncFromVPQuery)) {
        logMessage("Synced data from vehicle_pricing to airport_transfer_fares");
    } else {
        $errors[] = "Failed to sync from vehicle_pricing to airport_transfer_fares: " . $conn->error;
    }
    
    // Return success response
    sendSuccessResponse([
        'vehicles_synced' => count($vehicles_synced),
        'vehicles' => $vehicles_synced,
        'errors' => $errors
    ], 'Airport fares synchronized successfully');
    
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    logMessage("Trace: " . $e->getTraceAsString());
    
    sendErrorResponse($e->getMessage(), [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
