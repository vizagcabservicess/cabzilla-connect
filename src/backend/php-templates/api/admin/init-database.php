
<?php
// init-database.php - Initialize database tables

// Set headers before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

// For OPTIONS requests, return 200 immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request
error_log("Database initialization requested at " . date('Y-m-d H:i:s'));

// Load configuration if it exists
if (file_exists('../../config.php')) {
    require_once '../../config.php';
} elseif (file_exists('../config.php')) {
    require_once '../config.php';
} else {
    // Define fallback credentials if config not found
    define('DB_HOST', 'localhost');
    define('DB_USERNAME', 'u644605165_new_bookingusr');
    define('DB_PASSWORD', 'Vizag@1213');
    define('DB_DATABASE', 'u644605165_new_bookingdb');
    
    // Also set as variables for backward compatibility
    $db_host = 'localhost';
    $db_user = 'u644605165_new_bookingusr';
    $db_pass = 'Vizag@1213';
    $db_name = 'u644605165_new_bookingdb';
    
    error_log("Config file not found, using hardcoded credentials");
}

// Connect to database - try multiple connection methods
function getDbConnection() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            error_log("Connected to database using constants");
            return $conn;
        }

        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            error_log("Connected to database using globals");
            return $conn;
        }

        // Fallback to hardcoded credentials as last resort (for development only)
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        error_log("Connected to database using hardcoded values");
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e; // Re-throw to be caught by the main try-catch
    }
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Could not connect to database");
    }
    
    // Create tables
    $tables = [];
    
    // vehicle_types table
    $tables[] = "
    CREATE TABLE IF NOT EXISTS vehicle_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        capacity INT NOT NULL DEFAULT 4,
        luggage_capacity INT NOT NULL DEFAULT 2,
        ac TINYINT(1) NOT NULL DEFAULT 1,
        image VARCHAR(255),
        description TEXT,
        amenities TEXT,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // vehicle_pricing table
    $tables[] = "
    CREATE TABLE IF NOT EXISTS vehicle_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_type VARCHAR(50) NOT NULL,
        trip_type VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        driver_allowance DECIMAL(10,2) DEFAULT 0,
        night_halt_charge DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_trip_type (vehicle_type, trip_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // outstation_fares table
    $tables[] = "
    CREATE TABLE IF NOT EXISTS outstation_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // airport_fares table
    $tables[] = "
    CREATE TABLE IF NOT EXISTS airport_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        drop_price DECIMAL(10,2) DEFAULT 0,
        pickup_price DECIMAL(10,2) DEFAULT 0,
        tier1_price DECIMAL(10,2) DEFAULT 0,
        tier2_price DECIMAL(10,2) DEFAULT 0,
        tier3_price DECIMAL(10,2) DEFAULT 0,
        tier4_price DECIMAL(10,2) DEFAULT 0,
        extra_km_charge DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // local_fares table
    $tables[] = "
    CREATE TABLE IF NOT EXISTS local_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        package_4hr_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
        package_8hr_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
        package_10hr_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
        extra_km_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        extra_hour_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // Create each table
    $createdTables = 0;
    $existingTables = 0;
    $errorMessages = [];
    
    foreach ($tables as $sql) {
        if ($conn->query($sql) === TRUE) {
            $createdTables++;
        } else {
            $errorMessages[] = $conn->error;
        }
    }
    
    // Check table existence
    $tableNames = ['vehicle_types', 'vehicle_pricing', 'outstation_fares', 'airport_fares', 'local_fares'];
    foreach ($tableNames as $tableName) {
        $result = $conn->query("SHOW TABLES LIKE '$tableName'");
        if ($result->num_rows > 0) {
            $existingTables++;
        }
    }
    
    // Check outstation_fares has all needed columns
    $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'roundtrip_base_price'");
    if ($conn->affected_rows == 0) {
        $conn->query("ALTER TABLE outstation_fares ADD COLUMN roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price_per_km");
    }
    
    $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'roundtrip_price_per_km'");
    if ($conn->affected_rows == 0) {
        $conn->query("ALTER TABLE outstation_fares ADD COLUMN roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER roundtrip_base_price");
    }
    
    // Insert default vehicles if no vehicles exist
    $result = $conn->query("SELECT COUNT(*) as count FROM vehicle_types");
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        $defaultVehicles = [
            ['sedan', 'Sedan', 4, 2, 1, '/cars/sedan.png', 'Comfortable sedan suitable for 4 passengers', '["AC","Bottle Water","Music System"]', 1],
            ['ertiga', 'Ertiga', 6, 3, 1, '/cars/ertiga.png', 'Spacious SUV suitable for 6 passengers', '["AC","Bottle Water","Music System","Extra Legroom"]', 1],
            ['innova_crysta', 'Innova Crysta', 7, 4, 1, '/cars/innova.png', 'Premium SUV with ample space for 7 passengers', '["AC","Bottle Water","Music System","Extra Legroom","Charging Point"]', 1],
            ['luxury', 'Luxury Sedan', 4, 2, 1, '/cars/luxury.png', 'Premium luxury sedan for executive travel', '["AC","Bottle Water","Music System","Premium Leather Seats","Charging Point"]', 1]
        ];
        
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($defaultVehicles as $vehicle) {
            $insertVehicleStmt->bind_param("ssiissssi", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5], $vehicle[6], $vehicle[7], $vehicle[8]);
            $insertVehicleStmt->execute();
        }
        
        // Add default pricing
        $pricing = [
            ['sedan', 'outstation-one-way', 4200, 14, 250, 700],
            ['sedan', 'outstation-round-trip', 4200, 14, 250, 700],
            ['sedan', 'local', 3000, 14, 0, 0],
            ['sedan', 'airport', 1200, 14, 0, 0],
            ['ertiga', 'outstation-one-way', 5400, 18, 250, 1000],
            ['ertiga', 'outstation-round-trip', 5400, 18, 250, 1000],
            ['ertiga', 'local', 3800, 18, 0, 0],
            ['ertiga', 'airport', 1500, 16, 0, 0],
            ['innova_crysta', 'outstation-one-way', 6000, 20, 250, 1000],
            ['innova_crysta', 'outstation-round-trip', 6000, 20, 250, 1000],
            ['innova_crysta', 'local', 4500, 20, 0, 0],
            ['innova_crysta', 'airport', 1800, 18, 0, 0],
            ['luxury', 'outstation-one-way', 7000, 22, 300, 1200],
            ['luxury', 'outstation-round-trip', 7000, 22, 300, 1200],
            ['luxury', 'local', 5500, 22, 0, 0],
            ['luxury', 'airport', 2200, 20, 0, 0]
        ];
        
        $insertPricingStmt = $conn->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_type, trip_type, base_price, price_per_km, driver_allowance, night_halt_charge)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            driver_allowance = VALUES(driver_allowance),
            night_halt_charge = VALUES(night_halt_charge)
        ");
        
        foreach ($pricing as $price) {
            $insertPricingStmt->bind_param("ssdddd", $price[0], $price[1], $price[2], $price[3], $price[4], $price[5]);
            $insertPricingStmt->execute();
        }
        
        // Add outstation fares
        $outstationFares = [
            ['sedan', 4200, 14, 4200, 14, 250, 700],
            ['ertiga', 5400, 18, 5400, 18, 250, 1000],
            ['innova_crysta', 6000, 20, 6000, 20, 250, 1000],
            ['luxury', 7000, 22, 7000, 22, 300, 1200]
        ];
        
        $insertOutstationStmt = $conn->prepare("
            INSERT INTO outstation_fares 
            (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            roundtrip_base_price = VALUES(roundtrip_base_price),
            roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
            driver_allowance = VALUES(driver_allowance),
            night_halt_charge = VALUES(night_halt_charge)
        ");
        
        foreach ($outstationFares as $fare) {
            $insertOutstationStmt->bind_param("sdddddd", $fare[0], $fare[1], $fare[2], $fare[3], $fare[4], $fare[5], $fare[6]);
            $insertOutstationStmt->execute();
        }
    } else {
        // Update luxury vehicle if it doesn't exist
        $checkLuxuryStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = 'luxury'");
        $checkLuxuryStmt->execute();
        $luxuryResult = $checkLuxuryStmt->get_result();
        $luxuryRow = $luxuryResult->fetch_assoc();
        
        if ($luxuryRow['count'] == 0) {
            // Insert luxury vehicle
            $insertLuxuryStmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active)
                VALUES ('luxury', 'Luxury Sedan', 4, 2, 1, '/cars/luxury.png', 'Premium luxury sedan for executive travel', '[\"AC\",\"Bottle Water\",\"Music System\",\"Premium Leather Seats\",\"Charging Point\"]', 1)
            ");
            $insertLuxuryStmt->execute();
            
            // Insert pricing for luxury
            $luxuryPricing = [
                ['luxury', 'outstation-one-way', 7000, 22, 300, 1200],
                ['luxury', 'outstation-round-trip', 7000, 22, 300, 1200],
                ['luxury', 'local', 5500, 22, 0, 0],
                ['luxury', 'airport', 2200, 20, 0, 0]
            ];
            
            $insertLuxuryPricingStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_type, trip_type, base_price, price_per_km, driver_allowance, night_halt_charge)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge)
            ");
            
            foreach ($luxuryPricing as $price) {
                $insertLuxuryPricingStmt->bind_param("ssdddd", $price[0], $price[1], $price[2], $price[3], $price[4], $price[5]);
                $insertLuxuryPricingStmt->execute();
            }
            
            // Add outstation fare for luxury
            $insertLuxuryOutstationStmt = $conn->prepare("
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, driver_allowance, night_halt_charge)
                VALUES ('luxury', 7000, 22, 7000, 22, 300, 1200)
                ON DUPLICATE KEY UPDATE
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                roundtrip_base_price = VALUES(roundtrip_base_price),
                roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                driver_allowance = VALUES(driver_allowance),
                night_halt_charge = VALUES(night_halt_charge)
            ");
            $insertLuxuryOutstationStmt->execute();
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database initialized successfully',
        'data' => [
            'createdTables' => $createdTables,
            'existingTables' => $existingTables,
            'errors' => $errorMessages
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Database initialization error: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database initialization failed: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
