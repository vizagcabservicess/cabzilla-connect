<?php
/**
 * ENHANCED - Special endpoint for vehicle data with ultra-robust CORS support
 * This file serves as a CORS-friendly wrapper for the main vehicles-data.php
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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *');
header('Access-Control-Max-Age: 86400'); 
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
header('X-Content-Type-Options: nosniff');

// Add debugging headers
header('X-API-Version: 1.4.0');
header('X-CORS-Status: Ultra-Enhanced');
header('X-Debug-Endpoint: vehicles-data');
header('X-Debug-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
header('X-Debug-Method: ' . $_SERVER['REQUEST_METHOD']);

// Include the database helper
require_once __DIR__ . '/common/db_helper.php';

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

// Function to get vehicles from database
function getVehiclesFromDb($includeInactive = false, $specificId = null) {
    try {
        $conn = getDbConnectionWithRetry();
        
        // Build the query based on parameters
        $query = "SELECT * FROM vehicles";
        $params = [];
        $types = "";
        
        $whereConditions = [];
        
        if (!$includeInactive) {
            $whereConditions[] = "is_active = 1";
        }
        
        if ($specificId) {
            $whereConditions[] = "(id = ? OR vehicle_id = ?)";
            $params[] = $specificId;
            $params[] = $specificId;
            $types .= "ss";
        }
        
        if (!empty($whereConditions)) {
            $query .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        $query .= " ORDER BY name ASC";
        
        $stmt = $conn->prepare($query);
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $vehicles = [];
        while ($row = $result->fetch_assoc()) {
            // Process amenities
            $amenities = $row['amenities'] ?? '[]';
            if (!is_array($amenities)) {
                try {
                    $amenitiesArray = json_decode($amenities, true);
                    if (is_array($amenitiesArray)) {
                        $row['amenities'] = $amenitiesArray;
                    } else {
                        $row['amenities'] = explode(',', str_replace(['[', ']', '"', "'"], '', $amenities));
                    }
                } catch (Exception $e) {
                    $row['amenities'] = explode(',', str_replace(['[', ']', '"', "'"], '', $amenities));
                }
            }
            
            // Convert vehicle data to proper format for frontend
            $vehicle = [
                'id' => $row['id'] ?? $row['vehicle_id'] ?? '',
                'vehicleId' => $row['vehicle_id'] ?? $row['id'] ?? '',
                'name' => $row['name'] ?? '',
                'capacity' => (int)($row['capacity'] ?? 4),
                'luggageCapacity' => (int)($row['luggage_capacity'] ?? 2),
                'price' => (float)($row['base_price'] ?? 0),
                'basePrice' => (float)($row['base_price'] ?? 0),
                'pricePerKm' => (float)($row['price_per_km'] ?? 0),
                'image' => $row['image'] ?? '/cars/sedan.png',
                'amenities' => $row['amenities'] ?? ['AC'],
                'description' => $row['description'] ?? '',
                'ac' => $row['ac'] ? true : false,
                'nightHaltCharge' => (float)($row['night_halt_charge'] ?? 700),
                'driverAllowance' => (float)($row['driver_allowance'] ?? 250),
                'isActive' => $row['is_active'] ? true : false
            ];
            
            $vehicles[] = $vehicle;
        }
        
        $conn->close();
        logMessage("Retrieved " . count($vehicles) . " vehicles from database", "vehicles-data.log");
        return $vehicles;
    } catch (Exception $e) {
        logMessage("Error fetching vehicles from database: " . $e->getMessage(), "vehicles-data.log");
        throw $e;
    }
}

// Try to include the main file
try {
    // Log the attempt
    logMessage("Enhanced vehicles-data.php wrapper: Processing request", "vehicles-data.log");
    
    $vehicles = [];
    
    // Try to get vehicles directly from database first
    try {
        $vehicles = getVehiclesFromDb($includeInactive, $vehicleId);
    } catch (Exception $e) {
        logMessage("Error getting vehicles from database: " . $e->getMessage(), "vehicles-data.log");
        
        // Try to include the main file if it exists as fallback
        if (file_exists(__DIR__ . '/fares/vehicles-data.php')) {
            require_once __DIR__ . '/fares/vehicles-data.php';
            logMessage("Used fares/vehicles-data.php as fallback", "vehicles-data.log");
        } else {
            throw new Exception("Backend file fares/vehicles-data.php not found and database query failed");
        }
    }
    
    // If we have no vehicles at this point, check JSON file as backup
    if (empty($vehicles)) {
        $vehiclesJson = __DIR__ . '/../../data/vehicles.json';
        
        if (file_exists($vehiclesJson)) {
            $jsonContent = file_get_contents($vehiclesJson);
            $jsonData = json_decode($jsonContent, true);
            if ($jsonData && is_array($jsonData)) {
                $vehicles = $jsonData;
                logMessage("Retrieved " . count($vehicles) . " vehicles from JSON file", "vehicles-data.log");
            }
        }
    }
    
    // If still no vehicles, return default set
    if (empty($vehicles)) {
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
                'id' => 'tempo',
                'vehicleId' => 'tempo',
                'name' => 'Tempo Traveller',
                'capacity' => 12,
                'luggageCapacity' => 8,
                'price' => 6000,
                'basePrice' => 6000,
                'pricePerKm' => 22,
                'image' => '/cars/tempo.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                'description' => 'Spacious vehicle for large groups.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ],
            [
                'id' => 'luxury',
                'vehicleId' => 'luxury',
                'name' => 'Luxury Sedan',
                'capacity' => 4,
                'luggageCapacity' => 3,
                'price' => 5000,
                'basePrice' => 5000,
                'pricePerKm' => 25,
                'image' => '/cars/luxury.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Premium Seats', 'Charging Point'],
                'description' => 'Premium luxury sedan for comfortable rides.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ]
        ];
    }
    
    // Filter inactive vehicles if not requested
    if (!$includeInactive) {
        $vehicles = array_filter($vehicles, function($vehicle) {
            return isset($vehicle['isActive']) ? $vehicle['isActive'] : true;
        });
    }
    
    // Filter by specific ID if requested
    if ($vehicleId && !empty($vehicles)) {
        $filteredVehicles = array_filter($vehicles, function($vehicle) use ($vehicleId) {
            return $vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId;
        });
        
        if (!empty($filteredVehicles)) {
            $vehicles = array_values($filteredVehicles);
        }
    }
    
    // Output vehicles
    echo json_encode([
        'vehicles' => array_values($vehicles),
        'count' => count($vehicles),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time(),
        'source' => 'database',
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none',
            'forced' => $forceRefresh
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // In case of error, return a fallback response
    logMessage("Error in enhanced vehicles-data.php wrapper: " . $e->getMessage(), "vehicles-data.log");
    
    // Check if JSON file exists as backup
    $vehiclesJson = __DIR__ . '/../../data/vehicles.json';
    $vehicles = [];
    
    if (file_exists($vehiclesJson)) {
        $jsonContent = file_get_contents($vehiclesJson);
        $jsonData = json_decode($jsonContent, true);
        if ($jsonData && is_array($jsonData)) {
            $vehicles = $jsonData;
            logMessage("Retrieved " . count($vehicles) . " vehicles from JSON file", "vehicles-data.log");
        }
    }
    
    // If still no vehicles, return default set
    if (empty($vehicles)) {
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
                'id' => 'tempo',
                'vehicleId' => 'tempo',
                'name' => 'Tempo Traveller',
                'capacity' => 12,
                'luggageCapacity' => 8,
                'price' => 6000,
                'basePrice' => 6000,
                'pricePerKm' => 22,
                'image' => '/cars/tempo.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                'description' => 'Spacious vehicle for large groups.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ],
            [
                'id' => 'luxury',
                'vehicleId' => 'luxury',
                'name' => 'Luxury Sedan',
                'capacity' => 4,
                'luggageCapacity' => 3,
                'price' => 5000,
                'basePrice' => 5000,
                'pricePerKm' => 25,
                'image' => '/cars/luxury.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Premium Seats', 'Charging Point'],
                'description' => 'Premium luxury sedan for comfortable rides.',
                'ac' => true,
                'nightHaltCharge' => 1500,
                'driverAllowance' => 300,
                'isActive' => true
            ]
        ];
    }
    
    // Filter inactive vehicles if not requested
    if (!$includeInactive) {
        $vehicles = array_filter($vehicles, function($vehicle) {
            return isset($vehicle['isActive']) ? $vehicle['isActive'] : true;
        });
    }
    
    // Output fallback vehicles with error info
    echo json_encode([
        'vehicles' => array_values($vehicles),
        'count' => count($vehicles),
        'error' => $e->getMessage(),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time(),
        'source' => 'fallback',
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'error' => $e->getMessage(),
            'get' => $_GET,
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none'
        ]
    ], JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
}
