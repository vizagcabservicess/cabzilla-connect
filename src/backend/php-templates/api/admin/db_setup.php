
<?php
// Database setup script - creates all necessary tables if they don't exist
// Include configuration in a separate file

try {
    require_once __DIR__ . '/../../config.php';
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Failed to connect to database");
    }
    
    // Create vehicle types table if it doesn't exist
    $vehicleTypesSql = "CREATE TABLE IF NOT EXISTS `vehicle_types` (
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
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($vehicleTypesSql);
    
    // Create vehicle pricing table if it doesn't exist
    $vehiclePricingSql = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) DEFAULT NULL,
        `vehicle_type` varchar(50) DEFAULT NULL,
        `base_price` decimal(10,2) DEFAULT 0.00,
        `price_per_km` decimal(10,2) DEFAULT 0.00,
        `night_halt_charge` decimal(10,2) DEFAULT 0.00,
        `driver_allowance` decimal(10,2) DEFAULT 0.00,
        `airport_base_price` decimal(10,2) DEFAULT 0.00,
        `airport_price_per_km` decimal(10,2) DEFAULT 0.00,
        `airport_drop_price` decimal(10,2) DEFAULT 0.00,
        `airport_pickup_price` decimal(10,2) DEFAULT 0.00,
        `airport_tier1_price` decimal(10,2) DEFAULT 0.00,
        `airport_tier2_price` decimal(10,2) DEFAULT 0.00,
        `airport_tier3_price` decimal(10,2) DEFAULT 0.00,
        `airport_tier4_price` decimal(10,2) DEFAULT 0.00,
        `airport_extra_km_charge` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_type` (`vehicle_type`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($vehiclePricingSql);
    
    // Create airport transfer fares table
    $airportTransferFaresSql = "CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `base_price` decimal(10,2) DEFAULT 0.00,
        `price_per_km` decimal(10,2) DEFAULT 0.00,
        `pickup_price` decimal(10,2) DEFAULT 0.00,
        `drop_price` decimal(10,2) DEFAULT 0.00,
        `tier1_price` decimal(10,2) DEFAULT 0.00,
        `tier2_price` decimal(10,2) DEFAULT 0.00,
        `tier3_price` decimal(10,2) DEFAULT 0.00,
        `tier4_price` decimal(10,2) DEFAULT 0.00,
        `extra_km_charge` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($airportTransferFaresSql);
    
    // Create outstation fares table
    $outstationFaresSql = "CREATE TABLE IF NOT EXISTS `outstation_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `base_price` decimal(10,2) DEFAULT 0.00,
        `price_per_km` decimal(10,2) DEFAULT 0.00,
        `driver_allowance` decimal(10,2) DEFAULT 0.00,
        `night_halt` decimal(10,2) DEFAULT 0.00,
        `round_trip_base_price` decimal(10,2) DEFAULT 0.00,
        `round_trip_price_per_km` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($outstationFaresSql);
    
    // Create local package fares table
    $localPackageFaresSql = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` varchar(50) NOT NULL,
        `price_4hrs_40km` decimal(10,2) DEFAULT 0.00,
        `price_8hrs_80km` decimal(10,2) DEFAULT 0.00,
        `price_10hrs_100km` decimal(10,2) DEFAULT 0.00,
        `price_extra_km` decimal(10,2) DEFAULT 0.00,
        `price_extra_hour` decimal(10,2) DEFAULT 0.00,
        `created_at` timestamp NULL DEFAULT current_timestamp(),
        `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `vehicle_id` (`vehicle_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($localPackageFaresSql);
    
    // Insert default vehicles if vehicle_types table is empty
    $checkVehicles = $conn->query("SELECT COUNT(*) as count FROM vehicle_types");
    $vehicleCount = $checkVehicles->fetch_assoc()['count'];
    
    if ($vehicleCount == 0) {
        // Insert default vehicles
        $defaultVehicles = [
            [
                'vehicle_id' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggage_capacity' => 2,
                'ac' => 1,
                'image' => '/cars/sedan.png',
                'description' => 'Comfortable sedan with ample space for 4 passengers'
            ],
            [
                'vehicle_id' => 'ertiga',
                'name' => 'Ertiga',
                'capacity' => 6,
                'luggage_capacity' => 3,
                'ac' => 1,
                'image' => '/cars/ertiga.png',
                'description' => 'Spacious SUV ideal for families and small groups'
            ],
            [
                'vehicle_id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'capacity' => 7,
                'luggage_capacity' => 4,
                'ac' => 1,
                'image' => '/cars/innova.png',
                'description' => 'Premium SUV with excellent comfort for long journeys'
            ],
            [
                'vehicle_id' => 'tempo',
                'name' => 'Tempo Traveller',
                'capacity' => 12,
                'luggage_capacity' => 8,
                'ac' => 1,
                'image' => '/cars/tempo.png',
                'description' => 'Spacious minibus suitable for larger groups'
            ],
            [
                'vehicle_id' => 'luxury',
                'name' => 'Luxury Sedan',
                'capacity' => 4,
                'luggage_capacity' => 3,
                'ac' => 1,
                'image' => '/cars/luxury-sedan.png',
                'description' => 'Premium luxury sedan with top-notch comfort and amenities'
            ]
        ];
        
        $vehicleStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($defaultVehicles as $vehicle) {
            $vehicleStmt->bind_param(
                "siiisss", 
                $vehicle['vehicle_id'], 
                $vehicle['name'], 
                $vehicle['capacity'], 
                $vehicle['luggage_capacity'], 
                $vehicle['ac'], 
                $vehicle['image'], 
                $vehicle['description']
            );
            $vehicleStmt->execute();
        }
    }
    
    // Check if airport_transfer_fares table is empty
    $checkAirportFares = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares");
    $airportFaresCount = $checkAirportFares->fetch_assoc()['count'];
    
    if ($airportFaresCount == 0) {
        // Insert default airport fares
        $defaultAirportFares = [
            [
                'vehicle_id' => 'sedan',
                'base_price' => 3000.00,
                'price_per_km' => 12.00,
                'pickup_price' => 800.00,
                'drop_price' => 800.00,
                'tier1_price' => 600.00,
                'tier2_price' => 800.00,
                'tier3_price' => 1000.00,
                'tier4_price' => 1200.00,
                'extra_km_charge' => 12.00
            ],
            [
                'vehicle_id' => 'ertiga',
                'base_price' => 3500.00,
                'price_per_km' => 15.00,
                'pickup_price' => 1000.00,
                'drop_price' => 1000.00,
                'tier1_price' => 800.00,
                'tier2_price' => 1000.00,
                'tier3_price' => 1200.00,
                'tier4_price' => 1400.00,
                'extra_km_charge' => 15.00
            ],
            [
                'vehicle_id' => 'innova_crysta',
                'base_price' => 4000.00,
                'price_per_km' => 17.00,
                'pickup_price' => 1200.00,
                'drop_price' => 1200.00,
                'tier1_price' => 1000.00,
                'tier2_price' => 1200.00,
                'tier3_price' => 1400.00,
                'tier4_price' => 1600.00,
                'extra_km_charge' => 17.00
            ],
            [
                'vehicle_id' => 'tempo',
                'base_price' => 6000.00,
                'price_per_km' => 19.00,
                'pickup_price' => 2000.00,
                'drop_price' => 2000.00,
                'tier1_price' => 1600.00,
                'tier2_price' => 1800.00,
                'tier3_price' => 2000.00,
                'tier4_price' => 2500.00,
                'extra_km_charge' => 19.00
            ],
            [
                'vehicle_id' => 'luxury',
                'base_price' => 7000.00,
                'price_per_km' => 22.00,
                'pickup_price' => 2500.00,
                'drop_price' => 2500.00,
                'tier1_price' => 2000.00,
                'tier2_price' => 2200.00,
                'tier3_price' => 2500.00,
                'tier4_price' => 3000.00,
                'extra_km_charge' => 22.00
            ]
        ];
        
        $airportFaresStmt = $conn->prepare("
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
             tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($defaultAirportFares as $fare) {
            $airportFaresStmt->bind_param(
                "sdddddddddd", 
                $fare['vehicle_id'], 
                $fare['base_price'], 
                $fare['price_per_km'], 
                $fare['pickup_price'], 
                $fare['drop_price'], 
                $fare['tier1_price'], 
                $fare['tier2_price'], 
                $fare['tier3_price'], 
                $fare['tier4_price'], 
                $fare['extra_km_charge']
            );
            $airportFaresStmt->execute();
        }
        
        // Also update vehicle_pricing table with the same airport fare data
        foreach ($defaultAirportFares as $fare) {
            // Check if vehicle exists in vehicle_pricing
            $checkVehiclePricing = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
            $checkVehiclePricing->bind_param("s", $fare['vehicle_id']);
            $checkVehiclePricing->execute();
            $result = $checkVehiclePricing->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateStmt = $conn->prepare("
                    UPDATE vehicle_pricing SET 
                    airport_base_price = ?, 
                    airport_price_per_km = ?,
                    airport_pickup_price = ?,
                    airport_drop_price = ?,
                    airport_tier1_price = ?,
                    airport_tier2_price = ?,
                    airport_tier3_price = ?,
                    airport_tier4_price = ?,
                    airport_extra_km_charge = ?
                    WHERE vehicle_type = ?
                ");
                $updateStmt->bind_param(
                    "ddddddddds", 
                    $fare['base_price'], 
                    $fare['price_per_km'], 
                    $fare['pickup_price'], 
                    $fare['drop_price'], 
                    $fare['tier1_price'], 
                    $fare['tier2_price'], 
                    $fare['tier3_price'], 
                    $fare['tier4_price'], 
                    $fare['extra_km_charge'],
                    $fare['vehicle_id']
                );
                $updateStmt->execute();
            } else {
                // Insert new record
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, vehicle_id, airport_base_price, airport_price_per_km, 
                     airport_pickup_price, airport_drop_price, airport_tier1_price, 
                     airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                     airport_extra_km_charge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $insertStmt->bind_param(
                    "ssddddddddd", 
                    $fare['vehicle_id'],
                    $fare['vehicle_id'], 
                    $fare['base_price'], 
                    $fare['price_per_km'], 
                    $fare['pickup_price'], 
                    $fare['drop_price'], 
                    $fare['tier1_price'], 
                    $fare['tier2_price'], 
                    $fare['tier3_price'], 
                    $fare['tier4_price'], 
                    $fare['extra_km_charge']
                );
                $insertStmt->execute();
            }
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables created successfully'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error creating database tables: ' . $e->getMessage()
    ]);
}
