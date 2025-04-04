
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if ($conn->query($outstationFaresQuery)) {
        $fixed[] = 'outstation_fares table';
    }
    
    // Create persistent cache directory if it doesn't exist
    $cacheDir = __DIR__ . '/../../cache';
    if (!file_exists($cacheDir)) {
        if (mkdir($cacheDir, 0755, true)) {
            $fixed[] = 'cache directory';
        }
    }
    
    // Create persistent cache from default vehicles if it doesn't exist
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    if (!file_exists($persistentCacheFile)) {
        $defaultVehicles = [
            [
                "id" => "sedan",
                "vehicleId" => "sedan",
                "name" => "Sedan",
                "capacity" => 4,
                "luggageCapacity" => 2,
                "price" => 2500,
                "basePrice" => 2500,
                "pricePerKm" => 14,
                "image" => "/cars/sedan.png",
                "amenities" => ["AC", "Bottle Water", "Music System"],
                "description" => "Comfortable sedan suitable for 4 passengers.",
                "ac" => true,
                "nightHaltCharge" => 700,
                "driverAllowance" => 250,
                "isActive" => true
            ],
            [
                "id" => "ertiga",
                "vehicleId" => "ertiga",
                "name" => "Ertiga",
                "capacity" => 6,
                "luggageCapacity" => 3,
                "price" => 3200,
                "basePrice" => 3200,
                "pricePerKm" => 18,
                "image" => "/cars/ertiga.png",
                "amenities" => ["AC", "Bottle Water", "Music System", "Extra Legroom"],
                "description" => "Spacious SUV suitable for 6 passengers.",
                "ac" => true,
                "nightHaltCharge" => 1000,
                "driverAllowance" => 250,
                "isActive" => true
            ],
            [
                "id" => "innova_crysta",
                "vehicleId" => "innova_crysta",
                "name" => "Innova Crysta",
                "capacity" => 7,
                "luggageCapacity" => 4,
                "price" => 3800,
                "basePrice" => 3800,
                "pricePerKm" => 20,
                "image" => "/cars/innova.png",
                "amenities" => ["AC", "Bottle Water", "Music System", "Extra Legroom", "Charging Point"],
                "description" => "Premium SUV with ample space for 7 passengers.",
                "ac" => true,
                "nightHaltCharge" => 1000,
                "driverAllowance" => 250,
                "isActive" => true
            ]
        ];
        
        if (file_put_contents($persistentCacheFile, json_encode($defaultVehicles, JSON_PRETTY_PRINT))) {
            $fixed[] = 'persistent cache file';
        }
    }
    
    // Check for existing vehicles in the database and sync with persistent cache
    $persistentData = [];
    if (file_exists($persistentCacheFile)) {
        $persistentData = json_decode(file_get_contents($persistentCacheFile), true) ?: [];
    }
    
    // Check if we can query the vehicles table
    $checkVehiclesQuery = "SELECT COUNT(*) as count FROM vehicles";
    $checkStmt = $conn->prepare($checkVehiclesQuery);
    
    if ($checkStmt && $checkStmt->execute()) {
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        $vehicleCount = $row['count'];
        
        if ($vehicleCount === 0 && !empty($persistentData)) {
            // Database is empty but we have persistent data - insert it
            foreach ($persistentData as $vehicle) {
                $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'] ?? '';
                $name = $vehicle['name'] ?? '';
                $capacity = $vehicle['capacity'] ?? 4;
                $luggageCapacity = $vehicle['luggageCapacity'] ?? 2;
                $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                $image = $vehicle['image'] ?? '';
                $amenities = isset($vehicle['amenities']) ? json_encode($vehicle['amenities']) : null;
                $description = $vehicle['description'] ?? '';
                $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                $basePrice = $vehicle['basePrice'] ?? $vehicle['price'] ?? 0;
                $pricePerKm = $vehicle['pricePerKm'] ?? 0;
                $nightHaltCharge = $vehicle['nightHaltCharge'] ?? 700;
                $driverAllowance = $vehicle['driverAllowance'] ?? 250;
                
                $insertStmt = $conn->prepare("INSERT INTO vehicles 
                    (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, 
                    base_price, price_per_km, night_halt_charge, driver_allowance) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                if ($insertStmt) {
                    $insertStmt->bind_param("ssiissssidddd", 
                        $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenities, 
                        $description, $isActive, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    
                    if ($insertStmt->execute()) {
                        $fixed[] = "vehicle: $vehicleId inserted from persistent cache";
                    }
                }
            }
        }
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
