
<?php
// Enhanced direct local fares API with improved error handling
// Version 2.0.1 - 2023-03-27

// Include necessary headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh, X-Custom-Timestamp, X-API-Version, X-Client-Version, X-Authorization-Override, X-Debug-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Debug-File: direct-local-fares.php');
header('X-Debug-Mode: true');
header('X-API-Version: 2.0.1');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
$logMessage = "[$timestamp] Direct local fare update request received: Method=" . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "[$timestamp] URI: " . $_SERVER['REQUEST_URI'] . "\n";
$logMessage .= "[$timestamp] POST data: " . print_r($_POST, true) . "\n";
$logMessage .= "[$timestamp] GET data: " . print_r($_GET, true) . "\n";
$logMessage .= "[$timestamp] Raw input: $requestData\n";
error_log($logMessage, 3, $logDir . '/direct-fares.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize database if requested
if (isset($_GET['initialize']) && $_GET['initialize'] === 'true') {
    // Log initialization request
    error_log("[$timestamp] Database initialization requested", 3, $logDir . '/direct-fares.log');
    
    // Database connection details
    $dbHost = 'localhost';
    $dbName = 'u644605165_new_bookingdb';
    $dbUser = 'u644605165_new_bookingusr';
    $dbPass = 'Vizag@1213';
    
    try {
        $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
        error_log("[$timestamp] Database connection successful for initialization", 3, $logDir . '/direct-fares.log');
        
        // Create local_package_fares table if it doesn't exist
        $createTableSql = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
                        `id` INT NOT NULL AUTO_INCREMENT,
                        `vehicle_id` VARCHAR(50) NOT NULL,
                        `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                        `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                        `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                        `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                        `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
                        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `vehicle_id` (`vehicle_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        $pdo->exec($createTableSql);
        error_log("[$timestamp] Created/verified local_package_fares table", 3, $logDir . '/direct-fares.log');
        
        // Add default entries for common vehicle types if they don't exist
        $defaultVehicles = ['sedan', 'ertiga', 'innova', 'innova_crysta', 'tempo', 'luxury'];
        foreach ($defaultVehicles as $vehicle) {
            try {
                $checkSql = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
                $checkStmt = $pdo->prepare($checkSql);
                $checkStmt->execute([$vehicle]);
                if ($checkStmt->rowCount() === 0) {
                    // Default values based on vehicle type
                    $price4hrs = ($vehicle === 'sedan' ? 1500 : 
                                 ($vehicle === 'ertiga' ? 2000 : 
                                 ($vehicle === 'innova' || $vehicle === 'innova_crysta' ? 2500 : 
                                 ($vehicle === 'tempo' ? 3500 : 3000))));
                    $price8hrs = $price4hrs * 1.8;
                    $price10hrs = $price4hrs * 2.2;
                    $extraKm = ($vehicle === 'sedan' ? 14 : ($vehicle === 'ertiga' ? 16 : 18));
                    $extraHour = ($vehicle === 'sedan' ? 250 : ($vehicle === 'ertiga' ? 300 : 350));
                    
                    $insertSql = "INSERT INTO local_package_fares 
                               (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                                price_extra_km, price_extra_hour)
                               VALUES (?, ?, ?, ?, ?, ?)";
                    $insertStmt = $pdo->prepare($insertSql);
                    $insertStmt->execute([
                        $vehicle,
                        $price4hrs,
                        $price8hrs,
                        $price10hrs,
                        $extraKm,
                        $extraHour
                    ]);
                    error_log("[$timestamp] Inserted default record for $vehicle", 3, $logDir . '/direct-fares.log');
                }
            } catch (PDOException $e) {
                error_log("[$timestamp] Error adding default vehicle $vehicle: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
            }
        }
        
        // Check if vehicle_pricing table exists, create if not
        try {
            $pdo->query("SELECT 1 FROM vehicle_pricing LIMIT 1");
        } catch (PDOException $e) {
            // Table doesn't exist, create it
            $createVehiclePricingSql = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                                     `id` INT NOT NULL AUTO_INCREMENT,
                                     `vehicle_type` VARCHAR(50) NOT NULL,
                                     `trip_type` VARCHAR(20) NOT NULL,
                                     `base_fare` DECIMAL(10,2) DEFAULT 0.00,
                                     `price_per_km` DECIMAL(10,2) DEFAULT 0.00,
                                     `night_halt_charge` DECIMAL(10,2) DEFAULT 0.00,
                                     `driver_allowance` DECIMAL(10,2) DEFAULT 0.00,
                                     `local_package_4hr` DECIMAL(10,2) DEFAULT 0.00,
                                     `local_package_8hr` DECIMAL(10,2) DEFAULT 0.00,
                                     `local_package_10hr` DECIMAL(10,2) DEFAULT 0.00,
                                     `extra_km_charge` DECIMAL(10,2) DEFAULT 0.00,
                                     `extra_hour_charge` DECIMAL(10,2) DEFAULT 0.00,
                                     `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                     PRIMARY KEY (`id`),
                                     UNIQUE KEY `vehicle_trip_type` (`vehicle_type`, `trip_type`)
                                  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            $pdo->exec($createVehiclePricingSql);
            error_log("[$timestamp] Created vehicle_pricing table", 3, $logDir . '/direct-fares.log');
            
            // Add default entries for common vehicle types if table was just created
            foreach ($defaultVehicles as $vehicle) {
                try {
                    // Default values for local trip type
                    $price4hrs = ($vehicle === 'sedan' ? 1500 : 
                                 ($vehicle === 'ertiga' ? 2000 : 
                                 ($vehicle === 'innova' || $vehicle === 'innova_crysta' ? 2500 : 
                                 ($vehicle === 'tempo' ? 3500 : 3000))));
                    $price8hrs = $price4hrs * 1.8;
                    $price10hrs = $price4hrs * 2.2;
                    $extraKm = ($vehicle === 'sedan' ? 14 : ($vehicle === 'ertiga' ? 16 : 18));
                    $extraHour = ($vehicle === 'sedan' ? 250 : ($vehicle === 'ertiga' ? 300 : 350));
                    
                    $insertVpSql = "INSERT INTO vehicle_pricing 
                                  (vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                                   extra_km_charge, extra_hour_charge)
                                  VALUES (?, 'local', ?, ?, ?, ?, ?)";
                    $insertVpStmt = $pdo->prepare($insertVpSql);
                    $insertVpStmt->execute([
                        $vehicle,
                        $price4hrs,
                        $price8hrs,
                        $price10hrs,
                        $extraKm,
                        $extraHour
                    ]);
                    error_log("[$timestamp] Inserted default record in vehicle_pricing for $vehicle", 3, $logDir . '/direct-fares.log');
                } catch (PDOException $e) {
                    error_log("[$timestamp] Error adding default vehicle to vehicle_pricing for $vehicle: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
                }
            }
        }
        
        // Send success response
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Database tables initialized successfully',
            'timestamp' => time()
        ]);
        exit;
    } catch (PDOException $e) {
        error_log("[$timestamp] Database initialization error: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to initialize database: ' . $e->getMessage(),
            'timestamp' => time()
        ]);
        exit;
    }
}

// Check if we're in test mode
if (isset($_GET['test']) && $_GET['test'] == '1') {
    error_log("[$timestamp] Test mode requested", 3, $logDir . '/direct-fares.log');
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'API connection test successful',
        'time' => date('Y-m-d H:i:s'),
        'version' => '2.0.1'
    ]);
    exit;
}

// For direct local fare updates, process the data
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Log that we're about to process the fare update
    error_log("[$timestamp] Processing local fare update request", 3, $logDir . '/direct-fares.log');

    // Get data from all possible sources - for maximum flexibility
    $data = [];
    
    // Try POST data
    if (!empty($_POST)) {
        $data = $_POST;
    }
    
    // If no POST data, try JSON input
    if (empty($data)) {
        if (!empty($requestData)) {
            $jsonData = json_decode($requestData, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                $data = $jsonData;
            } else {
                // Try parsing as form data
                parse_str($requestData, $formData);
                if (!empty($formData)) {
                    $data = $formData;
                }
            }
        }
    }
    
    // Finally try GET parameters
    if (empty($data) && !empty($_GET)) {
        $data = $_GET;
    }
    
    // Log received data
    error_log("[$timestamp] Extracted data: " . print_r($data, true), 3, $logDir . '/direct-fares.log');
    
    // Extract vehicle ID from any possible field name
    $vehicleId = '';
    foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id', 'cab_id', 'cab_type', 'cab'] as $field) {
        if (!empty($data[$field])) {
            $vehicleId = $data[$field];
            break;
        }
    }
    
    // Clean vehicleId - remove "item-" prefix if exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Log extracted vehicle ID
    error_log("[$timestamp] Extracted vehicle ID: $vehicleId", 3, $logDir . '/direct-fares.log');
    
    // Extract pricing data with multiple fallbacks
    $package4hr = 0;
    foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hrs_40km', '4hrs-40km', '04hrs-40km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package4hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages or fares objects
    if ($package4hr == 0 && isset($data['packages'])) {
        foreach (['4hrs-40km', '04hrs-40km', '4hr40km', '04hr40km'] as $packageKey) {
            if (isset($data['packages'][$packageKey]) && is_numeric($data['packages'][$packageKey])) {
                $package4hr = floatval($data['packages'][$packageKey]);
                break;
            }
        }
    }
    
    // If still no value, check in fares object
    if ($package4hr == 0 && isset($data['fares'])) {
        foreach (['4hrs-40km', '04hrs-40km', '4hr40km', '04hr40km'] as $packageKey) {
            if (isset($data['fares'][$packageKey]) && is_numeric($data['fares'][$packageKey])) {
                $package4hr = floatval($data['fares'][$packageKey]);
                break;
            }
        }
    }
    
    $package8hr = 0;
    foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hrs_80km', '8hrs-80km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package8hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages or fares objects for 8hrs package
    if ($package8hr == 0 && isset($data['packages'])) {
        foreach (['8hrs-80km', '8hr80km'] as $packageKey) {
            if (isset($data['packages'][$packageKey]) && is_numeric($data['packages'][$packageKey])) {
                $package8hr = floatval($data['packages'][$packageKey]);
                break;
            }
        }
    }
    
    // If still no value, check in fares object
    if ($package8hr == 0 && isset($data['fares'])) {
        foreach (['8hrs-80km', '8hr80km'] as $packageKey) {
            if (isset($data['fares'][$packageKey]) && is_numeric($data['fares'][$packageKey])) {
                $package8hr = floatval($data['fares'][$packageKey]);
                break;
            }
        }
    }
    
    $package10hr = 0;
    foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km', '10hrs-100km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package10hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages object for 10hrs package
    if ($package10hr == 0 && isset($data['packages'])) {
        foreach (['10hrs-100km', '10hr100km'] as $packageKey) {
            if (isset($data['packages'][$packageKey]) && is_numeric($data['packages'][$packageKey])) {
                $package10hr = floatval($data['packages'][$packageKey]);
                break;
            }
        }
    }
    
    // If still no value, check in fares object
    if ($package10hr == 0 && isset($data['fares'])) {
        foreach (['10hrs-100km', '10hr100km'] as $packageKey) {
            if (isset($data['fares'][$packageKey]) && is_numeric($data['fares'][$packageKey])) {
                $package10hr = floatval($data['fares'][$packageKey]);
                break;
            }
        }
    }
    
    $extraKmRate = 0;
    foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'price_extra_km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraKmRate = floatval($data[$field]);
            break;
        }
    }
    
    // Check in packages object for extraKmRate
    if ($extraKmRate == 0 && isset($data['packages']) && isset($data['packages']['extraKmRate']) && is_numeric($data['packages']['extraKmRate'])) {
        $extraKmRate = floatval($data['packages']['extraKmRate']);
    }
    
    // Check in fares object for extraKmRate
    if ($extraKmRate == 0 && isset($data['fares']) && isset($data['fares']['extraKmRate']) && is_numeric($data['fares']['extraKmRate'])) {
        $extraKmRate = floatval($data['fares']['extraKmRate']);
    }
    
    $extraHourRate = 0;
    foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'price_extra_hour'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraHourRate = floatval($data[$field]);
            break;
        }
    }
    
    // Check in packages object for extraHourRate
    if ($extraHourRate == 0 && isset($data['packages']) && isset($data['packages']['extraHourRate']) && is_numeric($data['packages']['extraHourRate'])) {
        $extraHourRate = floatval($data['packages']['extraHourRate']);
    }
    
    // Check in fares object for extraHourRate
    if ($extraHourRate == 0 && isset($data['fares']) && isset($data['fares']['extraHourRate']) && is_numeric($data['fares']['extraHourRate'])) {
        $extraHourRate = floatval($data['fares']['extraHourRate']);
    }
    
    // Log extracted fare values
    error_log("[$timestamp] Extracted fare values: 
        package4hr: $package4hr, 
        package8hr: $package8hr, 
        package10hr: $package10hr, 
        extraKmRate: $extraKmRate, 
        extraHourRate: $extraHourRate", 
    3, $logDir . '/direct-fares.log');
    
    // Use defaults if values are zero/empty
    if (empty($vehicleId)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required',
            'received_data' => $data,
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Set default values based on vehicle type if any values are missing
    if ($package4hr == 0 || $package8hr == 0 || $package10hr == 0 || $extraKmRate == 0 || $extraHourRate == 0) {
        $vehicleIdLower = strtolower($vehicleId);
        
        if ($package4hr == 0) {
            if (strpos($vehicleIdLower, 'sedan') !== false) {
                $package4hr = 1500;
            } elseif (strpos($vehicleIdLower, 'ertiga') !== false) {
                $package4hr = 2000;
            } elseif (strpos($vehicleIdLower, 'innova') !== false) {
                $package4hr = 2500;
            } elseif (strpos($vehicleIdLower, 'tempo') !== false) {
                $package4hr = 3500;
            } else {
                $package4hr = 2000; // Default value
            }
        }
        
        if ($package8hr == 0) {
            // Default to roughly 1.8x the 4hr package
            $package8hr = round($package4hr * 1.8);
        }
        
        if ($package10hr == 0) {
            // Default to roughly 2.2x the 4hr package
            $package10hr = round($package4hr * 2.2);
        }
        
        if ($extraKmRate == 0) {
            if (strpos($vehicleIdLower, 'sedan') !== false) {
                $extraKmRate = 14;
            } elseif (strpos($vehicleIdLower, 'ertiga') !== false) {
                $extraKmRate = 16;
            } else {
                $extraKmRate = 18;
            }
        }
        
        if ($extraHourRate == 0) {
            if (strpos($vehicleIdLower, 'sedan') !== false) {
                $extraHourRate = 250;
            } elseif (strpos($vehicleIdLower, 'ertiga') !== false) {
                $extraHourRate = 300;
            } else {
                $extraHourRate = 350;
            }
        }
        
        error_log("[$timestamp] Applied default values for missing fare data: 
            package4hr: $package4hr, 
            package8hr: $package8hr, 
            package10hr: $package10hr, 
            extraKmRate: $extraKmRate, 
            extraHourRate: $extraHourRate", 
        3, $logDir . '/direct-fares.log');
    }
    
    // Database connection details
    $dbHost = 'localhost';
    $dbName = 'u644605165_new_bookingdb';
    $dbUser = 'u644605165_new_bookingusr';
    $dbPass = 'Vizag@1213';
    
    // Try to connect to the database using PDO for better error handling
    $databaseError = null;
    $updateSuccess = false;
    
    try {
        $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
        error_log("[$timestamp] Database connection successful", 3, $logDir . '/direct-fares.log');
        
        // First, check if the vehicle_pricing table has all required columns
        try {
            $checkColumnsStmt = $pdo->query("SHOW COLUMNS FROM vehicle_pricing");
            $columns = $checkColumnsStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $requiredColumns = [
                'vehicle_type', 'trip_type', 'local_package_4hr', 
                'local_package_8hr', 'local_package_10hr', 
                'extra_km_charge', 'extra_hour_charge',
                'base_fare', 'price_per_km', 'night_halt_charge', 'driver_allowance'
            ];
            
            $missingColumns = array_diff($requiredColumns, $columns);
            error_log("[$timestamp] Checking vehicle_pricing table columns. Missing: " . implode(', ', $missingColumns), 3, $logDir . '/direct-fares.log');
            
            // Add any missing columns
            if (!empty($missingColumns)) {
                foreach ($missingColumns as $column) {
                    try {
                        $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN $column DECIMAL(10,2) DEFAULT 0.00");
                        error_log("[$timestamp] Added missing column $column to vehicle_pricing table", 3, $logDir . '/direct-fares.log');
                    } catch (PDOException $e) {
                        error_log("[$timestamp] Error adding column $column: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
                    }
                }
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error checking columns: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
            // Try to create the table if it doesn't exist
            try {
                $createVehiclePricingSql = "CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                                         `id` INT NOT NULL AUTO_INCREMENT,
                                         `vehicle_type` VARCHAR(50) NOT NULL,
                                         `trip_type` VARCHAR(20) NOT NULL,
                                         `base_fare` DECIMAL(10,2) DEFAULT 0.00,
                                         `price_per_km` DECIMAL(10,2) DEFAULT 0.00,
                                         `night_halt_charge` DECIMAL(10,2) DEFAULT 0.00,
                                         `driver_allowance` DECIMAL(10,2) DEFAULT 0.00,
                                         `local_package_4hr` DECIMAL(10,2) DEFAULT 0.00,
                                         `local_package_8hr` DECIMAL(10,2) DEFAULT 0.00,
                                         `local_package_10hr` DECIMAL(10,2) DEFAULT 0.00,
                                         `extra_km_charge` DECIMAL(10,2) DEFAULT 0.00,
                                         `extra_hour_charge` DECIMAL(10,2) DEFAULT 0.00,
                                         `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                         PRIMARY KEY (`id`),
                                         UNIQUE KEY `vehicle_trip_type` (`vehicle_type`, `trip_type`)
                                      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                $pdo->exec($createVehiclePricingSql);
                error_log("[$timestamp] Created vehicle_pricing table", 3, $logDir . '/direct-fares.log');
            } catch (PDOException $createError) {
                error_log("[$timestamp] Error creating vehicle_pricing table: " . $createError->getMessage(), 3, $logDir . '/direct-fares.log');
            }
        }
        
        // Check if a record exists for this vehicle_id with trip_type 'local'
        try {
            $checkSql = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$vehicleId]);
            $exists = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($exists) {
                // Update existing record
                $updateSql = "UPDATE vehicle_pricing 
                          SET local_package_4hr = ?, 
                              local_package_8hr = ?, 
                              local_package_10hr = ?, 
                              extra_km_charge = ?, 
                              extra_hour_charge = ?,
                              base_fare = IFNULL(base_fare, 0),
                              price_per_km = IFNULL(price_per_km, 0),
                              night_halt_charge = IFNULL(night_halt_charge, 0),
                              driver_allowance = IFNULL(driver_allowance, 0)
                          WHERE vehicle_type = ? AND trip_type = 'local'";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate,
                    $vehicleId
                ]);
                
                error_log("[$timestamp] Updated existing record in vehicle_pricing for vehicle $vehicleId", 3, $logDir . '/direct-fares.log');
                $updateSuccess = true;
            } else {
                // Insert new record
                $insertSql = "INSERT INTO vehicle_pricing 
                          (vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                           extra_km_charge, extra_hour_charge, base_fare, price_per_km, night_halt_charge, driver_allowance)
                          VALUES (?, 'local', ?, ?, ?, ?, ?, 0, 0, 0, 0)";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    $vehicleId,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
                
                error_log("[$timestamp] Inserted new record in vehicle_pricing for vehicle $vehicleId", 3, $logDir . '/direct-fares.log');
                $updateSuccess = true;
            }
            
            // Now also update or insert into local_package_fares table
            // First check if the table exists
            $tableExists = false;
            try {
                $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'local_package_fares'");
                $tableExists = $checkTableStmt->rowCount() > 0;
                
                if (!$tableExists) {
                    // Create the table if it doesn't exist
                    $createTableSql = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
                                    `id` INT NOT NULL AUTO_INCREMENT,
                                    `vehicle_id` VARCHAR(50) NOT NULL,
                                    `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                                    `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                                    `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                                    `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                                    `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
                                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                    PRIMARY KEY (`id`),
                                    UNIQUE KEY `vehicle_id` (`vehicle_id`)
                                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                    $pdo->exec($createTableSql);
                    error_log("[$timestamp] Created local_package_fares table", 3, $logDir . '/direct-fares.log');
                    $tableExists = true;
                }
                
                if ($tableExists) {
                    // Check if record exists
                    $checkLpfSql = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
                    $checkLpfStmt = $pdo->prepare($checkLpfSql);
                    $checkLpfStmt->execute([$vehicleId]);
                    $lpfExists = $checkLpfStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($lpfExists) {
                        // Update existing record
                        $updateLpfSql = "UPDATE local_package_fares 
                                      SET price_4hrs_40km = ?, 
                                          price_8hrs_80km = ?, 
                                          price_10hrs_100km = ?, 
                                          price_extra_km = ?, 
                                          price_extra_hour = ?
                                      WHERE vehicle_id = ?";
                        $updateLpfStmt = $pdo->prepare($updateLpfSql);
                        $updateLpfStmt->execute([
                            $package4hr, 
                            $package8hr, 
                            $package10hr, 
                            $extraKmRate, 
                            $extraHourRate,
                            $vehicleId
                        ]);
                        
                        error_log("[$timestamp] Updated existing record in local_package_fares for vehicle $vehicleId", 3, $logDir . '/direct-fares.log');
                    } else {
                        // Insert new record
                        $insertLpfSql = "INSERT INTO local_package_fares 
                                      (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                                       price_extra_km, price_extra_hour)
                                      VALUES (?, ?, ?, ?, ?, ?)";
                        $insertLpfStmt = $pdo->prepare($insertLpfSql);
                        $insertLpfStmt->execute([
                            $vehicleId,
                            $package4hr, 
                            $package8hr, 
                            $package10hr, 
                            $extraKmRate, 
                            $extraHourRate
                        ]);
                        
                        error_log("[$timestamp] Inserted new record in local_package_fares for vehicle $vehicleId", 3, $logDir . '/direct-fares.log');
                    }
                }
            } catch (PDOException $e) {
                error_log("[$timestamp] Error updating local_package_fares: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
                $databaseError .= " local_package_fares error: " . $e->getMessage();
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating vehicle_pricing: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
            $databaseError = "Error updating vehicle_pricing: " . $e->getMessage();
        }
    } catch (PDOException $e) {
        error_log("[$timestamp] Database connection error: " . $e->getMessage(), 3, $logDir . '/direct-fares.log');
        $databaseError = "Database connection error: " . $e->getMessage();
    }
    
    // Send a response
    $response = [
        'status' => $updateSuccess ? 'success' : 'error',
        'message' => $updateSuccess ? 'Local fares updated successfully' : 'Failed to update local fares',
        'data' => [
            'vehicleId' => $vehicleId,
            'packages' => [
                '4hrs-40km' => $package4hr,
                '04hrs-40km' => $package4hr, // Explicitly add the 04hrs variant
                '8hrs-80km' => $package8hr,
                '10hrs-100km' => $package10hr,
                'extraKmRate' => $extraKmRate,
                'extraHourRate' => $extraHourRate
            ],
            'timestamp' => time()
        ]
    ];
    
    if ($databaseError) {
        $response['database_error'] = $databaseError;
    }
    
    error_log("[$timestamp] Sending response: " . json_encode($response), 3, $logDir . '/direct-fares.log');
    echo json_encode($response);
    exit;
}

// Method not allowed
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed. Use POST or GET for direct local fare updates.',
    'timestamp' => time()
]);
