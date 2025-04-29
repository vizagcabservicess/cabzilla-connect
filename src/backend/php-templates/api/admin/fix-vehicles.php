<?php
require_once __DIR__ . '/../../config.php';

header('Content-Type: application/json');

try {
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Create vehicles table if it doesn't exist
    $createVehiclesTable = "CREATE TABLE IF NOT EXISTS vehicles (
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
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if (!$conn->query($createVehiclesTable)) {
        throw new Exception("Failed to create vehicles table: " . $conn->error);
    }
    
    // Create vehicle_types table if it doesn't exist
    $createVehicleTypesTable = "CREATE TABLE IF NOT EXISTS vehicle_types (
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
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if (!$conn->query($createVehicleTypesTable)) {
        throw new Exception("Failed to create vehicle_types table: " . $conn->error);
    }
    
    // Insert default vehicles if they don't exist
    $defaultVehicles = [
        [
            'vehicle_id' => 'sedan',
            'name' => 'Sedan',
            'capacity' => 4,
            'luggage_capacity' => 2,
            'price' => 2500,
            'base_price' => 2500,
            'price_per_km' => 14,
            'image' => '/cars/sedan.png',
            'amenities' => json_encode(['AC', 'Bottle Water', 'Music System']),
            'description' => 'Comfortable sedan suitable for 4 passengers.',
            'ac' => 1,
            'night_halt_charge' => 700,
            'driver_allowance' => 250,
            'is_active' => 1
        ],
        [
            'vehicle_id' => 'ertiga',
            'name' => 'Ertiga',
            'capacity' => 6,
            'luggage_capacity' => 3,
            'price' => 3200,
            'base_price' => 3200,
            'price_per_km' => 18,
            'image' => '/cars/ertiga.png',
            'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom']),
            'description' => 'Spacious SUV suitable for 6 passengers.',
            'ac' => 1,
            'night_halt_charge' => 1000,
            'driver_allowance' => 250,
            'is_active' => 1
        ],
        [
            'vehicle_id' => 'innova_crysta',
            'name' => 'Innova Crysta',
            'capacity' => 7,
            'luggage_capacity' => 4,
            'price' => 3800,
            'base_price' => 3800,
            'price_per_km' => 20,
            'image' => '/cars/innova.png',
            'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point']),
            'description' => 'Premium SUV with ample space for 7 passengers.',
            'ac' => 1,
            'night_halt_charge' => 1000,
            'driver_allowance' => 250,
            'is_active' => 1
        ]
    ];
    
    foreach ($defaultVehicles as $vehicle) {
        // Check if vehicle exists in vehicles table
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicle['vehicle_id']);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            // Insert into vehicles table
            $insertStmt = $conn->prepare("INSERT INTO vehicles (
                vehicle_id, name, capacity, luggage_capacity, ac, image, 
                amenities, description, is_active, base_price, price_per_km,
                night_halt_charge, driver_allowance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $insertStmt->bind_param(
                "ssiiisssiiddd",
                $vehicle['vehicle_id'], $vehicle['name'], $vehicle['capacity'],
                $vehicle['luggage_capacity'], $vehicle['ac'], $vehicle['image'],
                $vehicle['amenities'], $vehicle['description'], $vehicle['is_active'],
                $vehicle['base_price'], $vehicle['price_per_km'],
                $vehicle['night_halt_charge'], $vehicle['driver_allowance']
            );
            
            $insertStmt->execute();
        }
        
        // Check if vehicle exists in vehicle_types table
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicle['vehicle_id']);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            // Insert into vehicle_types table
            $insertStmt = $conn->prepare("INSERT INTO vehicle_types (
                vehicle_id, name, capacity, luggage_capacity, ac, image, 
                amenities, description, is_active, base_price, price_per_km,
                night_halt_charge, driver_allowance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $insertStmt->bind_param(
                "ssiiisssiiddd",
                $vehicle['vehicle_id'], $vehicle['name'], $vehicle['capacity'],
                $vehicle['luggage_capacity'], $vehicle['ac'], $vehicle['image'],
                $vehicle['amenities'], $vehicle['description'], $vehicle['is_active'],
                $vehicle['base_price'], $vehicle['price_per_km'],
                $vehicle['night_halt_charge'], $vehicle['driver_allowance']
            );
            
            $insertStmt->execute();
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle tables checked and fixed successfully',
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
} 