
<?php
/**
 * Enhanced Admin-specific vehicle data endpoint
 * This endpoint provides extended vehicle information from the database for admin interfaces
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, Cache-Control');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Process GET parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;

// Log request for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/admin_vehicles_data_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Admin vehicles data request: includeInactive=$includeInactive, forceRefresh=$forceRefresh" . ($vehicleId ? ", vehicleId=$vehicleId" : "") . "\n", FILE_APPEND);

// This endpoint should always use admin mode
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';

// Before including the main file, let's make sure the cache directories exist
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0777, true);
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../common/db_helper.php';

// Check if persistent cache file exists, if not, create it
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
if (!file_exists($persistentCacheFile)) {
    // Create default vehicle data
    $defaultVehicles = [
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
    
    $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
    $writeResult = file_put_contents($persistentCacheFile, json_encode($defaultVehicles, $jsonOptions));
    
    if ($writeResult === false) {
        file_put_contents($logFile, "[$timestamp] Failed to write default vehicles to persistent cache\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Created new persistent cache file with default vehicles\n", FILE_APPEND);
    }
}

// For admin access, handle force refresh specifically
if ($forceRefresh) {
    file_put_contents($logFile, "[$timestamp] Force refresh requested. Attempting to synchronize data\n", FILE_APPEND);
    
    // Try to synchronize database with cache
    try {
        // Try to load data from database first
        $conn = getDbConnectionWithRetry(3);
        $loadedFromDatabase = false;
        
        if ($conn) {
            // Check if tables exist
            $tableExists = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
            
            if (!$tableExists) {
                file_put_contents($logFile, "[$timestamp] Vehicle tables don't exist, creating...\n", FILE_APPEND);
                $result = ensureDatabaseTables($conn);
                if ($result) {
                    file_put_contents($logFile, "[$timestamp] Successfully created database tables\n", FILE_APPEND);
                }
            }
            
            // Determine which table to use
            $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
            
            // Try to load vehicles from database
            $sql = "SELECT * FROM `$tableName`";
            $result = executeQuery($conn, $sql);
            
            if (is_array($result) && !empty($result)) {
                // We have data from the database - use it to refresh the cache
                $vehicles = [];
                
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
                
                if (!empty($vehicles)) {
                    $loadedFromDatabase = true;
                    $count = count($vehicles);
                    
                    file_put_contents($logFile, "[$timestamp] Loaded $count vehicles from database\n", FILE_APPEND);
                    
                    // Create a backup of the existing persistent cache first
                    $backupFile = $cacheDir . '/vehicles_persistent_backup_' . time() . '.json';
                    copy($persistentCacheFile, $backupFile);
                    
                    // Update the persistent cache with database data
                    file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
                    file_put_contents($logFile, "[$timestamp] Updated persistent cache with $count vehicles from database\n", FILE_APPEND);
                    
                    // Clear other cache files
                    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
                    foreach ($cacheFiles as $file) {
                        if ($file !== $persistentCacheFile && $file !== $backupFile) {
                            @unlink($file);
                        }
                    }
                }
            } else {
                file_put_contents($logFile, "[$timestamp] No vehicles found in database, will check persistent cache\n", FILE_APPEND);
            }
            
            $conn->close();
        }
        
        // If we couldn't load from database, try to load from persistent cache and sync to database
        if (!$loadedFromDatabase) {
            file_put_contents($logFile, "[$timestamp] Loading from persistent cache and attempting to sync to database\n", FILE_APPEND);
            
            // Load from persistent cache
            if (file_exists($persistentCacheFile)) {
                $persistentJson = file_get_contents($persistentCacheFile);
                if ($persistentJson) {
                    $persistentData = json_decode($persistentJson, true);
                    if (is_array($persistentData) && !empty($persistentData)) {
                        // Try to sync this data to the database
                        try {
                            $conn = getDbConnectionWithRetry(2);
                            
                            if ($conn) {
                                // Check if tables exist, create if not
                                $tablesExist = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
                                
                                if (!$tablesExist) {
                                    $result = ensureDatabaseTables($conn);
                                }
                                
                                // Determine which table to use
                                $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
                                
                                // Sync the data
                                foreach ($persistentData as $vehicle) {
                                    $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'] ?? '';
                                    
                                    if (empty($vehicleId)) continue;
                                    
                                    // Convert amenities to string for database storage
                                    $amenitiesStr = isset($vehicle['amenities']) ? 
                                        (is_array($vehicle['amenities']) ? json_encode($vehicle['amenities']) : $vehicle['amenities']) : 
                                        '["AC", "Bottle Water", "Music System"]';
                                    
                                    // Check if vehicle already exists
                                    $checkSql = "SELECT COUNT(*) as count FROM `$tableName` WHERE vehicle_id = ?";
                                    $checkResult = executeQuery($conn, $checkSql, [$vehicleId], 's');
                                    
                                    if (is_array($checkResult) && isset($checkResult[0]['count']) && $checkResult[0]['count'] > 0) {
                                        // Update existing record
                                        $updateSql = "UPDATE `$tableName` SET 
                                            name = ?, 
                                            capacity = ?, 
                                            luggage_capacity = ?, 
                                            ac = ?, 
                                            image = ?, 
                                            amenities = ?, 
                                            description = ?, 
                                            is_active = ?, 
                                            base_price = ?, 
                                            price_per_km = ?, 
                                            night_halt_charge = ?, 
                                            driver_allowance = ? 
                                            WHERE vehicle_id = ?";
                                            
                                        executeQuery($conn, $updateSql, [
                                            $vehicle['name'] ?? '',
                                            $vehicle['capacity'] ?? 4,
                                            $vehicle['luggageCapacity'] ?? 2,
                                            isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1,
                                            $vehicle['image'] ?? '/cars/sedan.png',
                                            $amenitiesStr,
                                            $vehicle['description'] ?? '',
                                            isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1,
                                            $vehicle['basePrice'] ?? $vehicle['price'] ?? 2500,
                                            $vehicle['pricePerKm'] ?? 14,
                                            $vehicle['nightHaltCharge'] ?? 700,
                                            $vehicle['driverAllowance'] ?? 250,
                                            $vehicleId
                                        ], 'siiisissiddds');
                                    } else {
                                        // Insert new record
                                        $insertSql = "INSERT INTO `$tableName` (
                                            vehicle_id, name, capacity, luggage_capacity, ac, image, 
                                            amenities, description, is_active, base_price, price_per_km, 
                                            night_halt_charge, driver_allowance
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                        
                                        executeQuery($conn, $insertSql, [
                                            $vehicleId,
                                            $vehicle['name'] ?? '',
                                            $vehicle['capacity'] ?? 4,
                                            $vehicle['luggageCapacity'] ?? 2,
                                            isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1,
                                            $vehicle['image'] ?? '/cars/sedan.png',
                                            $amenitiesStr,
                                            $vehicle['description'] ?? '',
                                            isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1,
                                            $vehicle['basePrice'] ?? $vehicle['price'] ?? 2500,
                                            $vehicle['pricePerKm'] ?? 14,
                                            $vehicle['nightHaltCharge'] ?? 700,
                                            $vehicle['driverAllowance'] ?? 250
                                        ], 'ssiiisissiddd');
                                    }
                                }
                                
                                file_put_contents($logFile, "[$timestamp] Successfully synced " . count($persistentData) . " vehicles from persistent cache to database\n", FILE_APPEND);
                                $conn->close();
                            }
                        } catch (Exception $e) {
                            file_put_contents($logFile, "[$timestamp] Error syncing to database: " . $e->getMessage() . "\n", FILE_APPEND);
                        }
                    }
                }
            }
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Error during force refresh: " . $e->getMessage() . "\n", FILE_APPEND);
    }
}

// Just include the main vehicles-data.php which now has proper database loading logic
require_once __DIR__ . '/../vehicles-data.php';
