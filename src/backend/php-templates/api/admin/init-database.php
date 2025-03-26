
<?php
// init-database.php - Initializes all necessary database tables

// Set headers for CORS and content type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Include database configuration
require_once '../../config.php';

// For OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to connect to the database with error handling
function connectToDatabase() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            return $conn;
        }
        
        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            return $conn;
        }
        
        // Fallback to hardcoded credentials (for development only)
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e;
    }
}

// Function to create all required tables
function createAllTables($conn) {
    $tablesCreated = [];
    $errors = [];
    
    // Create vehicles table if not exists
    $vehiclesTable = "
    CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        vehicle_id VARCHAR(50),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(255),
        capacity INT DEFAULT 4,
        is_active TINYINT(1) DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($vehiclesTable)) {
        $tablesCreated[] = 'vehicles';
    } else {
        $errors[] = "Error creating vehicles table: " . $conn->error;
    }
    
    // Create local_package_pricing table if not exists
    $localPricingTable = "
    CREATE TABLE IF NOT EXISTS local_package_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($localPricingTable)) {
        $tablesCreated[] = 'local_package_pricing';
    } else {
        $errors[] = "Error creating local_package_pricing table: " . $conn->error;
    }
    
    // Create airport_pricing table if not exists
    $airportPricingTable = "
    CREATE TABLE IF NOT EXISTS airport_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        pickup_charge DECIMAL(10,2) DEFAULT 0,
        drop_charge DECIMAL(10,2) DEFAULT 0,
        tier1_price DECIMAL(10,2) DEFAULT 0,
        tier2_price DECIMAL(10,2) DEFAULT 0,
        tier3_price DECIMAL(10,2) DEFAULT 0,
        tier4_price DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($airportPricingTable)) {
        $tablesCreated[] = 'airport_pricing';
    } else {
        $errors[] = "Error creating airport_pricing table: " . $conn->error;
    }
    
    // Create outstation_fares table if not exists
    $outstationFaresTable = "
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
    
    if ($conn->query($outstationFaresTable)) {
        $tablesCreated[] = 'outstation_fares';
    } else {
        $errors[] = "Error creating outstation_fares table: " . $conn->error;
    }
    
    // Create vehicle_pricing table for general pricing (alternative table)
    $vehiclePricingTable = "
    CREATE TABLE IF NOT EXISTS vehicle_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        trip_type VARCHAR(50) NOT NULL, 
        base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($vehiclePricingTable)) {
        $tablesCreated[] = 'vehicle_pricing';
    } else {
        $errors[] = "Error creating vehicle_pricing table: " . $conn->error;
    }
    
    // Create fare_prices table (another alternative)
    $farePricesTable = "
    CREATE TABLE IF NOT EXISTS fare_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        trip_type VARCHAR(50) NOT NULL,
        package_type VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY trip_vehicle_package (vehicle_id, trip_type, package_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($farePricesTable)) {
        $tablesCreated[] = 'fare_prices';
    } else {
        $errors[] = "Error creating fare_prices table: " . $conn->error;
    }
    
    // Insert default vehicles if table is empty
    $checkVehicles = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $vehicleCount = $checkVehicles->fetch_assoc()['count'];
    
    if ($vehicleCount == 0) {
        $defaultVehicles = [
            ["sedan", "Sedan", "Comfortable sedan for up to 4 passengers", 4, 1],
            ["ertiga", "Ertiga", "Spacious SUV for up to 6 passengers", 6, 1],
            ["innova_crysta", "Innova Crysta", "Premium SUV for up to 6 passengers", 6, 1],
            ["tempo_traveller", "Tempo Traveller", "Minibus for up to 12 passengers", 12, 1]
        ];
        
        $insertVehicle = $conn->prepare("INSERT INTO vehicles (id, name, description, capacity, is_active) VALUES (?, ?, ?, ?, ?)");
        
        foreach ($defaultVehicles as $vehicle) {
            $insertVehicle->bind_param("ssiii", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4]);
            $insertVehicle->execute();
        }
        
        $tablesCreated[] = 'default_vehicles_added';
    }
    
    return [
        'tablesCreated' => $tablesCreated,
        'errors' => $errors
    ];
}

try {
    // Connect to the database
    $conn = connectToDatabase();
    
    // Create all required tables
    $result = createAllTables($conn);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables initialized successfully',
        'data' => [
            'tablesCreated' => $result['tablesCreated'],
            'tablesWithErrors' => $result['errors'],
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database initialization failed: ' . $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ]);
}
?>
