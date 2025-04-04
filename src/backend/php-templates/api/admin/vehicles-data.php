
<?php
/**
 * Enhanced API endpoint for retrieving vehicle data
 * Provides vehicle data from MySQL database with JSON file fallback
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

$logFile = $logDir . '/vehicles_data_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log request
file_put_contents($logFile, "[$timestamp] Vehicle data request received\n", FILE_APPEND);

// Try to include database utilities
$dbConnected = false;
try {
    // Include database utility functions
    require_once __DIR__ . '/../utils/database.php';
    require_once __DIR__ . '/../common/db_helper.php';
    $dbConnected = true;
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Database include error: " . $e->getMessage() . "\n", FILE_APPEND);
}

// Process query parameters
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;
$includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');
$forceRefresh = isset($_GET['force']) && ($_GET['force'] === 'true' || $_GET['force'] === '1');

// Check for persistent storage option
$fromPersistent = isset($_GET['persistent']) && ($_GET['persistent'] === 'true' || $_GET['persistent'] === '1');

file_put_contents($logFile, "[$timestamp] Parameters: id=$vehicleId, includeInactive=" . ($includeInactive ? 'true' : 'false') . 
                           ", force=" . ($forceRefresh ? 'true' : 'false') . "\n", FILE_APPEND);

// Default vehicles in case everything fails
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

// Function to get vehicles from database
function getVehiclesFromDatabase($includeInactive = false, $vehicleId = null, $logFile = null) {
    $timestamp = date('Y-m-d H:i:s');
    $vehicles = [];
    
    try {
        // Get database connection
        $conn = getDbConnectionWithRetry(3);
        
        if (!$conn) {
            throw new Exception("Failed to connect to database");
        }
        
        if ($logFile) {
            file_put_contents($logFile, "[$timestamp] Connected to database successfully\n", FILE_APPEND);
        }
        
        // Determine which table to use (vehicles is newer, vehicle_types is legacy)
        $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
        
        if ($logFile) {
            file_put_contents($logFile, "[$timestamp] Using table: $tableName\n", FILE_APPEND);
        }
        
        // Build query based on parameters
        $query = "SELECT * FROM `$tableName`";
        $params = [];
        $types = "";
        
        if ($vehicleId) {
            $query .= " WHERE vehicle_id = ?";
            $params[] = $vehicleId;
            $types .= "s";
        } elseif (!$includeInactive) {
            $query .= " WHERE is_active = 1";
        }
        
        // Execute the query
        $result = $conn->prepare($query);
        
        if (!$result) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        if (!empty($params)) {
            $result->bind_param($types, ...$params);
        }
        
        if (!$result->execute()) {
            throw new Exception("Failed to execute query: " . $result->error);
        }
        
        $dbResult = $result->get_result();
        
        if ($logFile) {
            file_put_contents($logFile, "[$timestamp] Query executed, processing results\n", FILE_APPEND);
        }
        
        // Process results
        while ($row = $dbResult->fetch_assoc()) {
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
        
        if ($logFile) {
            file_put_contents($logFile, "[$timestamp] Retrieved " . count($vehicles) . " vehicles from database\n", FILE_APPEND);
        }
        
        $conn->close();
        return $vehicles;
    } catch (Exception $e) {
        if ($logFile) {
            file_put_contents($logFile, "[$timestamp] Database error: " . $e->getMessage() . "\n", FILE_APPEND);
        }
        return [];
    }
}

// Function to get vehicles from persistent JSON cache
function getVehiclesFromPersistentCache($cacheDir, $includeInactive = false, $vehicleId = null) {
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    $vehicles = [];
    
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            $persistentData = json_decode($persistentJson, true);
            if (is_array($persistentData)) {
                if ($vehicleId) {
                    // Return specific vehicle
                    foreach ($persistentData as $vehicle) {
                        if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                            return [$vehicle];
                        }
                    }
                } else {
                    // Filter inactive if needed
                    if (!$includeInactive) {
                        $filteredData = array_filter($persistentData, function($vehicle) {
                            return $vehicle['isActive'] !== false;
                        });
                        return array_values($filteredData);
                    }
                    return $persistentData;
                }
            }
        }
    }
    
    return $vehicles;
}

// Main execution logic
$vehicles = [];
$source = 'unknown';

// Try getting vehicles from the database first
if ($dbConnected) {
    $vehicles = getVehiclesFromDatabase($includeInactive, $vehicleId, $logFile);
    if (!empty($vehicles)) {
        $source = 'database';
        file_put_contents($logFile, "[$timestamp] Successfully retrieved vehicles from database\n", FILE_APPEND);
    }
}

// If database fetch failed, try the persistent cache
if (empty($vehicles)) {
    $vehicles = getVehiclesFromPersistentCache($cacheDir, $includeInactive, $vehicleId);
    if (!empty($vehicles)) {
        $source = 'persistent_cache';
        file_put_contents($logFile, "[$timestamp] Using persistent cache as fallback\n", FILE_APPEND);
    }
}

// If both database and persistent cache failed, try static JSON file
if (empty($vehicles)) {
    $jsonFilePath = __DIR__ . '/../../../public/data/vehicles.json';
    
    if (file_exists($jsonFilePath)) {
        $jsonData = file_get_contents($jsonFilePath);
        if ($jsonData) {
            $staticVehicles = json_decode($jsonData, true);
            if (is_array($staticVehicles) && !empty($staticVehicles)) {
                if ($vehicleId) {
                    // Filter for specific vehicle
                    foreach ($staticVehicles as $vehicle) {
                        if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                            $vehicles = [$vehicle];
                            break;
                        }
                    }
                } else {
                    // Filter inactive if needed
                    if (!$includeInactive) {
                        $vehicles = array_filter($staticVehicles, function($vehicle) {
                            return $vehicle['isActive'] !== false;
                        });
                        $vehicles = array_values($vehicles);
                    } else {
                        $vehicles = $staticVehicles;
                    }
                }
                
                $source = 'static_json';
                file_put_contents($logFile, "[$timestamp] Using static JSON file as fallback\n", FILE_APPEND);
            }
        }
    }
}

// Last resort: use hardcoded default vehicles
if (empty($vehicles)) {
    if ($vehicleId) {
        // Filter for specific vehicle
        foreach ($defaultVehicles as $vehicle) {
            if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                $vehicles = [$vehicle];
                break;
            }
        }
    } else {
        // Filter inactive vehicles if needed
        if (!$includeInactive) {
            $vehicles = array_filter($defaultVehicles, function($vehicle) {
                return $vehicle['isActive'] !== false;
            });
        } else {
            $vehicles = $defaultVehicles;
        }
    }
    
    $source = 'default';
    file_put_contents($logFile, "[$timestamp] Using default hardcoded vehicles\n", FILE_APPEND);
}

// Log the status to the log file
file_put_contents($logFile, "[$timestamp] Returning " . count($vehicles) . " vehicles from source: $source\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request completed successfully\n", FILE_APPEND);

// Return the final response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles retrieved successfully',
    'source' => $source,
    'vehicles' => array_values($vehicles),
    'timestamp' => time(),
    'query' => [
        'vehicleId' => $vehicleId,
        'includeInactive' => $includeInactive,
        'forceRefresh' => $forceRefresh
    ]
]);
