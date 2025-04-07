
<?php
/**
 * This script synchronizes data between airport_transfer_fares and vehicle_pricing tables
 * It handles different column name variations between tables
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Debug-Endpoint: sync-airport-fares');

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

// Run the database setup to ensure all tables exist
include_once __DIR__ . '/db_setup.php';

try {
    // Prevent multiple executions within a short time window (anti-loop protection)
    $lockFile = $logDir . '/sync_airport_fares.lock';
    $now = time();

    if (file_exists($lockFile)) {
        $lastRun = (int)file_get_contents($lockFile);
        if ($now - $lastRun < 10) { // 10-second cooldown
            logMessage('Sync operation throttled - last run was less than 10 seconds ago');
            
            echo json_encode([
                'status' => 'throttled',
                'message' => 'Airport fares sync was recently performed. Please wait at least 10 seconds between syncs.',
                'lastSync' => $lastRun,
                'nextAvailable' => $lastRun + 10,
                'currentTime' => $now
            ]);
            exit;
        }
    }

    // Update lock file with current timestamp
    file_put_contents($lockFile, $now);
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection successful");
    
    // Check if airport_transfer_fares table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $airportFaresTableExists = $checkTableStmt && $checkTableStmt->num_rows > 0;
    
    // If airport_transfer_fares table doesn't exist, create it
    if (!$airportFaresTableExists) {
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
        
        logMessage("Created airport_transfer_fares table");
    }
    
    // Also ensure vehicle_pricing table exists
    $checkVehiclePricingStmt = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $vehiclePricingExists = $checkVehiclePricingStmt && $checkVehiclePricingStmt->num_rows > 0;
    
    if (!$vehiclePricingExists) {
        $createVehiclePricingSql = "
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL,
                airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVehiclePricingSql)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        logMessage("Created vehicle_pricing table");
    }
    
    // Initialize vehicles array to track synced vehicles
    $vehicles = [];
    $syncedCount = 0;
    
    // First, sync from vehicle_pricing to airport_transfer_fares (if data exists in vehicle_pricing)
    logMessage("Syncing data from vehicle_pricing to airport_transfer_fares");
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
    
    $conn->query($syncFromVPQuery);
    logMessage("Synced from vehicle_pricing to airport_transfer_fares");
    
    // Now, sync from airport_transfer_fares to vehicle_pricing
    logMessage("Syncing data from airport_transfer_fares to vehicle_pricing");
    $syncToVPQuery = "
        INSERT INTO vehicle_pricing (
            vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, 
            airport_drop_price, airport_tier1_price, airport_tier2_price, airport_tier3_price, 
            airport_tier4_price, airport_extra_km_charge, updated_at
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
    
    $conn->query($syncToVPQuery);
    logMessage("Synced from airport_transfer_fares to vehicle_pricing");
    
    // Get vehicles from vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if ($vehiclesResult && $vehiclesResult->num_rows > 0) {
        while ($row = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $row['vehicle_id'] ?? $row['id'];
            if (!empty($vehicleId)) {
                $vehicles[] = $vehicleId;
                
                // Insert default values if no data exists in airport_transfer_fares
                $stmt = $conn->prepare("
                    INSERT IGNORE INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
                    VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
                ");
                
                if (!$stmt) {
                    logMessage("Prepare statement failed for vehicle $vehicleId: " . $conn->error);
                    continue;
                }
                
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                
                if ($stmt->affected_rows > 0) {
                    $syncedCount++;
                    logMessage("Added default airport fare for vehicle: $vehicleId");
                }
                
                // Insert default values if no data exists in vehicle_pricing
                $vpStmt = $conn->prepare("
                    INSERT IGNORE INTO vehicle_pricing 
                    (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price, 
                    airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                    airport_extra_km_charge, updated_at)
                    VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
                ");
                
                if (!$vpStmt) {
                    logMessage("Prepare vehicle_pricing statement failed for vehicle $vehicleId: " . $conn->error);
                    continue;
                }
                
                $vpStmt->bind_param("s", $vehicleId);
                $vpStmt->execute();
                
                if ($vpStmt->affected_rows > 0) {
                    logMessage("Added default vehicle_pricing airport data for vehicle: $vehicleId");
                }
            }
        }
    } else {
        logMessage("No vehicles found in database or query failed: " . $conn->error);
        
        // Fallback to hardcoded vehicles if database query failed
        $defaultVehicles = ['sedan', 'ertiga', 'innova_crysta', 'luxury', 'tempo_traveller'];
        
        // Ensure these default vehicles exist in the vehicles table
        foreach ($defaultVehicles as $vehicleId) {
            $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
            $vehicles[] = $vehicleId;
            
            $checkVehicle = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ? OR id = ?");
            if (!$checkVehicle) {
                logMessage("Prepare check statement failed for vehicle $vehicleId: " . $conn->error);
                continue;
            }
            
            $checkVehicle->bind_param("ss", $vehicleId, $vehicleId);
            $checkVehicle->execute();
            $checkResult = $checkVehicle->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Create vehicle
                $insertVehicle = $conn->prepare("INSERT INTO vehicles (vehicle_id, name, is_active) VALUES (?, ?, 1)");
                if (!$insertVehicle) {
                    logMessage("Prepare insert statement failed for vehicle $vehicleId: " . $conn->error);
                    continue;
                }
                
                $insertVehicle->bind_param("ss", $vehicleId, $vehicleName);
                $insertVehicle->execute();
                logMessage("Created missing vehicle: $vehicleId");
            }
            
            // Insert default airport fare values if they don't exist
            $insertFare = $conn->prepare("
                INSERT IGNORE INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
            ");
            
            if (!$insertFare) {
                logMessage("Prepare insert fares statement failed for vehicle $vehicleId: " . $conn->error);
                continue;
            }
            
            $insertFare->bind_param("s", $vehicleId);
            $insertFare->execute();
            
            if ($insertFare->affected_rows > 0) {
                $syncedCount++;
                logMessage("Added default airport fare for fallback vehicle: $vehicleId");
            }
            
            // Sync with vehicle_pricing for fallback vehicles
            $syncFallback = $conn->prepare("
                INSERT IGNORE INTO vehicle_pricing 
                (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price, 
                airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                airport_extra_km_charge, updated_at)
                VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
            ");
            
            if (!$syncFallback) {
                logMessage("Prepare sync fallback statement failed for vehicle $vehicleId: " . $conn->error);
                continue;
            }
            
            $syncFallback->bind_param("s", $vehicleId);
            $syncFallback->execute();
        }
    }
    
    // Close database connection
    $conn->close();
    
    logMessage("Synced airport fares for " . count($vehicles) . " vehicles");
    
    // Return success response with proper JSON encoding
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fares synced successfully',
        'synced' => $syncedCount,
        'vehicles' => $vehicles,
        'timestamp' => $now
    ]);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
