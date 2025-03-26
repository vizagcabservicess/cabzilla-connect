<?php
require_once '../../config.php';

// Allow CORS for all domains and add aggressive cache control
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add extra cache busting headers
header('X-Cache-Timestamp: ' . time());
header('X-Response-ID: ' . uniqid('resp_'));

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
error_log("vehicles-data.php request. Method: " . $_SERVER['REQUEST_METHOD'] . ", Time: " . time() . ", Query: " . $_SERVER['QUERY_STRING']);

// Global fallback vehicles to return in case of database issues
$fallbackVehicles = [
    [
        'id' => 'sedan',
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
        'isActive' => true,
        'vehicleId' => 'sedan'
    ],
    [
        'id' => 'ertiga',
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
        'isActive' => true,
        'vehicleId' => 'ertiga'
    ],
    [
        'id' => 'innova_crysta',
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
        'isActive' => true,
        'vehicleId' => 'innova_crysta'
    ]
];

// If this is a repeated request in a short time frame, return the fallback vehicles
// This helps prevent overwhelming the server with repeated requests
$requestHash = md5($_SERVER['REMOTE_ADDR'] . $_SERVER['HTTP_USER_AGENT'] . date('YmdH'));
$requestCount = isset($_SESSION['request_count_' . $requestHash]) ? $_SESSION['request_count_' . $requestHash] : 0;

if ($requestCount > 10) {
    error_log("Too many requests from same client, returning fallback vehicles");
    echo json_encode([
        'vehicles' => $fallbackVehicles,
        'timestamp' => time(),
        'cached' => true,
        'throttled' => true,
        'requestCount' => $requestCount
    ]);
    exit;
}

// Increment the request counter
$_SESSION['request_count_' . $requestHash] = $requestCount + 1;

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

    // Get information about whether to include inactive vehicles
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    
    // Build query to get all vehicle types
    $query = "
        SELECT 
            vt.id as db_id,
            vt.vehicle_id, 
            vt.name, 
            vt.capacity, 
            vt.luggage_capacity,
            vt.ac, 
            vt.image, 
            vt.amenities, 
            vt.description, 
            vt.is_active
        FROM 
            vehicle_types vt
    ";
    
    // Only add the WHERE clause if we're not including inactive vehicles
    if (!$includeInactive) {
        $query .= " WHERE vt.is_active = 1";
    }
    
    $query .= " ORDER BY vt.name";
    
    error_log("vehicles-data.php vehicle query: " . $query);
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $vehicles = [];
    $vehicleIds = [];
    
    while ($row = $result->fetch_assoc()) {
        // Store vehicle IDs to fetch the fares later
        $vehicleId = $row['vehicle_id'] ?? null;
        if (!empty($vehicleId)) {
            $vehicleIds[] = $vehicleId;
        }
        
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
        
        // Use vehicle_id as the primary identifier for consistency
        if (empty($vehicleId)) {
            // Skip vehicles with no proper ID
            continue;
        }
        
        // Format vehicle data with consistent property names for frontend
        $vehicle = [
            'id' => (string)$vehicleId,
            'vehicleId' => (string)$vehicleId,
            'name' => $name,
            'capacity' => intval($row['capacity'] ?? 0),
            'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
            'price' => 0, // Will be populated from specific fare tables
            'basePrice' => 0, // Will be populated from specific fare tables
            'pricePerKm' => 0, // Will be populated from specific fare tables
            'nightHaltCharge' => 0, // Will be populated from specific fare tables
            'driverAllowance' => 0, // Will be populated from specific fare tables
            'image' => $row['image'] ?? '/cars/sedan.png',
            'amenities' => $amenities,
            'description' => $row['description'] ?? '',
            'ac' => (bool)($row['ac'] ?? 0),
            'isActive' => (bool)($row['is_active'] ?? 0),
            'db_id' => $row['db_id'] ?? null,
            // Initialize fare objects
            'outstationFares' => null,
            'localPackageFares' => null,
            'airportFares' => null
        ];
        
        // Only add active vehicles for non-admin requests or if specifically including inactive
        if ($includeInactive || $vehicle['isActive']) {
            $vehicles[$vehicleId] = $vehicle;
        }
    }
    
    // Now fetch outstation fares for these vehicles
    if (!empty($vehicleIds)) {
        $placeholders = implode(',', array_fill(0, count($vehicleIds), '?'));
        $query = "SELECT * FROM outstation_fares WHERE vehicle_id IN ($placeholders)";
        
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $types = str_repeat('s', count($vehicleIds));
            $stmt->bind_param($types, ...$vehicleIds);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                if (isset($vehicles[$vehicleId])) {
                    $vehicles[$vehicleId]['price'] = floatval($row['base_price'] ?? 0);
                    $vehicles[$vehicleId]['basePrice'] = floatval($row['base_price'] ?? 0);
                    $vehicles[$vehicleId]['pricePerKm'] = floatval($row['price_per_km'] ?? 0);
                    $vehicles[$vehicleId]['nightHaltCharge'] = floatval($row['night_halt_charge'] ?? 0);
                    $vehicles[$vehicleId]['driverAllowance'] = floatval($row['driver_allowance'] ?? 0);
                    
                    // Create the outstationFares object
                    $vehicles[$vehicleId]['outstationFares'] = [
                        'basePrice' => floatval($row['base_price'] ?? 0),
                        'pricePerKm' => floatval($row['price_per_km'] ?? 0),
                        'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
                        'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
                        'roundTripBasePrice' => floatval($row['roundtrip_base_price'] ?? 0),
                        'roundTripPricePerKm' => floatval($row['roundtrip_price_per_km'] ?? 0)
                    ];
                }
            }
            $stmt->close();
        }
        
        // Fetch local package fares
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id IN ($placeholders)";
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param($types, ...$vehicleIds);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                if (isset($vehicles[$vehicleId])) {
                    // Create the localPackageFares object
                    $vehicles[$vehicleId]['localPackageFares'] = [
                        'price4hrs40km' => floatval($row['price_4hrs_40km'] ?? 0),
                        'price8hrs80km' => floatval($row['price_8hrs_80km'] ?? 0),
                        'price10hrs100km' => floatval($row['price_10hrs_100km'] ?? 0),
                        'priceExtraKm' => floatval($row['price_extra_km'] ?? 0),
                        'priceExtraHour' => floatval($row['price_extra_hour'] ?? 0)
                    ];
                }
            }
            $stmt->close();
        }
        
        // Fetch airport transfer fares
        $query = "SELECT * FROM airport_transfer_fares WHERE vehicle_id IN ($placeholders)";
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param($types, ...$vehicleIds);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                if (isset($vehicles[$vehicleId])) {
                    // Create the airportFares object
                    $vehicles[$vehicleId]['airportFares'] = [
                        'basePrice' => floatval($row['base_price'] ?? 0),
                        'pricePerKm' => floatval($row['price_per_km'] ?? 0),
                        'pickupPrice' => floatval($row['pickup_price'] ?? 0),
                        'dropPrice' => floatval($row['drop_price'] ?? 0),
                        'tier1Price' => floatval($row['tier1_price'] ?? 0),
                        'tier2Price' => floatval($row['tier2_price'] ?? 0),
                        'tier3Price' => floatval($row['tier3_price'] ?? 0),
                        'tier4Price' => floatval($row['tier4_price'] ?? 0),
                        'extraKmCharge' => floatval($row['extra_km_charge'] ?? 0)
                    ];
                }
            }
            $stmt->close();
        }
    }
    
    // Convert associative array to indexed array
    $vehicleList = array_values($vehicles);

    // If no vehicles found in database, use fallback
    if (empty($vehicleList)) {
        error_log("No vehicles found in database, using fallback vehicles");
        $vehicleList = $fallbackVehicles;
    }

    // Log success
    error_log("Vehicles-data GET response: found " . count($vehicleList) . " vehicles");
    
    // Send response with cache busting timestamp
    echo json_encode([
        'vehicles' => $vehicleList,
        'timestamp' => time(),
        'cached' => false,
        'responseId' => uniqid('veh_')
    ]);
    exit;
    
} catch (Exception $e) {
    error_log("Error in vehicles-data.php: " . $e->getMessage());
    
    // Return fallback vehicles instead of an error
    echo json_encode([
        'vehicles' => $fallbackVehicles,
        'timestamp' => time(),
        'cached' => false,
        'fallback' => true,
        'error' => $e->getMessage()
    ]);
    exit;
}
