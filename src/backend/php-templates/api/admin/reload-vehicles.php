
<?php
/**
 * reload-vehicles.php - Reload vehicles from database first, then from persistent storage
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh, X-Database-First');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log debug info
function logReloadDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_reload_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

logReloadDebug("Starting vehicles reload", $_SERVER['REQUEST_METHOD']);

// Get database connection
$conn = null;

// First try to include config
if (file_exists(__DIR__ . '/../../config.php')) {
    require_once __DIR__ . '/../../config.php';
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
        logReloadDebug("Got database connection from config");
    }
}

// If no connection yet, try direct connection
if (!$conn && class_exists('mysqli')) {
    // Fallback database credentials
    $dbHost = 'localhost';
    $dbName = 'u64460565_db_be';
    $dbUser = 'u64460565_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            logReloadDebug("Failed to connect to database: " . $conn->connect_error);
            $conn = null;
        } else {
            $conn->set_charset("utf8mb4");
            logReloadDebug("Connected to database with direct credentials");
        }
    } catch (Exception $e) {
        logReloadDebug("Connection error: " . $e->getMessage());
        $conn = null;
    }
}

// Array to hold all vehicles
$vehicles = [];
$source = "unknown";

// Get vehicles from database if connection available
if ($conn) {
    try {
        // Make sure vehicles table exists
        try {
            $createTableQuery = "CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                image VARCHAR(255),
                amenities TEXT,
                description TEXT,
                ac TINYINT(1) DEFAULT 1,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )";
            
            $conn->query($createTableQuery);
            logReloadDebug("Ensured vehicles table exists");
        } catch (Exception $e) {
            logReloadDebug("Error creating vehicles table: " . $e->getMessage());
        }
        
        // Query all vehicles
        $query = "SELECT * FROM vehicles";
        $includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
        
        if (!$includeInactive) {
            $query .= " WHERE is_active = 1";
        }
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            logReloadDebug("Found {$result->num_rows} vehicles in database");
            
            while ($row = $result->fetch_assoc()) {
                // Convert database row to vehicle object
                $amenities = json_decode($row['amenities'], true);
                if (!is_array($amenities)) {
                    $amenities = ['AC', 'Water'];
                }
                
                $vehicle = [
                    'id' => $row['vehicle_id'],
                    'vehicleId' => $row['vehicle_id'],
                    'name' => $row['name'],
                    'capacity' => (int)$row['capacity'],
                    'luggageCapacity' => (int)$row['luggage_capacity'],
                    'price' => (float)$row['base_price'],
                    'basePrice' => (float)$row['base_price'],
                    'pricePerKm' => (float)$row['price_per_km'],
                    'image' => $row['image'],
                    'amenities' => $amenities,
                    'description' => $row['description'],
                    'ac' => (bool)$row['ac'],
                    'nightHaltCharge' => (float)$row['night_halt_charge'],
                    'driverAllowance' => (float)$row['driver_allowance'],
                    'isActive' => (bool)$row['is_active']
                ];
                
                $vehicles[] = $vehicle;
            }
            
            $source = 'database';
        } else {
            logReloadDebug("No vehicles found in database or query error");
        }
        
        $conn->close();
    } catch (Exception $e) {
        logReloadDebug("Error querying database: " . $e->getMessage());
    }
}

// If no vehicles from database, try persistent cache
if (empty($vehicles)) {
    logReloadDebug("No vehicles from database, trying persistent cache");
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            try {
                $persistentData = json_decode($persistentJson, true);
                if (is_array($persistentData) && !empty($persistentData)) {
                    $vehicles = $persistentData;
                    $source = 'persistent_cache';
                    logReloadDebug("Loaded " . count($vehicles) . " vehicles from persistent cache");
                }
            } catch (Exception $e) {
                logReloadDebug("Error parsing persistent cache: " . $e->getMessage());
            }
        }
    }
}

// If still no vehicles, try static JSON
if (empty($vehicles)) {
    logReloadDebug("No vehicles from database or persistent cache, trying static JSON");
    $staticJsonPath = __DIR__ . '/../../../data/vehicles.json';
    
    if (file_exists($staticJsonPath)) {
        $staticJson = file_get_contents($staticJsonPath);
        if ($staticJson) {
            try {
                $staticData = json_decode($staticJson, true);
                if (is_array($staticData) && !empty($staticData)) {
                    $vehicles = $staticData;
                    $source = 'static_json';
                    logReloadDebug("Loaded " . count($vehicles) . " vehicles from static JSON");
                    
                    // If we loaded from static JSON, try to import into database
                    if ($conn) {
                        logReloadDebug("Attempting to import static JSON data into database");
                        foreach ($staticData as $vehicle) {
                            $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'] ?? null;
                            if ($vehicleId) {
                                // Call direct-vehicle-modify.php to add this vehicle
                                $apiUrl = '/api/admin/direct-vehicle-modify.php';
                                $postdata = http_build_query($vehicle);
                                
                                $opts = ['http' => [
                                    'method' => 'POST',
                                    'header' => 'Content-Type: application/x-www-form-urlencoded',
                                    'content' => $postdata
                                ]];
                                
                                $context = stream_context_create($opts);
                                $result = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . $apiUrl, false, $context);
                                
                                if ($result === false) {
                                    logReloadDebug("Failed to import vehicle $vehicleId into database");
                                } else {
                                    logReloadDebug("Imported vehicle $vehicleId into database");
                                }
                            }
                        }
                    }
                }
            } catch (Exception $e) {
                logReloadDebug("Error parsing static JSON: " . $e->getMessage());
            }
        }
    }
}

// If we have vehicles, update the persistent cache (if not already from database)
if (!empty($vehicles) && $source !== 'persistent_cache') {
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
    $saveResult = file_put_contents($persistentCacheFile, json_encode($vehicles, $jsonOptions));
    
    if ($saveResult === false) {
        logReloadDebug("Failed to update persistent cache");
    } else {
        logReloadDebug("Updated persistent cache with " . count($vehicles) . " vehicles");
    }
    
    // Also update static JSON if we loaded from database
    if ($source === 'database') {
        $staticJsonPath = __DIR__ . '/../../../data/vehicles.json';
        if (is_writable(dirname($staticJsonPath))) {
            $saveResult = file_put_contents($staticJsonPath, json_encode($vehicles, $jsonOptions));
            if ($saveResult === false) {
                logReloadDebug("Failed to update static JSON");
            } else {
                logReloadDebug("Updated static JSON with " . count($vehicles) . " vehicles");
            }
        } else {
            logReloadDebug("Static JSON path is not writable: " . dirname($staticJsonPath));
        }
    }
}

// Clear all temporary cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && strpos($file, 'persistent_backup') === false) {
        unlink($file);
        logReloadDebug("Cleared cache file: " . basename($file));
    }
}

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles reloaded from ' . $source,
    'source' => $source,
    'count' => count($vehicles),
    'vehicles' => $vehicles,
    'timestamp' => time()
]);
