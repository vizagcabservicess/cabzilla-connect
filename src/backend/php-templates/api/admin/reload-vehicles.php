<?php
/**
 * reload-vehicles.php - Reloads vehicle data from database
 * ENHANCED: Now prioritizes database over file storage
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
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
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_reload_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

logDebug("Vehicle reload requested");

// Load database utilities if available
if (file_exists(__DIR__ . '/../utils/database.php')) {
    require_once __DIR__ . '/../utils/database.php';
}

// Ensure we have a persistent backup before each reload operation
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$backupFile = $cacheDir . '/vehicles_persistent_backup_' . date('Y-m-d_H-i-s') . '.json';

if (file_exists($persistentCacheFile)) {
    copy($persistentCacheFile, $backupFile);
    logDebug("Created backup of persistent cache at: " . basename($backupFile));
}

// DATABASE FIRST APPROACH: Try to fetch data from the actual database
$dbVehicles = [];
$useDatabase = false;

// Try to connect to the database
try {
    $conn = null;
    
    // Try to use config file first
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
        }
    }
    
    // If no connection yet, try direct connection
    if (!$conn && class_exists('mysqli')) {
        // Fallback database credentials if config not available
        $dbHost = 'localhost';
        $dbName = 'u64460565_db_be';
        $dbUser = 'u64460565_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            logDebug("Direct DB connection failed: " . $conn->connect_error);
        } else {
            $conn->set_charset("utf8mb4");
        }
    }
    
    if ($conn) {
        logDebug("Connected to database successfully");
        $useDatabase = true;
        
        // Query the vehicles table
        $query = "SELECT * FROM vehicles WHERE 1";
        $result = $conn->query($query);
        
        if ($result) {
            logDebug("Successfully queried vehicles table");
            while ($row = $result->fetch_assoc()) {
                $amenities = [];
                
                // Parse amenities from JSON or string
                if (!empty($row['amenities'])) {
                    if (substr($row['amenities'], 0, 1) === '[') {
                        // Try to parse as JSON array
                        try {
                            $amenities = json_decode($row['amenities'], true);
                            if (!is_array($amenities)) {
                                $amenities = explode(',', str_replace(['[', ']', '"', "'"], '', $row['amenities']));
                            }
                        } catch (Exception $e) {
                            $amenities = explode(',', str_replace(['[', ']', '"', "'"], '', $row['amenities']));
                        }
                    } else {
                        // Parse as comma-separated string
                        $amenities = explode(',', $row['amenities']);
                    }
                }
                
                // Parse numeric values to proper types
                $dbVehicles[] = [
                    'id' => $row['vehicle_id'] ?? $row['id'],
                    'vehicleId' => $row['vehicle_id'] ?? $row['id'],
                    'name' => $row['name'],
                    'capacity' => (int)($row['capacity'] ?? 4),
                    'luggageCapacity' => (int)($row['luggage_capacity'] ?? 2),
                    'price' => (float)($row['base_price'] ?? 0),
                    'basePrice' => (float)($row['base_price'] ?? 0),
                    'pricePerKm' => (float)($row['price_per_km'] ?? 0),
                    'image' => $row['image'] ?? ('/cars/' . ($row['vehicle_id'] ?? $row['id']) . '.png'),
                    'amenities' => $amenities,
                    'description' => $row['description'] ?? '',
                    'ac' => (bool)($row['ac'] ?? true),
                    'nightHaltCharge' => (float)($row['night_halt_charge'] ?? 700),
                    'driverAllowance' => (float)($row['driver_allowance'] ?? 250),
                    'isActive' => (bool)($row['is_active'] ?? true)
                ];
            }
            
            logDebug("Loaded " . count($dbVehicles) . " vehicles from database");
        }
        
        $conn->close();
    }
} catch (Exception $e) {
    logDebug("Database error: " . $e->getMessage());
}

// Load data from persistent storage (as fallback or to merge with DB data)
$persistentVehicles = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentVehicles = json_decode($persistentJson, true);
            if (!is_array($persistentVehicles)) {
                $persistentVehicles = [];
                logDebug("Persistent data is not an array");
            } else {
                logDebug("Loaded " . count($persistentVehicles) . " vehicles from persistent cache");
            }
        } catch (Exception $e) {
            logDebug("Failed to parse persistent JSON: " . $e->getMessage());
            $persistentVehicles = [];
        }
    } else {
        logDebug("Persistent cache file exists but is empty");
    }
} else {
    logDebug("Persistent cache file does not exist");
}

// IMPORTANT: DATABASE FIRST APPROACH - Use database as source of truth when available
$finalVehicles = [];

if (count($dbVehicles) > 0) {
    // Create an associative array by ID for easier merging
    $vehiclesById = [];
    
    // First, index the persistent vehicles for reference
    foreach ($persistentVehicles as $vehicle) {
        $id = $vehicle['id'] ?? $vehicle['vehicleId'] ?? '';
        if (!empty($id)) {
            $vehiclesById[$id] = $vehicle;
        }
    }
    
    // Database vehicles become our base but we keep any fields from persistent storage 
    // that might not be in the database schema
    foreach ($dbVehicles as $dbVehicle) {
        $id = $dbVehicle['id'] ?? $dbVehicle['vehicleId'] ?? '';
        if (!empty($id)) {
            if (isset($vehiclesById[$id])) {
                // Merge but with database taking precedence for core fields
                $mergedVehicle = array_merge($vehiclesById[$id], $dbVehicle);
                $finalVehicles[] = $mergedVehicle;
            } else {
                $finalVehicles[] = $dbVehicle;
            }
        }
    }
    
    logDebug("Using database as primary source with " . count($finalVehicles) . " vehicles");
} else {
    // If no database data, use persistent vehicles
    $finalVehicles = $persistentVehicles;
    logDebug("Using persistent storage data with " . count($finalVehicles) . " vehicles");
}

// If we still have no data, try to load from static data files
if (empty($finalVehicles)) {
    logDebug("No vehicles found in database or persistent storage, attempting to load from static data");
    
    // Look for vehicles.json in public/data directory
    $staticDataFile = __DIR__ . '/../../../../public/data/vehicles.json';
    if (file_exists($staticDataFile)) {
        $staticJson = file_get_contents($staticDataFile);
        if ($staticJson) {
            try {
                $staticData = json_decode($staticJson, true);
                if (is_array($staticData) && !empty($staticData)) {
                    $finalVehicles = $staticData;
                    logDebug("Loaded " . count($finalVehicles) . " vehicles from static JSON file");
                }
            } catch (Exception $e) {
                logDebug("Failed to parse static JSON: " . $e->getMessage());
            }
        }
    }
}

// If we still have no data, create demo data
if (empty($finalVehicles)) {
    $finalVehicles = [
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
    
    logDebug("No vehicles found anywhere, using demo data");
}

// IMPORTANT: Always save the current merged set to persistent storage
// This ensures the persistent cache is always up-to-date even if from demo data
if (file_put_contents($persistentCacheFile, json_encode($finalVehicles, JSON_PRETTY_PRINT))) {
    logDebug("Updated persistent cache with " . count($finalVehicles) . " vehicles");
} else {
    logDebug("Failed to write to persistent cache file");
}

// Filter inactive vehicles if requested
$includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
if (!$includeInactive) {
    $vehicleCount = count($finalVehicles);
    $finalVehicles = array_filter($finalVehicles, function($vehicle) {
        return isset($vehicle['isActive']) ? $vehicle['isActive'] === true : true;
    });
    $finalVehicles = array_values($finalVehicles); // Re-index array
    logDebug("Filtered inactive vehicles. Before: $vehicleCount, After: " . count($finalVehicles));
}

// Clear all regular cache files (except the persistent one)
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logDebug("Cleared cache file: " . basename($file));
    }
}

// Save to temporary cache file for faster future access
$tempCacheFile = $cacheDir . '/vehicles_' . ($includeInactive ? 'all' : 'active') . '.json';
file_put_contents($tempCacheFile, json_encode([
    'status' => 'success',
    'timestamp' => time(),
    'vehicles' => $finalVehicles
], JSON_PRETTY_PRINT));
logDebug("Saved to temporary cache file: " . basename($tempCacheFile));

// Return the data as JSON
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles reloaded from ' . ($useDatabase ? 'database' : 'persistent storage'),
    'count' => count($finalVehicles),
    'timestamp' => time(),
    'vehicles' => $finalVehicles
], JSON_PRETTY_PRINT);

logDebug("Vehicle reload completed. Returned " . count($finalVehicles) . " vehicles");
