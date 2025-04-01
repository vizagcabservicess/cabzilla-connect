
<?php
/**
 * fix-vehicle-tables.php - Fix vehicle tables structure and data synchronization
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/fix-vehicle-tables.log');
}

// Log request info
logMessage("Fix vehicle tables request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error occurred',
    'debug' => [],
    'table_fixes' => [],
    'timestamp' => time()
];

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
        $response['debug'][] = "Connected via config.php";
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
        $response['debug'][] = "Connected via hardcoded credentials";
    }
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    $response['debug'][] = $e->getMessage();
    logMessage("Database connection error: " . $e->getMessage());
    
    echo json_encode($response);
    exit;
}

// Function to check if table exists
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return ($result && $result->num_rows > 0);
}

// Function to check if column exists in table
function columnExists($conn, $tableName, $columnName) {
    $result = $conn->query("SHOW COLUMNS FROM `$tableName` LIKE '$columnName'");
    return ($result && $result->num_rows > 0);
}

try {
    // Fix 1: Ensure vehicles table exists with correct columns
    if (!tableExists($conn, "vehicles")) {
        $createVehiclesTableSql = "
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
                `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0,
                `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createVehiclesTableSql)) {
            throw new Exception("Error creating vehicles table: " . $conn->error);
        }
        
        $response['table_fixes'][] = "Created vehicles table";
        logMessage("Created vehicles table");
    }

    // Fix 2: Ensure vehicle_types table exists with correct columns
    if (!tableExists($conn, "vehicle_types")) {
        $createVehicleTypesTableSql = "
            CREATE TABLE IF NOT EXISTS `vehicle_types` (
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
                `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0,
                `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createVehicleTypesTableSql)) {
            throw new Exception("Error creating vehicle_types table: " . $conn->error);
        }
        
        $response['table_fixes'][] = "Created vehicle_types table";
        logMessage("Created vehicle_types table");
    }

    // Fix 3: Ensure vehicle_pricing table exists with correct columns
    if (!tableExists($conn, "vehicle_pricing")) {
        $createVehiclePricingTableSql = "
            CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `trip_type` varchar(50) NOT NULL DEFAULT 'outstation',
                `base_fare` decimal(10,2) NOT NULL DEFAULT 0,
                `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
                `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0,
                `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0,
                `local_package_4hr` decimal(10,2) DEFAULT NULL,
                `local_package_8hr` decimal(10,2) DEFAULT NULL,
                `local_package_10hr` decimal(10,2) DEFAULT NULL,
                `extra_km_charge` decimal(5,2) DEFAULT NULL,
                `extra_hour_charge` decimal(5,2) DEFAULT NULL,
                `airport_base_price` decimal(10,2) DEFAULT NULL,
                `airport_price_per_km` decimal(5,2) DEFAULT NULL,
                `airport_drop_price` decimal(10,2) DEFAULT NULL,
                `airport_pickup_price` decimal(10,2) DEFAULT NULL,
                `airport_tier1_price` decimal(10,2) DEFAULT NULL,
                `airport_tier2_price` decimal(10,2) DEFAULT NULL,
                `airport_tier3_price` decimal(10,2) DEFAULT NULL,
                `airport_tier4_price` decimal(10,2) DEFAULT NULL,
                `airport_extra_km_charge` decimal(5,2) DEFAULT NULL,
                `base_price` decimal(10,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_trip_type` (`vehicle_id`, `trip_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createVehiclePricingTableSql)) {
            throw new Exception("Error creating vehicle_pricing table: " . $conn->error);
        }
        
        $response['table_fixes'][] = "Created vehicle_pricing table";
        logMessage("Created vehicle_pricing table");
    }

    // Fix 4: Fix `vehicle_type` to `vehicle_id` column issue
    if (tableExists($conn, "vehicle_pricing") && !columnExists($conn, "vehicle_pricing", "vehicle_id") && columnExists($conn, "vehicle_pricing", "vehicle_type")) {
        // Rename column from vehicle_type to vehicle_id
        $alterColumnSql = "ALTER TABLE `vehicle_pricing` CHANGE `vehicle_type` `vehicle_id` varchar(50) NOT NULL";
        
        if (!$conn->query($alterColumnSql)) {
            throw new Exception("Error renaming column vehicle_type to vehicle_id: " . $conn->error);
        }
        
        $response['table_fixes'][] = "Renamed column vehicle_type to vehicle_id in vehicle_pricing table";
        logMessage("Renamed column vehicle_type to vehicle_id in vehicle_pricing table");
    }

    // Fix 5: Ensure local_package_fares table exists
    if (!tableExists($conn, "local_package_fares")) {
        $createLocalPackageFaresTableSql = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
                `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createLocalPackageFaresTableSql)) {
            throw new Exception("Error creating local_package_fares table: " . $conn->error);
        }
        
        $response['table_fixes'][] = "Created local_package_fares table";
        logMessage("Created local_package_fares table");
    }

    // Fix 6: Sync data between vehicle tables
    // First, get all vehicle IDs from vehicle_types
    $vehicleIdsQuery = $conn->query("SELECT vehicle_id FROM vehicle_types");
    $vehicleIds = [];
    
    if ($vehicleIdsQuery) {
        while ($row = $vehicleIdsQuery->fetch_assoc()) {
            $vehicleIds[] = $row['vehicle_id'];
        }
    }
    
    // If we don't have any vehicles in vehicle_types, check vehicles table
    if (empty($vehicleIds)) {
        $vehicleIdsQuery = $conn->query("SELECT vehicle_id FROM vehicles");
        
        if ($vehicleIdsQuery) {
            while ($row = $vehicleIdsQuery->fetch_assoc()) {
                $vehicleIds[] = $row['vehicle_id'];
            }
        }
    }
    
    // If we still don't have vehicles, add default ones
    if (empty($vehicleIds)) {
        $defaultVehicles = [
            ['sedan', 'Sedan', 4, 2, 1, '/cars/sedan.png', 'AC, Bottle Water, Music System', 'Comfortable sedan suitable for 4 passengers.', 1, 4200, 14, 700, 250],
            ['ertiga', 'Ertiga', 6, 3, 1, '/cars/ertiga.png', 'AC, Bottle Water, Music System, Extra Legroom', 'Spacious SUV suitable for 6 passengers.', 1, 5400, 18, 1000, 250],
            ['innova_crysta', 'Innova Crysta', 7, 4, 1, '/cars/innova.png', 'AC, Bottle Water, Music System, Extra Legroom, Charging Point', 'Premium SUV with ample space for 7 passengers.', 1, 6000, 20, 1000, 250]
        ];
        
        foreach ($defaultVehicles as $vehicle) {
            $vehicleId = $vehicle[0];
            $name = $vehicle[1];
            $capacity = $vehicle[2];
            $luggageCapacity = $vehicle[3];
            $ac = $vehicle[4];
            $image = $vehicle[5];
            $amenities = $vehicle[6];
            $description = $vehicle[7];
            $isActive = $vehicle[8];
            $basePrice = $vehicle[9];
            $pricePerKm = $vehicle[10];
            $nightHaltCharge = $vehicle[11];
            $driverAllowance = $vehicle[12];
            
            // Insert into vehicle_types
            $stmt = $conn->prepare("INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity), luggage_capacity = VALUES(luggage_capacity),
                ac = VALUES(ac), image = VALUES(image), amenities = VALUES(amenities), description = VALUES(description),
                is_active = VALUES(is_active), base_price = VALUES(base_price), price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge), driver_allowance = VALUES(driver_allowance)");
                
            $stmt->bind_param("ssiiisssidddd", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenities, 
                $description, $isActive, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                
            if (!$stmt->execute()) {
                throw new Exception("Error adding default vehicle to vehicle_types: " . $stmt->error);
            }
            
            $vehicleIds[] = $vehicleId;
        }
        
        $response['table_fixes'][] = "Added default vehicles";
        logMessage("Added default vehicles");
    }
    
    // Now sync data across all vehicle tables
    foreach ($vehicleIds as $vehicleId) {
        // Get vehicle data from vehicle_types
        $vehicleQuery = $conn->prepare("SELECT * FROM vehicle_types WHERE vehicle_id = ?");
        $vehicleQuery->bind_param("s", $vehicleId);
        $vehicleQuery->execute();
        $vehicleResult = $vehicleQuery->get_result();
        $vehicleData = $vehicleResult->fetch_assoc();
        
        if (!$vehicleData) {
            continue; // Skip if no data found
        }
        
        // Sync to vehicles table
        $syncToVehiclesSql = "INSERT INTO vehicles 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity), luggage_capacity = VALUES(luggage_capacity),
            ac = VALUES(ac), image = VALUES(image), amenities = VALUES(amenities), description = VALUES(description),
            is_active = VALUES(is_active), base_price = VALUES(base_price), price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge), driver_allowance = VALUES(driver_allowance)";
            
        $stmt = $conn->prepare($syncToVehiclesSql);
        $stmt->bind_param("ssiiisssidddd", 
            $vehicleData['vehicle_id'], 
            $vehicleData['name'], 
            $vehicleData['capacity'], 
            $vehicleData['luggage_capacity'], 
            $vehicleData['ac'], 
            $vehicleData['image'], 
            $vehicleData['amenities'], 
            $vehicleData['description'], 
            $vehicleData['is_active'], 
            $vehicleData['base_price'], 
            $vehicleData['price_per_km'], 
            $vehicleData['night_halt_charge'], 
            $vehicleData['driver_allowance']
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Error syncing to vehicles table: " . $stmt->error);
        }
        
        // Sync to vehicle_pricing table for outstation
        $syncToVehiclePricingOutstationSql = "INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price) 
            VALUES (?, 'outstation', ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE base_fare = VALUES(base_fare), price_per_km = VALUES(price_per_km),
            night_halt_charge = VALUES(night_halt_charge), driver_allowance = VALUES(driver_allowance),
            base_price = VALUES(base_price)";
            
        $stmt = $conn->prepare($syncToVehiclePricingOutstationSql);
        $basePrice = $vehicleData['base_price'];
        $pricePerKm = $vehicleData['price_per_km'];
        $nightHaltCharge = $vehicleData['night_halt_charge'];
        $driverAllowance = $vehicleData['driver_allowance'];
        
        $stmt->bind_param("sddddd", 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $basePrice
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Error syncing to vehicle_pricing outstation: " . $stmt->error);
        }
        
        // Sync to local_package_fares with default values if not exists
        $syncToLocalPackageFaresSql = "INSERT IGNORE INTO local_package_fares 
            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
            VALUES (?, ?, ?, ?, ?, ?)";
            
        $price4hrs40km = $basePrice * 0.3; // 30% of base price
        $price8hrs80km = $basePrice * 0.6; // 60% of base price
        $price10hrs100km = $basePrice * 0.75; // 75% of base price
        $priceExtraKm = $pricePerKm;
        $priceExtraHour = 250;
        
        $stmt = $conn->prepare($syncToLocalPackageFaresSql);
        $stmt->bind_param("sddddd", 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm,
            $priceExtraHour
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Error syncing to local_package_fares: " . $stmt->error);
        }
        
        // Sync to vehicle_pricing table for local
        $syncToVehiclePricingLocalSql = "INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge, base_price) 
            VALUES (?, 'local', ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE local_package_4hr = VALUES(local_package_4hr), local_package_8hr = VALUES(local_package_8hr),
            local_package_10hr = VALUES(local_package_10hr), extra_km_charge = VALUES(extra_km_charge),
            extra_hour_charge = VALUES(extra_hour_charge), base_price = VALUES(base_price)";
            
        $stmt = $conn->prepare($syncToVehiclePricingLocalSql);
        $stmt->bind_param("sdddddd", 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm,
            $priceExtraHour,
            $price4hrs40km
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Error syncing to vehicle_pricing local: " . $stmt->error);
        }
    }
    
    $response['status'] = 'success';
    $response['message'] = 'Database tables fixed successfully';
    $response['vehicle_count'] = count($vehicleIds);
    $response['vehicles'] = $vehicleIds;
    
    logMessage("Database tables fixed successfully");
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Error fixing database tables: ' . $e->getMessage();
    $response['error_details'] = $e->getTraceAsString();
    logMessage("Error: " . $e->getMessage());
}

// Send response
echo json_encode($response);
