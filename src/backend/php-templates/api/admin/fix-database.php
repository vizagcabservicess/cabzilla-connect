
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Array to track fixed items
    $fixed = [];
    
    // Check and create vehicles table
    $vehiclesQuery = "CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        capacity INT DEFAULT 4,
        luggage_capacity INT DEFAULT 2,
        ac TINYINT(1) DEFAULT 1,
        image VARCHAR(255),
        amenities TEXT,
        description TEXT,
        is_active TINYINT(1) DEFAULT 1,
        base_price DECIMAL(10, 2) DEFAULT 0.00,
        price_per_km DECIMAL(10, 2) DEFAULT 0.00,
        night_halt_charge DECIMAL(10, 2) DEFAULT 0.00,
        driver_allowance DECIMAL(10, 2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    
    if ($conn->query($vehiclesQuery)) {
        $fixed[] = 'vehicles table';
    }
    
    // Check and create local_package_fares table
    $localFaresQuery = "CREATE TABLE IF NOT EXISTS local_package_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_4hrs_40km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_8hrs_80km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_10hrs_100km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_extra_km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_extra_hour DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (vehicle_id)
    )";
    
    if ($conn->query($localFaresQuery)) {
        $fixed[] = 'local_package_fares table';
    }
    
    // Check and create airport_transfer_fares table
    $airportFaresQuery = "CREATE TABLE IF NOT EXISTS airport_transfer_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_one_way DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_round_trip DECIMAL(10, 2) NOT NULL DEFAULT 0,
        night_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
        extra_waiting_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (vehicle_id)
    )";
    
    if ($conn->query($airportFaresQuery)) {
        $fixed[] = 'airport_transfer_fares table';
    }
    
    // Check and create outstation_fares table
    $outstationFaresQuery = "CREATE TABLE IF NOT EXISTS outstation_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
        driver_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        roundtrip_base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        roundtrip_price_per_km DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (vehicle_id)
    )";
    
    if ($conn->query($outstationFaresQuery)) {
        $fixed[] = 'outstation_fares table';
    }
    
    // Success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables fixed successfully',
        'fixed' => $fixed
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
