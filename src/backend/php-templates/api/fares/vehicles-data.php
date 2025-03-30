
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
    
    $allVehicles = [];
    $vehicleIds = [];
    
    // 1. First try to get vehicles from vehicle_types table (main source)
    $vehicleTypesExist = $conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0;
    
    if ($vehicleTypesExist) {
        $vehicleQuery = "SELECT * FROM vehicle_types";
        
        if (!$includeInactive) {
            $vehicleQuery .= " WHERE is_active = 1";
        }
        
        $vehicleResult = $conn->query($vehicleQuery);
        
        if ($vehicleResult && $vehicleResult->num_rows > 0) {
            error_log("Found " . $vehicleResult->num_rows . " vehicles in vehicle_types table");
            
            while ($row = $vehicleResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                // Format the vehicle data
                $vehicle = [
                    'id' => $vehicleId,
                    'vehicleId' => $vehicleId,
                    'name' => $row['name'],
                    'capacity' => (int) $row['capacity'],
                    'luggageCapacity' => (int) ($row['luggage_capacity'] ?? 2),
                    'ac' => (bool) ($row['ac'] ?? true),
                    'image' => $row['image'] ?: '/cars/sedan.png',
                    'amenities' => json_decode($row['amenities'] ?? '["AC"]', true),
                    'description' => $row['description'] ?? '',
                    'isActive' => (bool) $row['is_active']
                ];
                
                $allVehicles[$vehicleId] = $vehicle;
                $vehicleIds[] = "'" . $conn->real_escape_string($vehicleId) . "'";
            }
        }
    }
    
    // 2. Also check for vehicles in the vehicles table (if exists)
    $vehiclesExist = $conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0;
    
    if ($vehiclesExist) {
        $vehicleQuery = "SELECT * FROM vehicles";
        
        if (!$includeInactive) {
            $vehicleQuery .= " WHERE is_active = 1 OR is_active IS NULL";
        }
        
        $vehicleResult = $conn->query($vehicleQuery);
        
        if ($vehicleResult && $vehicleResult->num_rows > 0) {
            error_log("Found " . $vehicleResult->num_rows . " vehicles in vehicles table");
            
            while ($row = $vehicleResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'] ?? $row['id'];
                
                // Create or update vehicle data
                if (!isset($allVehicles[$vehicleId])) {
                    // New vehicle
                    $allVehicles[$vehicleId] = [
                        'id' => $vehicleId,
                        'vehicleId' => $vehicleId,
                        'name' => $row['name'] ?? ucwords(str_replace('_', ' ', $vehicleId)),
                        'capacity' => (int) ($row['capacity'] ?? 4),
                        'luggageCapacity' => (int) ($row['luggage_capacity'] ?? 2),
                        'ac' => (bool) ($row['ac'] ?? true),
                        'image' => $row['image'] ?? '/cars/sedan.png',
                        'amenities' => isset($row['amenities']) ? json_decode($row['amenities'], true) : ['AC'],
                        'description' => $row['description'] ?? '',
                        'isActive' => isset($row['is_active']) ? (bool) $row['is_active'] : true
                    ];
                    $vehicleIds[] = "'" . $conn->real_escape_string($vehicleId) . "'";
                } else {
                    // Update existing vehicle
                    $existingVehicle = $allVehicles[$vehicleId];
                    
                    if (isset($row['name']) && !empty($row['name'])) $existingVehicle['name'] = $row['name'];
                    if (isset($row['capacity'])) $existingVehicle['capacity'] = (int) $row['capacity'];
                    if (isset($row['luggage_capacity'])) $existingVehicle['luggageCapacity'] = (int) $row['luggage_capacity'];
                    if (isset($row['ac'])) $existingVehicle['ac'] = (bool) $row['ac'];
                    if (isset($row['image']) && !empty($row['image'])) $existingVehicle['image'] = $row['image'];
                    if (isset($row['amenities'])) $existingVehicle['amenities'] = json_decode($row['amenities'], true);
                    if (isset($row['description'])) $existingVehicle['description'] = $row['description'];
                    if (isset($row['is_active'])) $existingVehicle['isActive'] = (bool) $row['is_active'];
                    
                    $allVehicles[$vehicleId] = $existingVehicle;
                }
            }
        }
    }
    
    // 3. Get pricing information if we have any vehicles
    if (count($vehicleIds) > 0) {
        $vehicleIdsStr = implode(',', $vehicleIds);
        
        // First try the vehicle_pricing table
        $pricingExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
        
        if ($pricingExists) {
            $pricingQuery = "
                SELECT vp.vehicle_id, vp.trip_type, vp.base_fare, vp.price_per_km,
                       vp.driver_allowance, vp.night_halt_charge
                FROM vehicle_pricing vp
                WHERE vp.vehicle_id IN ($vehicleIdsStr) AND vp.trip_type LIKE 'outstation%'
                ORDER BY CASE
                    WHEN vp.trip_type = 'outstation' THEN 1
                    WHEN vp.trip_type = 'outstation-one-way' THEN 2
                    ELSE 3
                END
                LIMIT 1000
            ";
            
            $pricingResult = $conn->query($pricingQuery);
            
            if ($pricingResult && $pricingResult->num_rows > 0) {
                error_log("Found pricing data for " . $pricingResult->num_rows . " vehicles");
                
                // Group pricing by vehicle_id
                $vehiclePricing = [];
                while ($row = $pricingResult->fetch_assoc()) {
                    $vehicleId = $row['vehicle_id'];
                    
                    if (!isset($vehiclePricing[$vehicleId])) {
                        $vehiclePricing[$vehicleId] = [];
                    }
                    
                    $vehiclePricing[$vehicleId][] = $row;
                }
                
                // Apply pricing data to vehicles
                foreach ($vehiclePricing as $vehicleId => $pricingData) {
                    if (isset($allVehicles[$vehicleId])) {
                        // Use first pricing entry for the vehicle
                        $pricing = $pricingData[0];
                        
                        $allVehicles[$vehicleId]['basePrice'] = (float) $pricing['base_fare'];
                        $allVehicles[$vehicleId]['price'] = (float) $pricing['base_fare'];
                        $allVehicles[$vehicleId]['pricePerKm'] = (float) $pricing['price_per_km'];
                        $allVehicles[$vehicleId]['driverAllowance'] = (float) $pricing['driver_allowance'];
                        $allVehicles[$vehicleId]['nightHaltCharge'] = (float) $pricing['night_halt_charge'];
                    }
                }
            }
        }
        
        // Then check outstation_fares table for any missing pricing info
        $outstationFaresExists = $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0;
        
        if ($outstationFaresExists) {
            $outstationQuery = "
                SELECT vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge
                FROM outstation_fares
                WHERE vehicle_id IN ($vehicleIdsStr)
            ";
            
            $outstationResult = $conn->query($outstationQuery);
            
            if ($outstationResult && $outstationResult->num_rows > 0) {
                error_log("Found outstation fares for " . $outstationResult->num_rows . " vehicles");
                
                while ($row = $outstationResult->fetch_assoc()) {
                    $vehicleId = $row['vehicle_id'];
                    
                    if (isset($allVehicles[$vehicleId])) {
                        // Only update if price is not already set
                        if (!isset($allVehicles[$vehicleId]['basePrice']) || $allVehicles[$vehicleId]['basePrice'] == 0) {
                            $allVehicles[$vehicleId]['basePrice'] = (float) $row['base_price'];
                            $allVehicles[$vehicleId]['price'] = (float) $row['base_price'];
                        }
                        
                        if (!isset($allVehicles[$vehicleId]['pricePerKm']) || $allVehicles[$vehicleId]['pricePerKm'] == 0) {
                            $allVehicles[$vehicleId]['pricePerKm'] = (float) $row['price_per_km'];
                        }
                        
                        if (!isset($allVehicles[$vehicleId]['driverAllowance']) || $allVehicles[$vehicleId]['driverAllowance'] == 0) {
                            $allVehicles[$vehicleId]['driverAllowance'] = (float) $row['driver_allowance'];
                        }
                        
                        if (!isset($allVehicles[$vehicleId]['nightHaltCharge']) || $allVehicles[$vehicleId]['nightHaltCharge'] == 0) {
                            $allVehicles[$vehicleId]['nightHaltCharge'] = (float) $row['night_halt_charge'];
                        }
                    }
                }
            }
        }
    }
    
    // Convert to array and ensure all required fields
    $vehiclesArray = [];
    foreach ($allVehicles as $vehicle) {
        // Make sure each vehicle has complete data
        if (!isset($vehicle['basePrice']) || $vehicle['basePrice'] == 0) {
            $vehicle['basePrice'] = 2500;
            $vehicle['price'] = 2500;
        }
        
        if (!isset($vehicle['pricePerKm']) || $vehicle['pricePerKm'] == 0) {
            $vehicle['pricePerKm'] = 15;
        }
        
        if (!isset($vehicle['driverAllowance']) || $vehicle['driverAllowance'] == 0) {
            $vehicle['driverAllowance'] = 300;
        }
        
        if (!isset($vehicle['nightHaltCharge']) || $vehicle['nightHaltCharge'] == 0) {
            $vehicle['nightHaltCharge'] = 800;
        }
        
        if (!isset($vehicle['image']) || empty($vehicle['image'])) {
            $vehicle['image'] = '/cars/sedan.png';
        }
        
        if (!isset($vehicle['amenities']) || !is_array($vehicle['amenities'])) {
            $vehicle['amenities'] = ['AC'];
        }
        
        if (!isset($vehicle['description']) || empty($vehicle['description'])) {
            $vehicle['description'] = 'Vehicle suitable for ' . $vehicle['capacity'] . ' passengers.';
        }
        
        $vehiclesArray[] = $vehicle;
    }
    
    // Sort vehicles by name
    usort($vehiclesArray, function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    
    // If no vehicles found at all, return default vehicles
    if (empty($vehiclesArray)) {
        error_log("No vehicles found, returning default vehicles");
        
        $vehiclesArray = [
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
    
    error_log("Returning " . count($vehiclesArray) . " vehicles");
    
    // Return the vehicle data
    echo json_encode([
        'vehicles' => $vehiclesArray,
        'count' => count($vehiclesArray),
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
