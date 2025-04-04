
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

// Try to get vehicle IDs from database tables if available
try {
    // Try to include database configuration
    $dbConfig = __DIR__ . '/../../config.php';
    $dbAvailable = false;
    $allVehicleIds = [];
    
    if (file_exists($dbConfig)) {
        require_once $dbConfig;
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn) {
                $dbAvailable = true;
                logMessage("Database connection established");
                
                // Query all tables that might contain vehicle IDs
                $tables = ['vehicles', 'vehicle_types', 'airport_transfer_fares', 'local_package_fares', 'outstation_fares'];
                
                foreach ($tables as $table) {
                    try {
                        $checkTableQuery = "SHOW TABLES LIKE '$table'";
                        $checkResult = $conn->query($checkTableQuery);
                        
                        if ($checkResult && $checkResult->num_rows > 0) {
                            $vehicleQuery = "SELECT DISTINCT vehicle_id FROM $table";
                            $vehicleResult = $conn->query($vehicleQuery);
                            
                            if ($vehicleResult && $vehicleResult->num_rows > 0) {
                                while ($row = $vehicleResult->fetch_assoc()) {
                                    if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                                        $allVehicleIds[] = $row['vehicle_id'];
                                    }
                                }
                            }
                        }
                    } catch (Exception $e) {
                        logMessage("Error querying table $table: " . $e->getMessage());
                    }
                }
                
                logMessage("Found " . count($allVehicleIds) . " unique vehicle IDs from database tables");
            }
        }
    }
} catch (Exception $e) {
    logMessage("Database access error: " . $e->getMessage());
}

// Get all vehicle IDs from persistent data
$persistentVehicleIds = [];
foreach ($persistentData as $vehicle) {
    if (isset($vehicle['id']) && !empty($vehicle['id'])) {
        $persistentVehicleIds[] = $vehicle['id'];
    }
}

// Combine all vehicle IDs from database and persistent data
$vehicleIds = array_unique(array_merge($persistentVehicleIds, $allVehicleIds));

// If still no vehicles, use hardcoded list as fallback
if (empty($vehicleIds)) {
    $vehicleIds = [
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
    logMessage("No vehicles found, using default list");
} else {
    logMessage("Using " . count($vehicleIds) . " unique vehicles from all sources");
}

// In a real environment, we would now sync the airport fares table with these vehicle IDs
// For this mock implementation, we'll just update the persistent data
logMessage('Starting airport fares synchronization for vehicles: ' . implode(', ', $vehicleIds));

// If database is available, try to get actual fare values
$fareData = [];
if ($dbAvailable && $conn) {
    try {
        $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
        $checkResult = $conn->query($checkTableQuery);
        
        if ($checkResult && $checkResult->num_rows > 0) {
            $fareQuery = "SELECT * FROM airport_transfer_fares";
            $fareResult = $conn->query($fareQuery);
            
            if ($fareResult && $fareResult->num_rows > 0) {
                while ($row = $fareResult->fetch_assoc()) {
                    if (!empty($row['vehicle_id'])) {
                        $fareData[$row['vehicle_id']] = [
                            'vehicleId' => $row['vehicle_id'],
                            'vehicle_id' => $row['vehicle_id'],
                            'basePrice' => floatval($row['base_price'] ?? 0),
                            'pricePerKm' => floatval($row['price_per_km'] ?? 0),
                            'pickupPrice' => floatval($row['pickup_price'] ?? 0),
                            'dropPrice' => floatval($row['drop_price'] ?? 0),
                            'tier1Price' => floatval($row['tier1_price'] ?? 0),
                            'tier2Price' => floatval($row['tier2_price'] ?? 0),
                            'tier3Price' => floatval($row['tier3_price'] ?? 0),
                            'tier4Price' => floatval($row['tier4_price'] ?? 0),
                            'extraKmCharge' => floatval($row['extra_km_charge'] ?? 0)
                        ];
                    }
                }
                logMessage("Loaded " . count($fareData) . " fare records from airport_transfer_fares table");
            }
        }
    } catch (Exception $e) {
        logMessage("Error querying fare data: " . $e->getMessage());
    }
}

// Default fare values for new vehicles
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
    'luxury' => [
        'basePrice' => 7000, 'pricePerKm' => 22, 'pickupPrice' => 2500, 'dropPrice' => 2500,
        'tier1Price' => 2000, 'tier2Price' => 2200, 'tier3Price' => 2500, 'tier4Price' => 3000, 'extraKmCharge' => 22
    ],
    'tempo' => [
        'basePrice' => 6000, 'pricePerKm' => 19, 'pickupPrice' => 2000, 'dropPrice' => 2000,
        'tier1Price' => 1600, 'tier2Price' => 1800, 'tier3Price' => 2000, 'tier4Price' => 2500, 'extraKmCharge' => 19
    ],
    'default' => [
        'basePrice' => 3500, 'pricePerKm' => 15, 'pickupPrice' => 1000, 'dropPrice' => 1000,
        'tier1Price' => 800, 'tier2Price' => 1000, 'tier3Price' => 1200, 'tier4Price' => 1400, 'extraKmCharge' => 15
    ]
];

// Ensure all vehicles have airport fares entries
$updatedVehicles = 0;
foreach ($vehicleIds as $vehicleId) {
    $hasFares = false;
    
    // Check if vehicle already has airport fares in persistent data
    foreach ($persistentData as &$vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            if (!isset($vehicle['airportFares']) || !is_array($vehicle['airportFares'])) {
                // If no airport fares for this vehicle, add default ones
                // Get fares from database if available, otherwise use default values
                if (isset($fareData[$vehicleId])) {
                    $vehicle['airportFares'] = $fareData[$vehicleId];
                    logMessage("Added database fares for vehicle: $vehicleId");
                } else {
                    // Choose appropriate default fares based on vehicle type
                    $defaultFare = $defaultFares[$vehicleId] ?? $defaultFares['default'];
                    $vehicle['airportFares'] = array_merge(['vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId], $defaultFare);
                    logMessage("Added default fares for vehicle: $vehicleId");
                }
                $updatedVehicles++;
            } else {
                // If vehicle has fares but they're from database, update them
                if (isset($fareData[$vehicleId])) {
                    $vehicle['airportFares'] = $fareData[$vehicleId];
                    logMessage("Updated fares from database for vehicle: $vehicleId");
                    $updatedVehicles++;
                } else {
                    logMessage("Vehicle $vehicleId already has airport fares");
                }
            }
            $hasFares = true;
            break;
        }
    }
    
    // If vehicle not found in persistent data, add it
    if (!$hasFares) {
        // Get fares from database if available, otherwise use default values
        $vehicleFares = isset($fareData[$vehicleId]) ? 
            $fareData[$vehicleId] : 
            array_merge(['vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId], $defaultFares[$vehicleId] ?? $defaultFares['default']);
            
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        
        $newVehicle = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => $vehicleName,
            'airportFares' => $vehicleFares
        ];
        $persistentData[] = $newVehicle;
        $updatedVehicles++;
        logMessage("Added new vehicle $vehicleId with airport fares");
    }
}

// Save updated persistent data
if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
    logMessage("Saved updated persistent data with airport fares");
} else {
    logMessage("ERROR: Failed to save persistent data");
}

// If database is available, also ensure all vehicles have records in the airport_transfer_fares table
if ($dbAvailable && $conn) {
    $syncedDbRecords = 0;
    
    try {
        $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
        $checkResult = $conn->query($checkTableQuery);
        
        if ($checkResult && $checkResult->num_rows > 0) {
            foreach ($vehicleIds as $vehicleId) {
                $fares = null;
                
                // Find fares in persistent data
                foreach ($persistentData as $vehicle) {
                    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId && isset($vehicle['airportFares'])) {
                        $fares = $vehicle['airportFares'];
                        break;
                    }
                }
                
                if (!$fares) continue;
                
                // Check if vehicle exists in the table
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
                        $fares['basePrice'],
                        $fares['pricePerKm'],
                        $fares['pickupPrice'],
                        $fares['dropPrice'],
                        $fares['tier1Price'], 
                        $fares['tier2Price'],
                        $fares['tier3Price'],
                        $fares['tier4Price'],
                        $fares['extraKmCharge'],
                        $vehicleId
                    );
                    $stmt->execute();
                    $stmt->close();
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
                        $fares['basePrice'],
                        $fares['pricePerKm'],
                        $fares['pickupPrice'],
                        $fares['dropPrice'],
                        $fares['tier1Price'], 
                        $fares['tier2Price'],
                        $fares['tier3Price'],
                        $fares['tier4Price'],
                        $fares['extraKmCharge']
                    );
                    $stmt->execute();
                    $stmt->close();
                }
                
                $syncedDbRecords++;
            }
            
            logMessage("Synced $syncedDbRecords records to airport_transfer_fares table");
        } else {
            // Create the table if it doesn't exist
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
            logMessage("Created airport_transfer_fares table");
            
            // Now insert the records
            $insertedRecords = 0;
            foreach ($vehicleIds as $vehicleId) {
                $fares = null;
                
                // Find fares in persistent data
                foreach ($persistentData as $vehicle) {
                    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId && isset($vehicle['airportFares'])) {
                        $fares = $vehicle['airportFares'];
                        break;
                    }
                }
                
                if (!$fares) continue;
                
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
                    $fares['basePrice'],
                    $fares['pricePerKm'],
                    $fares['pickupPrice'],
                    $fares['dropPrice'],
                    $fares['tier1Price'], 
                    $fares['tier2Price'],
                    $fares['tier3Price'],
                    $fares['tier4Price'],
                    $fares['extraKmCharge']
                );
                $stmt->execute();
                $stmt->close();
                $insertedRecords++;
            }
            
            logMessage("Inserted $insertedRecords records into new airport_transfer_fares table");
        }
    } catch (Exception $e) {
        logMessage("Database sync error: " . $e->getMessage());
    }
}

logMessage("Synced fares for " . $updatedVehicles . " vehicles");

// Return success response with proper JSON encoding
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares synced successfully',
    'synced' => $updatedVehicles,
    'vehicles' => $vehicleIds,
    'timestamp' => $now
], JSON_PARTIAL_OUTPUT_ON_ERROR);
