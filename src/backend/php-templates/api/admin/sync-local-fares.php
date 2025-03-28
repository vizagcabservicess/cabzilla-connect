
<?php
/**
 * This script synchronizes data between local_package_fares and vehicle_pricing tables
 * It handles different column name variations between tables
 */
// Direct DB connection - not using config to avoid potential connection issues
$host = 'localhost';
$dbname = 'u644605165_new_bookingdb';
$username = 'u644605165_new_bookingusr';
$password = 'Vizag@1213';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Starting sync-local-fares.php script", 3, $logDir . '/sync-local-fares.log');

try {
    // Get database connection directly
    $conn = new mysqli($host, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    error_log("[$timestamp] Database connection successful", 3, $logDir . '/sync-local-fares.log');
    
    // Log start of sync process
    error_log("[$timestamp] Starting sync between local_package_fares and vehicle_pricing tables", 3, $logDir . '/sync-local-fares.log');
    
    $tables = [];
    $syncedIds = [];
    $syncResults = [
        'localToVehiclePricing' => 0,
        'vehiclePricingToLocal' => 0,
        'errors' => []
    ];
    
    // Check if tables exist and create them if needed
    $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $tables['local_package_fares'] = $result && $result->num_rows > 0;
    
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $tables['vehicle_pricing'] = $result && $result->num_rows > 0;
    
    error_log("[$timestamp] Tables check completed: local_package_fares=" . ($tables['local_package_fares'] ? 'exists' : 'missing') . 
              ", vehicle_pricing=" . ($tables['vehicle_pricing'] ? 'exists' : 'missing'), 3, $logDir . '/sync-local-fares.log');
    
    // Create tables if they don't exist
    if (!$tables['local_package_fares']) {
        $createLocalFaresQuery = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
                `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        if (!$conn->query($createLocalFaresQuery)) {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
        $tables['local_package_fares'] = true;
        error_log("[$timestamp] Created local_package_fares table", 3, $logDir . '/sync-local-fares.log');
    }
    
    if (!$tables['vehicle_pricing']) {
        $createVehiclePricingQuery = "
            CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `trip_type` enum('local','outstation','airport') NOT NULL,
                `local_package_4hr` decimal(10,2) DEFAULT '0.00',
                `local_package_8hr` decimal(10,2) DEFAULT '0.00',
                `local_package_10hr` decimal(10,2) DEFAULT '0.00',
                `base_fare` decimal(10,2) DEFAULT '0.00',
                `price_per_km` decimal(10,2) DEFAULT '0.00',
                `night_halt_charge` decimal(10,2) DEFAULT '0.00',
                `driver_allowance` decimal(10,2) DEFAULT '0.00',
                `extra_km_charge` decimal(10,2) DEFAULT '0.00',
                `extra_hour_charge` decimal(10,2) DEFAULT '0.00',
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_type_trip_type` (`vehicle_id`,`trip_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        if (!$conn->query($createVehiclePricingQuery)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        $tables['vehicle_pricing'] = true;
        error_log("[$timestamp] Created vehicle_pricing table", 3, $logDir . '/sync-local-fares.log');
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // First sync from local_package_fares to vehicle_pricing
        if ($tables['local_package_fares'] && $tables['vehicle_pricing']) {
            error_log("[$timestamp] Syncing from local_package_fares to vehicle_pricing...", 3, $logDir . '/sync-local-fares.log');
            
            // Get all records from local_package_fares
            $query = "SELECT * FROM local_package_fares";
            $localFares = $conn->query($query);
            
            if (!$localFares) {
                throw new Exception("Failed to query local_package_fares: " . $conn->error);
            }
            
            while ($fare = $localFares->fetch_assoc()) {
                $vehicleId = $fare['vehicle_id'];
                $syncedIds[$vehicleId] = true;
                
                $price4hrs40km = $fare['price_4hrs_40km'];
                $price8hrs80km = $fare['price_8hrs_80km'];
                $price10hrs100km = $fare['price_10hrs_100km'];
                $priceExtraKm = $fare['price_extra_km'];
                $priceExtraHour = $fare['price_extra_hour'];
                
                // Check if record exists in vehicle_pricing - using vehicle_id column
                $checkSql = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->bind_param("s", $vehicleId);
                $checkStmt->execute();
                $result = $checkStmt->get_result();
                $vpExists = $result && $result->num_rows > 0;
                
                // Get existing outstation data to preserve it
                $outStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'");
                $outStmt->bind_param("s", $vehicleId);
                $outStmt->execute();
                $outResult = $outStmt->get_result();
                $existingOutstationData = $outResult && $outResult->num_rows > 0 ? $outResult->fetch_assoc() : null;
                
                // Set default values for outstation fields
                $baseFare = $existingOutstationData ? ($existingOutstationData['base_fare'] ?? 0) : 0;
                $pricePerKm = $existingOutstationData ? ($existingOutstationData['price_per_km'] ?? 0) : 0;
                $nightHaltCharge = $existingOutstationData ? ($existingOutstationData['night_halt_charge'] ?? 0) : 0;
                $driverAllowance = $existingOutstationData ? ($existingOutstationData['driver_allowance'] ?? 0) : 0;
                
                if ($vpExists) {
                    // Update existing record
                    $updateSql = "UPDATE vehicle_pricing 
                                SET local_package_4hr = ?, 
                                    local_package_8hr = ?, 
                                    local_package_10hr = ?, 
                                    extra_km_charge = ?, 
                                    extra_hour_charge = ?,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE vehicle_id = ? AND trip_type = 'local'";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                    $updateStmt->execute();
                    $syncResults['localToVehiclePricing']++;
                } else {
                    // Insert new record
                    $insertSql = "INSERT INTO vehicle_pricing 
                                (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                                extra_km_charge, extra_hour_charge, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                                VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $insertStmt = $conn->prepare($insertSql);
                    $insertStmt->bind_param("sddddddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, 
                                          $priceExtraKm, $priceExtraHour, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    $insertStmt->execute();
                    $syncResults['localToVehiclePricing']++;
                }
            }
            
            // Now sync from vehicle_pricing to local_package_fares
            error_log("[$timestamp] Syncing from vehicle_pricing to local_package_fares...", 3, $logDir . '/sync-local-fares.log');
            
            // Get all local records from vehicle_pricing
            $query = "SELECT * FROM vehicle_pricing WHERE trip_type = 'local'";
            $vehiclePricing = $conn->query($query);
            
            if (!$vehiclePricing) {
                throw new Exception("Failed to query vehicle_pricing: " . $conn->error);
            }
            
            while ($pricing = $vehiclePricing->fetch_assoc()) {
                $vehicleId = $pricing['vehicle_id'];
                
                // Skip if already processed
                if (isset($syncedIds[$vehicleId])) {
                    continue;
                }
                
                // Mark as processed
                $syncedIds[$vehicleId] = true;
                
                // Get the values from vehicle_pricing
                $price4hrs40km = $pricing['local_package_4hr'] ?? 0;
                $price8hrs80km = $pricing['local_package_8hr'] ?? 0;
                $price10hrs100km = $pricing['local_package_10hr'] ?? 0;
                $priceExtraKm = $pricing['extra_km_charge'] ?? 0;
                $priceExtraHour = $pricing['extra_hour_charge'] ?? 0;
                
                // Check if record exists in local_package_fares
                $checkStmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
                $checkStmt->bind_param("s", $vehicleId);
                $checkStmt->execute();
                $result = $checkStmt->get_result();
                $lpfExists = $result && $result->num_rows > 0;
                
                if ($lpfExists) {
                    // Update existing record
                    $updateStmt = $conn->prepare("UPDATE local_package_fares 
                                            SET price_4hrs_40km = ?, 
                                                price_8hrs_80km = ?, 
                                                price_10hrs_100km = ?, 
                                                price_extra_km = ?, 
                                                price_extra_hour = ?,
                                                updated_at = CURRENT_TIMESTAMP
                                            WHERE vehicle_id = ?");
                    $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                    $updateStmt->execute();
                } else {
                    // Insert new record - no vehicle_type column in table
                    $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                                            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                                            price_extra_km, price_extra_hour)
                                            VALUES (?, ?, ?, ?, ?, ?)");
                    $insertStmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
                    $insertStmt->execute();
                }
                
                $syncResults['vehiclePricingToLocal']++;
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Tables synchronized successfully',
            'tables' => $tables,
            'syncResults' => $syncResults,
            'vehiclesProcessed' => count($syncedIds),
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction if an error occurred
        $conn->rollback();
        throw $e; // Re-throw to be caught by outer try-catch
    }
    
} catch (Exception $e) {
    error_log("[$timestamp] Error syncing tables: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 3, $logDir . '/sync-local-fares.log');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'tables' => $tables ?? [],
        'trace' => $e->getTraceAsString()
    ]);
}
