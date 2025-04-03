
<?php
/**
 * sync-local-fares.php - Synchronize local package fares with vehicle tables
 * 
 * This endpoint ensures that the local_package_fares table has entries for all
 * vehicles in the vehicles table, and that the vehicle_id values match.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message, $file = 'sync-local-fares.log') {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $file);
}

// Log request information
logMessage("Sync local fares request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'synced_vehicles' => [],
    'fixed_issues' => [],
    'failures' => []
];

// Include database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    logMessage("Database connection established");
    
    // Begin transaction
    $conn->begin_transaction();
    
    // 1. Get all vehicles from vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Failed to query vehicles: " . $conn->error);
    }
    
    $vehicles = [];
    while ($vehicle = $vehiclesResult->fetch_assoc()) {
        $vehicles[] = $vehicle;
    }
    
    logMessage("Found " . count($vehicles) . " active vehicles");
    
    // Define standard vehicle types for fallbacks
    $standardVehicleTypes = [
        'sedan' => ['price_4hrs_40km' => 1200, 'price_8hrs_80km' => 2200, 'price_10hrs_100km' => 2500, 'price_extra_km' => 14, 'price_extra_hour' => 250],
        'ertiga' => ['price_4hrs_40km' => 1500, 'price_8hrs_80km' => 2700, 'price_10hrs_100km' => 3000, 'price_extra_km' => 18, 'price_extra_hour' => 250],
        'innova_crysta' => ['price_4hrs_40km' => 1800, 'price_8hrs_80km' => 3000, 'price_10hrs_100km' => 3500, 'price_extra_km' => 20, 'price_extra_hour' => 250],
        'tempo' => ['price_4hrs_40km' => 3000, 'price_8hrs_80km' => 4500, 'price_10hrs_100km' => 5500, 'price_extra_km' => 22, 'price_extra_hour' => 300],
        'luxury' => ['price_4hrs_40km' => 3500, 'price_8hrs_80km' => 5500, 'price_10hrs_100km' => 6500, 'price_extra_km' => 25, 'price_extra_hour' => 300]
    ];
    
    // 2. Process each vehicle
    foreach ($vehicles as $vehicle) {
        $vehicleId = $vehicle['vehicle_id'] ?: $vehicle['id'];
        logMessage("Processing vehicle: $vehicleId");
        
        // Check if vehicle exists in local_package_fares
        $checkFareQuery = "SELECT id, vehicle_id FROM local_package_fares WHERE vehicle_id = ?";
        $checkFareStmt = $conn->prepare($checkFareQuery);
        $checkFareStmt->bind_param('s', $vehicleId);
        $checkFareStmt->execute();
        $checkFareResult = $checkFareStmt->get_result();
        
        // Get default prices for this vehicle or use sedan defaults
        $defaultPrices = isset($standardVehicleTypes[strtolower($vehicleId)]) 
            ? $standardVehicleTypes[strtolower($vehicleId)] 
            : $standardVehicleTypes['sedan'];
        
        if ($checkFareResult->num_rows > 0) {
            // Vehicle exists in local_package_fares - update if needed
            $fare = $checkFareResult->fetch_assoc();
            
            // Check if the vehicle_id differs (case mismatch perhaps)
            if ($fare['vehicle_id'] !== $vehicleId) {
                $updateIdQuery = "UPDATE local_package_fares SET vehicle_id = ? WHERE id = ?";
                $updateIdStmt = $conn->prepare($updateIdQuery);
                $updateIdStmt->bind_param('si', $vehicleId, $fare['id']);
                
                if ($updateIdStmt->execute()) {
                    logMessage("Fixed vehicle_id in local_package_fares: {$fare['vehicle_id']} -> $vehicleId");
                    $response['fixed_issues'][] = "Fixed vehicle_id mismatch for $vehicleId";
                } else {
                    logMessage("Failed to update vehicle_id in local_package_fares: " . $updateIdStmt->error);
                    $response['failures'][] = "Failed to fix vehicle_id for $vehicleId";
                }
            }
            
            $response['synced_vehicles'][] = $vehicleId;
        } else {
            // Create new entry in local_package_fares
            $insertFareQuery = "INSERT INTO local_package_fares 
                              (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                              VALUES (?, ?, ?, ?, ?, ?)";
            $insertFareStmt = $conn->prepare($insertFareQuery);
            $insertFareStmt->bind_param(
                'sddddd',
                $vehicleId,
                $defaultPrices['price_4hrs_40km'],
                $defaultPrices['price_8hrs_80km'],
                $defaultPrices['price_10hrs_100km'],
                $defaultPrices['price_extra_km'],
                $defaultPrices['price_extra_hour']
            );
            
            if ($insertFareStmt->execute()) {
                logMessage("Created local_package_fares entry for $vehicleId");
                $response['synced_vehicles'][] = $vehicleId;
                $response['fixed_issues'][] = "Created missing local_package_fares for $vehicleId";
            } else {
                logMessage("Failed to create local_package_fares entry: " . $insertFareStmt->error);
                $response['failures'][] = "Failed to create entry for $vehicleId";
            }
        }
    }
    
    // 3. Check for orphaned entries in local_package_fares
    $orphanedQuery = "SELECT lpf.id, lpf.vehicle_id 
                     FROM local_package_fares lpf 
                     LEFT JOIN vehicles v ON lpf.vehicle_id = v.vehicle_id 
                     WHERE v.vehicle_id IS NULL";
    $orphanedResult = $conn->query($orphanedQuery);
    
    if ($orphanedResult) {
        while ($orphan = $orphanedResult->fetch_assoc()) {
            logMessage("Found orphaned local_package_fares entry: " . $orphan['vehicle_id']);
            
            // Check if the vehicle exists in vehicle_types
            $checkTypesQuery = "SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?";
            $checkTypesStmt = $conn->prepare($checkTypesQuery);
            $checkTypesStmt->bind_param('s', $orphan['vehicle_id']);
            $checkTypesStmt->execute();
            $checkTypesResult = $checkTypesStmt->get_result();
            
            if ($checkTypesResult->num_rows == 0) {
                // This is a true orphan - create the vehicle entry
                logMessage("Creating missing vehicle entry for: " . $orphan['vehicle_id']);
                
                // Map the vehicle ID to a sensible name
                $vehicleName = ucfirst(str_replace('_', ' ', $orphan['vehicle_id']));
                
                // Create vehicle entry
                $insertVehicleQuery = "INSERT INTO vehicles 
                                     (id, vehicle_id, name, is_active) 
                                     VALUES (?, ?, ?, 1)";
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->bind_param('sss', $orphan['vehicle_id'], $orphan['vehicle_id'], $vehicleName);
                
                if ($insertVehicleStmt->execute()) {
                    logMessage("Created missing vehicle entry for: " . $orphan['vehicle_id']);
                    $response['fixed_issues'][] = "Created missing vehicle for " . $orphan['vehicle_id'];
                } else {
                    logMessage("Failed to create vehicle entry: " . $insertVehicleStmt->error);
                    $response['failures'][] = "Failed to create vehicle for " . $orphan['vehicle_id'];
                }
            } else {
                logMessage("Orphaned entry exists in vehicle_types - creating in vehicles table");
                
                // Get vehicle details from vehicle_types
                $vehicleType = $checkTypesResult->fetch_assoc();
                
                // Get the vehicle name from vehicle_types
                $nameQuery = "SELECT name FROM vehicle_types WHERE vehicle_id = ?";
                $nameStmt = $conn->prepare($nameQuery);
                $nameStmt->bind_param('s', $vehicleType['vehicle_id']);
                $nameStmt->execute();
                $nameResult = $nameStmt->get_result();
                $vehicleName = $nameResult->fetch_assoc()['name'] ?? ucfirst(str_replace('_', ' ', $vehicleType['vehicle_id']));
                
                // Create vehicle entry
                $insertVehicleQuery = "INSERT INTO vehicles 
                                     (id, vehicle_id, name, is_active) 
                                     VALUES (?, ?, ?, 1)";
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->bind_param('sss', $vehicleType['vehicle_id'], $vehicleType['vehicle_id'], $vehicleName);
                
                if ($insertVehicleStmt->execute()) {
                    logMessage("Created vehicle entry from vehicle_types for: " . $vehicleType['vehicle_id']);
                    $response['fixed_issues'][] = "Created vehicle from vehicle_types for " . $vehicleType['vehicle_id'];
                } else {
                    logMessage("Failed to create vehicle entry from vehicle_types: " . $insertVehicleStmt->error);
                    $response['failures'][] = "Failed to sync from vehicle_types for " . $vehicleType['vehicle_id'];
                }
            }
        }
    }
    
    // Commit all changes
    $conn->commit();
    
    // Success response
    $response['status'] = 'success';
    $response['message'] = 'Local package fares synchronized successfully';
    $response['syncedCount'] = count($response['synced_vehicles']);
    $response['fixedCount'] = count($response['fixed_issues']);
    $response['failuresCount'] = count($response['failures']);
    
    logMessage("Sync completed successfully with {$response['syncedCount']} synced vehicles and {$response['fixedCount']} fixes");
    
} catch (Exception $e) {
    // Rollback on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    $response['status'] = 'error';
    $response['message'] = 'Sync failed: ' . $e->getMessage();
    logMessage("ERROR: " . $e->getMessage());
} finally {
    // Close connection
    if (isset($conn)) {
        $conn->close();
    }
}

// Send response
echo json_encode($response);
?>
