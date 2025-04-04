<?php
/**
 * ENHANCED - Special endpoint for vehicle data with MySQL database storage
 * This file serves as the primary data source for vehicle information
 */

// Set ultra-aggressive CORS headers for maximum browser compatibility
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, pre-check=0, post-check=0');
header('Pragma: no-cache');
header('Expires: -1');

// Allow specific origins if specified
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, Cache-Control, *');
header('Access-Control-Max-Age: 86400'); 
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
header('X-Content-Type-Options: nosniff');

// Add debugging headers
header('X-API-Version: 2.0.0');
header('X-CORS-Status: Ultra-Enhanced');
header('X-Debug-Endpoint: vehicles-data');
header('X-Debug-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);

// Ultra-reliable OPTIONS handling - HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time(),
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none'
        ]
    ]);
    exit;
}

// Process GET parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    @mkdir($logDir, 0755, true);
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

// Persistent cache file path - as a fallback
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';

$logFile = $logDir . '/vehicles_data_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
$logMessage = "[$timestamp] Vehicles data request with includeInactive=$includeInactive, forceRefresh=$forceRefresh, isAdminMode=$isAdminMode" . ($vehicleId ? ", vehicleId=$vehicleId" : "") . "\n";
file_put_contents($logFile, $logMessage, FILE_APPEND);

// Include database utilities
require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/common/db_helper.php';

// Initialize vehicles array
$vehicles = [];
$loadedFromDatabase = false;
$dbError = null;

// PRIORITY 1: Try to load from database first
try {
    file_put_contents($logFile, "[$timestamp] Attempting to load vehicles from database\n", FILE_APPEND);
    
    // Get database connection
    $conn = getDbConnectionWithRetry(3);
    
    if ($conn) {
        // Check if vehicles table exists
        $tableExists = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
        
        if ($tableExists) {
            // Determine which table to use
            $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
            
            // Build query based on parameters
            $sql = "SELECT * FROM `$tableName`";
            
            if (!$includeInactive) {
                $sql .= " WHERE is_active = 1";
            }
            
            if ($vehicleId) {
                if (strpos($sql, 'WHERE') !== false) {
                    $sql .= " AND (vehicle_id = ? OR id = ?)";
                } else {
                    $sql .= " WHERE (vehicle_id = ? OR id = ?)";
                }
                
                // Execute query with vehicle ID parameter
                $result = executeQuery($conn, $sql, [$vehicleId, $vehicleId], 'ss');
            } else {
                // Execute query without parameters
                $result = executeQuery($conn, $sql);
            }
            
            if (is_array($result)) {
                // Format database results to match expected vehicle structure
                foreach ($result as $row) {
                    $amenitiesArray = [];
                    
                    // Handle amenities field which may be stored as JSON string or comma-separated string
                    if (!empty($row['amenities'])) {
                        if (is_string($row['amenities'])) {
                            // Try to decode as JSON first
                            $decodedAmenities = json_decode($row['amenities'], true);
                            if (is_array($decodedAmenities)) {
                                $amenitiesArray = $decodedAmenities;
                            } else {
                                // Fall back to comma-separated string
                                $amenitiesArray = array_map('trim', explode(',', $row['amenities']));
                            }
                        } else if (is_array($row['amenities'])) {
                            $amenitiesArray = $row['amenities'];
                        }
                    }
                    
                    // Format the vehicle data
                    $vehicle = [
                        'id' => $row['vehicle_id'] ?? $row['id'] ?? '',
                        'vehicleId' => $row['vehicle_id'] ?? $row['id'] ?? '',
                        'name' => $row['name'] ?? '',
                        'capacity' => (int)($row['capacity'] ?? 4),
                        'luggageCapacity' => (int)($row['luggage_capacity'] ?? $row['luggageCapacity'] ?? 2),
                        'price' => (float)($row['price'] ?? $row['base_price'] ?? 2500),
                        'basePrice' => (float)($row['base_price'] ?? $row['price'] ?? 2500),
                        'pricePerKm' => (float)($row['price_per_km'] ?? $row['pricePerKm'] ?? 14),
                        'image' => $row['image'] ?? '/cars/sedan.png',
                        'amenities' => $amenitiesArray,
                        'description' => $row['description'] ?? '',
                        'ac' => (bool)($row['ac'] ?? true),
                        'nightHaltCharge' => (float)($row['night_halt_charge'] ?? $row['nightHaltCharge'] ?? 700),
                        'driverAllowance' => (float)($row['driver_allowance'] ?? $row['driverAllowance'] ?? 250),
                        'isActive' => (bool)($row['is_active'] ?? $row['isActive'] ?? true)
                    ];
                    
                    $vehicles[] = $vehicle;
                }
                
                $loadedFromDatabase = true;
                file_put_contents($logFile, "[$timestamp] Successfully loaded " . count($vehicles) . " vehicles from database table $tableName\n", FILE_APPEND);
                
                // Also update the persistent cache to keep it in sync
                file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
                file_put_contents($logFile, "[$timestamp] Updated persistent cache with database data\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Database query failed or returned no results\n", FILE_APPEND);
            }
        } else {
            file_put_contents($logFile, "[$timestamp] Required tables (vehicles or vehicle_types) don't exist\n", FILE_APPEND);
            
            // Try to create the tables
            $result = ensureDatabaseTables($conn);
            if ($result) {
                file_put_contents($logFile, "[$timestamp] Created database tables successfully\n", FILE_APPEND);
            }
        }
        
        // Close the database connection
        $conn->close();
    }
} catch (Exception $e) {
    $dbError = $e->getMessage();
    file_put_contents($logFile, "[$timestamp] Database error: " . $dbError . "\n", FILE_APPEND);
}

// PRIORITY 2: If database failed or returned no results, load from persistent cache
if (!$loadedFromDatabase || empty($vehicles)) {
    file_put_contents($logFile, "[$timestamp] Database load failed or returned empty. Falling back to persistent cache\n", FILE_APPEND);
    
    if (file_exists($persistentCacheFile)) {
        file_put_contents($logFile, "[$timestamp] Loading from persistent cache file: $persistentCacheFile\n", FILE_APPEND);
        $persistentJson = file_get_contents($persistentCacheFile);
        
        if ($persistentJson) {
            try {
                $data = json_decode($persistentJson, true);
                if (is_array($data)) {
                    file_put_contents($logFile, "[$timestamp] Loaded " . count($data) . " vehicles from persistent cache\n", FILE_APPEND);
                    $vehicles = $data;
                } else {
                    file_put_contents($logFile, "[$timestamp] JSON decode resulted in non-array: " . gettype($data) . "\n", FILE_APPEND);
                    // Create a backup of the problematic file
                    $backupFile = $cacheDir . '/vehicles_persistent_backup_' . time() . '.json';
                    copy($persistentCacheFile, $backupFile);
                    file_put_contents($logFile, "[$timestamp] Created backup of problematic file at $backupFile\n", FILE_APPEND);
                }
            } catch (Exception $e) {
                file_put_contents($logFile, "[$timestamp] Failed to parse persistent JSON: " . $e->getMessage() . "\n", FILE_APPEND);
                // Create a backup of the problematic file
                $backupFile = $cacheDir . '/vehicles_persistent_backup_' . time() . '.json';
                copy($persistentCacheFile, $backupFile);
                file_put_contents($logFile, "[$timestamp] Created backup of problematic file at $backupFile\n", FILE_APPEND);
            }
        } else {
            file_put_contents($logFile, "[$timestamp] Failed to read persistent cache file\n", FILE_APPEND);
        }
    } else {
        file_put_contents($logFile, "[$timestamp] Persistent cache file not found at $persistentCacheFile\n", FILE_APPEND);
    }
}

// PRIORITY 3: If both database and persistent cache failed, use fallback defaults
if (empty($vehicles)) {
    file_put_contents($logFile, "[$timestamp] No vehicles found in database or persistent cache. Using default vehicles\n", FILE_APPEND);
    
    // Default vehicle data as fallback
    $vehicles = [
        [
            'id' => 'sedan',
            'vehicleId' => 'sedan',
            'name' => 'Sedan',
            'capacity' => 4,
            'luggageCapacity' => 2,
            'price' => 2500,
            'basePrice' => 2500,
            'pricePerKm' => 14,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System'],
            'description' => 'Comfortable sedan suitable for 4 passengers.',
            'ac' => true,
            'nightHaltCharge' => 700,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'ertiga',
            'vehicleId' => 'ertiga',
            'name' => 'Ertiga',
            'capacity' => 6,
            'luggageCapacity' => 3,
            'price' => 3200,
            'basePrice' => 3200,
            'pricePerKm' => 18,
            'image' => '/cars/ertiga.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
            'description' => 'Spacious SUV suitable for 6 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'innova_crysta',
            'vehicleId' => 'innova_crysta',
            'name' => 'Innova Crysta',
            'capacity' => 7,
            'luggageCapacity' => 4,
            'price' => 3800,
            'basePrice' => 3800,
            'pricePerKm' => 20,
            'image' => '/cars/innova.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
            'description' => 'Premium SUV with ample space for 7 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'luxury',
            'vehicleId' => 'luxury',
            'name' => 'Luxury Sedan',
            'capacity' => 4,
            'luggageCapacity' => 3,
            'price' => 4500,
            'basePrice' => 4500,
            'pricePerKm' => 25,
            'image' => '/cars/luxury.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
            'description' => 'Premium luxury sedan with high-end amenities for a comfortable journey.',
            'ac' => true,
            'nightHaltCharge' => 1200,
            'driverAllowance' => 300,
            'isActive' => true
        ],
        [
            'id' => 'tempo_traveller',
            'vehicleId' => 'tempo_traveller',
            'name' => 'Tempo Traveller',
            'capacity' => 12,
            'luggageCapacity' => 8,
            'price' => 5500,
            'basePrice' => 5500,
            'pricePerKm' => 25,
            'image' => '/cars/tempo.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Pushback Seats'],
            'description' => 'Large vehicle suitable for groups of up to 12 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1200,
            'driverAllowance' => 300,
            'isActive' => true
        ]
    ];
    
    // Save the default vehicles to the persistent cache
    file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    file_put_contents($logFile, "[$timestamp] Created new persistent cache with default vehicles\n", FILE_APPEND);
    
    // Also try to save these to the database if we had a connection
    try {
        $conn = getDbConnectionWithRetry(1); // Try once quickly
        
        if ($conn) {
            // Check if vehicles table exists
            $tableExists = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
            
            if (!$tableExists) {
                // Try to create tables first
                ensureDatabaseTables($conn);
            }
            
            // Determine which table to use
            $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
            
            file_put_contents($logFile, "[$timestamp] Inserting default vehicles into database table $tableName\n", FILE_APPEND);
            
            // Insert default vehicles into the database
            foreach ($vehicles as $vehicle) {
                // Check if the vehicle already exists
                $checkSql = "SELECT COUNT(*) as count FROM `$tableName` WHERE vehicle_id = ?";
                $checkResult = executeQuery($conn, $checkSql, [$vehicle['vehicleId']], 's');
                
                if (is_array($checkResult) && $checkResult[0]['count'] == 0) {
                    // Convert amenities to a string format for storage
                    $amenitiesStr = is_array($vehicle['amenities']) ? json_encode($vehicle['amenities']) : $vehicle['amenities'];
                    
                    // Insert the vehicle
                    $insertSql = "INSERT INTO `$tableName` (
                        vehicle_id, name, capacity, luggage_capacity, ac, image, 
                        amenities, description, is_active, base_price, price_per_km, 
                        night_halt_charge, driver_allowance
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    
                    executeQuery($conn, $insertSql, [
                        $vehicle['vehicleId'],
                        $vehicle['name'],
                        $vehicle['capacity'],
                        $vehicle['luggageCapacity'],
                        $vehicle['ac'] ? 1 : 0,
                        $vehicle['image'],
                        $amenitiesStr,
                        $vehicle['description'],
                        $vehicle['isActive'] ? 1 : 0,
                        $vehicle['basePrice'],
                        $vehicle['pricePerKm'],
                        $vehicle['nightHaltCharge'],
                        $vehicle['driverAllowance']
                    ], 'ssiisissiiddd');
                }
            }
            
            $conn->close();
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Error inserting default vehicles into database: " . $e->getMessage() . "\n", FILE_APPEND);
    }
}

// Filter inactive vehicles if needed
if (!$includeInactive) {
    $filteredVehicles = [];
    foreach ($vehicles as $vehicle) {
        if (isset($vehicle['isActive']) && $vehicle['isActive'] === true) {
            $filteredVehicles[] = $vehicle;
        }
    }
    $vehicles = $filteredVehicles;
    file_put_contents($logFile, "[$timestamp] Filtered to " . count($vehicles) . " active vehicles\n", FILE_APPEND);
}

// Filter by vehicle ID if specified
if ($vehicleId) {
    $filteredVehicles = [];
    foreach ($vehicles as $vehicle) {
        if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
            (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
            $filteredVehicles[] = $vehicle;
            break;
        }
    }
    
    if (!empty($filteredVehicles)) {
        $vehicles = $filteredVehicles;
        file_put_contents($logFile, "[$timestamp] Filtered to vehicle ID: $vehicleId\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] WARNING: No vehicle found with ID: $vehicleId\n", FILE_APPEND);
    }
}

// Response with detailed info for admin mode
if ($isAdminMode) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicles retrieved successfully',
        'vehicles' => $vehicles,
        'count' => count($vehicles),
        'timestamp' => time(),
        'includeInactive' => $includeInactive,
        'forceRefresh' => $forceRefresh,
        'isAdminMode' => $isAdminMode,
        'source' => $loadedFromDatabase ? 'database' : 'cache',
        'debug' => [
            'persistentCacheFile' => $persistentCacheFile,
            'dbError' => $dbError
        ]
    ]);
} else {
    // Standard response for non-admin requests
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicles retrieved successfully',
        'vehicles' => $vehicles,
        'count' => count($vehicles),
        'timestamp' => time(),
        'includeInactive' => $includeInactive,
        'forceRefresh' => $forceRefresh,
        'isAdminMode' => $isAdminMode
    ]);
}
