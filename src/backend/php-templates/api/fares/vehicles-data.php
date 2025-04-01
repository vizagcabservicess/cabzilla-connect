
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
                    if (isset($row['description']) && !empty($row['description'])) $existingVehicle['description'] = $row['description'];
                    if (isset($row['is_active'])) $existingVehicle['isActive'] = (bool) $row['is_active'];
                    
                    $allVehicles[$vehicleId] = $existingVehicle;
                }
            }
        }
    }
    
    // 3. Now get pricing information from vehicle_pricing or outstation_fares tables
    if (count($vehicleIds) > 0) {
        // First check if vehicle_pricing table exists
        $vehiclePricingExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
        
        if ($vehiclePricingExists) {
            $vehicleIdsString = implode(',', $vehicleIds);
            $pricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id IN ($vehicleIdsString)";
            $pricingResult = $conn->query($pricingQuery);
            
            if ($pricingResult && $pricingResult->num_rows > 0) {
                error_log("Found " . $pricingResult->num_rows . " pricing entries in vehicle_pricing table");
                
                while ($row = $pricingResult->fetch_assoc()) {
                    $vehicleId = $row['vehicle_id'];
                    
                    if (isset($allVehicles[$vehicleId])) {
                        $allVehicles[$vehicleId]['price'] = (float) ($row['base_price'] ?? 0);
                        $allVehicles[$vehicleId]['basePrice'] = (float) ($row['base_price'] ?? 0);
                        $allVehicles[$vehicleId]['pricePerKm'] = (float) ($row['price_per_km'] ?? 0);
                        $allVehicles[$vehicleId]['nightHaltCharge'] = (float) ($row['night_halt_charge'] ?? 700);
                        $allVehicles[$vehicleId]['driverAllowance'] = (float) ($row['driver_allowance'] ?? 300);
                    }
                }
            }
        }
        
        // Also check if outstation_fares table exists
        $outstationFaresExists = $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0;
        
        if ($outstationFaresExists) {
            $vehicleIdsString = implode(',', $vehicleIds);
            $faresQuery = "SELECT vehicle_id, base_price, price_per_km FROM outstation_fares WHERE vehicle_id IN ($vehicleIdsString) LIMIT 1";
            $faresResult = $conn->query($faresQuery);
            
            if ($faresResult && $faresResult->num_rows > 0) {
                error_log("Found pricing data in outstation_fares table");
                
                while ($row = $faresResult->fetch_assoc()) {
                    $vehicleId = $row['vehicle_id'];
                    
                    if (isset($allVehicles[$vehicleId]) && (!isset($allVehicles[$vehicleId]['price']) || $allVehicles[$vehicleId]['price'] == 0)) {
                        $allVehicles[$vehicleId]['price'] = (float) ($row['base_price'] ?? 0);
                        $allVehicles[$vehicleId]['basePrice'] = (float) ($row['base_price'] ?? 0);
                        $allVehicles[$vehicleId]['pricePerKm'] = (float) ($row['price_per_km'] ?? 0);
                    }
                }
            }
        }
        
        // If we still don't have pricing, set default values
        foreach ($allVehicles as $vehicleId => $vehicle) {
            if (!isset($vehicle['price']) || $vehicle['price'] == 0) {
                $defaultPrices = [
                    'sedan' => ['price' => 2500, 'pricePerKm' => 14],
                    'ertiga' => ['price' => 3200, 'pricePerKm' => 18],
                    'innova' => ['price' => 3500, 'pricePerKm' => 18],
                    'innova_crysta' => ['price' => 3800, 'pricePerKm' => 20],
                    'luxury' => ['price' => 5000, 'pricePerKm' => 24],
                    'tempo' => ['price' => 4500, 'pricePerKm' => 22]
                ];
                
                $lowerVehicleId = strtolower($vehicleId);
                if (isset($defaultPrices[$lowerVehicleId])) {
                    $allVehicles[$vehicleId]['price'] = $defaultPrices[$lowerVehicleId]['price'];
                    $allVehicles[$vehicleId]['basePrice'] = $defaultPrices[$lowerVehicleId]['price'];
                    $allVehicles[$vehicleId]['pricePerKm'] = $defaultPrices[$lowerVehicleId]['pricePerKm'];
                } else {
                    $allVehicles[$vehicleId]['price'] = 2500;
                    $allVehicles[$vehicleId]['basePrice'] = 2500;
                    $allVehicles[$vehicleId]['pricePerKm'] = 14;
                }
                
                $allVehicles[$vehicleId]['nightHaltCharge'] = 700;
                $allVehicles[$vehicleId]['driverAllowance'] = 300;
            }
            
            // Make sure these properties are always set
            if (!isset($allVehicles[$vehicleId]['nightHaltCharge'])) {
                $allVehicles[$vehicleId]['nightHaltCharge'] = 700;
            }
            
            if (!isset($allVehicles[$vehicleId]['driverAllowance'])) {
                $allVehicles[$vehicleId]['driverAllowance'] = 300;
            }
        }
    }
    
    // Convert to indexed array
    $vehicles = array_values($allVehicles);
    
    if (count($vehicles) == 0) {
        // Default vehicles if none found
        $vehicles = [
            [
                'id' => 'sedan',
                'vehicleId' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggageCapacity' => 2,
                'price' => 2500,
                'pricePerKm' => 14,
                'image' => '/cars/sedan.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System'],
                'description' => 'Comfortable sedan suitable for 4 passengers.',
                'ac' => true,
                'nightHaltCharge' => 700,
                'driverAllowance' => 300,
                'isActive' => true
            ],
            [
                'id' => 'ertiga',
                'vehicleId' => 'ertiga',
                'name' => 'Ertiga',
                'capacity' => 6,
                'luggageCapacity' => 3,
                'price' => 3200,
                'pricePerKm' => 18,
                'image' => '/cars/ertiga.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                'description' => 'Spacious SUV suitable for 6 passengers.',
                'ac' => true,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 300,
                'isActive' => true
            ],
            [
                'id' => 'innova_crysta',
                'vehicleId' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'capacity' => 7,
                'luggageCapacity' => 4,
                'price' => 3800,
                'pricePerKm' => 20,
                'image' => '/cars/innova.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
                'description' => 'Premium SUV with ample space for 7 passengers.',
                'ac' => true,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 300,
                'isActive' => true
            ]
        ];
    }
    
    // Set cache control headers for better performance
    header('Cache-Control: public, max-age=60');
    
    // Return JSON response
    echo json_encode([
        'status' => 'success',
        'data' => $vehicles,
        'count' => count($vehicles),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error in vehicles-data.php: " . $e->getMessage() . " - " . $e->getTraceAsString());
    
    // Use default vehicles in case of error
    $vehicles = [
        [
            'id' => 'sedan',
            'vehicleId' => 'sedan',
            'name' => 'Sedan',
            'capacity' => 4,
            'luggageCapacity' => 2,
            'price' => 2500,
            'pricePerKm' => 14,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System'],
            'description' => 'Comfortable sedan suitable for 4 passengers.',
            'ac' => true,
            'nightHaltCharge' => 700,
            'driverAllowance' => 300,
            'isActive' => true
        ],
        [
            'id' => 'ertiga',
            'vehicleId' => 'ertiga',
            'name' => 'Ertiga',
            'capacity' => 6,
            'luggageCapacity' => 3,
            'price' => 3200,
            'pricePerKm' => 18,
            'image' => '/cars/ertiga.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
            'description' => 'Spacious SUV suitable for 6 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 300,
            'isActive' => true
        ],
        [
            'id' => 'innova_crysta',
            'vehicleId' => 'innova_crysta',
            'name' => 'Innova Crysta',
            'capacity' => 7,
            'luggageCapacity' => 4,
            'price' => 3800,
            'pricePerKm' => 20,
            'image' => '/cars/innova.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
            'description' => 'Premium SUV with ample space for 7 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 300,
            'isActive' => true
        ]
    ];
    
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred while retrieving vehicle data. Using default vehicles.',
        'error' => $e->getMessage(),
        'data' => $vehicles,
        'count' => count($vehicles),
        'timestamp' => time()
    ]);
}
