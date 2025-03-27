
<?php
require_once '../../config.php';

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
error_log("vehicles-data.php request. Method: " . $_SERVER['REQUEST_METHOD'] . ", Time: " . time());

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
        'price' => 4000,
        'basePrice' => 4000,
        'pricePerKm' => 14,
        'image' => '/cars/ertiga.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
        'description' => 'Spacious SUV suitable for 6 passengers.',
        'ac' => true,
        'nightHaltCharge' => 700,
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

// Function to get data from outstation_fares table directly
function getOutstationFareData($conn, $vehicleId) {
    try {
        $query = $conn->prepare("
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
        
        if ($query) {
            $query->bind_param("s", $vehicleId);
            $query->execute();
            $result = $query->get_result();
            
            if ($result && $result->num_rows > 0) {
                $fareData = $result->fetch_assoc();
                error_log("Found outstation fares for $vehicleId in outstation_fares table: " . json_encode($fareData));
                return $fareData;
            } else {
                error_log("No records found in outstation_fares for vehicle_id: $vehicleId");
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching outstation fares: " . $e->getMessage());
    }
    
    return null;
}

// Function to get data from vehicle_pricing table as fallback
function getVehiclePricingData($conn, $vehicleId) {
    try {
        // Try to get outstation fare data for one-way trips
        $query = $conn->prepare("
            SELECT 
                base_fare as basePrice, 
                price_per_km as pricePerKm, 
                night_halt_charge as nightHaltCharge, 
                driver_allowance as driverAllowance
            FROM vehicle_pricing 
            WHERE vehicle_id = ? AND trip_type = 'outstation'
        ");
        
        if ($query) {
            $query->bind_param("s", $vehicleId);
            $query->execute();
            $result = $query->get_result();
            
            if ($result && $result->num_rows > 0) {
                $oneWayFares = $result->fetch_assoc();
                
                // Get round trip fares if available
                $rtQuery = $conn->prepare("
                    SELECT 
                        base_fare as basePrice, 
                        price_per_km as pricePerKm
                    FROM vehicle_pricing 
                    WHERE vehicle_id = ? AND trip_type = 'outstation-round-trip'
                ");
                
                $rtQuery->bind_param("s", $vehicleId);
                $rtQuery->execute();
                $rtResult = $rtQuery->get_result();
                
                if ($rtResult && $rtResult->num_rows > 0) {
                    $rtFares = $rtResult->fetch_assoc();
                    $oneWayFares['roundTripBasePrice'] = $rtFares['basePrice'];
                    $oneWayFares['roundTripPricePerKm'] = $rtFares['pricePerKm'];
                }
                
                return $oneWayFares;
            } else {
                error_log("No records found in vehicle_pricing for vehicle_id: $vehicleId and trip_type: outstation");
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching vehicle_pricing: " . $e->getMessage());
    }
    
    return null;
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
    
    // Add cache busting parameter
    $cacheBuster = isset($_GET['_t']) ? $_GET['_t'] : time();
    $forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
    
    error_log("vehicles-data.php GET request params: " . json_encode([
        'includeInactive' => $includeInactive, 
        'cacheBuster' => $cacheBuster,
        'forceRefresh' => $forceRefresh
    ]));
    
    // Build query to get vehicle types
    $query = "
        SELECT 
            v.vehicle_id, 
            v.name, 
            v.capacity, 
            v.luggage_capacity,
            v.ac, 
            v.image, 
            v.amenities, 
            v.description, 
            v.is_active
        FROM 
            vehicle_types v
    ";
    
    // Only add the WHERE clause if we're not including inactive vehicles
    if (!$includeInactive) {
        $query .= " WHERE v.is_active = 1";
    }
    
    $query .= " ORDER BY v.name";
    
    error_log("vehicles-data.php query: " . $query);
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['vehicle_id'];

        // First try to get fare data directly from outstation_fares table
        $outstationFares = getOutstationFareData($conn, $vehicleId);
        
        // If no data found in outstation_fares, try vehicle_pricing as fallback
        if (!$outstationFares) {
            $outstationFares = getVehiclePricingData($conn, $vehicleId);
            if ($outstationFares) {
                error_log("Using vehicle_pricing fallback for $vehicleId");
            }
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
        
        // Format vehicle data with consistent property names for frontend
        $vehicle = [
            'id' => (string)$vehicleId,
            'name' => $name,
            'capacity' => intval($row['capacity'] ?? 0),
            'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
            'image' => $row['image'] ?? '',
            'amenities' => $amenities,
            'description' => $row['description'] ?? '',
            'ac' => (bool)($row['ac'] ?? 0),
            'isActive' => (bool)($row['is_active'] ?? 0),
            'vehicleId' => (string)$vehicleId
        ];
        
        // Add outstation fare data if available
        if ($outstationFares) {
            // Set base vehicle price properties from outstation fares
            $vehicle['basePrice'] = floatval($outstationFares['basePrice'] ?? 0);
            $vehicle['price'] = floatval($outstationFares['basePrice'] ?? 0);
            $vehicle['pricePerKm'] = floatval($outstationFares['pricePerKm'] ?? 0);
            $vehicle['nightHaltCharge'] = floatval($outstationFares['nightHaltCharge'] ?? 0);
            $vehicle['driverAllowance'] = floatval($outstationFares['driverAllowance'] ?? 0);
            
            // Add the full fare data structure
            $vehicle['outstationFares'] = [
                'basePrice' => floatval($outstationFares['basePrice'] ?? 0),
                'pricePerKm' => floatval($outstationFares['pricePerKm'] ?? 0),
                'nightHaltCharge' => floatval($outstationFares['nightHaltCharge'] ?? 0),
                'driverAllowance' => floatval($outstationFares['driverAllowance'] ?? 0),
                'roundTripBasePrice' => floatval($outstationFares['roundTripBasePrice'] ?? 0),
                'roundTripPricePerKm' => floatval($outstationFares['roundTripPricePerKm'] ?? 0)
            ];
            
            error_log("Added outstation fares to vehicle $vehicleId: " . json_encode($vehicle['outstationFares']));
        } else {
            // Use fallback values
            $fallbackVehicle = null;
            foreach ($fallbackVehicles as $fv) {
                if ($fv['id'] === $vehicleId) {
                    $fallbackVehicle = $fv;
                    break;
                }
            }
            
            if ($fallbackVehicle) {
                $vehicle['basePrice'] = $fallbackVehicle['basePrice'];
                $vehicle['price'] = $fallbackVehicle['price'];
                $vehicle['pricePerKm'] = $fallbackVehicle['pricePerKm'];
                $vehicle['nightHaltCharge'] = $fallbackVehicle['nightHaltCharge'];
                $vehicle['driverAllowance'] = $fallbackVehicle['driverAllowance'];
                
                $vehicle['outstationFares'] = [
                    'basePrice' => $fallbackVehicle['basePrice'],
                    'pricePerKm' => $fallbackVehicle['pricePerKm'],
                    'nightHaltCharge' => $fallbackVehicle['nightHaltCharge'],
                    'driverAllowance' => $fallbackVehicle['driverAllowance'],
                    'roundTripBasePrice' => $fallbackVehicle['basePrice'],
                    'roundTripPricePerKm' => $fallbackVehicle['pricePerKm']
                ];
                
                error_log("Using fallback values for $vehicleId");
            }
        }
        
        // Only add active vehicles for non-admin requests or if specifically including inactive
        if ($includeInactive || $vehicle['isActive']) {
            $vehicles[] = $vehicle;
        }
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
        'version' => '1.0.4'
    ]);
    exit;
    
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
    exit;
}
?>
