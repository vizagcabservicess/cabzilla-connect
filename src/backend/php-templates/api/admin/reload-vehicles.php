
<?php
/**
 * Admin endpoint for reloading vehicle data
 * This script syncs between database and persistent JSON cache
 */

// Set CORS headers for API access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

$logFile = $logDir . '/vehicle_reload_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log request
file_put_contents($logFile, "[$timestamp] Vehicle reload request received\n", FILE_APPEND);

// Persistent cache file path
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';

// Try to include database utilities
$dbConnected = false;
try {
    require_once __DIR__ . '/../utils/database.php';
    require_once __DIR__ . '/../common/db_helper.php';
    $dbConnected = true;
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Failed to include database utilities: " . $e->getMessage() . "\n", FILE_APPEND);
}

// Function to back up persistent cache file
function backupPersistentCache($persistentCacheFile, $backupDir) {
    if (file_exists($persistentCacheFile)) {
        if (!file_exists($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $backupFile = $backupDir . '/vehicles_backup_' . date('Y-m-d_H-i-s') . '.json';
        copy($persistentCacheFile, $backupFile);
        return $backupFile;
    }
    return null;
}

// Function to get vehicles from database
function getVehiclesFromDatabase($logFile) {
    $timestamp = date('Y-m-d H:i:s');
    $vehicles = [];
    
    try {
        // Get database connection
        $conn = getDbConnectionWithRetry(3);
        
        if (!$conn) {
            throw new Exception("Failed to connect to database");
        }
        
        file_put_contents($logFile, "[$timestamp] Connected to database successfully\n", FILE_APPEND);
        
        // Determine which table to use
        $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
        file_put_contents($logFile, "[$timestamp] Using table: $tableName\n", FILE_APPEND);
        
        // Get all vehicles
        $query = "SELECT * FROM `$tableName`";
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Failed to execute query: " . $conn->error);
        }
        
        // Process results
        while ($row = $result->fetch_assoc()) {
            // Convert database row to vehicle object
            $amenitiesData = [];
            if (!empty($row['amenities'])) {
                try {
                    $amenitiesData = json_decode($row['amenities'], true);
                    
                    // If parsing fails, try to split by comma
                    if (!is_array($amenitiesData)) {
                        $amenitiesData = array_map('trim', explode(',', $row['amenities']));
                    }
                } catch (Exception $e) {
                    $amenitiesData = ['AC', 'Bottle Water', 'Music System'];
                }
            } else {
                $amenitiesData = ['AC', 'Bottle Water', 'Music System'];
            }
            
            $vehicle = [
                'id' => $row['vehicle_id'],
                'vehicleId' => $row['vehicle_id'],
                'name' => $row['name'],
                'capacity' => (int)$row['capacity'],
                'luggageCapacity' => (int)$row['luggage_capacity'],
                'price' => (float)($row['price'] ?? $row['base_price']),
                'basePrice' => (float)$row['base_price'],
                'pricePerKm' => (float)$row['price_per_km'],
                'image' => $row['image'] ?? "/cars/{$row['vehicle_id']}.png",
                'amenities' => $amenitiesData,
                'description' => $row['description'] ?? '',
                'ac' => (bool)$row['ac'],
                'nightHaltCharge' => (float)($row['night_halt_charge'] ?? 700),
                'driverAllowance' => (float)($row['driver_allowance'] ?? 250),
                'isActive' => (bool)$row['is_active']
            ];
            
            $vehicles[] = $vehicle;
        }
        
        $conn->close();
        
        file_put_contents($logFile, "[$timestamp] Retrieved " . count($vehicles) . " vehicles from database\n", FILE_APPEND);
        
        return $vehicles;
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . "\n", FILE_APPEND);
        return [];
    }
}

// Create backup directory
$backupDir = $cacheDir . '/backups';

// Make a backup of the persistent cache file
$backupFile = backupPersistentCache($persistentCacheFile, $backupDir);
if ($backupFile) {
    file_put_contents($logFile, "[$timestamp] Created backup at $backupFile\n", FILE_APPEND);
}

// Clear all cache files except the persistent file
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile) {
        @unlink($file);
        file_put_contents($logFile, "[$timestamp] Cleared cache file: " . basename($file) . "\n", FILE_APPEND);
    }
}

// Process request based on source parameter
$source = isset($_GET['source']) ? $_GET['source'] : 'auto';
$forceDbToJson = isset($_GET['dbToJson']) && ($_GET['dbToJson'] === 'true' || $_GET['dbToJson'] === '1');
$forceJsonToDb = isset($_GET['jsonToDb']) && ($_GET['jsonToDb'] === 'true' || $_GET['jsonToDb'] === '1');
$count = 0;
$actualSource = 'none';

// Sync strategy:
// 1. If database connected and source is 'database' or 'auto', try to load from database
// 2. If database load failed or source is 'json', try to load from persistent JSON
// 3. Sync in the requested direction if specified

$persistentVehicles = [];
$dbVehicles = [];

if ($dbConnected && ($source === 'database' || $source === 'auto' || $forceJsonToDb)) {
    $dbVehicles = getVehiclesFromDatabase($logFile);
    
    if (!empty($dbVehicles)) {
        $count = count($dbVehicles);
        $actualSource = 'database';
        
        // Update persistent JSON cache if we have database data
        file_put_contents($persistentCacheFile, json_encode($dbVehicles, JSON_PRETTY_PRINT));
        file_put_contents($logFile, "[$timestamp] Updated persistent cache with $count vehicles from database\n", FILE_APPEND);
        
        // Use these vehicles for the response
        $persistentVehicles = $dbVehicles;
    } else {
        file_put_contents($logFile, "[$timestamp] Failed to retrieve vehicles from database\n", FILE_APPEND);
    }
}

// If we still don't have any vehicles, try persistent JSON
if (empty($persistentVehicles) || $source === 'json' || $forceDbToJson) {
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            try {
                $jsonData = json_decode($persistentJson, true);
                
                if (is_array($jsonData) && !empty($jsonData)) {
                    $persistentVehicles = $jsonData;
                    $count = count($persistentVehicles);
                    $actualSource = $actualSource === 'none' ? 'persistent_json' : $actualSource;
                    
                    file_put_contents($logFile, "[$timestamp] Loaded $count vehicles from persistent JSON\n", FILE_APPEND);
                    
                    // If we're forcing JSON to database and we have database connection
                    if ($forceDbToJson && $dbConnected) {
                        // Update database with JSON data
                        try {
                            $conn = getDbConnectionWithRetry(3);
                            
                            if ($conn) {
                                // Determine which table to use
                                $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
                                
                                // Ensure the table exists
                                if (!tableExists($conn, $tableName)) {
                                    // Create the table
                                    $createTableSql = "CREATE TABLE IF NOT EXISTS `$tableName` (
                                        `id` INT AUTO_INCREMENT PRIMARY KEY,
                                        `vehicle_id` VARCHAR(50) NOT NULL UNIQUE,
                                        `name` VARCHAR(100) NOT NULL,
                                        `capacity` INT NOT NULL DEFAULT 4,
                                        `luggage_capacity` INT NOT NULL DEFAULT 2,
                                        `ac` TINYINT(1) NOT NULL DEFAULT 1,
                                        `image` VARCHAR(255),
                                        `amenities` TEXT,
                                        `description` TEXT,
                                        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                                        `base_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
                                        `price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
                                        `night_halt_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
                                        `driver_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
                                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                                    )";
                                    
                                    if (!$conn->query($createTableSql)) {
                                        throw new Exception("Failed to create table: " . $conn->error);
                                    }
                                }
                                
                                // Update database for each vehicle
                                $updated = 0;
                                $inserted = 0;
                                
                                foreach ($persistentVehicles as $vehicle) {
                                    $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'];
                                    $name = $vehicle['name'] ?? 'Unknown Vehicle';
                                    $capacity = isset($vehicle['capacity']) ? intval($vehicle['capacity']) : 4;
                                    $luggageCapacity = isset($vehicle['luggageCapacity']) ? intval($vehicle['luggageCapacity']) : 2;
                                    $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                                    $image = isset($vehicle['image']) ? $vehicle['image'] : "/cars/{$vehicleId}.png";
                                    $basePrice = isset($vehicle['basePrice']) ? floatval($vehicle['basePrice']) : 
                                                (isset($vehicle['price']) ? floatval($vehicle['price']) : 1500);
                                    $pricePerKm = isset($vehicle['pricePerKm']) ? floatval($vehicle['pricePerKm']) : 14;
                                    $nightHaltCharge = isset($vehicle['nightHaltCharge']) ? floatval($vehicle['nightHaltCharge']) : 700;
                                    $driverAllowance = isset($vehicle['driverAllowance']) ? floatval($vehicle['driverAllowance']) : 250;
                                    $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                                    $description = isset($vehicle['description']) ? $vehicle['description'] : '';
                                    
                                    // Process amenities
                                    $amenities = isset($vehicle['amenities']) ? $vehicle['amenities'] : ['AC', 'Bottle Water', 'Music System'];
                                    $amenitiesJson = json_encode($amenities);
                                    
                                    // Check if vehicle already exists
                                    $checkSql = "SELECT id FROM `$tableName` WHERE vehicle_id = ?";
                                    $checkStmt = $conn->prepare($checkSql);
                                    $checkStmt->bind_param('s', $vehicleId);
                                    $checkStmt->execute();
                                    $result = $checkStmt->get_result();
                                    $exists = $result->num_rows > 0;
                                    $checkStmt->close();
                                    
                                    if ($exists) {
                                        // Update existing vehicle
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
                                            driver_allowance = ?,
                                            updated_at = NOW()
                                            WHERE vehicle_id = ?";
                                            
                                        $updateStmt = $conn->prepare($updateSql);
                                        
                                        if ($updateStmt) {
                                            $updateStmt->bind_param('siissssiiddds', 
                                                $name, 
                                                $capacity, 
                                                $luggageCapacity, 
                                                $ac, 
                                                $image, 
                                                $amenitiesJson, 
                                                $description, 
                                                $isActive, 
                                                $basePrice, 
                                                $pricePerKm,
                                                $nightHaltCharge,
                                                $driverAllowance,
                                                $vehicleId
                                            );
                                            
                                            if ($updateStmt->execute()) {
                                                $updated++;
                                            }
                                            
                                            $updateStmt->close();
                                        }
                                    } else {
                                        // Insert new vehicle
                                        $insertSql = "INSERT INTO `$tableName` (
                                            vehicle_id, 
                                            name, 
                                            capacity, 
                                            luggage_capacity, 
                                            ac, 
                                            image, 
                                            amenities, 
                                            description, 
                                            is_active, 
                                            base_price, 
                                            price_per_km,
                                            night_halt_charge,
                                            driver_allowance,
                                            created_at,
                                            updated_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                                        
                                        $insertStmt = $conn->prepare($insertSql);
                                        
                                        if ($insertStmt) {
                                            $insertStmt->bind_param('ssiissssiiddd', 
                                                $vehicleId, 
                                                $name, 
                                                $capacity, 
                                                $luggageCapacity, 
                                                $ac, 
                                                $image, 
                                                $amenitiesJson, 
                                                $description, 
                                                $isActive, 
                                                $basePrice, 
                                                $pricePerKm,
                                                $nightHaltCharge,
                                                $driverAllowance
                                            );
                                            
                                            if ($insertStmt->execute()) {
                                                $inserted++;
                                            }
                                            
                                            $insertStmt->close();
                                        }
                                    }
                                }
                                
                                $conn->close();
                                
                                file_put_contents($logFile, "[$timestamp] Synced database from JSON: updated $updated, inserted $inserted vehicles\n", FILE_APPEND);
                                $actualSource = 'json_to_database';
                            }
                        } catch (Exception $e) {
                            file_put_contents($logFile, "[$timestamp] Error syncing database from JSON: " . $e->getMessage() . "\n", FILE_APPEND);
                        }
                    }
                } else {
                    file_put_contents($logFile, "[$timestamp] Persistent JSON is empty or invalid\n", FILE_APPEND);
                }
            } catch (Exception $e) {
                file_put_contents($logFile, "[$timestamp] Error parsing persistent JSON: " . $e->getMessage() . "\n", FILE_APPEND);
            }
        }
    } else {
        file_put_contents($logFile, "[$timestamp] Persistent cache file does not exist\n", FILE_APPEND);
    }
}

// Log completion
file_put_contents($logFile, "[$timestamp] Vehicle reload completed with $count vehicles from source: $actualSource\n", FILE_APPEND);

// Return response
echo json_encode([
    'status' => 'success',
    'message' => 'Successfully reloaded vehicles from ' . ($actualSource === 'database' ? 'database' : 'persistent storage'),
    'count' => $count,
    'source' => $actualSource,
    'timestamp' => time(),
    'backupFile' => $backupFile ? basename($backupFile) : null,
    'persistentFile' => basename($persistentCacheFile)
]);
