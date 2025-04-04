
<?php
/**
 * Database setup script for the cab booking system.
 * This script creates all necessary tables if they don't exist.
 */

// Set headers for API response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/db_setup_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Initialize response array
$response = [
    'status' => 'error', 
    'message' => '',
    'tables' => [],
    'errors' => [],
    'debug' => []
];

// Get database connection details from config file if it exists
$dbConfig = [
    'host' => 'localhost',
    'dbname' => 'u644605165_db_be',
    'username' => 'u644605165_usr_be',
    'password' => 'Vizag@1213'
];

if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
    // The config file should define getDbConnection() or DB_* constants
}

try {
    // Try to connect to database
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
        file_put_contents($logFile, "[$timestamp] Using getDbConnection function\n", FILE_APPEND);
    } else {
        // Connect using PDO
        $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        
        $conn = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
        file_put_contents($logFile, "[$timestamp] Connected using PDO\n", FILE_APPEND);
    }
    
    // Helper function to create tables
    function createTable($conn, $tableName, $query, $logFile, $timestamp) {
        global $response;
        
        try {
            $conn->exec($query);
            file_put_contents($logFile, "[$timestamp] Created table: $tableName\n", FILE_APPEND);
            $response['tables'][] = $tableName;
            return true;
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Error creating table $tableName: " . $e->getMessage() . "\n", FILE_APPEND);
            $response['errors'][] = "Error creating table $tableName: " . $e->getMessage();
            return false;
        }
    }
    
    // Create airport_transfer_fares table
    $airport_fares_query = "
    CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `base_price` decimal(10,2) NOT NULL DEFAULT 0,
        `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
        `pickup_price` decimal(10,2) NOT NULL DEFAULT 0,
        `drop_price` decimal(10,2) NOT NULL DEFAULT 0,
        `tier1_price` decimal(10,2) NOT NULL DEFAULT 0,
        `tier2_price` decimal(10,2) NOT NULL DEFAULT 0,
        `tier3_price` decimal(10,2) NOT NULL DEFAULT 0,
        `tier4_price` decimal(10,2) NOT NULL DEFAULT 0,
        `extra_km_charge` decimal(5,2) NOT NULL DEFAULT 0,
        `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    createTable($conn, 'airport_transfer_fares', $airport_fares_query, $logFile, $timestamp);
    
    // Create local_package_fares table
    $local_fares_query = "
    CREATE TABLE IF NOT EXISTS `local_package_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
        `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
        `price_12hrs_120km` decimal(10,2) NOT NULL DEFAULT 0,
        `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
        `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
        `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    createTable($conn, 'local_package_fares', $local_fares_query, $logFile, $timestamp);
    
    // Create outstation_fares table
    $outstation_fares_query = "
    CREATE TABLE IF NOT EXISTS `outstation_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `base_price` decimal(10,2) NOT NULL DEFAULT 0,
        `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
        `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 700,
        `driver_allowance` decimal(10,2) NOT NULL DEFAULT 250,
        `roundtrip_base_price` decimal(10,2) DEFAULT NULL,
        `roundtrip_price_per_km` decimal(5,2) DEFAULT NULL,
        `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    createTable($conn, 'outstation_fares', $outstation_fares_query, $logFile, $timestamp);
    
    // Create vehicles table
    $vehicles_query = "
    CREATE TABLE IF NOT EXISTS `vehicles` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `name` varchar(100) NOT NULL,
        `capacity` int(11) NOT NULL DEFAULT 4,
        `luggage_capacity` int(11) NOT NULL DEFAULT 2,
        `ac` tinyint(1) NOT NULL DEFAULT 1,
        `image` varchar(255) DEFAULT '/cars/sedan.png',
        `amenities` text DEFAULT NULL,
        `description` text DEFAULT NULL,
        `is_active` tinyint(1) NOT NULL DEFAULT 1,
        `base_price` decimal(10,2) NOT NULL DEFAULT 0,
        `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
        `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 700,
        `driver_allowance` decimal(10,2) NOT NULL DEFAULT 250,
        `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    createTable($conn, 'vehicles', $vehicles_query, $logFile, $timestamp);
    
    // Insert default airport fares if table is empty
    $countQuery = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares");
    $count = $countQuery->fetchColumn();
    
    if ($count == 0) {
        file_put_contents($logFile, "[$timestamp] Inserting default airport fares\n", FILE_APPEND);
        
        $insertQuery = "
        INSERT INTO `airport_transfer_fares` (`vehicle_id`, `base_price`, `price_per_km`, `pickup_price`, `drop_price`, 
                                           `tier1_price`, `tier2_price`, `tier3_price`, `tier4_price`, `extra_km_charge`) VALUES
        ('sedan', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
        ('ertiga', 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
        ('innova_crysta', 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
        ('tempo', 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
        ('luxury', 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22)
        ";
        
        try {
            $conn->exec($insertQuery);
            $response['debug'][] = "Inserted default airport fares";
            file_put_contents($logFile, "[$timestamp] Successfully inserted default airport fares\n", FILE_APPEND);
        } catch (Exception $e) {
            $response['errors'][] = "Error inserting default airport fares: " . $e->getMessage();
            file_put_contents($logFile, "[$timestamp] Error inserting default airport fares: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Insert default local package fares if table is empty
    $countQuery = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
    $count = $countQuery->fetchColumn();
    
    if ($count == 0) {
        file_put_contents($logFile, "[$timestamp] Inserting default local package fares\n", FILE_APPEND);
        
        $insertQuery = "
        INSERT INTO `local_package_fares` (`vehicle_id`, `price_4hrs_40km`, `price_8hrs_80km`, `price_12hrs_120km`, 
                                        `price_extra_km`, `price_extra_hour`) VALUES
        ('sedan', 1200, 2200, 2500, 14, 250),
        ('ertiga', 1500, 2700, 3000, 18, 250),
        ('innova_crysta', 1800, 3000, 3500, 20, 250),
        ('tempo', 3000, 4500, 5500, 22, 300),
        ('luxury', 3500, 5500, 6500, 25, 300)
        ";
        
        try {
            $conn->exec($insertQuery);
            $response['debug'][] = "Inserted default local package fares";
            file_put_contents($logFile, "[$timestamp] Successfully inserted default local package fares\n", FILE_APPEND);
        } catch (Exception $e) {
            $response['errors'][] = "Error inserting default local package fares: " . $e->getMessage();
            file_put_contents($logFile, "[$timestamp] Error inserting default local package fares: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Insert default outstation fares if table is empty
    $countQuery = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
    $count = $countQuery->fetchColumn();
    
    if ($count == 0) {
        file_put_contents($logFile, "[$timestamp] Inserting default outstation fares\n", FILE_APPEND);
        
        $insertQuery = "
        INSERT INTO `outstation_fares` (`vehicle_id`, `base_price`, `price_per_km`, `night_halt_charge`, `driver_allowance`, 
                                     `roundtrip_base_price`, `roundtrip_price_per_km`) VALUES
        ('sedan', 4200, 14, 700, 250, 4000, 12),
        ('ertiga', 5400, 18, 1000, 250, 5000, 15),
        ('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
        ('tempo', 9000, 22, 1500, 300, 8500, 19),
        ('luxury', 10500, 25, 1500, 300, 10000, 22)
        ";
        
        try {
            $conn->exec($insertQuery);
            $response['debug'][] = "Inserted default outstation fares";
            file_put_contents($logFile, "[$timestamp] Successfully inserted default outstation fares\n", FILE_APPEND);
        } catch (Exception $e) {
            $response['errors'][] = "Error inserting default outstation fares: " . $e->getMessage();
            file_put_contents($logFile, "[$timestamp] Error inserting default outstation fares: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Insert default vehicles if table is empty
    $countQuery = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $count = $countQuery->fetchColumn();
    
    if ($count == 0) {
        file_put_contents($logFile, "[$timestamp] Inserting default vehicles\n", FILE_APPEND);
        
        $insertQuery = "
        INSERT INTO `vehicles` (
          `vehicle_id`, `name`, `capacity`, `luggage_capacity`, `ac`, `image`, 
          `amenities`, `description`, `is_active`, `base_price`, `price_per_km`, 
          `night_halt_charge`, `driver_allowance`
        ) VALUES
        ('sedan', 'Sedan', 4, 2, 1, '/cars/sedan.png', 'AC, Bottle Water, Music System', 'Comfortable sedan suitable for 4 passengers.', 1, 4200, 14, 700, 250),
        ('ertiga', 'Ertiga', 6, 3, 1, '/cars/ertiga.png', 'AC, Bottle Water, Music System, Extra Legroom', 'Spacious SUV suitable for 6 passengers.', 1, 5400, 18, 1000, 250),
        ('innova_crysta', 'Innova Crysta', 7, 4, 1, '/cars/innova.png', 'AC, Bottle Water, Music System, Extra Legroom, Charging Point', 'Premium SUV with ample space for 7 passengers.', 1, 6000, 20, 1000, 250),
        ('tempo', 'Tempo Traveller', 12, 8, 1, '/cars/tempo.png', 'AC, Bottle Water, Music System, Extra Legroom, Charging Point', 'Spacious van suitable for group travel of up to 12 passengers.', 1, 9000, 22, 1500, 300),
        ('luxury', 'Luxury Sedan', 4, 3, 1, '/cars/luxury.png', 'AC, Bottle Water, Music System, Premium Leather Seats, WiFi, Charging Points', 'Premium luxury sedan with high-end amenities for a comfortable journey.', 1, 10500, 25, 1500, 300)
        ";
        
        try {
            $conn->exec($insertQuery);
            $response['debug'][] = "Inserted default vehicles";
            file_put_contents($logFile, "[$timestamp] Successfully inserted default vehicles\n", FILE_APPEND);
        } catch (Exception $e) {
            $response['errors'][] = "Error inserting default vehicles: " . $e->getMessage();
            file_put_contents($logFile, "[$timestamp] Error inserting default vehicles: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Success response
    $response['status'] = 'success';
    $response['message'] = 'Database setup completed successfully';
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    $response['status'] = 'error';
    $response['message'] = 'Database setup failed: ' . $e->getMessage();
    $response['errors'][] = $e->getMessage();
}

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT);
