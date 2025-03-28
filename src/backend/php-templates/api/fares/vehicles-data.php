
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
header('X-API-Version: '.'1.0.4');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
$requestDetails = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query_string' => $_SERVER['QUERY_STRING'],
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
    'includeInactive' => isset($_GET['includeInactive']) ? $_GET['includeInactive'] : 'false',
    'timestamp' => time()
];
error_log("vehicles-data.php request details: " . json_encode($requestDetails), 3, __DIR__ . '/../../../error.log');

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

// Function to get data from specific fare tables - PRIORITIZE outstation_fares
function getSpecializedFareData($conn, $vehicleId) {
    $fareData = [
        'outstation' => null,
        'local' => null,
        'airport' => null
    ];
    
    // First try to get outstation fares from outstation_fares table
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
    
    return $fareData;
}

// Handle requests
try {
    // Connect to database
    $conn = getDbConnection();

    if (!$conn) {
        error_log("Database connection failed in vehicles-data.php, using fallback vehicles");
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true
        ]);
        exit;
    }
    
    // Check if we should include inactive vehicles (admin only)
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    error_log("Include inactive vehicles: " . ($includeInactive ? 'true' : 'false'));
    
    // Add cache busting parameter
    $cacheBuster = isset($_GET['_t']) ? $_GET['_t'] : time();
    $forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
    
    error_log("vehicles-data.php GET request params: " . json_encode([
        'includeInactive' => $includeInactive, 
        'cacheBuster' => $cacheBuster,
        'forceRefresh' => $forceRefresh
    ]));
    
    // Check if vehicle_types table exists, if not create it
    if (!tableExists($conn, 'vehicle_types')) {
        error_log("Creating vehicle_types table as it doesn't exist");
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        // Insert fallback vehicles
        foreach ($fallbackVehicles as $vehicle) {
            $stmt = $conn->prepare("
                INSERT IGNORE INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $amenities = json_encode($vehicle['amenities']);
            $ac = $vehicle['ac'] ? 1 : 0;
            $isActive = $vehicle['isActive'] ? 1 : 0;
            
            $stmt->bind_param("ssiissssi", 
                $vehicle['id'],
                $vehicle['name'],
                $vehicle['capacity'],
                $vehicle['luggageCapacity'],
                $ac,
                $vehicle['image'],
                $amenities,
                $vehicle['description'],
                $isActive
            );
            
            $stmt->execute();
        }
    }
    
    // Initialize list of tables to check
    $vehicleTables = ['vehicle_types', 'vehicles'];
    $vehicleTableToUse = null;
    
    // Check which vehicle table exists and use that
    foreach ($vehicleTables as $tableName) {
        if (tableExists($conn, $tableName)) {
            $vehicleTableToUse = $tableName;
            break;
        }
    }
    
    if (!$vehicleTableToUse) {
        throw new Exception("No vehicle tables found in database");
    }
    
    error_log("Using $vehicleTableToUse table for vehicle data");
    
    // Build query to get vehicle types based on which table exists
    $query = "SELECT * FROM $vehicleTableToUse";
    
    // Only add the WHERE clause if we're not including inactive vehicles
    if (!$includeInactive && columnExists($conn, $vehicleTableToUse, 'is_active')) {
        $query .= " WHERE is_active = 1";
    }
    
    $query .= " ORDER BY name";
    
    error_log("vehicles-data.php query: " . $query);
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        // Get vehicle ID based on table schema
        $vehicleId = $row['vehicle_id'] ?? $row['id'] ?? null;
        
        if (!$vehicleId) {
            error_log("Skipping vehicle with no valid ID: " . json_encode($row));
            continue;
        }
        
        // Get specialized fare data for this vehicle
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
        
        // Ensure name is always a string, use vehicle_id as fallback
        $name = $row['name'] ?? '';
        if (empty($name) || $name === '0') {
            $name = "Vehicle ID: " . $vehicleId;
        }
        
        // Format vehicle data with consistent property names for frontend
        $vehicle = [
            'id' => (string)$vehicleId,
            'name' => $name,
            'capacity' => intval($row['capacity'] ?? $row['seats'] ?? 4),
            'luggageCapacity' => intval($row['luggage_capacity'] ?? $row['luggage'] ?? 2),
            'image' => $row['image'] ?? '/cars/sedan.png',
            'amenities' => $amenities,
            'description' => $row['description'] ?? '',
            'ac' => (bool)($row['ac'] ?? 1),
            'isActive' => (bool)($row['is_active'] ?? 1),
            'vehicleId' => (string)$vehicleId
        ];
        
        // Include outstation fare data if available
        if ($fareData['outstation']) {
            $vehicle['outstationFares'] = $fareData['outstation'];
            $vehicle['basePrice'] = floatval($fareData['outstation']['basePrice']);
            $vehicle['price'] = floatval($fareData['outstation']['basePrice']);
            $vehicle['pricePerKm'] = floatval($fareData['outstation']['pricePerKm']);
            $vehicle['nightHaltCharge'] = floatval($fareData['outstation']['nightHaltCharge']);
            $vehicle['driverAllowance'] = floatval($fareData['outstation']['driverAllowance']);
            
            error_log("Added outstation fares to vehicle $vehicleId: " . json_encode($fareData['outstation']));
        } else {
            // Default values if no outstation fare data
            $vehicle['basePrice'] = 2500;
            $vehicle['price'] = 2500; 
            $vehicle['pricePerKm'] = 14;
            $vehicle['nightHaltCharge'] = 700;
            $vehicle['driverAllowance'] = 250;
        }
        
        // Include local package fares if available
        if ($fareData['local']) {
            $vehicle['localPackageFares'] = $fareData['local'];
        }
        
        // Include airport transfer fares if available
        if ($fareData['airport']) {
            $vehicle['airportFares'] = $fareData['airport'];
        }
        
        // Always add the vehicle if we're including inactive ones, or if it's active
        $vehicles[] = $vehicle;
        error_log("Added vehicle to response: $vehicleId - $name");
    }

    // If no vehicles found in database, use fallback
    if (empty($vehicles)) {
        error_log("No vehicles found in database, using fallback vehicles");
        $vehicles = $fallbackVehicles;
    }

    // Log success
    error_log("Vehicles data GET response: found " . count($vehicles) . " vehicles");
    
    // Send response with cache busting timestamp
    echo json_encode([
        'vehicles' => $vehicles,
        'timestamp' => time(),
        'cached' => false,
        'version' => '1.0.4',
        'tableUsed' => $vehicleTableToUse,
        'includeInactive' => $includeInactive
    ]);
    exit;
    
} catch (Exception $e) {
    error_log("Error in vehicles-data.php: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    
    // Return fallback vehicles
    echo json_encode([
        'vehicles' => $fallbackVehicles,
        'timestamp' => time(),
        'cached' => false,
        'fallback' => true,
        'error' => $e->getMessage(),
        'errorLocation' => $e->getFile() . ':' . $e->getLine()
    ]);
    exit;
}
