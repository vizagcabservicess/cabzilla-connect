<?php
// Set up error reporting and logging for debugging
ini_set('display_errors', 0);
error_reporting(E_ALL);
error_log("vehicles-data.php accessed at " . date('Y-m-d H:i:s'), 3, __DIR__ . '/../../../error.log');

// Include necessary config
require_once __DIR__ . '/../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add extra cache busting headers
header('X-Cache-Timestamp: ' . time());
header('X-API-Version: '.'1.0.10'); // Updated version number

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
$requestDetails = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query_string' => $_SERVER['QUERY_STRING'] ?? '',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
    'includeInactive' => isset($_GET['includeInactive']) ? $_GET['includeInactive'] : 'false',
    'timestamp' => time()
];
error_log("vehicles-data.php request details: " . json_encode($requestDetails), 3, __DIR__ . '/../../../error.log');

// Check if cache was invalidated by looking for marker file
$cacheMarkerFile = __DIR__ . '/../../../data/vehicle_cache_invalidated.txt';
$cacheInvalidated = false;
if (file_exists($cacheMarkerFile)) {
    $lastInvalidated = (int)file_get_contents($cacheMarkerFile);
    $currentTime = time();
    // If invalidated in the last 5 minutes
    if ($currentTime - $lastInvalidated < 300) {
        $cacheInvalidated = true;
        error_log("Cache was invalidated, forcing refresh");
    }
}

// Global fallback vehicles to return in case of database issues
$fallbackVehicles = [
    [
        'id' => 'sedan',
        'name' => 'Sedan',
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 4200,
        'basePrice' => 4200,
        'pricePerKm' => 14,
        'image' => '/cars/sedan.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System'],
        'description' => 'Comfortable sedan suitable for 4 passengers.',
        'ac' => true,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'sedan'
    ],
    [
        'id' => 'ertiga',
        'name' => 'Ertiga',
        'capacity' => 6,
        'luggageCapacity' => 3,
        'price' => 5400,
        'basePrice' => 5400,
        'pricePerKm' => 18,
        'image' => '/cars/ertiga.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
        'description' => 'Spacious SUV suitable for 6 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'ertiga'
    ],
    [
        'id' => 'innova_crysta',
        'name' => 'Innova Crysta',
        'capacity' => 7,
        'luggageCapacity' => 4,
        'price' => 6000,
        'basePrice' => 6000,
        'pricePerKm' => 20,
        'image' => '/cars/innova.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
        'description' => 'Premium SUV with ample space for 7 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'innova_crysta'
    ]
];

// Helper function to check if a table exists
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return $result && $result->num_rows > 0;
}

// Helper function to check if a column exists
function columnExists($conn, $tableName, $columnName) {
    $result = $conn->query("SHOW COLUMNS FROM `$tableName` LIKE '$columnName'");
    return $result && $result->num_rows > 0;
}

// Helper function to normalize image paths
function normalizeImagePath($imagePath) {
    // Return default if empty
    if (empty($imagePath)) {
        return '/cars/sedan.png';
    }
    
    // If it's a URL, extract just the filename
    if (strpos($imagePath, 'http') === 0) {
        $filename = basename(parse_url($imagePath, PHP_URL_PATH));
        return '/cars/' . $filename;
    }
    
    // If it doesn't have /cars/ prefix, add it
    if (strpos($imagePath, '/cars/') === false) {
        return '/cars/' . basename($imagePath);
    }
    
    return $imagePath;
}

// Function to get data from specific fare tables
function getSpecializedFareData($conn, $vehicleId) {
    $fareData = [
        'outstation' => null,
        'local' => null,
        'airport' => null
    ];
    
    // Try to get outstation fares from outstation_fares table
    try {
        if (tableExists($conn, 'outstation_fares')) {
            $outstationQuery = $conn->prepare("
                SELECT 
                    base_price as basePrice, 
                    price_per_km as pricePerKm, 
                    night_halt_charge as nightHaltCharge, 
                    driver_allowance as driverAllowance,
                    roundtrip_base_price as roundTripBasePrice, 
                    roundtrip_price_per_km as roundTripPricePerKm
                FROM outstation_fares 
                WHERE vehicle_id = ?
            ");
            
            if ($outstationQuery) {
                $outstationQuery->bind_param("s", $vehicleId);
                $outstationQuery->execute();
                $result = $outstationQuery->get_result();
                
                if ($result && $result->num_rows > 0) {
                    $fareData['outstation'] = $result->fetch_assoc();
                    error_log("Found outstation fares for $vehicleId in outstation_fares table: " . json_encode($fareData['outstation']));
                } else {
                    error_log("No records found in outstation_fares for vehicle_id: $vehicleId");
                }
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching outstation fares: " . $e->getMessage());
    }
    
    // Try to get local fares
    try {
        if (tableExists($conn, 'local_package_fares')) {
            $localQuery = $conn->prepare("
                SELECT price_4hrs_40km as price4hrs40km, price_8hrs_80km as price8hrs80km,
                       price_10hrs_100km as price10hrs100km, price_extra_km as priceExtraKm,
                       price_extra_hour as priceExtraHour
                FROM local_package_fares 
                WHERE vehicle_id = ?
            ");
            
            if ($localQuery) {
                $localQuery->bind_param("s", $vehicleId);
                $localQuery->execute();
                $result = $localQuery->get_result();
                
                if ($result && $result->num_rows > 0) {
                    $fareData['local'] = $result->fetch_assoc();
                }
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching local fares: " . $e->getMessage());
    }
    
    // Try to get airport fares
    try {
        if (tableExists($conn, 'airport_transfer_fares')) {
            $airportQuery = $conn->prepare("
                SELECT base_price as basePrice, price_per_km as pricePerKm,
                       pickup_price as pickupPrice, drop_price as dropPrice,
                       tier1_price as tier1Price, tier2_price as tier2Price,
                       tier3_price as tier3Price, tier4_price as tier4Price,
                       extra_km_charge as extraKmCharge
                FROM airport_transfer_fares 
                WHERE vehicle_id = ?
            ");
            
            if ($airportQuery) {
                $airportQuery->bind_param("s", $vehicleId);
                $airportQuery->execute();
                $result = $airportQuery->get_result();
                
                if ($result && $result->num_rows > 0) {
                    $fareData['airport'] = $result->fetch_assoc();
                }
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching airport fares: " . $e->getMessage());
    }
    
    // Also check vehicle_pricing table for additional fare data
    try {
        if (tableExists($conn, 'vehicle_pricing')) {
            // First check for outstation data
            $outstationQuery = $conn->prepare("
                SELECT 
                    base_fare AS basePrice,
                    price_per_km AS pricePerKm,
                    night_halt_charge AS nightHaltCharge,
                    driver_allowance AS driverAllowance
                FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'outstation'
            ");
            
            if ($outstationQuery) {
                $outstationQuery->bind_param("s", $vehicleId);
                $outstationQuery->execute();
                $result = $outstationQuery->get_result();
                
                if ($result && $result->num_rows > 0 && !$fareData['outstation']) {
                    $fareData['outstation'] = $result->fetch_assoc();
                }
            }
            
            // Check for local data
            $localQuery = $conn->prepare("
                SELECT 
                    local_package_4hr AS price4hrs40km,
                    local_package_8hr AS price8hrs80km,
                    local_package_10hr AS price10hrs100km,
                    extra_km_charge AS priceExtraKm,
                    extra_hour_charge AS priceExtraHour
                FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local'
            ");
            
            if ($localQuery) {
                $localQuery->bind_param("s", $vehicleId);
                $localQuery->execute();
                $result = $localQuery->get_result();
                
                if ($result && $result->num_rows > 0 && !$fareData['local']) {
                    $fareData['local'] = $result->fetch_assoc();
                }
            }
            
            // Check for airport data
            $airportQuery = $conn->prepare("
                SELECT 
                    base_fare AS basePrice,
                    price_per_km AS pricePerKm
                FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'airport'
            ");
            
            if ($airportQuery) {
                $airportQuery->bind_param("s", $vehicleId);
                $airportQuery->execute();
                $result = $airportQuery->get_result();
                
                if ($result && $result->num_rows > 0 && !$fareData['airport']) {
                    $fareData['airport'] = $result->fetch_assoc();
                }
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching data from vehicle_pricing: " . $e->getMessage());
    }
    
    return $fareData;
}

// First, try to get vehicles from local JSON file for consistency
function getVehiclesFromJson() {
    $jsonFile = __DIR__ . '/../../../data/vehicles.json';
    $vehicles = [];
    
    if (file_exists($jsonFile)) {
        $content = file_get_contents($jsonFile);
        if (!empty($content)) {
            $jsonData = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                // Normalize image paths in the JSON data
                foreach ($jsonData as &$vehicle) {
                    if (isset($vehicle['image'])) {
                        $vehicle['image'] = normalizeImagePath($vehicle['image']);
                    }
                    
                    // Ensure all required fields exist
                    $vehicle['id'] = $vehicle['id'] ?? $vehicle['vehicleId'] ?? 'unknown';
                    $vehicle['vehicleId'] = $vehicle['vehicleId'] ?? $vehicle['id'] ?? 'unknown';
                    $vehicle['isActive'] = isset($vehicle['isActive']) ? (bool)$vehicle['isActive'] : true;
                }
                $vehicles = $jsonData;
                error_log("Successfully loaded " . count($vehicles) . " vehicles from JSON file");
            } else {
                error_log("Error parsing JSON file: " . json_last_error_msg());
            }
        } else {
            error_log("JSON file exists but is empty");
        }
    } else {
        error_log("JSON file does not exist: " . $jsonFile);
    }
    
    return $vehicles;
}

// Handle requests
try {
    // Check if we should include inactive vehicles (admin only)
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    error_log("Include inactive vehicles: " . ($includeInactive ? 'true' : 'false'));
    
    // Add cache busting parameter
    $cacheBuster = isset($_GET['_t']) ? $_GET['_t'] : time();
    $forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
    
    // If cache was invalidated or force refresh requested, skip JSON file
    $skipJsonFile = $forceRefresh || $cacheInvalidated;
    
    // Get vehicles from JSON file if applicable
    $jsonVehicles = [];
    if (!$skipJsonFile) {
        $jsonVehicles = getVehiclesFromJson();
        
        // If we got vehicles from JSON and don't need to force refresh, return them
        if (!empty($jsonVehicles) && !$forceRefresh) {
            // Filter inactive vehicles if needed
            if (!$includeInactive) {
                $jsonVehicles = array_filter($jsonVehicles, function($vehicle) {
                    return $vehicle['isActive'] ?? true;
                });
                // Re-index array after filtering
                $jsonVehicles = array_values($jsonVehicles);
            }
            
            error_log("Returning " . count($jsonVehicles) . " vehicles from JSON file");
            echo json_encode([
                'vehicles' => $jsonVehicles,
                'timestamp' => time(),
                'cached' => true,
                'source' => 'json',
                'version' => '1.0.10', // Updated version
                'includeInactive' => $includeInactive
            ]);
            exit;
        }
    }
    
    // Connect to database
    $conn = getDbConnection();

    if (!$conn) {
        error_log("Database connection failed in vehicles-data.php, using JSON or fallback vehicles");
        
        // If we have JSON vehicles but we needed a force refresh, still return them as fallback
        if (!empty($jsonVehicles)) {
            echo json_encode([
                'vehicles' => $jsonVehicles,
                'timestamp' => time(),
                'cached' => true,
                'source' => 'json-fallback',
                'fallback' => true
            ]);
            exit;
        }
        
        // Otherwise use hardcoded fallback vehicles
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true
        ]);
        exit;
    }
    
    // We'll gather vehicles from both vehicle_types and vehicles tables
    $allVehicles = [];
    $vehicleIds = [];
    
    // First get vehicles from vehicle_types table
    if (tableExists($conn, 'vehicle_types')) {
        error_log("Getting vehicles from vehicle_types table");
        
        // Build query to get all vehicles or only active ones
        $query = "SELECT * FROM vehicle_types";
        
        // Only add the WHERE clause if we're not including inactive vehicles
        if (!$includeInactive && columnExists($conn, 'vehicle_types', 'is_active')) {
            $query .= " WHERE is_active = 1";
        }
        
        $query .= " ORDER BY name";
        
        error_log("vehicle_types query: " . $query);
        
        $result = $conn->query($query);
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                // Get vehicle ID
                $vehicleId = $row['vehicle_id'] ?? $row['id'] ?? null;
                
                if (!$vehicleId) {
                    continue;
                }
                
                // Add to vehicle IDs list
                $vehicleIds[] = $vehicleId;
                
                // Get specialized fare data
                $fareData = getSpecializedFareData($conn, $vehicleId);
                
                // Parse amenities from JSON string or comma-separated list
                $amenities = [];
                if (!empty($row['amenities'])) {
                    $decoded = json_decode($row['amenities'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $amenities = $decoded;
                    } else {
                        $amenities = array_map('trim', explode(',', $row['amenities']));
                    }
                }
                
                // Default amenities if empty
                if (empty($amenities)) {
                    $amenities = ['AC', 'Bottle Water', 'Music System'];
                }
                
                // Ensure name is always a string, use vehicle_id as fallback
                $name = $row['name'] ?? '';
                if (empty($name) || $name === '0') {
                    $name = ucfirst(str_replace('_', ' ', $vehicleId));
                }
                
                // Ensure proper handling of is_active field
                $isActive = true; // Default to active
                if (isset($row['is_active'])) {
                    $isActive = (bool)(int)$row['is_active'];
                }
                
                // Format vehicle data with consistent property names for frontend
                $vehicle = [
                    'id' => (string)$vehicleId,
                    'name' => $name,
                    'capacity' => intval($row['capacity'] ?? $row['seats'] ?? 4),
                    'luggageCapacity' => intval($row['luggage_capacity'] ?? $row['luggage'] ?? 2),
                    'image' => normalizeImagePath($row['image'] ?? '/cars/sedan.png'),
                    'amenities' => $amenities,
                    'description' => $row['description'] ?? "$name vehicle",
                    'ac' => (bool)($row['ac'] ?? 1),
                    'isActive' => $isActive,
                    'vehicleId' => (string)$vehicleId
                ];
                
                // Include outstation fare data if available
                if ($fareData['outstation']) {
                    $vehicle['outstationFares'] = $fareData['outstation'];
                    $vehicle['basePrice'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['price'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['pricePerKm'] = floatval($fareData['outstation']['pricePerKm'] ?? 0);
                    $vehicle['nightHaltCharge'] = floatval($fareData['outstation']['nightHaltCharge'] ?? 0);
                    $vehicle['driverAllowance'] = floatval($fareData['outstation']['driverAllowance'] ?? 0);
                } else {
                    // Provide default pricing values
                    $vehicle['basePrice'] = 0;
                    $vehicle['price'] = 0;
                    $vehicle['pricePerKm'] = 0;
                    $vehicle['nightHaltCharge'] = 0;
                    $vehicle['driverAllowance'] = 0;
                    
                    // Get pricing from vehicle_pricing table
                    if (tableExists($conn, 'vehicle_pricing')) {
                        $pricingQuery = $conn->prepare("
                            SELECT 
                                base_fare as baseFare, 
                                base_price as basePrice,
                                price_per_km as pricePerKm, 
                                night_halt_charge as nightHaltCharge, 
                                driver_allowance as driverAllowance
                            FROM vehicle_pricing 
                            WHERE vehicle_id = ? AND (trip_type = 'outstation' OR trip_type = 'all')
                            LIMIT 1
                        ");
                        
                        if ($pricingQuery) {
                            $pricingQuery->bind_param("s", $vehicleId);
                            $pricingQuery->execute();
                            $pricingResult = $pricingQuery->get_result();
                            
                            if ($pricingResult && $pricingResult->num_rows > 0) {
                                $pricing = $pricingResult->fetch_assoc();
                                $vehicle['basePrice'] = floatval($pricing['basePrice'] ?? $pricing['baseFare'] ?? 0);
                                $vehicle['price'] = floatval($pricing['basePrice'] ?? $pricing['baseFare'] ?? 0);
                                $vehicle['pricePerKm'] = floatval($pricing['pricePerKm'] ?? 0);
                                $vehicle['nightHaltCharge'] = floatval($pricing['nightHaltCharge'] ?? 0);
                                $vehicle['driverAllowance'] = floatval($pricing['driverAllowance'] ?? 0);
                            }
                        }
                    }
                }
                
                // Add local fare data if available
                if ($fareData['local']) {
                    $vehicle['localFares'] = $fareData['local'];
                }
                
                // Add airport fare data if available
                if ($fareData['airport']) {
                    $vehicle['airportFares'] = $fareData['airport'];
                }
                
                // Add to all vehicles array
                $allVehicles[] = $vehicle;
            }
            
            error_log("Got " . count($allVehicles) . " vehicles from vehicle_types table");
        }
    }
    
    // Then get vehicles from the vehicles table (if any aren't already included)
    if (tableExists($conn, 'vehicles')) {
        error_log("Getting vehicles from vehicles table");
        
        // Build query to get all vehicles or only active ones
        $query = "SELECT * FROM vehicles";
        
        // Only add the WHERE clause if we're not including inactive vehicles
        if (!$includeInactive && columnExists($conn, 'vehicles', 'is_active')) {
            $query .= " WHERE is_active = 1";
        }
        
        $query .= " ORDER BY name";
        
        error_log("vehicles query: " . $query);
        
        $result = $conn->query($query);
        
        if ($result) {
            $vehiclesFromVehiclesTable = 0;  // Counter for logging
            
            while ($row = $result->fetch_assoc()) {
                // Get vehicle ID
                $vehicleId = $row['vehicle_id'] ?? $row['id'] ?? null;
                
                if (!$vehicleId) {
                    continue;
                }
                
                // Check if this vehicle is already included
                if (in_array($vehicleId, $vehicleIds)) {
                    continue;
                }
                
                // Add to vehicle IDs list
                $vehicleIds[] = $vehicleId;
                $vehiclesFromVehiclesTable++;
                
                // Get specialized fare data
                $fareData = getSpecializedFareData($conn, $vehicleId);
                
                // Parse amenities from JSON string or comma-separated list
                $amenities = [];
                if (!empty($row['amenities'])) {
                    $decoded = json_decode($row['amenities'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $amenities = $decoded;
                    } else {
                        $amenities = array_map('trim', explode(',', $row['amenities']));
                    }
                }
                
                // Default amenities if empty
                if (empty($amenities)) {
                    $amenities = ['AC', 'Bottle Water', 'Music System'];
                }
                
                // Ensure name is always a string, use vehicle_id as fallback
                $name = $row['name'] ?? '';
                if (empty($name) || $name === '0') {
                    $name = ucfirst(str_replace('_', ' ', $vehicleId));
                }
                
                // Ensure proper handling of is_active field
                $isActive = true; // Default to active
                if (isset($row['is_active'])) {
                    $isActive = (bool)(int)$row['is_active'];
                }
                
                // Format vehicle data with consistent property names for frontend
                $vehicle = [
                    'id' => (string)$vehicleId,
                    'name' => $name,
                    'capacity' => intval($row['capacity'] ?? $row['seats'] ?? 4),
                    'luggageCapacity' => intval($row['luggage_capacity'] ?? $row['luggage'] ?? 2),
                    'image' => normalizeImagePath($row['image'] ?? '/cars/sedan.png'),
                    'amenities' => $amenities,
                    'description' => $row['description'] ?? "$name vehicle",
                    'ac' => (bool)($row['ac'] ?? 1),
                    'isActive' => $isActive,
                    'vehicleId' => (string)$vehicleId
                ];
                
                // Include outstation fare data if available
                if ($fareData['outstation']) {
                    $vehicle['outstationFares'] = $fareData['outstation'];
                    $vehicle['basePrice'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['price'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['pricePerKm'] = floatval($fareData['outstation']['pricePerKm'] ?? 0);
                    $vehicle['nightHaltCharge'] = floatval($fareData['outstation']['nightHaltCharge'] ?? 0);
                    $vehicle['driverAllowance'] = floatval($fareData['outstation']['driverAllowance'] ?? 0);
                } else {
                    // Try to get pricing from vehicle_pricing table
                    $vehicle['basePrice'] = 0;
                    $vehicle['price'] = 0;
                    $vehicle['pricePerKm'] = 0;
                    $vehicle['nightHaltCharge'] = 0;
                    $vehicle['driverAllowance'] = 0;
                    
                    // Get pricing from vehicle_pricing table
                    if (tableExists($conn, 'vehicle_pricing')) {
                        $pricingQuery = $conn->prepare("
                            SELECT 
                                base_fare as baseFare, 
                                base_price as basePrice,
                                price_per_km as pricePerKm, 
                                night_halt_charge as nightHaltCharge, 
                                driver_allowance as driverAllowance
                            FROM vehicle_pricing 
                            WHERE vehicle_id = ? AND (trip_type = 'outstation' OR trip_type = 'all')
                            LIMIT 1
                        ");
                        
                        if ($pricingQuery) {
                            $pricingQuery->bind_param("s", $vehicleId);
                            $pricingQuery->execute();
                            $pricingResult = $pricingQuery->get_result();
                            
                            if ($pricingResult && $pricingResult->num_rows > 0) {
                                $pricing = $pricingResult->fetch_assoc();
                                $vehicle['basePrice'] = floatval($pricing['basePrice'] ?? $pricing['baseFare'] ?? 0);
                                $vehicle['price'] = floatval($pricing['basePrice'] ?? $pricing['baseFare'] ?? 0);
                                $vehicle['pricePerKm'] = floatval($pricing['pricePerKm'] ?? 0);
                                $vehicle['nightHaltCharge'] = floatval($pricing['nightHaltCharge'] ?? 0);
                                $vehicle['driverAllowance'] = floatval($pricing['driverAllowance'] ?? 0);
                            }
                        }
                    }
                }
                
                // Add local fare data if available
                if ($fareData['local']) {
                    $vehicle['localFares'] = $fareData['local'];
                }
                
                // Add airport fare data if available
                if ($fareData['airport']) {
                    $vehicle['airportFares'] = $fareData['airport'];
                }
                
                // Add to all vehicles array
                $allVehicles[] = $vehicle;
            }
            
            error_log("Added $vehiclesFromVehiclesTable more vehicles from vehicles table");
        }
    }
    
    // Also check vehicle_pricing for any vehicles that might be missing
    if (tableExists($conn, 'vehicle_pricing') && empty($allVehicles)) {
        error_log("No vehicles found, checking vehicle_pricing table");
        
        $query = "SELECT DISTINCT vehicle_id FROM vehicle_pricing";
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                // Skip if already included
                if (in_array($vehicleId, $vehicleIds)) {
                    continue;
                }
                
                // Add vehicle ID to list
                $vehicleIds[] = $vehicleId;
                
                // Format vehicle name from ID
                $name = ucwords(str_replace('_', ' ', $vehicleId));
                
                // Get fare data
                $fareData = getSpecializedFareData($conn, $vehicleId);
                
                // Create basic vehicle
                $vehicle = [
                    'id' => $vehicleId,
                    'name' => $name,
                    'capacity' => 4, // Default
                    'luggageCapacity' => 2, // Default
                    'image' => '/cars/sedan.png', // Default
                    'amenities' => ['AC', 'Bottle Water', 'Music System'], // Default
                    'description' => "$name vehicle", // Default
                    'ac' => true, // Default
                    'isActive' => true, // Default
                    'vehicleId' => $vehicleId
                ];
                
                // Include outstation fare data if available
                if ($fareData['outstation']) {
                    $vehicle['outstationFares'] = $fareData['outstation'];
                    $vehicle['basePrice'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['price'] = floatval($fareData['outstation']['basePrice'] ?? 0);
                    $vehicle['pricePerKm'] = floatval($fareData['outstation']['pricePerKm'] ?? 0);
                    $vehicle['nightHaltCharge'] = floatval($fareData['outstation']['nightHaltCharge'] ?? 0);
                    $vehicle['driverAllowance'] = floatval($fareData['outstation']['driverAllowance'] ?? 0);
                }
                
                // Add local fare data if available
                if ($fareData['local']) {
                    $vehicle['localFares'] = $fareData['local'];
                }
                
                // Add airport fare data if available
                if ($fareData['airport']) {
                    $vehicle['airportFares'] = $fareData['airport'];
                }
                
                // Add to vehicles array
                $allVehicles[] = $vehicle;
            }
            
            error_log("Added " . (count($vehicleIds) - count($allVehicles) + count($vehicleIds)) . " vehicles from vehicle_pricing table");
        }
    }
    
    // If no vehicles found in DB, try to merge with JSON vehicles
    if (empty($allVehicles) && !empty($jsonVehicles)) {
        $allVehicles = $jsonVehicles;
    }
    
    // If still no vehicles, use fallback
    if (empty($allVehicles)) {
        $allVehicles = $fallbackVehicles;
    }
    
    // Save all vehicles to JSON file for caching
    try {
        $jsonFile = __DIR__ . '/../../../data/vehicles.json';
        // Ensure the directory exists
        if (!file_exists(dirname($jsonFile))) {
            mkdir(dirname($jsonFile), 0755, true);
        }
        file_put_contents($jsonFile, json_encode($allVehicles, JSON_PRETTY_PRINT));
        error_log("Saved " . count($allVehicles) . " vehicles to JSON file");
        
        // Mark cache as updated
        file_put_contents($cacheMarkerFile, time());
    } catch (Exception $e) {
        error_log("Error saving vehicles to JSON file: " . $e->getMessage());
    }
    
    // Return the vehicles
    echo json_encode([
        'vehicles' => $allVehicles,
        'timestamp' => time(),
        'cached' => false,
        'source' => 'database',
        'count' => count($allVehicles),
        'includeInactive' => $includeInactive
    ]);
    
} catch (Exception $e) {
    error_log("Error in vehicles-data.php: " . $e->getMessage());
    
    // Return fallback vehicles
    echo json_encode([
        'vehicles' => $fallbackVehicles,
        'timestamp' => time(),
        'cached' => false,
        'fallback' => true,
        'error' => $e->getMessage()
    ]);
}
