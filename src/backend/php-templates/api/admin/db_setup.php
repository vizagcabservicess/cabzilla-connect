
<?php
/**
 * Database setup script to ensure all required tables exist
 * This script is included by various API endpoints to ensure database consistency
 */

// Include database utilities
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../utils/database.php';
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Set up logging
$setupLogFile = $logDir . '/db_setup_' . date('Y-m-d') . '.log';
$setupTimestamp = date('Y-m-d H:i:s');

// Log setup message
file_put_contents($setupLogFile, "[$setupTimestamp] Running database setup\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed during setup");
    }
    
    // Verify vehicles table
    $checkVehiclesTable = $conn->query("SHOW TABLES LIKE 'vehicles'");
    
    if (!$checkVehiclesTable || $checkVehiclesTable->num_rows === 0) {
        // Create vehicles table
        $createVehiclesSQL = "
            CREATE TABLE IF NOT EXISTS vehicles (
                id VARCHAR(50) NOT NULL,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT 'Standard',
                capacity INT(11) DEFAULT 4,
                luggage_capacity INT(11) DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0.00,
                price_per_km DECIMAL(5,2) DEFAULT 0.00,
                image VARCHAR(255) DEFAULT '',
                description TEXT,
                amenities TEXT,
                ac TINYINT(1) DEFAULT 1,
                is_active TINYINT(1) DEFAULT 1,
                night_halt_charge DECIMAL(10,2) DEFAULT 0.00,
                driver_allowance DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVehiclesSQL)) {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created vehicles table\n", FILE_APPEND);
        
        // Add default vehicles
        $defaultVehicles = [
            ['sedan', 'Sedan', 'Standard', 4, 2],
            ['ertiga', 'Ertiga', 'Standard', 6, 3],
            ['innova_crysta', 'Innova Crysta', 'Premium', 6, 4],
            ['luxury', 'Luxury', 'Luxury', 4, 2],
            ['tempo_traveller', 'Tempo Traveller', 'Group', 12, 10]
        ];
        
        $insertVehicleStmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, category, capacity, luggage_capacity, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
        
        if ($insertVehicleStmt) {
            foreach ($defaultVehicles as $vehicle) {
                $insertVehicleStmt->bind_param("ssssii", $vehicle[0], $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4]);
                $insertVehicleStmt->execute();
            }
            
            file_put_contents($setupLogFile, "[$setupTimestamp] Added default vehicles\n", FILE_APPEND);
        }
    } else {
        // Ensure vehicles table has all required columns
        $vehiclesColumns = [
            ['vehicle_id', "ALTER TABLE vehicles ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id"],
            ['base_price', "ALTER TABLE vehicles ADD COLUMN base_price DECIMAL(10,2) DEFAULT 0.00 AFTER luggage_capacity"],
            ['price_per_km', "ALTER TABLE vehicles ADD COLUMN price_per_km DECIMAL(5,2) DEFAULT 0.00 AFTER base_price"],
            ['night_halt_charge', "ALTER TABLE vehicles ADD COLUMN night_halt_charge DECIMAL(10,2) DEFAULT 0.00 AFTER is_active"],
            ['driver_allowance', "ALTER TABLE vehicles ADD COLUMN driver_allowance DECIMAL(10,2) DEFAULT 0.00 AFTER night_halt_charge"]
        ];
        
        foreach ($vehiclesColumns as $column) {
            $checkColumn = $conn->query("SHOW COLUMNS FROM vehicles LIKE '{$column[0]}'");
            if (!$checkColumn || $checkColumn->num_rows === 0) {
                $conn->query($column[1]);
                file_put_contents($setupLogFile, "[$setupTimestamp] Added {$column[0]} column to vehicles table\n", FILE_APPEND);
            }
        }
    }
    
    // Verify airport_transfer_fares table
    $checkAirportTable = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    
    if (!$checkAirportTable || $checkAirportTable->num_rows === 0) {
        // Create airport_transfer_fares table
        $createAirportFaresSQL = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
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
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createAirportFaresSQL)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Verify vehicle_pricing table
    $checkVehiclePricingTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    
    if (!$checkVehiclePricingTable || $checkVehiclePricingTable->num_rows === 0) {
        // Create vehicle_pricing table
        $createVehiclePricingSQL = "
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL,
                airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVehiclePricingSQL)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created vehicle_pricing table\n", FILE_APPEND);
    }
    
    // Populate tables with synced data
    $syncQuery = "
        INSERT IGNORE INTO vehicle_pricing (vehicle_id, trip_type)
        SELECT vehicle_id, 'airport' FROM vehicles
    ";
    
    $conn->query($syncQuery);
    
    $syncAirportQuery = "
        INSERT IGNORE INTO airport_transfer_fares (vehicle_id)
        SELECT vehicle_id FROM vehicles
    ";
    
    $conn->query($syncAirportQuery);
    
    file_put_contents($setupLogFile, "[$setupTimestamp] Database setup completed successfully\n", FILE_APPEND);
    
    // If this was called directly as an API, return success response
    if (basename($_SERVER['PHP_SELF']) == 'db_setup.php') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'Database setup completed successfully',
            'timestamp' => time()
        ]);
    }
    
} catch (Exception $e) {
    file_put_contents($setupLogFile, "[$setupTimestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // If this was called directly as an API, return error response
    if (basename($_SERVER['PHP_SELF']) == 'db_setup.php') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
}
