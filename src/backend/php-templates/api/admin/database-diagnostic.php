
<?php
// database-diagnostic.php - Endpoint for diagnosing database issues

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include necessary files
$utilPaths = [
    __DIR__ . '/../utils/database.php',
    __DIR__ . '/../../api/utils/database.php',
    __DIR__ . '/../../utils/database.php'
];

$databaseUtilsLoaded = false;
foreach ($utilPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $databaseUtilsLoaded = true;
        break;
    }
}

if (!$databaseUtilsLoaded) {
    // Try to load config directly
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Database utilities not found',
            'searched_paths' => $utilPaths
        ]);
        exit;
    }
}

try {
    // Connect to database
    if (!function_exists('getDbConnection')) {
        echo json_encode([
            'status' => 'error',
            'message' => 'getDbConnection function not found',
            'included_files' => get_included_files()
        ]);
        exit;
    }
    
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get list of tables in database
    $tables = [];
    $result = $conn->query("SHOW TABLES");
    
    if (!$result) {
        throw new Exception("Failed to get table list: " . $conn->error);
    }
    
    while ($row = $result->fetch_array(MYSQLI_NUM)) {
        $tableName = $row[0];
        $count = 0;
        
        // Get count of rows in table
        $countResult = $conn->query("SELECT COUNT(*) as count FROM `$tableName`");
        if ($countResult && $countRow = $countResult->fetch_assoc()) {
            $count = $countRow['count'];
        }
        
        // Get table columns
        $columns = [];
        if (function_exists('getTableColumns')) {
            $columns = getTableColumns($conn, $tableName);
        } else {
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$tableName`");
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
        }
        
        $tables[$tableName] = [
            'row_count' => $count,
            'columns' => $columns
        ];
        
        // If this is the vehicle_types table, get all records
        if ($tableName === 'vehicle_types') {
            $vehicleResult = $conn->query("SELECT * FROM `$tableName`");
            $vehicles = [];
            
            if ($vehicleResult) {
                while ($vehicle = $vehicleResult->fetch_assoc()) {
                    // Check if vehicle has fare entries
                    $fareTables = ['outstation_fares', 'local_package_fares', 'airport_transfer_fares'];
                    $fareInfo = [];
                    
                    foreach ($fareTables as $fareTable) {
                        if (isset($tables[$fareTable])) {
                            $fareCheckResult = $conn->query("SELECT COUNT(*) as count FROM `$fareTable` WHERE vehicle_id = '{$vehicle['vehicle_id']}'");
                            if ($fareCheckResult && $fareCheckRow = $fareCheckResult->fetch_assoc()) {
                                $fareInfo[$fareTable] = $fareCheckRow['count'] > 0;
                            }
                        }
                    }
                    
                    $vehicle['fares'] = $fareInfo;
                    $vehicles[] = $vehicle;
                }
            }
            
            $tables[$tableName]['records'] = $vehicles;
        }
    }
    
    // Check for specific issues
    $issues = [];
    
    // Check for missing tables
    $requiredTables = ['vehicle_types', 'outstation_fares', 'local_package_fares', 'airport_transfer_fares'];
    $missingTables = array_diff($requiredTables, array_keys($tables));
    
    if (!empty($missingTables)) {
        $issues[] = "Missing required tables: " . implode(", ", $missingTables);
    }
    
    // Check for empty vehicle_types table
    if (isset($tables['vehicle_types']) && $tables['vehicle_types']['row_count'] === 0) {
        $issues[] = "The vehicle_types table is empty";
    }
    
    // Check for vehicle_types without fares
    if (isset($tables['vehicle_types']) && isset($tables['vehicle_types']['records'])) {
        foreach ($tables['vehicle_types']['records'] as $vehicle) {
            $missingFares = [];
            
            foreach (['outstation_fares', 'local_package_fares', 'airport_transfer_fares'] as $fareTable) {
                if (isset($vehicle['fares'][$fareTable]) && !$vehicle['fares'][$fareTable]) {
                    $missingFares[] = $fareTable;
                }
            }
            
            if (!empty($missingFares)) {
                $issues[] = "Vehicle '{$vehicle['name']}' (ID: {$vehicle['vehicle_id']}) is missing entries in: " . implode(", ", $missingFares);
            }
        }
    }
    
    // Get PHP version and extensions
    $phpInfo = [
        'version' => PHP_VERSION,
        'extensions' => get_loaded_extensions(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'post_max_size' => ini_get('post_max_size'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'display_errors' => ini_get('display_errors')
    ];
    
    // Get server information
    $serverInfo = [
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'Unknown',
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'http_host' => $_SERVER['HTTP_HOST'] ?? 'Unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown'
    ];
    
    // Check for initialization action
    if (isset($_GET['initialize']) && $_GET['initialize'] === 'true') {
        // Create missing tables if needed
        if (function_exists('ensureDatabaseTables')) {
            ensureDatabaseTables($conn);
            $response['action'] = 'Database tables initialized';
        } else {
            // Manual initialization (basic tables)
            foreach ($missingTables as $tableName) {
                switch ($tableName) {
                    case 'vehicle_types':
                        $conn->query("
                            CREATE TABLE IF NOT EXISTS vehicle_types (
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
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        ");
                        break;
                    
                    case 'outstation_fares':
                        $conn->query("
                            CREATE TABLE IF NOT EXISTS outstation_fares (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                vehicle_id VARCHAR(50) NOT NULL,
                                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                                roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                UNIQUE KEY vehicle_id (vehicle_id)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        ");
                        break;
                    
                    case 'local_package_fares':
                        $conn->query("
                            CREATE TABLE IF NOT EXISTS local_package_fares (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                vehicle_id VARCHAR(50) NOT NULL,
                                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                UNIQUE KEY vehicle_id (vehicle_id)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        ");
                        break;
                    
                    case 'airport_transfer_fares':
                        $conn->query("
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
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                UNIQUE KEY vehicle_id (vehicle_id)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        ");
                        break;
                }
            }
            
            $response['action'] = 'Database tables manually initialized';
        }
        
        // Add default vehicles if vehicle_types is empty
        if (isset($tables['vehicle_types']) && $tables['vehicle_types']['row_count'] === 0) {
            $defaultVehicles = [
                [
                    'id' => 'sedan',
                    'name' => 'Sedan',
                    'capacity' => 4,
                    'luggage_capacity' => 2,
                    'ac' => 1,
                    'amenities' => json_encode(['AC', 'Bottle Water', 'Music System']),
                    'image' => '/cars/sedan.png',
                    'description' => 'Comfortable sedan suitable for 4 passengers.',
                    'is_active' => 1
                ],
                [
                    'id' => 'ertiga',
                    'name' => 'Ertiga',
                    'capacity' => 6,
                    'luggage_capacity' => 3,
                    'ac' => 1,
                    'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom']),
                    'image' => '/cars/ertiga.png',
                    'description' => 'Spacious SUV suitable for 6 passengers.',
                    'is_active' => 1
                ],
                [
                    'id' => 'innova_crysta',
                    'name' => 'Innova Crysta',
                    'capacity' => 7,
                    'luggage_capacity' => 4,
                    'ac' => 1,
                    'amenities' => json_encode(['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point']),
                    'image' => '/cars/innova.png',
                    'description' => 'Premium SUV with ample space for 7 passengers.',
                    'is_active' => 1
                ]
            ];
            
            foreach ($defaultVehicles as $vehicle) {
                $stmt = $conn->prepare("
                    INSERT INTO vehicle_types 
                    (vehicle_id, name, capacity, luggage_capacity, ac, amenities, image, description, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->bind_param("ssiissssi", 
                    $vehicle['id'],
                    $vehicle['name'],
                    $vehicle['capacity'],
                    $vehicle['luggage_capacity'],
                    $vehicle['ac'],
                    $vehicle['amenities'],
                    $vehicle['image'],
                    $vehicle['description'],
                    $vehicle['is_active']
                );
                
                $stmt->execute();
                
                // Also create fare entries for each default vehicle
                $vehicleId = $vehicle['id'];
                
                // Outstation fares
                if (tableExists($conn, 'outstation_fares')) {
                    $basePrice = 2500;
                    $pricePerKm = 14;
                    $nightHaltCharge = 700;
                    $driverAllowance = 250;
                    $roundTripBasePrice = 2000;
                    $roundTripPricePerKm = 12;
                    
                    if ($vehicleId === 'ertiga') {
                        $basePrice = 3200;
                        $pricePerKm = 18;
                        $nightHaltCharge = 1000;
                        $roundTripBasePrice = 2800;
                        $roundTripPricePerKm = 16;
                    } else if ($vehicleId === 'innova_crysta') {
                        $basePrice = 3800;
                        $pricePerKm = 20;
                        $nightHaltCharge = 1000;
                        $roundTripBasePrice = 3400;
                        $roundTripPricePerKm = 18;
                    }
                    
                    $conn->query("
                        INSERT INTO outstation_fares 
                        (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km) 
                        VALUES ('$vehicleId', $basePrice, $pricePerKm, $nightHaltCharge, 
                        $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm)
                    ");
                }
                
                // Local package fares
                if (tableExists($conn, 'local_package_fares')) {
                    $price4hrs40km = 1600;
                    $price8hrs80km = 2800;
                    $price10hrs100km = 3400;
                    $priceExtraKm = 14;
                    $priceExtraHour = 150;
                    
                    if ($vehicleId === 'ertiga') {
                        $price4hrs40km = 2200;
                        $price8hrs80km = 3800;
                        $price10hrs100km = 4400;
                        $priceExtraKm = 18;
                        $priceExtraHour = 200;
                    } else if ($vehicleId === 'innova_crysta') {
                        $price4hrs40km = 2600;
                        $price8hrs80km = 4400;
                        $price10hrs100km = 5000;
                        $priceExtraKm = 20;
                        $priceExtraHour = 250;
                    }
                    
                    $conn->query("
                        INSERT INTO local_package_fares 
                        (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                        price_extra_km, price_extra_hour) 
                        VALUES ('$vehicleId', $price4hrs40km, $price8hrs80km, $price10hrs100km, 
                        $priceExtraKm, $priceExtraHour)
                    ");
                }
                
                // Airport transfer fares
                if (tableExists($conn, 'airport_transfer_fares')) {
                    $basePrice = 1500;
                    $pricePerKm = 14;
                    $pickupPrice = 1600;
                    $dropPrice = 1500;
                    $tier1Price = 1600;
                    $tier2Price = 1800;
                    $tier3Price = 2200;
                    $tier4Price = 2600;
                    $extraKmCharge = 14;
                    
                    if ($vehicleId === 'ertiga') {
                        $basePrice = 2000;
                        $pricePerKm = 18;
                        $pickupPrice = 2000;
                        $dropPrice = 1900;
                        $tier1Price = 2000;
                        $tier2Price = 2200;
                        $tier3Price = 2600;
                        $tier4Price = 3000;
                        $extraKmCharge = 18;
                    } else if ($vehicleId === 'innova_crysta') {
                        $basePrice = 2500;
                        $pricePerKm = 20;
                        $pickupPrice = 2400;
                        $dropPrice = 2300;
                        $tier1Price = 2400;
                        $tier2Price = 2600;
                        $tier3Price = 3000;
                        $tier4Price = 3400;
                        $extraKmCharge = 20;
                    }
                    
                    $conn->query("
                        INSERT INTO airport_transfer_fares 
                        (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                        VALUES ('$vehicleId', $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                        $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge)
                    ");
                }
            }
            
            $response['action'] .= ' and default vehicles added';
        }
    }
    
    // Add diagnostics to response
    $response['status'] = empty($issues) ? 'healthy' : 'issues_found';
    $response['message'] = empty($issues) ? 'Database is healthy' : 'Database issues found';
    $response['issues'] = $issues;
    $response['tables'] = $tables;
    $response['php_info'] = $phpInfo;
    $response['server_info'] = $serverInfo;
    $response['timestamp'] = date('Y-m-d H:i:s');
    
    // Return the response
    echo json_encode($response);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Diagnostic error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
