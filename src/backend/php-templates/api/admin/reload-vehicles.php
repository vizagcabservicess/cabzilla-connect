
<?php
/**
 * reload-vehicles.php - Force reload vehicles from persistent storage
 * This script helps to ensure that cached vehicle data is refreshed from the persistent storage
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
    require_once '../../config.php'; // Include database config
    
    // The persistent cache file path - this is our SOURCE OF TRUTH
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    // Check if persistent file exists, if not create it
    if (!file_exists($persistentCacheFile)) {
        logMessage("Persistent cache file not found, creating default.");
        
        // Default vehicles to use if no persistent cache
        $defaultVehicles = [
            [
                "id" => "sedan",
                "vehicleId" => "sedan",
                "name" => "Sedan",
                "capacity" => 4,
                "luggageCapacity" => 2,
                "price" => 2500,
                "basePrice" => 2500,
                "pricePerKm" => 14,
                "image" => "/cars/sedan.png",
                "amenities" => ["AC", "Bottle Water", "Music System"],
                "description" => "Comfortable sedan suitable for 4 passengers.",
                "ac" => true,
                "nightHaltCharge" => 700,
                "driverAllowance" => 250,
                "isActive" => true
            ],
            [
                "id" => "ertiga",
                "vehicleId" => "ertiga",
                "name" => "Ertiga",
                "capacity" => 6,
                "luggageCapacity" => 3,
                "price" => 3200,
                "basePrice" => 3200,
                "pricePerKm" => 18,
                "image" => "/cars/ertiga.png",
                "amenities" => ["AC", "Bottle Water", "Music System", "Extra Legroom"],
                "description" => "Spacious SUV suitable for 6 passengers.",
                "ac" => true,
                "nightHaltCharge" => 1000,
                "driverAllowance" => 250,
                "isActive" => true
            ],
            [
                "id" => "innova_crysta",
                "vehicleId" => "innova_crysta",
                "name" => "Innova Crysta",
                "capacity" => 7,
                "luggageCapacity" => 4,
                "price" => 3800,
                "basePrice" => 3800,
                "pricePerKm" => 20,
                "image" => "/cars/innova.png",
                "amenities" => ["AC", "Bottle Water", "Music System", "Extra Legroom", "Charging Point"],
                "description" => "Premium SUV with ample space for 7 passengers.",
                "ac" => true,
                "nightHaltCharge" => 1000,
                "driverAllowance" => 250,
                "isActive" => true
            ]
        ];
        
        if (!file_put_contents($persistentCacheFile, json_encode($defaultVehicles, JSON_PRETTY_PRINT))) {
            throw new Exception("Failed to create persistent cache file");
        }
    }
    
    // Try to load vehicles from database first
    $vehiclesFromDb = [];
    
    try {
        // Connect to database
        $conn = getDbConnection();
        
        $query = "SELECT * FROM vehicles";
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            logMessage("Found {$result->num_rows} vehicles in database");
            
            while ($row = $result->fetch_assoc()) {
                // Convert from DB schema names to frontend property names
                $vehicle = [
                    'id' => $row['vehicle_id'],
                    'vehicleId' => $row['vehicle_id'],
                    'name' => $row['name'],
                    'capacity' => (int)$row['capacity'],
                    'luggageCapacity' => (int)$row['luggage_capacity'],
                    'basePrice' => (float)$row['base_price'],
                    'price' => (float)$row['base_price'], // For backward compatibility
                    'pricePerKm' => (float)$row['price_per_km'],
                    'image' => $row['image'],
                    'amenities' => json_decode($row['amenities'] ?? '["AC"]', true),
                    'description' => $row['description'],
                    'ac' => (bool)$row['ac'],
                    'nightHaltCharge' => (float)$row['night_halt_charge'],
                    'driverAllowance' => (float)$row['driver_allowance'],
                    'isActive' => (bool)$row['is_active']
                ];
                
                $vehiclesFromDb[] = $vehicle;
            }
            
            // Update the persistent cache with database data
            logMessage("Updating persistent cache with database data");
            file_put_contents($persistentCacheFile, json_encode($vehiclesFromDb, JSON_PRETTY_PRINT));
        } else {
            logMessage("No vehicles found in database. Will use persistent cache if it exists.");
        }
    } catch (Exception $dbError) {
        logMessage("Database error: " . $dbError->getMessage());
        logMessage("Will fall back to persistent cache file");
    }
    
    // Now load the persistent data
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
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid JSON in persistent cache file',
            'timestamp' => time(),
            'jsonError' => json_last_error_msg()
        ]);
        exit;
    }
    
    // Count the vehicles
    $vehicleCount = count($persistentData);
    logMessage("Loaded $vehicleCount vehicles from persistent cache");
    
    // If we have vehicles from the database but none in persistent cache, sync persistent cache with DB
    if (!empty($vehiclesFromDb) && empty($persistentData)) {
        logMessage("Syncing persistent cache from database");
        file_put_contents($persistentCacheFile, json_encode($vehiclesFromDb, JSON_PRETTY_PRINT));
        $persistentData = $vehiclesFromDb;
    }
    
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
    
    // Write the persistent data to a new cache file
    $result = file_put_contents($tempCacheFile, json_encode($persistentData, $jsonOptions));
    
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
    
    // If database is available, make sure it's in sync with our persistent storage
    if (!empty($vehiclesFromDb)) {
        try {
            $conn = getDbConnection();
            
            foreach ($persistentData as $vehicle) {
                $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'] ?? '';
                if (empty($vehicleId)) continue;
                
                // Check if this vehicle exists in DB
                $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?");
                $checkStmt->bind_param("s", $vehicleId);
                $checkStmt->execute();
                $result = $checkStmt->get_result();
                $row = $result->fetch_assoc();
                
                if ($row['count'] == 0) {
                    // Vehicle doesn't exist in DB, insert it
                    $name = $vehicle['name'] ?? '';
                    $capacity = $vehicle['capacity'] ?? 4;
                    $luggageCapacity = $vehicle['luggageCapacity'] ?? 2;
                    $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                    $image = $vehicle['image'] ?? '';
                    $amenities = isset($vehicle['amenities']) ? json_encode($vehicle['amenities']) : null;
                    $description = $vehicle['description'] ?? '';
                    $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                    $basePrice = $vehicle['basePrice'] ?? $vehicle['price'] ?? 0;
                    $pricePerKm = $vehicle['pricePerKm'] ?? 0;
                    $nightHaltCharge = $vehicle['nightHaltCharge'] ?? 700;
                    $driverAllowance = $vehicle['driverAllowance'] ?? 250;
                    
                    $insertStmt = $conn->prepare("INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, 
                        base_price, price_per_km, night_halt_charge, driver_allowance) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    
                    $insertStmt->bind_param("ssiissssidddd", 
                        $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenities, 
                        $description, $isActive, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    
                    if ($insertStmt->execute()) {
                        logMessage("Inserted vehicle $vehicleId from persistent cache to database");
                    } else {
                        logMessage("Failed to insert vehicle $vehicleId: " . $insertStmt->error);
                    }
                } else {
                    // Vehicle exists, update it
                    $name = $vehicle['name'] ?? '';
                    $capacity = $vehicle['capacity'] ?? 4;
                    $luggageCapacity = $vehicle['luggageCapacity'] ?? 2;
                    $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                    $image = $vehicle['image'] ?? '';
                    $amenities = isset($vehicle['amenities']) ? json_encode($vehicle['amenities']) : null;
                    $description = $vehicle['description'] ?? '';
                    $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                    $basePrice = $vehicle['basePrice'] ?? $vehicle['price'] ?? 0;
                    $pricePerKm = $vehicle['pricePerKm'] ?? 0;
                    $nightHaltCharge = $vehicle['nightHaltCharge'] ?? 700;
                    $driverAllowance = $vehicle['driverAllowance'] ?? 250;
                    
                    $updateStmt = $conn->prepare("UPDATE vehicles SET 
                        name = ?, capacity = ?, luggage_capacity = ?, ac = ?, image = ?, 
                        amenities = ?, description = ?, is_active = ?, base_price = ?, 
                        price_per_km = ?, night_halt_charge = ?, driver_allowance = ? 
                        WHERE vehicle_id = ?");
                    
                    $updateStmt->bind_param("siisssiiddds", 
                        $name, $capacity, $luggageCapacity, $ac, $image, $amenities, 
                        $description, $isActive, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                    
                    if ($updateStmt->execute()) {
                        logMessage("Updated vehicle $vehicleId in database");
                    } else {
                        logMessage("Failed to update vehicle $vehicleId: " . $updateStmt->error);
                    }
                }
            }
            
            logMessage("Database sync complete");
            
        } catch (Exception $syncError) {
            logMessage("Error syncing with database: " . $syncError->getMessage());
        }
    }
    
    logMessage("Successfully reloaded $vehicleCount vehicles, cleared $cleared cache files, and created new cache at " . basename($tempCacheFile));
    
    // Return success response with detailed information
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully reloaded vehicles from persistent storage",
        'count' => $vehicleCount,
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
