
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
header('X-API-Version: '.'1.0.4'); // Incrementing version

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
        'price' => 5400,
        'basePrice' => 3000, // Changed to match database
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

// Function to get data from specific fare tables - PRIORITIZE outstation_fares
function getSpecializedFareData($conn, $vehicleId) {
    $fareData = [
        'outstation' => null,
        'local' => null,
        'airport' => null
    ];
    
    // First try to get data from outstation_fares table (primary source)
    try {
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
                
                // If not found in outstation_fares, try vehicle_pricing as fallback
                $fallbackQuery = $conn->prepare("
                    SELECT 
                        vp1.base_fare as basePrice,
                        vp1.price_per_km as pricePerKm,
                        vp1.night_halt_charge as nightHaltCharge,
                        vp1.driver_allowance as driverAllowance,
                        vp2.base_fare as roundTripBasePrice,
                        vp2.price_per_km as roundTripPricePerKm
                    FROM 
                        vehicle_pricing vp1
                    LEFT JOIN 
                        vehicle_pricing vp2 ON vp1.vehicle_id = vp2.vehicle_id AND vp2.trip_type = 'outstation-round-trip'
                    WHERE 
                        vp1.vehicle_id = ? AND (vp1.trip_type = 'outstation' OR vp1.trip_type = 'outstation-one-way')
                    LIMIT 1
                ");
                
                if ($fallbackQuery) {
                    $fallbackQuery->bind_param("s", $vehicleId);
                    $fallbackQuery->execute();
                    $result = $fallbackQuery->get_result();
                    
                    if ($result && $result->num_rows > 0) {
                        $fareData['outstation'] = $result->fetch_assoc();
                        error_log("Fallback: Found outstation fares for $vehicleId in vehicle_pricing table: " . json_encode($fareData['outstation']));
                        
                        // Now try to sync this data back to outstation_fares table for future use
                        syncToOutstationFares($conn, $vehicleId, $fareData['outstation']);
                    }
                }
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching outstation fares: " . $e->getMessage());
    }
    
    // Try to get local fares
    try {
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
    } catch (Exception $e) {
        error_log("Error fetching local fares: " . $e->getMessage());
    }
    
    // Try to get airport fares
    try {
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
    } catch (Exception $e) {
        error_log("Error fetching airport fares: " . $e->getMessage());
    }
    
    return $fareData;
}

// Function to sync vehicle pricing data to outstation_fares table
function syncToOutstationFares($conn, $vehicleId, $data) {
    try {
        // Check if the outstation_fares table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($tableCheckResult->num_rows === 0) {
            error_log("outstation_fares table doesn't exist, skipping sync");
            return;
        }
        
        // Extract data with fallbacks
        $basePrice = isset($data['basePrice']) ? $data['basePrice'] : 0;
        $pricePerKm = isset($data['pricePerKm']) ? $data['pricePerKm'] : 0;
        $nightHaltCharge = isset($data['nightHaltCharge']) ? $data['nightHaltCharge'] : 0;
        $driverAllowance = isset($data['driverAllowance']) ? $data['driverAllowance'] : 0;
        $roundTripBasePrice = isset($data['roundTripBasePrice']) ? $data['roundTripBasePrice'] : ($basePrice * 0.95);
        $roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? $data['roundTripPricePerKm'] : ($pricePerKm * 0.85);
        
        // Insert or update data in outstation_fares
        $syncQuery = $conn->prepare("
            INSERT INTO outstation_fares 
            (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge),
            driver_allowance = VALUES(driver_allowance),
            roundtrip_base_price = VALUES(roundtrip_base_price),
            roundtrip_price_per_km = VALUES(roundtrip_price_per_km)
        ");
        
        if ($syncQuery) {
            $syncQuery->bind_param("sdddddd", 
                $vehicleId, 
                $basePrice, 
                $pricePerKm, 
                $nightHaltCharge, 
                $driverAllowance, 
                $roundTripBasePrice, 
                $roundTripPricePerKm
            );
            
            if ($syncQuery->execute()) {
                error_log("Successfully synced vehicle_pricing data to outstation_fares for $vehicleId");
            } else {
                error_log("Failed to sync to outstation_fares: " . $conn->error);
            }
        }
    } catch (Exception $e) {
        error_log("Error in syncToOutstationFares: " . $e->getMessage());
    }
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
            'capacity' => intval($row['capacity'] ?? 0),
            'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
            'image' => $row['image'] ?? '',
            'amenities' => $amenities,
            'description' => $row['description'] ?? '',
            'ac' => (bool)($row['ac'] ?? 0),
            'isActive' => (bool)($row['is_active'] ?? 0),
            'vehicleId' => (string)$vehicleId
        ];
        
        // Include outstation fare data if available, prioritizing outstation_fares table data
        if ($fareData['outstation']) {
            $vehicle['outstationFares'] = $fareData['outstation'];
            $vehicle['basePrice'] = floatval($fareData['outstation']['basePrice']);
            $vehicle['price'] = floatval($fareData['outstation']['basePrice']);
            $vehicle['pricePerKm'] = floatval($fareData['outstation']['pricePerKm']);
            $vehicle['nightHaltCharge'] = floatval($fareData['outstation']['nightHaltCharge']);
            $vehicle['driverAllowance'] = floatval($fareData['outstation']['driverAllowance']);
            
            error_log("Added outstation fares to vehicle $vehicleId: " . json_encode($fareData['outstation']));
        }
        
        // Include local package fares if available
        if ($fareData['local']) {
            $vehicle['localPackageFares'] = $fareData['local'];
        }
        
        // Include airport transfer fares if available
        if ($fareData['airport']) {
            $vehicle['airportFares'] = $fareData['airport'];
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
