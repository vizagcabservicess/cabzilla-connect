
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: local-fares.php');
header('X-API-Version: 1.0.4');
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
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Local fares request: " . json_encode([
        'vehicle_id' => $vehicleId,
        'request_uri' => $_SERVER['REQUEST_URI']
    ]));
    
    // First check if local_package_fares table exists
    $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    $vehiclePricingTableExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
    
    // If tables don't exist, try to create them
    if (!$localFaresTableExists) {
        $createLocalFaresTable = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createLocalFaresTable);
        $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        error_log("Created local_package_fares table: " . ($localFaresTableExists ? "success" : "failed"));
    }
    
    if (!$vehiclePricingTableExists) {
        $createVehiclePricingTable = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `vehicle_type` VARCHAR(50) NOT NULL,
            `trip_type` VARCHAR(20) NOT NULL,
            `local_package_4hr` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `local_package_8hr` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `local_package_10hr` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `extra_km_charge` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `extra_hour_charge` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `base_fare` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `night_halt_charge` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `driver_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_trip` (`vehicle_type`, `trip_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createVehiclePricingTable);
        $vehiclePricingTableExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
        error_log("Created vehicle_pricing table: " . ($vehiclePricingTableExists ? "success" : "failed"));
    }
    
    $fares = [];
    $sourceTable = 'none';
    
    // Try to fetch from local_package_fares first (preferred source)
    if ($localFaresTableExists) {
        // If vehicle ID is provided, build a query that tries multiple match strategies
        if ($vehicleId) {
            $query = "
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
                    vehicle_id = ?
            ";
            
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // If exact match fails, try a normalized match
            if ($result->num_rows === 0) {
                $normalizedVehicleId = strtolower(str_replace(' ', '_', $vehicleId));
                $stmt = $conn->prepare($query);
                $stmt->bind_param("s", $normalizedVehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                // If normalized match fails, try a LIKE match
                if ($result->num_rows === 0) {
                    $query = "
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
                            vehicle_id LIKE ? OR ? LIKE CONCAT('%', vehicle_id, '%')
                    ";
                    
                    $likePattern = '%' . $vehicleId . '%';
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param("ss", $likePattern, $vehicleId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                }
            }
        } else {
            // If no vehicle ID is provided, get all fares
            $query = "
                SELECT 
                    vehicle_id,
                    price_4hrs_40km,
                    price_8hrs_80km,
                    price_10hrs_100km,
                    price_extra_km,
                    price_extra_hour
                FROM 
                    local_package_fares
            ";
            
            $result = $conn->query($query);
        }
        
        error_log("Executing query for local_package_fares table: " . ($vehicleId ? "For $vehicleId" : "All vehicles"));
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'local_package_fares';
            error_log("Found " . $result->num_rows . " records in $sourceTable");
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing local_package_fares row for vehicle: $id");
                
                // Create standardized objects in the format expected by the frontend
                $fares[] = [
                    'vehicleId' => $id,
                    'price4hrs40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'price8hrs80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'price10hrs100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'priceExtraKm' => floatval($row['price_extra_km'] ?? 0),
                    'priceExtraHour' => floatval($row['price_extra_hour'] ?? 0)
                ];
            }
        } else {
            error_log("No records found in local_package_fares table" . ($vehicleId ? " for $vehicleId" : ""));
        }
    }
    
    // If no data from local_package_fares, or it doesn't exist, try vehicle_pricing
    if (empty($fares) && $vehiclePricingTableExists) {
        $query = "
            SELECT 
                vehicle_type as vehicle_id,
                local_package_4hr,
                local_package_8hr,
                local_package_10hr,
                extra_km_charge,
                extra_hour_charge
            FROM 
                vehicle_pricing
            WHERE 
                trip_type = 'local'
        ";
        
        // If vehicle_id parameter is provided, add filtering
        if ($vehicleId) {
            $query .= " AND (vehicle_type = ? OR vehicle_type LIKE ? OR ? LIKE CONCAT('%', vehicle_type, '%'))";
            
            $stmt = $conn->prepare($query);
            $likePattern = '%' . $vehicleId . '%';
            $stmt->bind_param("sss", $vehicleId, $likePattern, $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($query);
        }
        
        error_log("Executing query for vehicle_pricing table: " . ($vehicleId ? "For $vehicleId" : "All vehicles"));
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'vehicle_pricing';
            error_log("Found " . $result->num_rows . " records in $sourceTable");
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing vehicle_pricing row for vehicle: $id");
                
                // Create standardized objects in the format expected by the frontend
                $fares[] = [
                    'vehicleId' => $id,
                    'price4hrs40km' => floatval($row['local_package_4hr'] ?? 0),
                    'price8hrs80km' => floatval($row['local_package_8hr'] ?? 0),
                    'price10hrs100km' => floatval($row['local_package_10hr'] ?? 0),
                    'priceExtraKm' => floatval($row['extra_km_charge'] ?? 0),
                    'priceExtraHour' => floatval($row['extra_hour_charge'] ?? 0)
                ];
            }
        } else {
            error_log("No records found in vehicle_pricing table" . ($vehicleId ? " for $vehicleId" : ""));
        }
    }
    
    error_log("Total fares found: " . count($fares));
    
    // If vehicle_id was specified but no fares found, add a diagnostic message
    $diagnosticMessage = "";
    if ($vehicleId && empty($fares)) {
        error_log("No fares found for vehicle_id: $vehicleId");
        $diagnosticMessage = "No fares found for vehicle_id: $vehicleId. Check database or vehicle ID spelling.";
    }
    
    // Return response in the format expected by the frontend
    echo json_encode([
        'status' => 'success',
        'message' => empty($fares) ? "No fares found" : "Local fares retrieved successfully",
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $sourceTable,
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId,
        'diagnosticMessage' => $diagnosticMessage,
        'tablesChecked' => [
            'local_package_fares' => $localFaresTableExists,
            'vehicle_pricing' => $vehiclePricingTableExists
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
