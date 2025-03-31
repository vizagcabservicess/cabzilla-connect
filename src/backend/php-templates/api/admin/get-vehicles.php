
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
header('X-API-Version: 1.0.0');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
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
    
    // First get from vehicle_types table (primary table)
    if (in_array('vehicle_types', $existingTables)) {
        $vehicleTypesQuery = "SELECT * FROM vehicle_types";
        if (!$includeInactive) {
            $vehicleTypesQuery .= " WHERE is_active = 1";
        }
        
        $vehicleTypesResult = $conn->query($vehicleTypesQuery);
        
        if ($vehicleTypesResult) {
            while ($row = $vehicleTypesResult->fetch_assoc()) {
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
                $camelCaseRow['vehicleId'] = $row['vehicle_id'];
                $camelCaseRow['isActive'] = (bool)$row['is_active'];
                
                $allVehicles[$row['vehicle_id']] = $camelCaseRow;
                $vehicleIds[] = "'" . $conn->real_escape_string($row['vehicle_id']) . "'";
            }
        }
    }
    
    // Then get from vehicles table (if exists)
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
                $camelCaseRow['isActive'] = isset($row['is_active']) ? (bool)$row['is_active'] : true;
                
                if (!isset($allVehicles[$vehicleId])) {
                    $allVehicles[$vehicleId] = $camelCaseRow;
                    $vehicleIds[] = "'" . $conn->real_escape_string($vehicleId) . "'";
                } else {
                    // Merge with existing vehicle data
                    $allVehicles[$vehicleId] = array_merge($allVehicles[$vehicleId], $camelCaseRow);
                }
            }
        }
    }
    
    // Get pricing data from vehicle_pricing table (if exists)
    if (in_array('vehicle_pricing', $existingTables) && count($vehicleIds) > 0) {
        $vehicleIdsString = implode(',', $vehicleIds);
        $pricingQuery = "
            SELECT vp.vehicle_id, vp.trip_type, vp.base_fare, vp.price_per_km, 
                   vp.driver_allowance, vp.night_halt_charge
            FROM vehicle_pricing vp
            WHERE vp.vehicle_id IN ($vehicleIdsString) AND vp.trip_type = 'outstation'
        ";
        
        $pricingResult = $conn->query($pricingQuery);
        
        if ($pricingResult) {
            while ($row = $pricingResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($allVehicles[$vehicleId])) {
                    // Add pricing data
                    $allVehicles[$vehicleId]['basePrice'] = $row['base_fare'];
                    $allVehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                    $allVehicles[$vehicleId]['driverAllowance'] = $row['driver_allowance'];
                    $allVehicles[$vehicleId]['nightHaltCharge'] = $row['night_halt_charge'];
                    
                    // Also add snake_case versions
                    $allVehicles[$vehicleId]['base_price'] = $row['base_fare'];
                    $allVehicles[$vehicleId]['price_per_km'] = $row['price_per_km'];
                    $allVehicles[$vehicleId]['driver_allowance'] = $row['driver_allowance'];
                    $allVehicles[$vehicleId]['night_halt_charge'] = $row['night_halt_charge'];
                }
            }
        }
    }
    
    // Get outstation fares if available
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
                    if (!isset($allVehicles[$vehicleId]['basePrice']) || $allVehicles[$vehicleId]['basePrice'] == 0) {
                        $allVehicles[$vehicleId]['basePrice'] = $row['base_price'];
                        $allVehicles[$vehicleId]['base_price'] = $row['base_price'];
                    }
                    
                    if (!isset($allVehicles[$vehicleId]['pricePerKm']) || $allVehicles[$vehicleId]['pricePerKm'] == 0) {
                        $allVehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                        $allVehicles[$vehicleId]['price_per_km'] = $row['price_per_km'];
                    }
                    
                    if (!isset($allVehicles[$vehicleId]['driverAllowance']) || $allVehicles[$vehicleId]['driverAllowance'] == 0) {
                        $allVehicles[$vehicleId]['driverAllowance'] = $row['driver_allowance'];
                        $allVehicles[$vehicleId]['driver_allowance'] = $row['driver_allowance'];
                    }
                    
                    if (!isset($allVehicles[$vehicleId]['nightHaltCharge']) || $allVehicles[$vehicleId]['nightHaltCharge'] == 0) {
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
        $vehiclesArray[$key]['description'] = $vehicle['description'] ?? $vehicle['name'] . ' vehicle';
        
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
