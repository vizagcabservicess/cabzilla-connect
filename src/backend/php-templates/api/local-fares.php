
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: local-fares.php');
header('X-API-Version: 1.0.4');
header('X-Timestamp: ' . time());

// Clear any existing output buffer to prevent corrupt JSON
ob_clean();
ob_start();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Include the database helper to ensure the function is available
    require_once __DIR__ . '/common/db_helper.php';
    
    $conn = getDbConnectionWithRetry();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Local fares request: " . json_encode([
        'vehicle_id' => $vehicleId
    ]));
    
    // Ensure the local_package_fares table has the correct columns
    ensureLocalPackageFaresTable($conn);
    
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
            `vehicle_id` VARCHAR(50) NOT NULL,
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
            UNIQUE KEY `vehicle_trip` (`vehicle_id`, `trip_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createVehiclePricingTable);
        $vehiclePricingTableExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
        error_log("Created vehicle_pricing table: " . ($vehiclePricingTableExists ? "success" : "failed"));
    }
    
    $fares = [];
    $sourceTable = 'none';
    
    // Validate the column names in local_package_fares table
    $columnsResult = $conn->query("DESCRIBE local_package_fares");
    $columns = [];
    if ($columnsResult) {
        while ($column = $columnsResult->fetch_assoc()) {
            $columns[] = $column['Field'];
        }
    }
    error_log("Available columns in local_package_fares: " . implode(", ", $columns));
    
    // Try to fetch from local_package_fares first (preferred source)
    if ($localFaresTableExists) {
        // Use the correct column names based on what's available in the database
        $price4hrColumn = in_array('price_4hrs_40km', $columns) ? 'price_4hrs_40km' : 
                         (in_array('price_4hr_40km', $columns) ? 'price_4hr_40km' : 'price_4hrs_40km');
        
        $price8hrColumn = in_array('price_8hrs_80km', $columns) ? 'price_8hrs_80km' : 
                         (in_array('price_8hr_80km', $columns) ? 'price_8hr_80km' : 'price_8hrs_80km');
        
        $price10hrColumn = in_array('price_10hrs_100km', $columns) ? 'price_10hrs_100km' : 
                          (in_array('price_10hr_100km', $columns) ? 'price_10hr_100km' : 'price_10hrs_100km');
        
        $extraKmColumn = in_array('price_extra_km', $columns) ? 'price_extra_km' : 
                        (in_array('extra_km_rate', $columns) ? 'extra_km_rate' : 'price_extra_km');
        
        $extraHourColumn = in_array('price_extra_hour', $columns) ? 'price_extra_hour' : 
                          (in_array('extra_hour_rate', $columns) ? 'extra_hour_rate' : 'price_extra_hour');
        
        $query = "
            SELECT 
                vehicle_id,
                $price4hrColumn,
                $price8hrColumn,
                $price10hrColumn,
                $extraKmColumn,
                $extraHourColumn
            FROM 
                local_package_fares
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " WHERE vehicle_id = '$vehicleId'";
        }
        
        error_log("Using local_package_fares table with query: $query");
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'local_package_fares';
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing local_package_fares row for vehicle: $id");
                error_log("Row data: " . json_encode($row));
                
                // Map to standardized properties with all naming variants
                $fares[$id] = [
                    // Standard API property names
                    'price4hrs40km' => floatval($row[$price4hrColumn] ?? 0),
                    'price8hrs80km' => floatval($row[$price8hrColumn] ?? 0),
                    'price10hrs100km' => floatval($row[$price10hrColumn] ?? 0),
                    'priceExtraKm' => floatval($row[$extraKmColumn] ?? 0),
                    'priceExtraHour' => floatval($row[$extraHourColumn] ?? 0),
                    
                    // Include original column names for direct mapping
                    'price_4hrs_40km' => floatval($row[$price4hrColumn] ?? 0),
                    'price_8hrs_80km' => floatval($row[$price8hrColumn] ?? 0),
                    'price_10hrs_100km' => floatval($row[$price10hrColumn] ?? 0),
                    'price_extra_km' => floatval($row[$extraKmColumn] ?? 0),
                    'price_extra_hour' => floatval($row[$extraHourColumn] ?? 0),
                    
                    // Include alias properties for compatibility
                    'package4hr40km' => floatval($row[$price4hrColumn] ?? 0),
                    'package8hr80km' => floatval($row[$price8hrColumn] ?? 0),
                    'package10hr100km' => floatval($row[$price10hrColumn] ?? 0),
                    'extraKmRate' => floatval($row[$extraKmColumn] ?? 0),
                    'extraHourRate' => floatval($row[$extraHourColumn] ?? 0),
                    
                    // Vehicle pricing table names for compatibility
                    'local_package_4hr' => floatval($row[$price4hrColumn] ?? 0),
                    'local_package_8hr' => floatval($row[$price8hrColumn] ?? 0),
                    'local_package_10hr' => floatval($row[$price10hrColumn] ?? 0),
                    'extra_km_charge' => floatval($row[$extraKmColumn] ?? 0),
                    'extra_hour_charge' => floatval($row[$extraHourColumn] ?? 0)
                ];
            }
        }
    }
    
    // If no data from local_package_fares, or it doesn't exist, try vehicle_pricing
    if (empty($fares) && $vehiclePricingTableExists) {
        $query = "
            SELECT 
                vehicle_id as vehicle_id,
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
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vehicle_id = '$vehicleId'";
        }
        
        error_log("Using vehicle_pricing table with query: $query");
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'vehicle_pricing';
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing vehicle_pricing row for vehicle: $id");
                
                // Map to standardized properties with all naming variants
                $fares[$id] = [
                    // Standard API property names
                    'price4hrs40km' => floatval($row['local_package_4hr'] ?? 0),
                    'price8hrs80km' => floatval($row['local_package_8hr'] ?? 0),
                    'price10hrs100km' => floatval($row['local_package_10hr'] ?? 0),
                    'priceExtraKm' => floatval($row['extra_km_charge'] ?? 0),
                    'priceExtraHour' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Include original column names for direct mapping
                    'local_package_4hr' => floatval($row['local_package_4hr'] ?? 0),
                    'local_package_8hr' => floatval($row['local_package_8hr'] ?? 0),
                    'local_package_10hr' => floatval($row['local_package_10hr'] ?? 0),
                    'extra_km_charge' => floatval($row['extra_km_charge'] ?? 0),
                    'extra_hour_charge' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Include alias properties for compatibility
                    'package4hr40km' => floatval($row['local_package_4hr'] ?? 0),
                    'package8hr80km' => floatval($row['local_package_8hr'] ?? 0),
                    'package10hr100km' => floatval($row['local_package_10hr'] ?? 0),
                    'extraKmRate' => floatval($row['extra_km_charge'] ?? 0),
                    'extraHourRate' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Local package fares column names for compatibility
                    'price_4hrs_40km' => floatval($row['local_package_4hr'] ?? 0),
                    'price_8hrs_80km' => floatval($row['local_package_8hr'] ?? 0),
                    'price_10hrs_100km' => floatval($row['local_package_10hr'] ?? 0),
                    'price_extra_km' => floatval($row['extra_km_charge'] ?? 0),
                    'price_extra_hour' => floatval($row['extra_hour_charge'] ?? 0)
                ];
            }
        }
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response
    $response = [
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $sourceTable,
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId,
        'tablesChecked' => [
            'local_package_fares' => $localFaresTableExists,
            'vehicle_pricing' => $vehiclePricingTableExists
        ],
        'columnsAvailable' => $columns
    ];
    
    // Send the JSON response and clear any buffer
    ob_end_clean();
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in local-fares.php: " . $e->getMessage());
    http_response_code(500);
    
    ob_end_clean();
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
