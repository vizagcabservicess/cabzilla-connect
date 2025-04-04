
<?php
/**
 * This is a utility script for setting up the driver management tables.
 * It should be executed once to create the necessary tables if they don't exist.
 */

// Set correct headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Error reporting
ini_set('display_errors', 0);
error_reporting(0);

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'tables_created' => [],
    'tables_failed' => [],
    'messages' => [],
    'timestamp' => time()
];

try {
    // Define database connection with updated credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $response['messages'][] = "Connected to database successfully";

    // Create drivers table if it doesn't exist
    $query = "
    CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(20),
        status ENUM('Available', 'Busy', 'Offline') DEFAULT 'Available',
        location VARCHAR(100),
        rating DECIMAL(3,1) DEFAULT 0,
        rides INT DEFAULT 0,
        earnings DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    ";
    
    if ($conn->query($query)) {
        $response['tables_created'][] = 'drivers';
    } else {
        $response['tables_failed'][] = 'drivers';
        $response['messages'][] = "Error creating drivers table: " . $conn->error;
    }
    
    // CREATE LOCAL PACKAGE FARES TABLE WITH CORRECTED COLUMN NAMES AND NOT NULL VALUES
    $local_fares_query = "
    CREATE TABLE IF NOT EXISTS local_package_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    if ($conn->query($local_fares_query)) {
        $response['tables_created'][] = 'local_package_fares';
    } else {
        $response['tables_failed'][] = 'local_package_fares';
        $response['messages'][] = "Error creating local_package_fares table: " . $conn->error;
    }
    
    // CREATE AIRPORT TRANSFER FARES TABLE WITH NOT NULL VALUES
    $airport_fares_query = "
    CREATE TABLE IF NOT EXISTS airport_transfer_fares (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    if ($conn->query($airport_fares_query)) {
        $response['tables_created'][] = 'airport_transfer_fares';
    } else {
        $response['tables_failed'][] = 'airport_transfer_fares';
        $response['messages'][] = "Error creating airport_transfer_fares table: " . $conn->error;
    }
    
    // CREATE OUTSTATION FARES TABLE WITH NON NULL VALUES FOR CRITICAL FIELDS
    $outstation_fares_query = "
    CREATE TABLE IF NOT EXISTS outstation_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
        roundtrip_base_price DECIMAL(10,2) DEFAULT NULL,
        roundtrip_price_per_km DECIMAL(5,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    if ($conn->query($outstation_fares_query)) {
        $response['tables_created'][] = 'outstation_fares';
    } else {
        $response['tables_failed'][] = 'outstation_fares';
        $response['messages'][] = "Error creating outstation_fares table: " . $conn->error;
    }
    
    // CREATE VEHICLES TABLE IF NOT EXISTS
    $vehicles_query = "
    CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        capacity INT NOT NULL DEFAULT 4,
        luggage_capacity INT NOT NULL DEFAULT 2,
        ac TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        image VARCHAR(255) NOT NULL DEFAULT '/cars/sedan.png',
        amenities TEXT,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    ";
    
    if ($conn->query($vehicles_query)) {
        $response['tables_created'][] = 'vehicles';
    } else {
        $response['tables_failed'][] = 'vehicles';
        $response['messages'][] = "Error creating vehicles table: " . $conn->error;
    }
    
    // Create cache directories for data storage
    $cacheDir = __DIR__ . '/../../cache';
    if (!file_exists($cacheDir)) {
        if (mkdir($cacheDir, 0755, true)) {
            $response['messages'][] = "Created cache directory";
        } else {
            $response['messages'][] = "Failed to create cache directory";
        }
    }
    
    // Prepare persistent vehicle data if it doesn't exist
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    if (!file_exists($persistentCacheFile)) {
        $defaultVehicles = [
            [
                'id' => 'sedan',
                'vehicleId' => 'sedan',
                'vehicle_id' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggageCapacity' => 2,
                'ac' => true,
                'isActive' => true,
                'basePrice' => 4200,
                'pricePerKm' => 14,
                'nightHaltCharge' => 700,
                'driverAllowance' => 250,
                'airportFares' => [
                    'vehicleId' => 'sedan',
                    'vehicle_id' => 'sedan',
                    'basePrice' => 3000,
                    'pricePerKm' => 12,
                    'pickupPrice' => 800,
                    'dropPrice' => 800, 
                    'tier1Price' => 600,
                    'tier2Price' => 800,
                    'tier3Price' => 1000,
                    'tier4Price' => 1200,
                    'extraKmCharge' => 12
                ]
            ],
            [
                'id' => 'ertiga',
                'vehicleId' => 'ertiga',
                'vehicle_id' => 'ertiga',
                'name' => 'Ertiga',
                'capacity' => 6,
                'luggageCapacity' => 3,
                'ac' => true,
                'isActive' => true,
                'basePrice' => 5400,
                'pricePerKm' => 18,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 250,
                'airportFares' => [
                    'vehicleId' => 'ertiga',
                    'vehicle_id' => 'ertiga',
                    'basePrice' => 3500,
                    'pricePerKm' => 15,
                    'pickupPrice' => 1000,
                    'dropPrice' => 1000,
                    'tier1Price' => 800,
                    'tier2Price' => 1000,
                    'tier3Price' => 1200,
                    'tier4Price' => 1400,
                    'extraKmCharge' => 15
                ]
            ],
            [
                'id' => 'innova_crysta',
                'vehicleId' => 'innova_crysta',
                'vehicle_id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'capacity' => 7,
                'luggageCapacity' => 4,
                'ac' => true,
                'isActive' => true,
                'basePrice' => 6000,
                'pricePerKm' => 20,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 250,
                'airportFares' => [
                    'vehicleId' => 'innova_crysta',
                    'vehicle_id' => 'innova_crysta',
                    'basePrice' => 4000,
                    'pricePerKm' => 17,
                    'pickupPrice' => 1200,
                    'dropPrice' => 1200,
                    'tier1Price' => 1000,
                    'tier2Price' => 1200,
                    'tier3Price' => 1400,
                    'tier4Price' => 1600,
                    'extraKmCharge' => 17
                ]
            ]
        ];
        
        if (file_put_contents($persistentCacheFile, json_encode($defaultVehicles, JSON_PRETTY_PRINT))) {
            $response['messages'][] = "Created default persistent vehicles data";
        } else {
            $response['messages'][] = "Failed to create persistent vehicles data";
        }
    } else {
        $response['messages'][] = "Persistent vehicles data already exists";
    }
    
    // Add sample data to airport_transfer_fares if it's empty
    $airport_result = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares");
    if ($airport_result) {
        $airport_row = $airport_result->fetch_assoc();
        
        if ($airport_row['count'] == 0) {
            // Insert default airport transfer fares
            $conn->query("
                INSERT INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                                                  tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) VALUES
                ('sedan', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
                ('ertiga', 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
                ('innova_crysta', 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
                ('tempo', 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
                ('luxury', 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22)
            ");
            
            $response['messages'][] = "Sample airport transfer fares added";
        }
    }
    
    // Success response
    $response['status'] = 'success';
    $response['message'] = "Database setup complete";
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = "Error: " . $e->getMessage();
}

// Send JSON response
echo json_encode($response);
