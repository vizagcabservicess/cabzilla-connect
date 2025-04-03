
<?php
/**
 * This API endpoint retrieves all vehicles from multiple tables and merges the data
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: get-vehicles.php');
header('X-API-Version: 1.0.3');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Use global variables from config.php
    global $db_host, $db_user, $db_pass, $db_name;
    
    if (empty($db_host) || empty($db_user) || empty($db_name)) {
        throw new Exception("Database configuration not properly set. Please check config.php");
    }
    
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    // Check if the connection was successful
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Get additional parameters
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    
    // Log the operation start
    error_log("Starting get-vehicles operation with includeInactive=" . ($includeInactive ? 'true' : 'false') . " at " . date('Y-m-d H:i:s'));
    
    // First check if tables exist and create them if needed
    $tables = [
        'vehicle_types',
        'vehicles',
        'vehicle_pricing',
        'outstation_fares',
        'local_fares',
        'airport_transfer_fares'
    ];
    
    // Check for base_price column in tables and add if missing
    $checkTables = ["vehicles", "vehicle_types"];
    foreach ($checkTables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result && $result->num_rows > 0) {
            // Check if base_price column exists
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'base_price'");
            if ($columnsResult && $columnsResult->num_rows == 0) {
                // Add base_price column if it doesn't exist
                $conn->query("ALTER TABLE `$table` ADD COLUMN `base_price` DECIMAL(10,2) DEFAULT 0");
                error_log("Added base_price column to $table table");
            }
            
            // Check if price_per_km column exists
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'price_per_km'");
            if ($columnsResult && $columnsResult->num_rows == 0) {
                // Add price_per_km column if it doesn't exist
                $conn->query("ALTER TABLE `$table` ADD COLUMN `price_per_km` DECIMAL(5,2) DEFAULT 0");
                error_log("Added price_per_km column to $table table");
            }
        }
    }
    
    $existingTables = [];
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result && $result->num_rows > 0) {
            $existingTables[] = $table;
        }
    }
    
    // Get vehicles from all available tables and merge them
    $allVehicles = [];
    $vehicleIds = [];
    
    // First get from vehicles table (primary source)
    if (in_array('vehicles', $existingTables)) {
        $vehiclesQuery = "SELECT * FROM vehicles";
        if (!$includeInactive) {
            $vehiclesQuery .= " WHERE is_active = 1 OR is_active IS NULL";
        }
        
        $vehiclesResult = $conn->query($vehiclesQuery);
        
        if ($vehiclesResult) {
            while ($row = $vehiclesResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'] ?? $row['id'];
                
                // Convert snake_case to camelCase
                $camelCaseRow = [];
                foreach ($row as $key => $value) {
                    // Convert snake_case to camelCase
                    $camelKey = preg_replace_callback('/_([a-z])/', function($matches) {
                        return ucfirst($matches[1]);
                    }, $key);
                    
                    $camelCaseRow[$camelKey] = $value;
                }
                
                // Add special key mappings
                $camelCaseRow['vehicleId'] = $vehicleId;
                $camelCaseRow['id'] = $vehicleId;
                $camelCaseRow['isActive'] = isset($row['is_active']) ? (bool)$row['is_active'] : true;
                
                $allVehicles[$vehicleId] = $camelCaseRow;
                $vehicleIds[] = "'" . $conn->real_escape_string($vehicleId) . "'";
            }
        }
    }
    
    // Then get from vehicle_types table to merge or add entries
    if (in_array('vehicle_types', $existingTables)) {
        $vehicleTypesQuery = "SELECT * FROM vehicle_types";
        if (!$includeInactive) {
            $vehicleTypesQuery .= " WHERE is_active = 1 OR is_active IS NULL";
        }
        
        $vehicleTypesResult = $conn->query($vehicleTypesQuery);
        
        if ($vehicleTypesResult) {
            while ($row = $vehicleTypesResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                // Convert snake_case to camelCase
                $camelCaseRow = [];
                foreach ($row as $key => $value) {
                    // Convert snake_case to camelCase
                    $camelKey = preg_replace_callback('/_([a-z])/', function($matches) {
                        return ucfirst($matches[1]);
                    }, $key);
                    
                    $camelCaseRow[$camelKey] = $value;
                }
                
                // Add special key mappings
                $camelCaseRow['vehicleId'] = $vehicleId;
                $camelCaseRow['id'] = $vehicleId;
                $camelCaseRow['isActive'] = isset($row['is_active']) ? (bool)$row['is_active'] : true;
                
                if (!isset($allVehicles[$vehicleId])) {
                    $allVehicles[$vehicleId] = $camelCaseRow;
                    $vehicleIds[] = "'" . $conn->real_escape_string($vehicleId) . "'";
                } else {
                    // Merge with existing vehicle data (prioritize longer description/name values)
                    if (empty($allVehicles[$vehicleId]['description']) && !empty($camelCaseRow['description'])) {
                        $allVehicles[$vehicleId]['description'] = $camelCaseRow['description'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['basePrice']) && !empty($camelCaseRow['basePrice'])) {
                        $allVehicles[$vehicleId]['basePrice'] = $camelCaseRow['basePrice'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['pricePerKm']) && !empty($camelCaseRow['pricePerKm'])) {
                        $allVehicles[$vehicleId]['pricePerKm'] = $camelCaseRow['pricePerKm'];
                    }
                    
                    // Merge other fields with priority to non-empty values from vehicle_types
                    foreach ($camelCaseRow as $key => $value) {
                        // Skip id and vehicleId fields
                        if ($key === 'id' || $key === 'vehicleId') continue;
                        
                        // If the value is not empty and different from the existing value
                        if (!empty($value) && 
                            (empty($allVehicles[$vehicleId][$key]) || 
                             $allVehicles[$vehicleId][$key] === '0' || 
                             $allVehicles[$vehicleId][$key] === 0 || 
                             $allVehicles[$vehicleId][$key] === '')) {
                            $allVehicles[$vehicleId][$key] = $value;
                        }
                    }
                }
            }
        }
    }
    
    // Get pricing data from outstation_fares table (if exists)
    if (in_array('outstation_fares', $existingTables) && count($vehicleIds) > 0) {
        $vehicleIdsString = implode(',', $vehicleIds);
        $outstationQuery = "
            SELECT vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge
            FROM outstation_fares
            WHERE vehicle_id IN ($vehicleIdsString)
        ";
        
        $outstationResult = $conn->query($outstationQuery);
        
        if ($outstationResult) {
            while ($row = $outstationResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($allVehicles[$vehicleId])) {
                    // Update prices if not already set
                    if (empty($allVehicles[$vehicleId]['basePrice']) || $allVehicles[$vehicleId]['basePrice'] == 0) {
                        $allVehicles[$vehicleId]['basePrice'] = $row['base_price'];
                        $allVehicles[$vehicleId]['base_price'] = $row['base_price'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['pricePerKm']) || $allVehicles[$vehicleId]['pricePerKm'] == 0) {
                        $allVehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                        $allVehicles[$vehicleId]['price_per_km'] = $row['price_per_km'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['driverAllowance']) || $allVehicles[$vehicleId]['driverAllowance'] == 0) {
                        $allVehicles[$vehicleId]['driverAllowance'] = $row['driver_allowance'];
                        $allVehicles[$vehicleId]['driver_allowance'] = $row['driver_allowance'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['nightHaltCharge']) || $allVehicles[$vehicleId]['nightHaltCharge'] == 0) {
                        $allVehicles[$vehicleId]['nightHaltCharge'] = $row['night_halt_charge'];
                        $allVehicles[$vehicleId]['night_halt_charge'] = $row['night_halt_charge'];
                    }
                }
            }
        }
    }
    
    // Get pricing data from vehicle_pricing table (if exists)
    if (in_array('vehicle_pricing', $existingTables) && count($vehicleIds) > 0) {
        $vehicleIdsString = implode(',', $vehicleIds);
        $pricingQuery = "
            SELECT vp.vehicle_id, vp.trip_type, vp.base_fare, vp.price_per_km, 
                   vp.driver_allowance, vp.night_halt_charge, vp.base_price
            FROM vehicle_pricing vp
            WHERE vp.vehicle_id IN ($vehicleIdsString) AND vp.trip_type = 'outstation'
        ";
        
        $pricingResult = $conn->query($pricingQuery);
        
        if ($pricingResult) {
            while ($row = $pricingResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($allVehicles[$vehicleId])) {
                    // Add pricing data - use base_price or base_fare
                    $basePrice = !empty($row['base_price']) ? $row['base_price'] : $row['base_fare'];
                    
                    if (empty($allVehicles[$vehicleId]['basePrice']) || $allVehicles[$vehicleId]['basePrice'] == 0) {
                        $allVehicles[$vehicleId]['basePrice'] = $basePrice;
                        $allVehicles[$vehicleId]['base_price'] = $basePrice;
                        $allVehicles[$vehicleId]['price'] = $basePrice;
                    }
                    
                    if (empty($allVehicles[$vehicleId]['pricePerKm']) || $allVehicles[$vehicleId]['pricePerKm'] == 0) {
                        $allVehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                        $allVehicles[$vehicleId]['price_per_km'] = $row['price_per_km'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['driverAllowance']) || $allVehicles[$vehicleId]['driverAllowance'] == 0) {
                        $allVehicles[$vehicleId]['driverAllowance'] = $row['driver_allowance'];
                        $allVehicles[$vehicleId]['driver_allowance'] = $row['driver_allowance'];
                    }
                    
                    if (empty($allVehicles[$vehicleId]['nightHaltCharge']) || $allVehicles[$vehicleId]['nightHaltCharge'] == 0) {
                        $allVehicles[$vehicleId]['nightHaltCharge'] = $row['night_halt_charge'];
                        $allVehicles[$vehicleId]['night_halt_charge'] = $row['night_halt_charge'];
                    }
                }
            }
        }
    }
    
    // Convert to array
    $vehiclesArray = array_values($allVehicles);
    
    // Ensure each vehicle has required fields
    foreach ($vehiclesArray as $key => $vehicle) {
        // Make sure essential fields exist
        $vehiclesArray[$key]['id'] = $vehicle['id'] ?? $vehicle['vehicleId'] ?? $vehicle['vehicle_id'] ?? '';
        $vehiclesArray[$key]['vehicleId'] = $vehicle['vehicleId'] ?? $vehicle['id'] ?? $vehicle['vehicle_id'] ?? '';
        $vehiclesArray[$key]['name'] = $vehicle['name'] ?? ucwords(str_replace('_', ' ', $vehicle['id'] ?? 'Unknown'));
        $vehiclesArray[$key]['description'] = $vehicle['description'] ?? '';
        
        // Set defaults for missing fields
        if (!isset($vehicle['capacity'])) $vehiclesArray[$key]['capacity'] = 4;
        if (!isset($vehicle['luggageCapacity'])) $vehiclesArray[$key]['luggageCapacity'] = 2;
        if (!isset($vehicle['amenities'])) $vehiclesArray[$key]['amenities'] = ['AC'];
        if (!isset($vehicle['ac'])) $vehiclesArray[$key]['ac'] = true;
        if (!isset($vehicle['isActive'])) $vehiclesArray[$key]['isActive'] = true;
        
        // Set price defaults if missing
        if (!isset($vehicle['price']) || $vehicle['price'] == 0) {
            $vehiclesArray[$key]['price'] = $vehicle['basePrice'] ?? 2500;
        }
        
        if (!isset($vehicle['basePrice']) || $vehicle['basePrice'] == 0) {
            $vehiclesArray[$key]['basePrice'] = $vehicle['price'] ?? 2500;
        }
        
        if (!isset($vehicle['pricePerKm']) || $vehicle['pricePerKm'] == 0) {
            $vehiclesArray[$key]['pricePerKm'] = 15;
        }
        
        if (!isset($vehicle['nightHaltCharge']) || $vehicle['nightHaltCharge'] == 0) {
            $vehiclesArray[$key]['nightHaltCharge'] = 800;
        }
        
        if (!isset($vehicle['driverAllowance']) || $vehicle['driverAllowance'] == 0) {
            $vehiclesArray[$key]['driverAllowance'] = 300;
        }
        
        // Set image
        if (!isset($vehicle['image']) || empty($vehicle['image'])) {
            $vehiclesArray[$key]['image'] = '/cars/sedan.png';
        }
        
        // Ensure required fields to fix errors
        if (empty($vehiclesArray[$key]['id'])) $vehiclesArray[$key]['id'] = 'vehicle_' . $key;
    }
    
    // Sort vehicles by name
    usort($vehiclesArray, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    
    // If no vehicles found, provide default vehicles
    if (empty($vehiclesArray)) {
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
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicles retrieved successfully',
        'vehicles' => $vehiclesArray,
        'source' => 'direct-db-query',
        'tables' => $existingTables,
        'includeInactive' => $includeInactive,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error in get-vehicles.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => 'get-vehicles.php',
        'trace' => $e->getTraceAsString()
    ]);
}
