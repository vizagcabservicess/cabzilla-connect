<?php
/**
 * Enhanced reload-vehicles.php - Force reload vehicles from database and synchronize with cache
 * This script ensures that vehicle data is synchronized between database and cache files
 */

// Set headers for CORS and caching prevention
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh, Cache-Control');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../common/db_helper.php';

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory if it doesn't exist
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log messages to a file
function logMessage($message) {
    global $logDir;
    $logFile = $logDir . '/vehicle-reload-' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Log the request
logMessage("Vehicle reload request received");

try {
    // The persistent cache file path
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    // PRIORITY 1: Try to load from database first
    $vehicles = [];
    $loadedFromDatabase = false;
    $databaseVehicleCount = 0;
    
    try {
        logMessage("Attempting to load vehicles from database");
        $conn = getDbConnectionWithRetry(3);
        
        if ($conn) {
            // Check if relevant tables exist
            $tableExists = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
            
            if (!$tableExists) {
                logMessage("Vehicle tables don't exist, creating...");
                $result = ensureDatabaseTables($conn);
                if ($result) {
                    logMessage("Successfully created database tables");
                }
            }
            
            // Determine which table to use
            $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
            
            $sql = "SELECT * FROM `$tableName`";
            $result = executeQuery($conn, $sql);
            
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
                $databaseVehicleCount = count($vehicles);
                logMessage("Successfully loaded $databaseVehicleCount vehicles from database table $tableName");
                
                // Update the persistent cache to keep it in sync
                file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT));
                logMessage("Updated persistent cache file with database data");
            } else {
                logMessage("Database query failed or returned no results");
            }
            
            $conn->close();
        }
    } catch (Exception $e) {
        logMessage("Database error: " . $e->getMessage());
    }
    
    // PRIORITY 2: If database failed, load from persistent cache
    if (!$loadedFromDatabase || empty($vehicles)) {
        logMessage("Database load failed or returned empty. Checking persistent cache");
        
        // Check if persistent file exists
        if (!file_exists($persistentCacheFile)) {
            logMessage("ERROR: Persistent cache file not found at $persistentCacheFile");
            echo json_encode([
                'status' => 'error',
                'message' => 'Persistent cache file not found',
                'timestamp' => time(),
                'cacheDir' => $cacheDir
            ]);
            exit;
        }
        
        // Load the persistent data
        $persistentJson = file_get_contents($persistentCacheFile);
        if (!$persistentJson) {
            logMessage("ERROR: Failed to read persistent cache file at $persistentCacheFile");
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to read persistent cache file',
                'timestamp' => time(),
                'persistentFile' => $persistentCacheFile
            ]);
            exit;
        }
        
        // Parse the persistent data
        $persistentData = json_decode($persistentJson, true);
        if (!is_array($persistentData)) {
            logMessage("ERROR: Invalid JSON in persistent cache file: " . substr($persistentJson, 0, 100) . "...");
            
            // Create backup of problematic file
            $backupFile = $cacheDir . '/vehicles_persistent_backup_corrupt_' . time() . '.json';
            copy($persistentCacheFile, $backupFile);
            logMessage("Created backup of problematic file at $backupFile");
            
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid JSON in persistent cache file',
                'timestamp' => time(),
                'jsonError' => json_last_error_msg()
            ]);
            exit;
        }
        
        // Use the persistent cache data
        $vehicles = $persistentData;
        logMessage("Loaded " . count($vehicles) . " vehicles from persistent cache");
        
        // If we loaded from cache but have database connection, try to sync back to database
        if (!$loadedFromDatabase) {
            try {
                logMessage("Attempting to sync persistent cache data back to database");
                $conn = getDbConnectionWithRetry(3);
                
                if ($conn) {
                    // Check if tables exist, create if not
                    $tablesExist = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
                    
                    if (!$tablesExist) {
                        logMessage("Vehicle tables don't exist, creating...");
                        $result = ensureDatabaseTables($conn);
                        if ($result) {
                            logMessage("Successfully created database tables");
                        } else {
                            throw new Exception("Failed to create required database tables");
                        }
                    }
                    
                    // Determine which table to use
                    $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
                    
                    // Sync each vehicle to the database
                    foreach ($vehicles as $vehicle) {
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
                    
                    logMessage("Successfully synced " . count($vehicles) . " vehicles from persistent cache to database");
                    $conn->close();
                }
            } catch (Exception $e) {
                logMessage("Error syncing to database: " . $e->getMessage());
            }
        }
    }
    
    // Count the vehicles
    $vehicleCount = count($vehicles);
    logMessage("Total vehicles available: $vehicleCount");
    
    // Clear all other cache files EXCEPT the persistent one
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    $cleared = 0;
    foreach ($cacheFiles as $file) {
        // Don't delete the persistent file itself
        if ($file !== $persistentCacheFile) {
            if (@unlink($file)) {
                logMessage("Cleared cache file: " . basename($file));
                $cleared++;
            } else {
                logMessage("Failed to clear cache file: " . basename($file));
            }
        }
    }
    
    // Create timestamp-based cache files to ensure fresh data
    $currentTime = time();
    $tempCacheFile = $cacheDir . '/vehicles_' . $currentTime . '.json';
    $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
    
    // Save the vehicles to the temp cache file
    $result = file_put_contents($tempCacheFile, json_encode($vehicles, $jsonOptions));
    
    if ($result === false) {
        logMessage("ERROR: Failed to write temp cache file to $tempCacheFile");
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to write temp cache file',
            'timestamp' => time(),
            'tempFile' => $tempCacheFile
        ]);
        exit;
    }
    
    // Also create a backup of the persistent file
    $backupCacheFile = $cacheDir . '/vehicles_persistent_backup_' . $currentTime . '.json';
    if (copy($persistentCacheFile, $backupCacheFile)) {
        logMessage("Created backup of persistent cache at " . basename($backupCacheFile));
    }
    
    logMessage("Successfully reloaded $vehicleCount vehicles, cleared $cleared cache files, and created new cache at " . basename($tempCacheFile));
    
    // Return success response with detailed information
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully reloaded vehicles from persistent storage",
        'source' => $loadedFromDatabase ? 'database' : 'persistent_cache',
        'count' => $vehicleCount,
        'databaseCount' => $databaseVehicleCount,
        'cleared' => $cleared,
        'persistentFile' => basename($persistentCacheFile),
        'newCacheFile' => basename($tempCacheFile),
        'timestamp' => $currentTime
    ]);
    
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
