
<?php
/**
 * API endpoint for fixing database tables
 * Creates, checks and repairs database tables as needed
 */

// Set CORS headers for API access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log request
file_put_contents($logFile, "[$timestamp] Database fix request received\n", FILE_APPEND);

try {
    // Include database utilities
    require_once __DIR__ . '/../utils/database.php';
    require_once __DIR__ . '/../common/db_helper.php';
    
    // Connect to database
    $conn = getDbConnectionWithRetry(3);
    
    if (!$conn) {
        throw new Exception("Failed to connect to database");
    }
    
    file_put_contents($logFile, "[$timestamp] Connected to database successfully\n", FILE_APPEND);
    
    // Create vehicles table if it doesn't exist
    if (!tableExists($conn, 'vehicles')) {
        file_put_contents($logFile, "[$timestamp] Vehicles table doesn't exist, creating...\n", FILE_APPEND);
        
        $createVehiclesSql = "CREATE TABLE `vehicles` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL UNIQUE,
            `name` VARCHAR(100) NOT NULL,
            `capacity` INT NOT NULL DEFAULT 4,
            `luggage_capacity` INT NOT NULL DEFAULT 2,
            `ac` TINYINT(1) NOT NULL DEFAULT 1,
            `image` VARCHAR(255),
            `amenities` TEXT,
            `description` TEXT,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `base_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `night_halt_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `driver_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($createVehiclesSql)) {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created vehicles table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Vehicles table already exists\n", FILE_APPEND);
    }
    
    // Check if vehicle_types table exists as a fallback
    if (!tableExists($conn, 'vehicle_types')) {
        file_put_contents($logFile, "[$timestamp] Vehicle_types table doesn't exist, creating...\n", FILE_APPEND);
        
        $createVehicleTypesSql = "CREATE TABLE `vehicle_types` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL UNIQUE,
            `name` VARCHAR(100) NOT NULL,
            `capacity` INT NOT NULL DEFAULT 4,
            `luggage_capacity` INT NOT NULL DEFAULT 2,
            `ac` TINYINT(1) NOT NULL DEFAULT 1,
            `image` VARCHAR(255),
            `amenities` TEXT,
            `description` TEXT,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `base_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `night_halt_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `driver_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($createVehicleTypesSql)) {
            throw new Exception("Failed to create vehicle_types table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created vehicle_types table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Vehicle_types table already exists\n", FILE_APPEND);
    }
    
    // Create local_package_fares table if it doesn't exist
    if (!tableExists($conn, 'local_package_fares')) {
        file_put_contents($logFile, "[$timestamp] Local_package_fares table doesn't exist, creating...\n", FILE_APPEND);
        
        $createLocalFaresSql = "CREATE TABLE `local_package_fares` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `price_4hrs_40km` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_8hrs_80km` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_10hrs_100km` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_extra_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `price_extra_hour` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (`vehicle_id`)
        )";
        
        if (!$conn->query($createLocalFaresSql)) {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created local_package_fares table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Local_package_fares table already exists\n", FILE_APPEND);
    }
    
    // Create airport_transfer_fares table if it doesn't exist
    if (!tableExists($conn, 'airport_transfer_fares')) {
        file_put_contents($logFile, "[$timestamp] Airport_transfer_fares table doesn't exist, creating...\n", FILE_APPEND);
        
        $createAirportFaresSql = "CREATE TABLE `airport_transfer_fares` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `pickup_fare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `drop_fare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `roundtrip_fare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (`vehicle_id`)
        )";
        
        if (!$conn->query($createAirportFaresSql)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Airport_transfer_fares table already exists\n", FILE_APPEND);
    }
    
    // Create outstation_fares table if it doesn't exist
    if (!tableExists($conn, 'outstation_fares')) {
        file_put_contents($logFile, "[$timestamp] Outstation_fares table doesn't exist, creating...\n", FILE_APPEND);
        
        $createOutstationFaresSql = "CREATE TABLE `outstation_fares` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL,
            `oneway_price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `roundtrip_price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `driver_allowance_per_day` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `night_halt_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (`vehicle_id`)
        )";
        
        if (!$conn->query($createOutstationFaresSql)) {
            throw new Exception("Failed to create outstation_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created outstation_fares table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Outstation_fares table already exists\n", FILE_APPEND);
    }
    
    // Check if any vehicle data exists in the database
    $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
    $result = $conn->query("SELECT COUNT(*) as count FROM `$tableName`");
    $row = $result->fetch_assoc();
    $vehicleCount = $row['count'];
    
    // Import vehicle data from persistent JSON if database is empty
    if ($vehicleCount == 0) {
        file_put_contents($logFile, "[$timestamp] No vehicles in database, trying to import from persistent cache\n", FILE_APPEND);
        
        $cacheDir = __DIR__ . '/../../cache';
        $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
        
        if (file_exists($persistentCacheFile)) {
            $persistentJson = file_get_contents($persistentCacheFile);
            $persistentData = json_decode($persistentJson, true);
            
            if (is_array($persistentData) && !empty($persistentData)) {
                file_put_contents($logFile, "[$timestamp] Found " . count($persistentData) . " vehicles in persistent cache, importing to database\n", FILE_APPEND);
                
                $importCount = 0;
                
                foreach ($persistentData as $vehicle) {
                    $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'];
                    $name = $vehicle['name'] ?? 'Unknown Vehicle';
                    $capacity = isset($vehicle['capacity']) ? intval($vehicle['capacity']) : 4;
                    $luggageCapacity = isset($vehicle['luggageCapacity']) ? intval($vehicle['luggageCapacity']) : 2;
                    $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                    $image = isset($vehicle['image']) ? $vehicle['image'] : "/cars/{$vehicleId}.png";
                    $basePrice = isset($vehicle['basePrice']) ? floatval($vehicle['basePrice']) : 
                                (isset($vehicle['price']) ? floatval($vehicle['price']) : 1500);
                    $pricePerKm = isset($vehicle['pricePerKm']) ? floatval($vehicle['pricePerKm']) : 14;
                    $nightHaltCharge = isset($vehicle['nightHaltCharge']) ? floatval($vehicle['nightHaltCharge']) : 700;
                    $driverAllowance = isset($vehicle['driverAllowance']) ? floatval($vehicle['driverAllowance']) : 250;
                    $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                    $description = isset($vehicle['description']) ? $vehicle['description'] : '';
                    
                    // Process amenities
                    $amenities = isset($vehicle['amenities']) ? $vehicle['amenities'] : ['AC', 'Bottle Water', 'Music System'];
                    $amenitiesJson = json_encode($amenities);
                    
                    $insertSql = "INSERT INTO `$tableName` (
                        vehicle_id, 
                        name, 
                        capacity, 
                        luggage_capacity, 
                        ac, 
                        image, 
                        amenities, 
                        description, 
                        is_active, 
                        base_price, 
                        price_per_km,
                        night_halt_charge,
                        driver_allowance
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    
                    $insertStmt = $conn->prepare($insertSql);
                    
                    if ($insertStmt) {
                        $insertStmt->bind_param('ssiissssiiddd', 
                            $vehicleId, 
                            $name, 
                            $capacity, 
                            $luggageCapacity, 
                            $ac, 
                            $image, 
                            $amenitiesJson, 
                            $description, 
                            $isActive, 
                            $basePrice, 
                            $pricePerKm,
                            $nightHaltCharge,
                            $driverAllowance
                        );
                        
                        if ($insertStmt->execute()) {
                            $importCount++;
                        }
                        
                        $insertStmt->close();
                    }
                }
                
                file_put_contents($logFile, "[$timestamp] Imported $importCount vehicles to database\n", FILE_APPEND);
            }
        }
    }
    
    // Close database connection
    $conn->close();
    
    file_put_contents($logFile, "[$timestamp] Database fix completed successfully\n", FILE_APPEND);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables fixed successfully',
        'tables' => [
            'vehicles' => tableExists($conn, 'vehicles'),
            'vehicle_types' => tableExists($conn, 'vehicle_types'),
            'local_package_fares' => tableExists($conn, 'local_package_fares'),
            'airport_transfer_fares' => tableExists($conn, 'airport_transfer_fares'),
            'outstation_fares' => tableExists($conn, 'outstation_fares')
        ],
        'vehicle_count' => $vehicleCount
    ]);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fix database: ' . $e->getMessage()
    ]);
}
