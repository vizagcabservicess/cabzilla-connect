
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
                $tables = ['vehicles', 'vehicle_types', 'airport_transfer_fares', 'local_package_fares', 'outstation_fares', 'vehicle_pricing'];
                
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
                
                // Also try to get from vehicles table with id column
                try {
                    $checkTableQuery = "SHOW TABLES LIKE 'vehicles'";
                    $checkResult = $conn->query($checkTableQuery);
                    
                    if ($checkResult && $checkResult->num_rows > 0) {
                        $vehicleQuery = "SELECT DISTINCT id FROM vehicles";
                        $vehicleResult = $conn->query($vehicleQuery);
                        
                        if ($vehicleResult && $vehicleResult->num_rows > 0) {
                            while ($row = $vehicleResult->fetch_assoc()) {
                                if (!empty($row['id']) && !in_array($row['id'], $allVehicleIds)) {
                                    $allVehicleIds[] = $row['id'];
                                }
                            }
                        }
                    }
                } catch (Exception $e) {
                    logMessage("Error querying vehicles table with id column: " . $e->getMessage());
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

// If these specific vehicle IDs aren't in our list, add them explicitly
$requiredVehicleIds = [
    'innova_hycross',
    'dzire_cng',
    'tempo_traveller',
    'toyota'
];

foreach ($requiredVehicleIds as $requiredId) {
    if (!in_array($requiredId, $vehicleIds)) {
        $vehicleIds[] = $requiredId;
        logMessage("Added required vehicle ID not found in sources: " . $requiredId);
    }
}

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

// Ensure all vehicles have airport fares entries
$updatedVehicles = 0;
foreach ($vehicleIds as $vehicleId) {
    $hasFares = false;
    
    // Check if vehicle already has airport fares in persistent data
    foreach ($persistentData as &$vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            // Check if there are existing airport fares for this vehicle
            $hasExistingFares = isset($vehicle['airportFares']) && is_array($vehicle['airportFares']);
            
            // Get the appropriate fare source
            $fareSource = isset($fareData[$vehicleId]) ? $fareData[$vehicleId] : null;
            
            // If no data in database or it's incomplete, use default values
            if (!$fareSource || array_sum(array_filter(array_values($fareSource), 'is_numeric')) == 0) {
                $defaultFare = $defaultFares[$vehicleId] ?? $defaultFares['default'];
                $fareSource = array_merge(
                    ['vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId],
                    $defaultFare
                );
                logMessage("Using default fares for vehicle: $vehicleId");
            } else {
                logMessage("Using database fares for vehicle: $vehicleId");
            }
            
            // Update or set the airport fares
            $vehicle['airportFares'] = $fareSource;
            $updatedVehicles++;
            
            $hasFares = true;
            break;
        }
    }
    
    // If vehicle not found in persistent data, add it
    if (!$hasFares) {
        // Determine the appropriate fare source
        $fareSource = isset($fareData[$vehicleId]) ? $fareData[$vehicleId] : null;
        
        // If no data in database or it's incomplete, use default values
        if (!$fareSource || array_sum(array_filter(array_values($fareSource), 'is_numeric')) == 0) {
            $defaultFare = $defaultFares[$vehicleId] ?? $defaultFares['default'];
            $fareSource = array_merge(
                ['vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId],
                $defaultFare
            );
            logMessage("Using default fares for new vehicle: $vehicleId");
        } else {
            logMessage("Using database fares for new vehicle: $vehicleId");
        }
        
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        
        $newVehicle = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => $vehicleName,
            'airportFares' => $fareSource
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
        // First, check if the table exists
        $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
        $checkResult = $conn->query($checkTableQuery);
        $tableExists = $checkResult && $checkResult->num_rows > 0;
        
        // If table doesn't exist, create it
        if (!$tableExists) {
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
            logMessage("Created airport_transfer_fares table");
            $tableExists = true;
        }
        
        if ($tableExists) {
            // Process each vehicle ID
            foreach ($vehicleIds as $vehicleId) {
                // Find the appropriate fares for this vehicle
                $fares = null;
                
                // First try to find fares in persistent data
                foreach ($persistentData as $vehicle) {
                    if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId && isset($vehicle['airportFares'])) {
                        $fares = $vehicle['airportFares'];
                        break;
                    }
                }
                
                // If not found in persistent data, use default fares
                if (!$fares) {
                    $defaultFare = $defaultFares[$vehicleId] ?? $defaultFares['default'];
                    $fares = array_merge(
                        ['vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId],
                        $defaultFare
                    );
                    logMessage("Using default fares for vehicle in database: $vehicleId");
                }
                
                // If we have fares now, proceed with database operations
                if ($fares) {
                    // Check if the vehicle exists in the table
                    $checkVehicleQuery = "SELECT vehicle_id FROM airport_transfer_fares WHERE vehicle_id = ?";
                    $checkStmt = $conn->prepare($checkVehicleQuery);
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                    $exists = $checkResult->num_rows > 0;
                    $checkStmt->close();
                    
                    // Extract fare values, ensuring we have sensible defaults
                    $basePrice = isset($fares['basePrice']) && $fares['basePrice'] > 0 ? $fares['basePrice'] : ($defaultFares[$vehicleId]['basePrice'] ?? $defaultFares['default']['basePrice']);
                    $pricePerKm = isset($fares['pricePerKm']) && $fares['pricePerKm'] > 0 ? $fares['pricePerKm'] : ($defaultFares[$vehicleId]['pricePerKm'] ?? $defaultFares['default']['pricePerKm']);
                    $pickupPrice = isset($fares['pickupPrice']) && $fares['pickupPrice'] > 0 ? $fares['pickupPrice'] : ($defaultFares[$vehicleId]['pickupPrice'] ?? $defaultFares['default']['pickupPrice']);
                    $dropPrice = isset($fares['dropPrice']) && $fares['dropPrice'] > 0 ? $fares['dropPrice'] : ($defaultFares[$vehicleId]['dropPrice'] ?? $defaultFares['default']['dropPrice']);
                    $tier1Price = isset($fares['tier1Price']) && $fares['tier1Price'] > 0 ? $fares['tier1Price'] : ($defaultFares[$vehicleId]['tier1Price'] ?? $defaultFares['default']['tier1Price']);
                    $tier2Price = isset($fares['tier2Price']) && $fares['tier2Price'] > 0 ? $fares['tier2Price'] : ($defaultFares[$vehicleId]['tier2Price'] ?? $defaultFares['default']['tier2Price']);
                    $tier3Price = isset($fares['tier3Price']) && $fares['tier3Price'] > 0 ? $fares['tier3Price'] : ($defaultFares[$vehicleId]['tier3Price'] ?? $defaultFares['default']['tier3Price']);
                    $tier4Price = isset($fares['tier4Price']) && $fares['tier4Price'] > 0 ? $fares['tier4Price'] : ($defaultFares[$vehicleId]['tier4Price'] ?? $defaultFares['default']['tier4Price']);
                    $extraKmCharge = isset($fares['extraKmCharge']) && $fares['extraKmCharge'] > 0 ? $fares['extraKmCharge'] : ($defaultFares[$vehicleId]['extraKmCharge'] ?? $defaultFares['default']['extraKmCharge']);
                    
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
                        $stmt->execute();
                        $stmt->close();
                        
                        logMessage("Updated fares in database for vehicle: $vehicleId");
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
                        $stmt->execute();
                        $stmt->close();
                        
                        logMessage("Inserted new fares in database for vehicle: $vehicleId");
                    }
                    
                    $syncedDbRecords++;
                }
            }
            
            logMessage("Synced $syncedDbRecords records to airport_transfer_fares table");
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
