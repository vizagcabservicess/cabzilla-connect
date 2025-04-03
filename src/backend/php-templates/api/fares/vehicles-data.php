<?php
/**
 * API endpoint to retrieve vehicle data
 */
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if database config is included
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

// Get parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

error_log("vehicles-data.php called with includeInactive=" . ($includeInactive ? 'true' : 'false') . 
         ", forceRefresh=" . ($forceRefresh ? 'true' : 'false') . 
         ", isAdminMode=" . ($isAdminMode ? 'true' : 'false'));

try {
    // Connect to the database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Failed to connect to database");
    }
    
    // Get all vehicle IDs from multiple tables to ensure comprehensive listing
    $allVehicleIds = [];
    $allVehicles = [];
    
    // Check outstation_fares table
    $outstationFaresExists = $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0;
    if ($outstationFaresExists) {
        $ofQuery = "SELECT DISTINCT vehicle_id FROM outstation_fares";
        $ofResult = $conn->query($ofQuery);
        if ($ofResult && $ofResult->num_rows > 0) {
            while ($row = $ofResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // Check local_package_fares table
    $localFaresExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    if ($localFaresExists) {
        $lfQuery = "SELECT DISTINCT vehicle_id FROM local_package_fares";
        $lfResult = $conn->query($lfQuery);
        if ($lfResult && $lfResult->num_rows > 0) {
            while ($row = $lfResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // Check airport_transfer_fares table
    $airportFaresExists = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'")->num_rows > 0;
    if ($airportFaresExists) {
        $afQuery = "SELECT DISTINCT vehicle_id FROM airport_transfer_fares";
        $afResult = $conn->query($afQuery);
        if ($afResult && $afResult->num_rows > 0) {
            while ($row = $afResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // Check vehicles table
    $vehiclesExists = $conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0;
    if ($vehiclesExists) {
        $vQuery = "SELECT id, vehicle_id FROM vehicles";
        $vResult = $conn->query($vQuery);
        if ($vResult && $vResult->num_rows > 0) {
            while ($row = $vResult->fetch_assoc()) {
                $vid = !empty($row['vehicle_id']) ? $row['vehicle_id'] : $row['id'];
                if (!empty($vid) && !in_array($vid, $allVehicleIds)) {
                    $allVehicleIds[] = $vid;
                }
            }
        }
    }
    
    // Check vehicle_types table
    $vehicleTypesExists = $conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0;
    if ($vehicleTypesExists) {
        $vtQuery = "SELECT vehicle_id FROM vehicle_types";
        $vtResult = $conn->query($vtQuery);
        if ($vtResult && $vtResult->num_rows > 0) {
            while ($row = $vtResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    error_log("Found " . count($allVehicleIds) . " unique vehicle IDs across all tables");
    
    // Process each vehicle ID to gather comprehensive data
    foreach ($allVehicleIds as $vehicleId) {
        $vehicle = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => ucwords(str_replace('_', ' ', $vehicleId)),
            'capacity' => 4,
            'luggageCapacity' => 2,
            'ac' => true,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC'],
            'description' => '',
            'isActive' => true,
            'basePrice' => 0,
            'price' => 0,
            'pricePerKm' => 0,
            'driverAllowance' => 300,
            'nightHaltCharge' => 700
        ];
        
        // Get vehicle details from vehicle_types table if it exists
        if ($vehicleTypesExists) {
            $vtDetailQuery = "SELECT * FROM vehicle_types WHERE vehicle_id = ?";
            $stmt = $conn->prepare($vtDetailQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $vtDetailResult = $stmt->get_result();
            
            if ($vtDetailResult && $vtDetailResult->num_rows > 0) {
                $vtData = $vtDetailResult->fetch_assoc();
                $vehicle['name'] = $vtData['name'] ?: $vehicle['name'];
                $vehicle['capacity'] = (int) ($vtData['capacity'] ?: $vehicle['capacity']);
                $vehicle['luggageCapacity'] = (int) ($vtData['luggage_capacity'] ?: $vehicle['luggageCapacity']);
                $vehicle['ac'] = (bool) ($vtData['ac'] ?? $vehicle['ac']);
                $vehicle['image'] = $vtData['image'] ?: $vehicle['image'];
                $vehicle['isActive'] = isset($vtData['is_active']) ? (bool) $vtData['is_active'] : $vehicle['isActive'];
                
                if (!empty($vtData['description'])) {
                    $vehicle['description'] = $vtData['description'];
                }
                
                if (!empty($vtData['amenities'])) {
                    try {
                        $amenities = json_decode($vtData['amenities'], true);
                        if (is_array($amenities) && !empty($amenities)) {
                            $vehicle['amenities'] = $amenities;
                        } elseif (is_string($vtData['amenities'])) {
                            $vehicle['amenities'] = explode(',', str_replace(['[',']','"',"'",' '], '', $vtData['amenities']));
                        }
                    } catch (Exception $e) {
                        // Keep default amenities
                    }
                }
            }
        }
        
        // Get vehicle details from vehicles table if it exists
        if ($vehiclesExists) {
            $vDetailQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
            $stmt = $conn->prepare($vDetailQuery);
            $stmt->bind_param('ss', $vehicleId, $vehicleId);
            $stmt->execute();
            $vDetailResult = $stmt->get_result();
            
            if ($vDetailResult && $vDetailResult->num_rows > 0) {
                $vData = $vDetailResult->fetch_assoc();
                
                // Only override if fields are empty in vehicle_types data
                if (empty($vehicle['name']) && !empty($vData['name'])) {
                    $vehicle['name'] = $vData['name'];
                }
                
                if (empty($vehicle['capacity']) && !empty($vData['capacity'])) {
                    $vehicle['capacity'] = (int) $vData['capacity'];
                }
                
                if (empty($vehicle['luggageCapacity']) && !empty($vData['luggage_capacity'])) {
                    $vehicle['luggageCapacity'] = (int) $vData['luggage_capacity'];
                }
                
                if (empty($vehicle['image']) && !empty($vData['image'])) {
                    $vehicle['image'] = $vData['image'];
                }
                
                if (empty($vehicle['description']) && !empty($vData['description'])) {
                    $vehicle['description'] = $vData['description'];
                }
                
                if (isset($vData['is_active'])) {
                    $vehicle['isActive'] = (bool) $vData['is_active'];
                }
                
                // Process amenities if available
                if (!empty($vData['amenities']) && (empty($vehicle['amenities']) || $vehicle['amenities'] === ['AC'])) {
                    try {
                        $amenities = json_decode($vData['amenities'], true);
                        if (is_array($amenities) && !empty($amenities)) {
                            $vehicle['amenities'] = $amenities;
                        } elseif (is_string($vData['amenities'])) {
                            $vehicle['amenities'] = explode(',', str_replace(['[',']','"',"'",' '], '', $vData['amenities']));
                        }
                    } catch (Exception $e) {
                        // Keep default amenities
                    }
                }
            }
        }
        
        // Skip inactive vehicles if not including them
        if (!$includeInactive && $vehicle['isActive'] === false) {
            continue;
        }
        
        // Get outstation pricing
        if ($outstationFaresExists) {
            $ofDetailQuery = "SELECT * FROM outstation_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($ofDetailQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $ofDetailResult = $stmt->get_result();
            
            if ($ofDetailResult && $ofDetailResult->num_rows > 0) {
                $ofData = $ofDetailResult->fetch_assoc();
                $vehicle['basePrice'] = (float) $ofData['base_price'];
                $vehicle['price'] = (float) $ofData['base_price']; // Alias for consistency
                $vehicle['pricePerKm'] = (float) $ofData['price_per_km'];
                $vehicle['nightHaltCharge'] = (float) $ofData['night_halt_charge'];
                $vehicle['driverAllowance'] = (float) $ofData['driver_allowance'];
                
                // Create the outstation object
                $vehicle['outstation'] = [
                    'base_price' => (float) $ofData['base_price'],
                    'price_per_km' => (float) $ofData['price_per_km'],
                    'night_halt_charge' => (float) $ofData['night_halt_charge'],
                    'driver_allowance' => (float) $ofData['driver_allowance'],
                    'roundtrip_base_price' => isset($ofData['roundtrip_base_price']) ? (float) $ofData['roundtrip_base_price'] : (float) $ofData['base_price'],
                    'roundtrip_price_per_km' => isset($ofData['roundtrip_price_per_km']) ? (float) $ofData['roundtrip_price_per_km'] : (float) $ofData['price_per_km']
                ];
            }
        }
        
        // Get local package pricing
        if ($localFaresExists) {
            $lfDetailQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($lfDetailQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $lfDetailResult = $stmt->get_result();
            
            if ($lfDetailResult && $lfDetailResult->num_rows > 0) {
                $lfData = $lfDetailResult->fetch_assoc();
                
                // Create the local object
                $vehicle['local'] = [
                    'price_4hrs_40km' => (float) ($lfData['price_4hrs_40km'] ?? 0),
                    'price_8hrs_80km' => (float) ($lfData['price_8hrs_80km'] ?? 0),
                    'price_10hrs_100km' => (float) ($lfData['price_10hrs_100km'] ?? 0),
                    'price_extra_km' => (float) ($lfData['price_extra_km'] ?? 0),
                    'price_extra_hour' => (float) ($lfData['price_extra_hour'] ?? 0)
                ];
            }
        }
        
        // Get airport transfer pricing
        if ($airportFaresExists) {
            $afDetailQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($afDetailQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $afDetailResult = $stmt->get_result();
            
            if ($afDetailResult && $afDetailResult->num_rows > 0) {
                $afData = $afDetailResult->fetch_assoc();
                
                // Create the airport object
                $vehicle['airport'] = [
                    'base_price' => (float) ($afData['base_price'] ?? 0),
                    'price_per_km' => (float) ($afData['price_per_km'] ?? 0),
                    'pickup_price' => (float) ($afData['pickup_price'] ?? 0),
                    'drop_price' => (float) ($afData['drop_price'] ?? 0),
                    'tier1_price' => (float) ($afData['tier1_price'] ?? 0),
                    'tier2_price' => (float) ($afData['tier2_price'] ?? 0),
                    'tier3_price' => (float) ($afData['tier3_price'] ?? 0),
                    'tier4_price' => (float) ($afData['tier4_price'] ?? 0),
                    'extra_km_charge' => (float) ($afData['extra_km_charge'] ?? 0)
                ];
            }
        }
        
        // Ensure all necessary objects are set with defaults
        if (!isset($vehicle['outstation'])) {
            $vehicle['outstation'] = [
                'base_price' => $vehicle['basePrice'],
                'price_per_km' => $vehicle['pricePerKm'],
                'night_halt_charge' => $vehicle['nightHaltCharge'],
                'driver_allowance' => $vehicle['driverAllowance'],
                'roundtrip_base_price' => $vehicle['basePrice'],
                'roundtrip_price_per_km' => $vehicle['pricePerKm']
            ];
        }
        
        if (!isset($vehicle['local'])) {
            $vehicle['local'] = [
                'price_4hrs_40km' => 0,
                'price_8hrs_80km' => 0,
                'price_10hrs_100km' => 0,
                'price_extra_km' => 0,
                'price_extra_hour' => 0
            ];
        }
        
        if (!isset($vehicle['airport'])) {
            $vehicle['airport'] = [
                'base_price' => 0,
                'price_per_km' => 0,
                'pickup_price' => 0,
                'drop_price' => 0,
                'tier1_price' => 0,
                'tier2_price' => 0,
                'tier3_price' => 0,
                'tier4_price' => 0,
                'extra_km_charge' => 0
            ];
        }
        
        // Generate description if empty
        if (empty($vehicle['description'])) {
            $vehicle['description'] = "Vehicle suitable for {$vehicle['capacity']} passengers.";
        }
        
        // Set default image if empty
        if (empty($vehicle['image'])) {
            $vehicle['image'] = '/cars/sedan.png';
        }
        
        // Set these fields if they're still 0
        if ($vehicle['basePrice'] == 0 && $vehicle['outstation']['base_price'] > 0) {
            $vehicle['basePrice'] = $vehicle['outstation']['base_price'];
            $vehicle['price'] = $vehicle['outstation']['base_price'];
        }
        
        if ($vehicle['pricePerKm'] == 0 && $vehicle['outstation']['price_per_km'] > 0) {
            $vehicle['pricePerKm'] = $vehicle['outstation']['price_per_km'];
        }
        
        $allVehicles[] = $vehicle;
    }
    
    // Sort vehicles by name
    usort($allVehicles, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    
    error_log("Returning " . count($allVehicles) . " vehicles");
    
    // If no vehicles found, return default set
    if (empty($allVehicles)) {
        $allVehicles = [
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
            ]
        ];
    }
    
    // Return the vehicle data
    echo json_encode([
        'vehicles' => $allVehicles,
        'count' => count($allVehicles),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error fetching vehicle data: " . $e->getMessage());
    
    // Return default vehicles on error
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
        ]
    ];
    
    // Output error but in a way that still provides usable data
    echo json_encode([
        'vehicles' => $defaultVehicles,
        'count' => count($defaultVehicles),
        'error' => $e->getMessage(),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time()
    ]);
}
