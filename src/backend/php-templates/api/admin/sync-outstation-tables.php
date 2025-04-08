
<?php
/**
 * sync-outstation-tables.php - Sync outstation fares with vehicle_pricing table
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
    
    // First ensure both tables exist
    $tables = ['outstation_fares', 'vehicle_pricing'];
    $missingTables = [];
    
    foreach ($tables as $table) {
        $checkTableQuery = "SHOW TABLES LIKE '$table'";
        $checkResult = $conn->query($checkTableQuery);
        
        if ($checkResult->num_rows === 0) {
            $missingTables[] = $table;
            
            // Create missing tables
            if ($table === 'outstation_fares') {
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
                
                $conn->query($createTableSql);
            } elseif ($table === 'vehicle_pricing') {
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) NOT NULL,
                        base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                $conn->query($createTableSql);
            }
        }
    }
    
    // Transaction for data sync
    $conn->begin_transaction();
    
    try {
        // 1. Update outstation_fares from vehicle_pricing (in case of changes made elsewhere)
        $updateOutstationFaresQuery = "
            INSERT INTO outstation_fares (
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
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()
        ";
        
        $conn->query($updateOutstationFaresQuery);
        
        // Update roundtrip values
        $updateRoundtripQuery = "
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
        
        $conn->query($updateRoundtripQuery);
        
        // 2. Update vehicle_pricing from outstation_fares (to make changes visible elsewhere)
        // Update one-way pricing
        $updateOneWayQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, 
                trip_type, 
                base_fare, 
                price_per_km, 
                driver_allowance, 
                night_halt_charge
            )
            SELECT 
                of.vehicle_id,
                'outstation-one-way',
                of.base_price,
                of.price_per_km,
                of.driver_allowance,
                of.night_halt_charge
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()
        ";
        
        $conn->query($updateOneWayQuery);
        
        // Also update generic outstation trip type
        $updateGenericQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, 
                trip_type, 
                base_fare, 
                price_per_km, 
                driver_allowance, 
                night_halt_charge
            )
            SELECT 
                of.vehicle_id,
                'outstation',
                of.base_price,
                of.price_per_km,
                of.driver_allowance,
                of.night_halt_charge
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()
        ";
        
        $conn->query($updateGenericQuery);
        
        // Update round-trip pricing
        $updateRoundTripPricingQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, 
                trip_type, 
                base_fare, 
                price_per_km, 
                driver_allowance, 
                night_halt_charge
            )
            SELECT 
                of.vehicle_id,
                'outstation-round-trip',
                IFNULL(of.roundtrip_base_price, of.base_price * 0.9),
                IFNULL(of.roundtrip_price_per_km, of.price_per_km * 0.85),
                of.driver_allowance,
                of.night_halt_charge
            FROM 
                outstation_fares of
            ON DUPLICATE KEY UPDATE
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge),
                updated_at = NOW()
        ";
        
        $conn->query($updateRoundTripPricingQuery);
        
        $conn->commit();
        
        // Get counts for reporting
        $outstationFaresCount = $conn->query("SELECT COUNT(*) as count FROM outstation_fares")->fetch_assoc()['count'];
        $vehiclePricingCount = $conn->query("SELECT COUNT(*) as count FROM vehicle_pricing WHERE trip_type LIKE 'outstation%'")->fetch_assoc()['count'];
        
        // Send success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Outstation fare tables synchronized successfully',
            'data' => [
                'outstation_fares_count' => $outstationFaresCount,
                'vehicle_pricing_count' => $vehiclePricingCount,
                'created_tables' => $missingTables
            ]
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
} catch (Exception $e) {
    logError("Error syncing outstation tables: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => "Failed to sync outstation tables: " . $e->getMessage()
    ]);
}
