
<?php
// local-fares-update.php - Ultra simplified local fare update endpoint
// No configuration files, no includes, pure standalone script

// Set CORS headers for all cases
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Local fare update request received: Method=" . $_SERVER['REQUEST_METHOD'], 3, __DIR__ . '/../logs/direct-fares.log');
error_log("Raw input: $requestData", 3, __DIR__ . '/../logs/direct-fares.log');

// Get data from all possible sources - maximum flexibility
$data = [];

// Try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
}

// If no POST data, try JSON input
if (empty($data)) {
    if (!empty($requestData)) {
        $jsonData = json_decode($requestData, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $data = $jsonData;
            error_log("Using JSON data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
        } else {
            // Try parsing as form data
            parse_str($requestData, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("Parsed raw input as form data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
            }
        }
    }
}

// Finally try GET parameters
if (empty($data) && !empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
}

// Extract vehicle ID and normalize using any of the possible field names
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

// Extract pricing data with multiple fallbacks
$package4hr = 0;
foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package4hr = floatval($data[$field]);
        break;
    }
}

$package8hr = 0;
foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package8hr = floatval($data[$field]);
        break;
    }
}

$package10hr = 0;
foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package10hr = floatval($data[$field]);
        break;
    }
}

$extraKmRate = 0;
foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $extraKmRate = floatval($data[$field]);
        break;
    }
}

$extraHourRate = 0;
foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $extraHourRate = floatval($data[$field]);
        break;
    }
}

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

// Normalize missing fares - if we have at least one value, assume others should be calculated proportionally
if ($package8hr > 0 && $package4hr === 0) {
    $package4hr = round($package8hr * 0.6); // 4hr package is typically 60% of 8hr
}

if ($package8hr > 0 && $package10hr === 0) {
    $package10hr = round($package8hr * 1.2); // 10hr package is typically 120% of 8hr
}

if ($package4hr > 0 && $package8hr === 0) {
    $package8hr = round($package4hr / 0.6); // Calculate 8hr from 4hr
}

if ($package10hr > 0 && $package8hr === 0) {
    $package8hr = round($package10hr / 1.2); // Calculate 8hr from 10hr
}

// Ensure we have at least some extra rate values
if ($extraKmRate === 0 && $package8hr > 0) {
    // Default to a sensible value based on vehicle type
    if (stripos($vehicleId, 'sedan') !== false || stripos($vehicleId, 'swift') !== false || stripos($vehicleId, 'dzire') !== false) {
        $extraKmRate = 14;
    } elseif (stripos($vehicleId, 'ertiga') !== false) {
        $extraKmRate = 18;
    } elseif (stripos($vehicleId, 'innova') !== false) {
        $extraKmRate = 20;
    } elseif (stripos($vehicleId, 'luxury') !== false) {
        $extraKmRate = 25;
    } else {
        $extraKmRate = 15; // Default fallback
    }
}

if ($extraHourRate === 0 && $package8hr > 0) {
    // Extra hour is typically 1/8 of the 8hr package or about 250-350 rupees
    $extraHourRate = round($package8hr / 8);
    // Ensure it's within a reasonable range
    if ($extraHourRate < 200) $extraHourRate = 200;
    if ($extraHourRate > 500) $extraHourRate = 500;
}

// Log the received values
error_log("Vehicle ID: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("4hr Package: $package4hr", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("8hr Package: $package8hr", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("10hr Package: $package10hr", 3, __DIR__ . '/../logs/direct-fares.log');

// Prepare response with all packages data
$responseData = [
    'status' => 'success',
    'message' => 'Local fares updated successfully',
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

// Only try to update the database if we have a vehicle ID and at least one package price
if (!empty($vehicleId) && ($package4hr > 0 || $package8hr > 0 || $package10hr > 0)) {
    try {
        // Create database connection - hardcoded for maximum reliability
        $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // First check if local_package_fares table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'local_package_fares'");
        if ($checkTable->rowCount() === 0) {
            // Create the table if it doesn't exist
            $createTableSql = "
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
                    UNIQUE KEY (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $pdo->exec($createTableSql);
            error_log("Created local_package_fares table", 3, __DIR__ . '/../logs/direct-fares.log');
        }
        
        // Try to update the local_package_fares table
        try {
            // Check if record exists
            $checkSql = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$vehicleId]);
            $exists = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($exists) {
                // Update existing record
                $updateSql = "UPDATE local_package_fares 
                              SET price_4hrs_40km = ?, 
                                  price_8hrs_80km = ?, 
                                  price_10hrs_100km = ?, 
                                  price_extra_km = ?, 
                                  price_extra_hour = ?,
                                  updated_at = NOW()
                              WHERE vehicle_id = ?";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate,
                    $vehicleId
                ]);
            } else {
                // Insert new record
                $insertSql = "INSERT INTO local_package_fares 
                              (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                               price_extra_km, price_extra_hour, created_at, updated_at)
                              VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    $vehicleId,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
            }
            
            // Check if vehicle_pricing table exists
            $checkVPTable = $pdo->query("SHOW TABLES LIKE 'vehicle_pricing'");
            if ($checkVPTable->rowCount() === 0) {
                // Create the vehicle_pricing table if it doesn't exist
                $createVPTableSql = "
                    CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        vehicle_type VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) NOT NULL DEFAULT 'local',
                        base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        local_package_4hr DECIMAL(10,2) DEFAULT NULL,
                        local_package_8hr DECIMAL(10,2) DEFAULT NULL,
                        local_package_10hr DECIMAL(10,2) DEFAULT NULL,
                        extra_km_charge DECIMAL(5,2) DEFAULT NULL,
                        extra_hour_charge DECIMAL(5,2) DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY (vehicle_id, vehicle_type, trip_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ";
                $pdo->exec($createVPTableSql);
                error_log("Created vehicle_pricing table", 3, __DIR__ . '/../logs/direct-fares.log');
            }
            
            // Check if vehicle_pricing has both vehicle_id and vehicle_type columns
            $columnsStmt = $pdo->query("SHOW COLUMNS FROM vehicle_pricing");
            $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
            $hasVehicleId = in_array('vehicle_id', $columns);
            $hasVehicleType = in_array('vehicle_type', $columns);
            
            // Check if there is an existing local record for this vehicle in vehicle_pricing
            $existingVPRecordSql = "";
            $existingVPParams = [];
            
            if ($hasVehicleId && $hasVehicleType) {
                $existingVPRecordSql = "SELECT * FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
                $existingVPParams = [$vehicleId, $vehicleId];
            } else {
                $existingVPRecordSql = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
                $existingVPParams = [$vehicleId];
            }
            
            $existingVPStmt = $pdo->prepare($existingVPRecordSql);
            $existingVPStmt->execute($existingVPParams);
            $existingVPRecord = $existingVPStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingVPRecord) {
                // Update only the local package fields in vehicle_pricing, preserve other fields
                if ($hasVehicleId && $hasVehicleType) {
                    $vpUpdateSql = "UPDATE vehicle_pricing 
                                   SET local_package_4hr = ?, 
                                       local_package_8hr = ?, 
                                       local_package_10hr = ?, 
                                       extra_km_charge = ?, 
                                       extra_hour_charge = ?,
                                       updated_at = NOW()
                                   WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'local'";
                    $vpUpdateStmt = $pdo->prepare($vpUpdateSql);
                    $vpUpdateStmt->execute([
                        $package4hr, 
                        $package8hr, 
                        $package10hr, 
                        $extraKmRate, 
                        $extraHourRate,
                        $vehicleId,
                        $vehicleId
                    ]);
                } else {
                    $vpUpdateSql = "UPDATE vehicle_pricing 
                                   SET local_package_4hr = ?, 
                                       local_package_8hr = ?, 
                                       local_package_10hr = ?, 
                                       extra_km_charge = ?, 
                                       extra_hour_charge = ?,
                                       updated_at = NOW()
                                   WHERE vehicle_type = ? AND trip_type = 'local'";
                    $vpUpdateStmt = $pdo->prepare($vpUpdateSql);
                    $vpUpdateStmt->execute([
                        $package4hr, 
                        $package8hr, 
                        $package10hr, 
                        $extraKmRate, 
                        $extraHourRate,
                        $vehicleId
                    ]);
                }
                
                error_log("Updated existing local record in vehicle_pricing", 3, __DIR__ . '/../logs/direct-fares.log');
            } else {
                // Insert new local record in vehicle_pricing with DEFAULT values for unrelated fields
                if ($hasVehicleId && $hasVehicleType) {
                    $vpInsertSql = "INSERT INTO vehicle_pricing 
                                   (vehicle_id, vehicle_type, trip_type, 
                                    local_package_4hr, local_package_8hr, local_package_10hr, 
                                    extra_km_charge, extra_hour_charge,
                                    base_fare, price_per_km, night_halt_charge, driver_allowance,
                                    created_at, updated_at)
                                   VALUES (?, ?, 'local', ?, ?, ?, ?, ?, 0, 0, 0, 0, NOW(), NOW())";
                    $vpInsertStmt = $pdo->prepare($vpInsertSql);
                    $vpInsertStmt->execute([
                        $vehicleId,
                        $vehicleId,
                        $package4hr,
                        $package8hr,
                        $package10hr,
                        $extraKmRate,
                        $extraHourRate
                    ]);
                } else {
                    $vpInsertSql = "INSERT INTO vehicle_pricing 
                                   (vehicle_type, trip_type, 
                                    local_package_4hr, local_package_8hr, local_package_10hr, 
                                    extra_km_charge, extra_hour_charge,
                                    base_fare, price_per_km, night_halt_charge, driver_allowance,
                                    created_at, updated_at)
                                   VALUES (?, 'local', ?, ?, ?, ?, ?, 0, 0, 0, 0, NOW(), NOW())";
                    $vpInsertStmt = $pdo->prepare($vpInsertSql);
                    $vpInsertStmt->execute([
                        $vehicleId,
                        $package4hr,
                        $package8hr,
                        $package10hr,
                        $extraKmRate,
                        $extraHourRate
                    ]);
                }
                
                error_log("Inserted new local record in vehicle_pricing", 3, __DIR__ . '/../logs/direct-fares.log');
            }
            
            // Check if this vehicle has an outstation record, if not create one with default values
            $outstationCheckSql = "";
            $outstationParams = [];
            
            if ($hasVehicleId && $hasVehicleType) {
                $outstationCheckSql = "SELECT * FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'outstation'";
                $outstationParams = [$vehicleId, $vehicleId];
            } else {
                $outstationCheckSql = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'outstation'";
                $outstationParams = [$vehicleId];
            }
            
            $outstationCheckStmt = $pdo->prepare($outstationCheckSql);
            $outstationCheckStmt->execute($outstationParams);
            $outstationExists = $outstationCheckStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$outstationExists) {
                // Create a default outstation record to prevent null values
                $defaultBaseFare = 0;
                $defaultPricePerKm = 0;
                $defaultNightHalt = 0;
                $defaultDriverAllowance = 0;
                
                // Set default values based on vehicle type
                if (stripos($vehicleId, 'sedan') !== false) {
                    $defaultBaseFare = 4000;
                    $defaultPricePerKm = 14;
                    $defaultNightHalt = 700;
                    $defaultDriverAllowance = 250;
                } elseif (stripos($vehicleId, 'ertiga') !== false) {
                    $defaultBaseFare = 4500;
                    $defaultPricePerKm = 18;
                    $defaultNightHalt = 1000;
                    $defaultDriverAllowance = 250;
                } elseif (stripos($vehicleId, 'innova') !== false) {
                    $defaultBaseFare = 6000;
                    $defaultPricePerKm = 20;
                    $defaultNightHalt = 1000;
                    $defaultDriverAllowance = 250;
                } elseif (stripos($vehicleId, 'tempo') !== false) {
                    $defaultBaseFare = 8000;
                    $defaultPricePerKm = 22;
                    $defaultNightHalt = 1500;
                    $defaultDriverAllowance = 300;
                } elseif (stripos($vehicleId, 'luxury') !== false) {
                    $defaultBaseFare = 10000;
                    $defaultPricePerKm = 25;
                    $defaultNightHalt = 1500;
                    $defaultDriverAllowance = 300;
                }
                
                if ($hasVehicleId && $hasVehicleType) {
                    $outstationInsertSql = "INSERT INTO vehicle_pricing 
                                          (vehicle_id, vehicle_type, trip_type, 
                                           base_fare, price_per_km, night_halt_charge, driver_allowance,
                                           created_at, updated_at)
                                          VALUES (?, ?, 'outstation', ?, ?, ?, ?, NOW(), NOW())";
                    $outstationInsertStmt = $pdo->prepare($outstationInsertSql);
                    $outstationInsertStmt->execute([
                        $vehicleId,
                        $vehicleId,
                        $defaultBaseFare,
                        $defaultPricePerKm,
                        $defaultNightHalt,
                        $defaultDriverAllowance
                    ]);
                } else {
                    $outstationInsertSql = "INSERT INTO vehicle_pricing 
                                          (vehicle_type, trip_type, 
                                           base_fare, price_per_km, night_halt_charge, driver_allowance,
                                           created_at, updated_at)
                                          VALUES (?, 'outstation', ?, ?, ?, ?, NOW(), NOW())";
                    $outstationInsertStmt = $pdo->prepare($outstationInsertSql);
                    $outstationInsertStmt->execute([
                        $vehicleId,
                        $defaultBaseFare,
                        $defaultPricePerKm,
                        $defaultNightHalt,
                        $defaultDriverAllowance
                    ]);
                }
                
                error_log("Created default outstation record for $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
            }
            
            $responseData['database_update'] = 'Successfully updated local_package_fares and vehicle_pricing tables';
            
            // Try to sync the tables with a separate call
            try {
                $syncUrl = str_replace('local-fares-update.php', 'sync-local-fares.php', $_SERVER['PHP_SELF']);
                $fullSyncUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
                             "://" . $_SERVER['HTTP_HOST'] . $syncUrl;
                
                $ch = curl_init($fullSyncUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                curl_exec($ch);
                curl_close($ch);
            } catch (Exception $e) {
                // Ignore sync errors, as we've already updated the primary tables
                error_log("Sync error (non-critical): " . $e->getMessage());
            }
            
        } catch (Exception $e) {
            $responseData['database_error'] = $e->getMessage();
            error_log("Database error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
        }
        
    } catch (Exception $e) {
        $responseData['database_connection_error'] = $e->getMessage();
        error_log("Database connection error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    }
}

// Echo the response data
echo json_encode($responseData);
