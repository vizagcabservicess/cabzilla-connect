
<?php
/**
 * ENHANCED get-vehicles.php - Retrieve vehicle data with pricing information
 * This version fixes SQL errors and provides synchronized data from all vehicle tables
 */

// Set ultra-aggressive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');
header('X-CORS-Status: Ultra-Enhanced');

// Ultra-reliable OPTIONS handling - HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

// Get parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicles from vehicle_types table which is our primary source
    $sql = "
        SELECT 
            vt.id,
            vt.vehicle_id,
            vt.name,
            vt.capacity, 
            vt.luggage_capacity AS luggageCapacity,
            vt.ac,
            vt.image,
            vt.amenities,
            vt.description,
            vt.is_active AS isActive,
            vt.base_price AS basePrice,
            vt.price_per_km AS pricePerKm,
            vt.night_halt_charge AS nightHaltCharge,
            vt.driver_allowance AS driverAllowance,
            vt.created_at AS createdAt,
            vt.updated_at AS updatedAt
        FROM 
            vehicle_types vt
    ";
    
    // Add WHERE clause if we don't want inactive vehicles
    if (!$includeInactive) {
        $sql .= " WHERE vt.is_active = 1";
    }
    
    // Execute the query
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $vehicles = [];
    $vehicleIds = [];
    
    // First pass - get basic vehicle data
    while ($row = $result->fetch_assoc()) {
        // Convert amenities string to array if needed
        if (isset($row['amenities']) && $row['amenities']) {
            if (substr($row['amenities'], 0, 1) === '[') {
                $row['amenities'] = json_decode($row['amenities'], true);
            } else {
                $row['amenities'] = explode(',', $row['amenities']);
            }
        } else {
            $row['amenities'] = ['AC'];
        }
        
        // Set default price same as base price
        $row['price'] = $row['basePrice'];
        
        $vehicleIds[] = $row['vehicle_id'];
        $vehicles[$row['vehicle_id']] = $row;
    }
    
    // No vehicles found? Try the vehicles table as fallback
    if (empty($vehicles)) {
        $fallbackSql = "
            SELECT 
                v.id,
                v.vehicle_id,
                v.name,
                v.capacity, 
                v.luggage_capacity AS luggageCapacity,
                v.ac,
                v.image,
                v.amenities,
                v.description,
                v.is_active AS isActive,
                v.base_price AS basePrice,
                v.price_per_km AS pricePerKm,
                v.night_halt_charge AS nightHaltCharge,
                v.driver_allowance AS driverAllowance,
                v.created_at AS createdAt,
                v.updated_at AS updatedAt
            FROM 
                vehicles v
        ";
        
        // Add WHERE clause if we don't want inactive vehicles
        if (!$includeInactive) {
            $fallbackSql .= " WHERE v.is_active = 1";
        }
        
        // Execute the fallback query
        $fallbackResult = $conn->query($fallbackSql);
        
        if ($fallbackResult && $fallbackResult->num_rows > 0) {
            while ($row = $fallbackResult->fetch_assoc()) {
                // Convert amenities string to array if needed
                if (isset($row['amenities']) && $row['amenities']) {
                    if (substr($row['amenities'], 0, 1) === '[') {
                        $row['amenities'] = json_decode($row['amenities'], true);
                    } else {
                        $row['amenities'] = explode(',', $row['amenities']);
                    }
                } else {
                    $row['amenities'] = ['AC'];
                }
                
                // Set default price same as base price
                $row['price'] = $row['basePrice'];
                
                $vehicleIds[] = $row['vehicle_id'];
                $vehicles[$row['vehicle_id']] = $row;
            }
        }
    }
    
    // If still no vehicles found, try sync from outstation_fares table
    if (empty($vehicles)) {
        $fallbackSql = "
            SELECT 
                of.id,
                of.vehicle_id,
                '' AS name,
                4 AS capacity, 
                2 AS luggageCapacity,
                1 AS ac,
                '/cars/sedan.png' AS image,
                '[]' AS amenities,
                '' AS description,
                1 AS isActive,
                of.base_price AS basePrice,
                of.price_per_km AS pricePerKm,
                of.night_halt_charge AS nightHaltCharge,
                of.driver_allowance AS driverAllowance,
                of.created_at AS createdAt,
                of.updated_at AS updatedAt
            FROM 
                outstation_fares of
        ";
        
        $fallbackResult = $conn->query($fallbackSql);
        
        if ($fallbackResult && $fallbackResult->num_rows > 0) {
            while ($row = $fallbackResult->fetch_assoc()) {
                // Generate a name from vehicle_id if empty
                if (empty($row['name'])) {
                    $row['name'] = ucfirst(str_replace('_', ' ', $row['vehicle_id']));
                }
                
                $row['amenities'] = ['AC'];
                $row['price'] = $row['basePrice'];
                
                $vehicleIds[] = $row['vehicle_id'];
                $vehicles[$row['vehicle_id']] = $row;
            }
        }
    }
    
    // If we have vehicles, try to enhance them with outstation_fares data
    if (!empty($vehicles)) {
        $vehicleIdsStr = "'" . implode("','", $vehicleIds) . "'";
        
        // Get outstation fares data
        $outstationSql = "
            SELECT 
                vehicle_id,
                base_price,
                price_per_km,
                night_halt_charge,
                driver_allowance
            FROM 
                outstation_fares
            WHERE 
                vehicle_id IN ($vehicleIdsStr)
        ";
        
        $outstationResult = $conn->query($outstationSql);
        
        if ($outstationResult && $outstationResult->num_rows > 0) {
            while ($row = $outstationResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($vehicles[$vehicleId])) {
                    // Update price info if it's missing in the vehicle
                    if (empty($vehicles[$vehicleId]['basePrice']) || $vehicles[$vehicleId]['basePrice'] == 0) {
                        $vehicles[$vehicleId]['basePrice'] = $row['base_price'];
                        $vehicles[$vehicleId]['price'] = $row['base_price'];
                    }
                    
                    if (empty($vehicles[$vehicleId]['pricePerKm']) || $vehicles[$vehicleId]['pricePerKm'] == 0) {
                        $vehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                    }
                    
                    if (empty($vehicles[$vehicleId]['nightHaltCharge']) || $vehicles[$vehicleId]['nightHaltCharge'] == 0) {
                        $vehicles[$vehicleId]['nightHaltCharge'] = $row['night_halt_charge'];
                    }
                    
                    if (empty($vehicles[$vehicleId]['driverAllowance']) || $vehicles[$vehicleId]['driverAllowance'] == 0) {
                        $vehicles[$vehicleId]['driverAllowance'] = $row['driver_allowance'];
                    }
                }
            }
        }
        
        // Also check vehicle_pricing table for missing prices
        $pricingSql = "
            SELECT 
                vehicle_id,
                trip_type,
                base_fare,
                price_per_km,
                night_halt_charge,
                driver_allowance,
                base_price
            FROM 
                vehicle_pricing
            WHERE 
                vehicle_id IN ($vehicleIdsStr) AND trip_type = 'outstation'
        ";
        
        $pricingResult = $conn->query($pricingSql);
        
        if ($pricingResult && $pricingResult->num_rows > 0) {
            while ($row = $pricingResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($vehicles[$vehicleId])) {
                    // Update price info if it's missing
                    if (empty($vehicles[$vehicleId]['basePrice']) || $vehicles[$vehicleId]['basePrice'] == 0) {
                        $vehicles[$vehicleId]['basePrice'] = $row['base_fare'] ?? $row['base_price'] ?? 0;
                        $vehicles[$vehicleId]['price'] = $row['base_fare'] ?? $row['base_price'] ?? 0;
                    }
                    
                    if (empty($vehicles[$vehicleId]['pricePerKm']) || $vehicles[$vehicleId]['pricePerKm'] == 0) {
                        $vehicles[$vehicleId]['pricePerKm'] = $row['price_per_km'];
                    }
                }
            }
        }
        
        // Also check local_package_fares table for additional data
        $localSql = "
            SELECT 
                vehicle_id,
                price_4hrs_40km,
                price_8hrs_80km,
                price_10hrs_100km,
                price_extra_km,
                price_extra_hour
            FROM 
                local_package_fares
            WHERE 
                vehicle_id IN ($vehicleIdsStr)
        ";
        
        $localResult = $conn->query($localSql);
        
        if ($localResult && $localResult->num_rows > 0) {
            while ($row = $localResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                if (isset($vehicles[$vehicleId])) {
                    // Add local package data for reference
                    $vehicles[$vehicleId]['local'] = [
                        'price_4hrs_40km' => $row['price_4hrs_40km'],
                        'price_8hrs_80km' => $row['price_8hrs_80km'],
                        'price_10hrs_100km' => $row['price_10hrs_100km'],
                        'price_extra_km' => $row['price_extra_km'],
                        'price_extra_hour' => $row['price_extra_hour']
                    ];
                    
                    // If we don't have pricing info, use local package data
                    if (empty($vehicles[$vehicleId]['basePrice']) || $vehicles[$vehicleId]['basePrice'] == 0) {
                        // Use 10hrs package price as base price if available
                        if (!empty($row['price_10hrs_100km']) && $row['price_10hrs_100km'] > 0) {
                            $vehicles[$vehicleId]['basePrice'] = $row['price_10hrs_100km'];
                            $vehicles[$vehicleId]['price'] = $row['price_10hrs_100km'];
                        }
                    }
                    
                    if (empty($vehicles[$vehicleId]['pricePerKm']) || $vehicles[$vehicleId]['pricePerKm'] == 0) {
                        $vehicles[$vehicleId]['pricePerKm'] = $row['price_extra_km'] ?? 0;
                    }
                }
            }
        }
    }
    
    // Return the vehicles as a flat array
    $finalVehicles = array_values($vehicles);
    
    echo json_encode([
        'status' => 'success',
        'vehicles' => $finalVehicles,
        'count' => count($finalVehicles),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Log error
    error_log("Error fetching vehicles: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => basename(__FILE__),
        'trace' => $e->getTraceAsString()
    ]);
}
