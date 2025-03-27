
<?php
// This is a redirection script for compatibility with old URLs
// It redirects to the admin/local-fares-update.php file

// Include necessary headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: '0');
header('X-Debug-File: direct-local-fares.php');
header('X-Debug-Mode: true');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct local fare update request received at root endpoint: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] POST data: " . print_r($_POST, true), 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/direct-fares.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// For direct local fare updates, we need to forward the POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Log that we're about to redirect
    error_log("[$timestamp] Attempting to handle local fare update request", 3, $logDir . '/direct-fares.log');

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
    foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id'] as $field) {
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
            if (isset($data['packages'][$packageKey])) {
                $package4hr = floatval($data['packages'][$packageKey]);
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
    
    // Also check in packages or fares objects
    if ($package8hr == 0 && isset($data['packages']) && isset($data['packages']['8hrs-80km'])) {
        $package8hr = floatval($data['packages']['8hrs-80km']);
    }
    
    $package10hr = 0;
    foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km', '10hrs-100km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package10hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages object
    if ($package10hr == 0 && isset($data['packages']) && isset($data['packages']['10hrs-100km'])) {
        $package10hr = floatval($data['packages']['10hrs-100km']);
    }
    
    $extraKmRate = 0;
    foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'price_extra_km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraKmRate = floatval($data[$field]);
            break;
        }
    }
    
    $extraHourRate = 0;
    foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'price_extra_hour'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraHourRate = floatval($data[$field]);
            break;
        }
    }
    
    // Log extracted fare values
    error_log("[$timestamp] Extracted fare values: 
        package4hr: $package4hr, 
        package8hr: $package8hr, 
        package10hr: $package10hr, 
        extraKmRate: $extraKmRate, 
        extraHourRate: $extraHourRate", 
    3, $logDir . '/direct-fares.log');
    
    // Simple validation
    if (empty($vehicleId)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required',
            'received_data' => $data
        ]);
        exit;
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
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
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
                              extra_hour_charge = ?
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
    
    // Send a success response regardless of database operation
    // This way frontend always gets something positive
    $response = [
        'status' => $updateSuccess ? 'success' : 'error',
        'message' => $updateSuccess ? 'Local fares updated successfully' : 'Failed to update local fares',
        'data' => [
            'vehicleId' => $vehicleId,
            'packages' => [
                '4hrs-40km' => $package4hr,
                '8hrs-80km' => $package8hr,
                '10hrs-100km' => $package10hr,
                'extra-km' => $extraKmRate,
                'extra-hour' => $extraHourRate
            ]
        ]
    ];
    
    if ($databaseError) {
        $response['database_error'] = $databaseError;
    }
    
    echo json_encode($response);
    exit;
}

// Method not allowed
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed. Use POST for direct local fare updates.'
]);
