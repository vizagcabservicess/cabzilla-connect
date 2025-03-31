
<?php
/**
 * fix-database-tables.php
 * 
 * This script fixes database schema issues and migrates data as needed.
 * It's designed to be called from the admin interface to resolve database issues.
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Check if database config is included
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

// Establish database connection
try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Start with a response structure
    $response = [
        "status" => "success",
        "message" => "Database tables fixed successfully",
        "details" => [
            "tables_checked" => [],
            "tables_fixed" => [],
            "vehicle_pricing_entries" => [],
            "errors" => []
        ]
    ];
    
    // First check if an admin_settings table exists and set a flag to prevent future prompts
    $adminSettingsExists = $conn->query("SHOW TABLES LIKE 'admin_settings'")->num_rows > 0;
    
    if (!$adminSettingsExists) {
        $conn->query("
            CREATE TABLE admin_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) NOT NULL UNIQUE,
                setting_value TEXT NOT NULL,
                description VARCHAR(255) NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "admin_settings (created)";
    }
    
    // Insert or update the database_fix_prompted setting to prevent continuous prompts
    $conn->query("
        INSERT INTO admin_settings (setting_key, setting_value, description)
        VALUES ('database_fix_prompted', 'fixed', 'Flag to prevent continuous database fix prompts')
        ON DUPLICATE KEY UPDATE setting_value = 'fixed', updated_at = NOW()
    ");
    $response["details"]["settings_updated"][] = "database_fix_prompted flag set to 'fixed'";
    
    // 1. Check and fix vehicle_types table
    $response["details"]["tables_checked"][] = "vehicle_types";
    $tableExists = $conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0;
    
    if (!$tableExists) {
        $conn->query("
            CREATE TABLE vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "vehicle_types (created)";
    } else {
        // Check and add missing columns
        $columnsToAdd = [
            "base_price" => "DECIMAL(10,2) NOT NULL DEFAULT 0",
            "price_per_km" => "DECIMAL(5,2) NOT NULL DEFAULT 0",
            "night_halt_charge" => "DECIMAL(10,2) NOT NULL DEFAULT 700",
            "driver_allowance" => "DECIMAL(10,2) NOT NULL DEFAULT 300"
        ];
        
        foreach ($columnsToAdd as $column => $definition) {
            $columnExists = $conn->query("SHOW COLUMNS FROM vehicle_types LIKE '$column'")->num_rows > 0;
            if (!$columnExists) {
                $conn->query("ALTER TABLE vehicle_types ADD COLUMN $column $definition");
                $response["details"]["tables_fixed"][] = "vehicle_types (added $column)";
            }
        }
    }
    
    // 2. Check and fix airport_transfer_fares table
    $response["details"]["tables_checked"][] = "airport_transfer_fares";
    $tableExists = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'")->num_rows > 0;
    
    if (!$tableExists) {
        $conn->query("
            CREATE TABLE airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "airport_transfer_fares (created)";
    }
    
    // 3. Check and fix vehicle_pricing table
    $response["details"]["tables_checked"][] = "vehicle_pricing";
    $tableExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
    
    if (!$tableExists) {
        $conn->query("
            CREATE TABLE vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL DEFAULT 'outstation',
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                airport_base_price DECIMAL(10,2) DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) DEFAULT 0,
                airport_drop_price DECIMAL(10,2) DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "vehicle_pricing (created)";
    } else {
        // Check and add missing columns
        $columnsToAdd = [
            "airport_base_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_price_per_km" => "DECIMAL(5,2) DEFAULT 0",
            "airport_pickup_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_drop_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_tier1_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_tier2_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_tier3_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_tier4_price" => "DECIMAL(10,2) DEFAULT 0",
            "airport_extra_km_charge" => "DECIMAL(5,2) DEFAULT 0"
        ];
        
        foreach ($columnsToAdd as $column => $definition) {
            $columnExists = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE '$column'")->num_rows > 0;
            if (!$columnExists) {
                $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN $column $definition");
                $response["details"]["tables_fixed"][] = "vehicle_pricing (added $column)";
            }
        }
        
        // Check for vehicle_type column and ensure vehicle_id exists
        $vehicleTypeExists = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_type'")->num_rows > 0;
        $vehicleIdExists = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'")->num_rows > 0;
        
        if ($vehicleTypeExists && !$vehicleIdExists) {
            $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id");
            $conn->query("UPDATE vehicle_pricing SET vehicle_id = vehicle_type");
            $response["details"]["tables_fixed"][] = "vehicle_pricing (added vehicle_id from vehicle_type)";
        }
    }
    
    // 4. Check and fix local_package_fares table
    $response["details"]["tables_checked"][] = "local_package_fares";
    $tableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    
    if (!$tableExists) {
        $conn->query("
            CREATE TABLE local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "local_package_fares (created)";
    }
    
    // 5. Check and fix outstation_fares table
    $response["details"]["tables_checked"][] = "outstation_fares";
    $tableExists = $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0;
    
    if (!$tableExists) {
        $conn->query("
            CREATE TABLE outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $response["details"]["tables_fixed"][] = "outstation_fares (created)";
    }
    
    // 6. Ensure all vehicles have pricing entries in vehicle_pricing
    $result = $conn->query("SELECT vehicle_id FROM vehicle_types WHERE is_active = 1");
    while ($vehicle = $result->fetch_assoc()) {
        $vehicleId = $vehicle['vehicle_id'];
        $tripTypes = ['outstation', 'local', 'airport'];
        
        foreach ($tripTypes as $tripType) {
            $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?");
            $checkStmt->bind_param("ss", $vehicleId, $tripType);
            $checkStmt->execute();
            
            if ($checkStmt->get_result()->num_rows === 0) {
                // Default values based on trip type
                $baseFare = ($tripType === 'outstation') ? 2000 : (($tripType === 'airport') ? 3000 : 1000);
                $pricePerKm = ($tripType === 'outstation') ? 15 : (($tripType === 'airport') ? 18 : 12);
                
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km) 
                    VALUES (?, ?, ?, ?)
                ");
                $insertStmt->bind_param("ssdd", $vehicleId, $tripType, $baseFare, $pricePerKm);
                $insertStmt->execute();
                
                $response["details"]["vehicle_pricing_entries"][] = "Added $tripType pricing for $vehicleId";
            }
            $checkStmt->close();
        }
    }
    
    // 7. If vehicle exists in vehicle_pricing but not in vehicle_types, create it in vehicle_types
    $result = $conn->query("
        SELECT DISTINCT vp.vehicle_id 
        FROM vehicle_pricing vp 
        LEFT JOIN vehicle_types vt ON vp.vehicle_id = vt.vehicle_id 
        WHERE vt.id IS NULL
    ");
    
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['vehicle_id'];
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_types (vehicle_id, name, is_active) 
            VALUES (?, ?, 1)
        ");
        $insertStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertStmt->execute();
        
        $response["details"]["tables_fixed"][] = "vehicle_types (added missing vehicle $vehicleId)";
    }
    
    // 8. Check if vehicles have airport_transfer_fares entries
    $result = $conn->query("SELECT vehicle_id FROM vehicle_types WHERE is_active = 1");
    while ($vehicle = $result->fetch_assoc()) {
        $vehicleId = $vehicle['vehicle_id'];
        
        $checkStmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        
        if ($checkStmt->get_result()->num_rows === 0) {
            // Default values for airport transfer fares
            $basePrice = 3000;
            $pricePerKm = 15;
            $pickupPrice = 800;
            $dropPrice = 800;
            $tier1Price = 600;
            $tier2Price = 800;
            $tier3Price = 1000;
            $tier4Price = 1200;
            $extraKmCharge = 15;
            
            $insertStmt = $conn->prepare("
                INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                 tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->bind_param("sddddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                                 $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
            $insertStmt->execute();
            
            $response["details"]["tables_fixed"][] = "airport_transfer_fares (added entry for $vehicleId)";
        }
        $checkStmt->close();
    }
    
    // Clear the database_fix_prompted flag to prevent future unwanted prompts
    $conn->query("
        INSERT INTO admin_settings (setting_key, setting_value, description)
        VALUES ('database_fix_prompted', 'fixed', 'Flag to prevent continuous database fix prompts')
        ON DUPLICATE KEY UPDATE setting_value = 'fixed', updated_at = NOW()
    ");
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Failed to fix database tables: " . $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
}
