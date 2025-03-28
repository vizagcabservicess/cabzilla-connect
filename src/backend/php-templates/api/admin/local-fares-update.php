
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

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Local fare update request received: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/local-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/local-fares.log');

// Get data from all possible sources - maximum flexibility
$data = [];

// Try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("[$timestamp] Using POST data: " . print_r($data, true), 3, $logDir . '/local-fares.log');
}

// If no POST data, try JSON input
if (empty($data)) {
    if (!empty($requestData)) {
        $jsonData = json_decode($requestData, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $data = $jsonData;
            error_log("[$timestamp] Using JSON data: " . print_r($data, true), 3, $logDir . '/local-fares.log');
        } else {
            // Try parsing as form data
            parse_str($requestData, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("[$timestamp] Parsed raw input as form data: " . print_r($data, true), 3, $logDir . '/local-fares.log');
            }
        }
    }
}

// Finally try GET parameters
if (empty($data) && !empty($_GET)) {
    $data = $_GET;
    error_log("[$timestamp] Using GET data: " . print_r($data, true), 3, $logDir . '/local-fares.log');
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
foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hrs_40km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package4hr = floatval($data[$field]);
        break;
    }
}

// Also check in packages or fares objects for React-style clients
if ($package4hr == 0 && isset($data['packages']) && isset($data['packages']['4hrs-40km']) && is_numeric($data['packages']['4hrs-40km'])) {
    $package4hr = floatval($data['packages']['4hrs-40km']);
}
if ($package4hr == 0 && isset($data['fares']) && isset($data['fares']['4hrs-40km']) && is_numeric($data['fares']['4hrs-40km'])) {
    $package4hr = floatval($data['fares']['4hrs-40km']);
}

$package8hr = 0;
foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hrs_80km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package8hr = floatval($data[$field]);
        break;
    }
}

// Also check in packages or fares objects for React-style clients
if ($package8hr == 0 && isset($data['packages']) && isset($data['packages']['8hrs-80km']) && is_numeric($data['packages']['8hrs-80km'])) {
    $package8hr = floatval($data['packages']['8hrs-80km']);
}
if ($package8hr == 0 && isset($data['fares']) && isset($data['fares']['8hrs-80km']) && is_numeric($data['fares']['8hrs-80km'])) {
    $package8hr = floatval($data['fares']['8hrs-80km']);
}

$package10hr = 0;
foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package10hr = floatval($data[$field]);
        break;
    }
}

// Also check in packages or fares objects for React-style clients
if ($package10hr == 0 && isset($data['packages']) && isset($data['packages']['10hrs-100km']) && is_numeric($data['packages']['10hrs-100km'])) {
    $package10hr = floatval($data['packages']['10hrs-100km']);
}
if ($package10hr == 0 && isset($data['fares']) && isset($data['fares']['10hrs-100km']) && is_numeric($data['fares']['10hrs-100km'])) {
    $package10hr = floatval($data['fares']['10hrs-100km']);
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
error_log("[$timestamp] Trip type detected: local", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] Local fare update for $vehicleId: 4hr=$package4hr, 8hr=$package8hr, 10hr=$package10hr", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] Extra rates: KM=$extraKmRate, Hour=$extraHourRate", 3, $logDir . '/local-fares.log');

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

$databaseError = null;

// Only try to update the database if we have a vehicle ID and at least one package price
if (!empty($vehicleId) && ($package4hr > 0 || $package8hr > 0 || $package10hr > 0)) {
    try {
        // Create database connection - hardcoded for maximum reliability
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        // Try to connect to the database
        try {
            $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            error_log("[$timestamp] Successfully connected to database", 3, $logDir . '/local-fares.log');
        } catch (PDOException $e) {
            error_log("[$timestamp] Database connection error: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Database connection error: " . $e->getMessage();
            throw $e;
        }
        
        // First check if vehicle_types table exists and create if needed
        try {
            $checkTable = $pdo->query("SHOW TABLES LIKE 'vehicle_types'");
            $vehicleTypesExists = ($checkTable->rowCount() > 0);
            
            if (!$vehicleTypesExists) {
                // Create the vehicle_types table if it doesn't exist
                $createVehicleTypesSql = "
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
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ";
                $pdo->exec($createVehicleTypesSql);
                error_log("[$timestamp] Created vehicle_types table", 3, $logDir . '/local-fares.log');
            }
            
            // Check if vehicle exists and create if it doesn't
            $checkVehicleSql = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
            $checkVehicleStmt = $pdo->prepare($checkVehicleSql);
            $checkVehicleStmt->execute([$vehicleId]);
            $vehicleExists = ($checkVehicleStmt->rowCount() > 0);
            
            if (!$vehicleExists) {
                // Create a new vehicle entry
                $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
                $insertVehicleSql = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active, created_at, updated_at) 
                                     VALUES (?, ?, 4, 2, 1, 1, NOW(), NOW())";
                $insertVehicleStmt = $pdo->prepare($insertVehicleSql);
                $insertVehicleStmt->execute([$vehicleId, $vehicleName]);
                error_log("[$timestamp] Created new vehicle: $vehicleId", 3, $logDir . '/local-fares.log');
            }
            
        } catch (PDOException $e) {
            error_log("[$timestamp] Error checking vehicle_types table: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            // Continue anyway, as we primarily want to update fares
        }
        
        // Check if local_package_fares table exists
        $tableExists = false;
        try {
            $checkTable = $pdo->query("SHOW TABLES LIKE 'local_package_fares'");
            $tableExists = ($checkTable->rowCount() > 0);
        } catch (PDOException $e) {
            error_log("[$timestamp] Error checking if table exists: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        }
        
        if (!$tableExists) {
            // Create the table if it doesn't exist
            try {
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS local_package_fares (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        vehicle_type VARCHAR(50) DEFAULT NULL,
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
                error_log("[$timestamp] Created local_package_fares table", 3, $logDir . '/local-fares.log');
            } catch (PDOException $e) {
                error_log("[$timestamp] Error creating table: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
                $databaseError = "Error creating table: " . $e->getMessage();
                throw $e;
            }
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
                error_log("[$timestamp] Updated existing record in local_package_fares for $vehicleId", 3, $logDir . '/local-fares.log');
            } else {
                // Insert new record
                $insertSql = "INSERT INTO local_package_fares 
                              (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                               price_extra_km, price_extra_hour)
                              VALUES (?, ?, ?, ?, ?, ?, ?)";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    $vehicleId,
                    $vehicleId, // Use vehicle_id as vehicle_type if not provided
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
                error_log("[$timestamp] Inserted new record in local_package_fares for $vehicleId", 3, $logDir . '/local-fares.log');
            }
            
            error_log("[$timestamp] Local fare update successful for vehicle $vehicleId", 3, $logDir . '/local-fares.log');
            $responseData['database'] = 'Updated successfully';
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating local_package_fares: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Error updating local_package_fares: " . $e->getMessage();
            throw $e;
        }
        
        // Check if vehicle_pricing table exists and update if it does
        try {
            $checkVehiclePricingTable = $pdo->query("SHOW TABLES LIKE 'vehicle_pricing'");
            $vehiclePricingExists = ($checkVehiclePricingTable->rowCount() > 0);
            
            if ($vehiclePricingExists) {
                // Get column names for vehicle_pricing
                $columnsQuery = $pdo->query("SHOW COLUMNS FROM vehicle_pricing");
                $columns = [];
                while ($column = $columnsQuery->fetch(PDO::FETCH_ASSOC)) {
                    $columns[] = $column['Field'];
                }
                
                $hasVehicleId = in_array('vehicle_id', $columns);
                $hasVehicleType = in_array('vehicle_type', $columns);
                $tripType = 'local';
                
                if ($hasVehicleId || $hasVehicleType) {
                    // Build conditions for where clause
                    $whereConditions = [];
                    $whereParams = [];
                    
                    if ($hasVehicleId) {
                        $whereConditions[] = "vehicle_id = ?";
                        $whereParams[] = $vehicleId;
                    }
                    
                    if ($hasVehicleType) {
                        $whereConditions[] = "vehicle_type = ?";
                        $whereParams[] = $vehicleId;
                    }
                    
                    // Add trip type condition
                    $whereConditions[] = "trip_type = ?";
                    $whereParams[] = $tripType;
                    
                    // Build the SET part with only columns that exist
                    $setParts = [];
                    $setParams = [];
                    
                    $possibleColumns = [
                        'local_package_4hr' => $package4hr,
                        'local_package_8hr' => $package8hr,
                        'local_package_10hr' => $package10hr,
                        'extra_km_charge' => $extraKmRate,
                        'extra_hour_charge' => $extraHourRate
                    ];
                    
                    foreach ($possibleColumns as $column => $value) {
                        if (in_array($column, $columns)) {
                            $setParts[] = "$column = ?";
                            $setParams[] = $value;
                        }
                    }
                    
                    // Add updated_at if it exists
                    if (in_array('updated_at', $columns)) {
                        $setParts[] = "updated_at = NOW()";
                    }
                    
                    // Only proceed if we have conditions and columns to update
                    if (!empty($whereConditions) && !empty($setParts)) {
                        // Try to update first
                        $updateSql = "UPDATE vehicle_pricing SET " . implode(", ", $setParts) . 
                                    " WHERE (" . implode(" OR ", array_slice($whereConditions, 0, -1)) . ") AND " . end($whereConditions);
                        
                        $updateVehiclePricingStmt = $pdo->prepare($updateSql);
                        $updateParams = array_merge($setParams, $whereParams);
                        $updateVehiclePricingStmt->execute($updateParams);
                        $rowsAffected = $updateVehiclePricingStmt->rowCount();
                        
                        error_log("[$timestamp] Updated vehicle_pricing for local fares: $vehicleId, Affected rows: $rowsAffected", 3, $logDir . '/local-fares.log');
                        
                        // If no rows were updated, try to insert
                        if ($rowsAffected === 0) {
                            $insertFields = [];
                            $insertPlaceholders = [];
                            $insertParams = [];
                            
                            if ($hasVehicleId) {
                                $insertFields[] = "vehicle_id";
                                $insertPlaceholders[] = "?";
                                $insertParams[] = $vehicleId;
                            }
                            
                            if ($hasVehicleType) {
                                $insertFields[] = "vehicle_type";
                                $insertPlaceholders[] = "?";
                                $insertParams[] = $vehicleId;
                            }
                            
                            // Add trip_type
                            $insertFields[] = "trip_type";
                            $insertPlaceholders[] = "?";
                            $insertParams[] = $tripType;
                            
                            // Add columns that exist
                            foreach ($possibleColumns as $column => $value) {
                                if (in_array($column, $columns)) {
                                    $insertFields[] = $column;
                                    $insertPlaceholders[] = "?";
                                    $insertParams[] = $value;
                                }
                            }
                            
                            // Add created_at and updated_at if they exist
                            if (in_array('created_at', $columns)) {
                                $insertFields[] = "created_at";
                                $insertPlaceholders[] = "NOW()";
                            }
                            
                            if (in_array('updated_at', $columns)) {
                                $insertFields[] = "updated_at";
                                $insertPlaceholders[] = "NOW()";
                            }
                            
                            $insertSql = "INSERT INTO vehicle_pricing (" . implode(", ", $insertFields) . 
                                        ") VALUES (" . implode(", ", $insertPlaceholders) . ")";
                            
                            $insertVehiclePricingStmt = $pdo->prepare($insertSql);
                            $insertVehiclePricingStmt->execute($insertParams);
                            error_log("[$timestamp] Inserted into vehicle_pricing for local fares: $vehicleId", 3, $logDir . '/local-fares.log');
                        }
                    }
                }
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating vehicle_pricing: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            // Don't throw, as this is secondary
        }
        
    } catch (Exception $e) {
        error_log("[$timestamp] Exception: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        $responseData['status'] = 'error';
        $responseData['message'] = $e->getMessage();
        $responseData['database_error'] = $databaseError ?: $e->getMessage();
        http_response_code(500);
    }
}

// Return response
echo json_encode($responseData);
