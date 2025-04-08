
<?php
/**
 * initialize-outstation-tables.php - Create database tables for outstation fares
 */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the config file
require_once __DIR__ . '/../../config.php';

try {
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Create outstation_fares table if not exists
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT(11) NOT NULL AUTO_INCREMENT,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            roundtrip_base_price DECIMAL(10,2) DEFAULT NULL,
            roundtrip_price_per_km DECIMAL(5,2) DEFAULT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $result = $conn->query($createTableSql);
    
    if ($result === false) {
        throw new Exception("Failed to create outstation_fares table: " . $conn->error);
    }
    
    // Migrate data from vehicle_pricing table if it exists
    $checkPricingTableQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $pricingTableExistsResult = $conn->query($checkPricingTableQuery);
    
    if ($pricingTableExistsResult->num_rows > 0) {
        // Copy data from vehicle_pricing table
        $migrateDataSql = "
            INSERT IGNORE INTO outstation_fares (
                vehicle_id, 
                base_price, 
                price_per_km, 
                driver_allowance, 
                night_halt_charge
            )
            SELECT 
                vp.vehicle_id,
                vp.base_fare,
                vp.price_per_km,
                vp.driver_allowance,
                vp.night_halt_charge
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type IN ('outstation', 'outstation-one-way')
            ON DUPLICATE KEY UPDATE
                updated_at = NOW()
        ";
        
        $migrateResult = $conn->query($migrateDataSql);
        
        if ($migrateResult === false) {
            logError("Data migration warning: " . $conn->error);
        }
        
        // Update roundtrip pricing
        $updateRoundtripSql = "
            UPDATE 
                outstation_fares of,
                vehicle_pricing vp
            SET 
                of.roundtrip_base_price = vp.base_fare,
                of.roundtrip_price_per_km = vp.price_per_km,
                of.updated_at = NOW()
            WHERE 
                of.vehicle_id = vp.vehicle_id AND
                vp.trip_type = 'outstation-round-trip'
        ";
        
        $updateResult = $conn->query($updateRoundtripSql);
        
        if ($updateResult === false) {
            logError("Roundtrip update warning: " . $conn->error);
        }
    }
    
    // Get the list of vehicles to ensure all vehicles have outstation fare entries
    $vehiclesSql = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesSql);
    
    $insertCount = 0;
    
    if ($vehiclesResult->num_rows > 0) {
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $vehicle['vehicle_id'] ?: $vehicle['id'];
            
            // Skip numeric IDs
            if (is_numeric($vehicleId)) {
                continue;
            }
            
            // Check if fare already exists
            $checkSql = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Insert default fare for this vehicle
                $insertSql = "
                    INSERT INTO outstation_fares (
                        vehicle_id, 
                        base_price, 
                        price_per_km, 
                        driver_allowance, 
                        night_halt_charge, 
                        roundtrip_base_price, 
                        roundtrip_price_per_km
                    ) VALUES (?, 0, 0, 300, 700, 0, 0)
                ";
                
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
                
                $insertCount++;
            }
        }
    }
    
    // Send success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fare tables initialized successfully',
        'data' => [
            'table_created' => !$pricingTableExistsResult->num_rows,
            'default_fares_added' => $insertCount
        ]
    ]);
} catch (Exception $e) {
    logError("Error initializing outstation tables: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => "Failed to initialize outstation tables: " . $e->getMessage()
    ]);
}
