
<?php
/**
 * This script synchronizes data between airport_transfer_fares and vehicle_pricing tables
 * It handles different column name variations between tables and ensures all vehicle types
 * have default fare values
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, X-Force-Creation');
header('Content-Type: application/json');

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

// Log function to help with debugging
function logMessage($message) {
    global $logDir;
    $logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Prevent multiple executions within a short time window (anti-loop protection)
$lockFile = $logDir . '/sync_airport_fares.lock';
$now = time();

if (file_exists($lockFile)) {
    $lastRun = (int)file_get_contents($lockFile);
    if ($now - $lastRun < 30) { // 30-second cooldown
        logMessage('Sync operation throttled - last run was less than 30 seconds ago');
        
        echo json_encode([
            'status' => 'throttled',
            'message' => 'Airport fares sync was recently performed. Please wait at least 30 seconds between syncs.',
            'lastSync' => $lastRun,
            'nextAvailable' => $lastRun + 30,
            'currentTime' => $now
        ]);
        exit;
    }
}

// Update lock file with current timestamp
file_put_contents($lockFile, $now);

// Check if force creation is requested
$forceCreation = isset($_SERVER['HTTP_X_FORCE_CREATION']) && $_SERVER['HTTP_X_FORCE_CREATION'] === 'true';
logMessage('Force creation flag: ' . ($forceCreation ? 'true' : 'false'));

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Load persistent vehicle data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                $persistentData = [];
                logMessage("Error: Persistent data is not an array");
            } else {
                logMessage("Loaded " . count($persistentData) . " vehicles from persistent data");
            }
        } catch (Exception $e) {
            logMessage("Error parsing persistent data: " . $e->getMessage());
            $persistentData = [];
        }
    }
}

// Default fare values for all vehicle types
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

// List of required vehicle types that should always have entries
$requiredVehicleIds = [
    'sedan',
    'ertiga',
    'innova_crysta',
    'innova_hycross',
    'dzire_cng',
    'luxury',
    'tempo',
    'tempo_traveller',
    'toyota'
];

// Process data and synchronize
try {
    // Include database configuration
    require_once __DIR__ . '/../../config.php';
    
    if (!function_exists('getDbConnection')) {
        throw new Exception("Database configuration not found or incomplete");
    }
    
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection established");
    
    // Ensure airport_transfer_fares table exists
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
    
    // Collect all vehicle IDs from various sources
    $allVehicleIds = [];
    
    // 1. From required list
    foreach ($requiredVehicleIds as $vehicleId) {
        if (!in_array($vehicleId, $allVehicleIds)) {
            $allVehicleIds[] = $vehicleId;
        }
    }
    
    // 2. From existing airport_transfer_fares table
    $fareQuery = "SELECT DISTINCT vehicle_id FROM airport_transfer_fares";
    $fareResult = $conn->query($fareQuery);
    if ($fareResult && $fareResult->num_rows > 0) {
        while ($row = $fareResult->fetch_assoc()) {
            if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                $allVehicleIds[] = $row['vehicle_id'];
            }
        }
    }
    
    // 3. From vehicles table
    $vehicleQuery = "SELECT vehicle_id FROM vehicles WHERE vehicle_id IS NOT NULL AND vehicle_id != ''";
    $vehicleResult = $conn->query($vehicleQuery);
    if ($vehicleResult && $vehicleResult->num_rows > 0) {
        while ($row = $vehicleResult->fetch_assoc()) {
            if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                $allVehicleIds[] = $row['vehicle_id'];
            }
        }
    }
    
    // 4. Also check based on ID column for backward compatibility
    $idQuery = "SELECT id FROM vehicles WHERE id IS NOT NULL AND id != ''";
    $idResult = $conn->query($idQuery);
    if ($idResult && $idResult->num_rows > 0) {
        while ($row = $idResult->fetch_assoc()) {
            if (!empty($row['id']) && !in_array($row['id'], $allVehicleIds)) {
                $allVehicleIds[] = $row['id'];
            }
        }
    }
    
    // 5. Check in vehicle_types as well
    if ($conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0) {
        $typeQuery = "SELECT vehicle_id FROM vehicle_types WHERE vehicle_id IS NOT NULL AND vehicle_id != ''";
        $typeResult = $conn->query($typeQuery);
        if ($typeResult && $typeResult->num_rows > 0) {
            while ($row = $typeResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    logMessage("Found " . count($allVehicleIds) . " vehicle IDs to process");
    
    // Process each vehicle ID
    $processed = 0;
    $created = 0;
    $updated = 0;
    $skipped = 0;
    
    foreach ($allVehicleIds as $vehicleId) {
        // Skip empty IDs
        if (empty($vehicleId)) {
            continue;
        }
        
        // Check if vehicle exists in airport_transfer_fares
        $checkVehicleSql = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkVehicleSql);
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0 || $forceCreation) {
            // Vehicle doesn't exist, create it with default values
            $defaultKey = isset($defaultFares[$vehicleId]) ? $vehicleId : 'default';
            $defaults = $defaultFares[$defaultKey];
            
            // If force creation and vehicle already exists, update with defaults if needed
            if ($checkResult->num_rows > 0 && $forceCreation) {
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
                
                $updateStmt = $conn->prepare($updateSql);
                $basePrice = $defaults['basePrice'];
                $pricePerKm = $defaults['pricePerKm'];
                $pickupPrice = $defaults['pickupPrice'];
                $dropPrice = $defaults['dropPrice'];
                $tier1Price = $defaults['tier1Price'];
                $tier2Price = $defaults['tier2Price'];
                $tier3Price = $defaults['tier3Price'];
                $tier4Price = $defaults['tier4Price'];
                $extraKmCharge = $defaults['extraKmCharge'];
                
                $updateStmt->bind_param(
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
                
                if ($updateStmt->execute()) {
                    $updated++;
                    logMessage("Updated airport fare entry for $vehicleId with default values");
                } else {
                    logMessage("Failed to update airport fare entry for $vehicleId: " . $updateStmt->error);
                }
            } else {
                // Insert new entry with default values
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
                        extra_km_charge, 
                        created_at, 
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ";
                
                $insertStmt = $conn->prepare($insertSql);
                $basePrice = $defaults['basePrice'];
                $pricePerKm = $defaults['pricePerKm'];
                $pickupPrice = $defaults['pickupPrice'];
                $dropPrice = $defaults['dropPrice'];
                $tier1Price = $defaults['tier1Price'];
                $tier2Price = $defaults['tier2Price'];
                $tier3Price = $defaults['tier3Price'];
                $tier4Price = $defaults['tier4Price'];
                $extraKmCharge = $defaults['extraKmCharge'];
                
                $insertStmt->bind_param(
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
                
                if ($insertStmt->execute()) {
                    $created++;
                    logMessage("Created new airport fare entry for $vehicleId with default values");
                } else {
                    logMessage("Failed to create airport fare entry for $vehicleId: " . $insertStmt->error);
                }
            }
        } else {
            $skipped++;
            logMessage("Airport fare entry for $vehicleId already exists - skipped");
        }
        
        $processed++;
    }
    
    // Return success response with statistics
    echo json_encode([
        'status' => 'success',
        'message' => "Airport fares sync completed successfully",
        'stats' => [
            'processed' => $processed,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'vehicleIds' => $allVehicleIds
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    logMessage("Airport fares sync completed successfully: processed=$processed, created=$created, updated=$updated, skipped=$skipped");
    
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
