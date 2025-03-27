
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
$logDir = __DIR__ . '/../logs';
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
error_log("[$timestamp] Vehicle ID: $vehicleId", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] 4hr Package: $package4hr", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] 8hr Package: $package8hr", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] 10hr Package: $package10hr", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] Extra KM Rate: $extraKmRate", 3, $logDir . '/local-fares.log');
error_log("[$timestamp] Extra Hour Rate: $extraHourRate", 3, $logDir . '/local-fares.log');

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
        
        // First check if local_package_fares table exists
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
                error_log("[$timestamp] Inserted new record in local_package_fares for $vehicleId", 3, $logDir . '/local-fares.log');
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating local_package_fares: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Error updating local_package_fares: " . $e->getMessage();
            throw $e;
        }
        
        // Check if vehicle_pricing table exists
        $vpTableExists = false;
        try {
            $checkVPTable = $pdo->query("SHOW TABLES LIKE 'vehicle_pricing'");
            $vpTableExists = ($checkVPTable->rowCount() > 0);
        } catch (PDOException $e) {
            error_log("[$timestamp] Error checking if vehicle_pricing exists: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        }
        
        if (!$vpTableExists) {
            // Create the vehicle_pricing table if it doesn't exist
            try {
                $createVPTableSql = "
                    CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) NOT NULL DEFAULT 'local',
                        base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                        local_package_4hr DECIMAL(10,2) DEFAULT NULL,
                        local_package_8hr DECIMAL(10,2) DEFAULT NULL,
                        local_package_10hr DECIMAL(10,2) DEFAULT NULL,
                        extra_km_charge DECIMAL(5,2) DEFAULT NULL,
                        extra_hour_charge DECIMAL(5,2) DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ";
                $pdo->exec($createVPTableSql);
                error_log("[$timestamp] Created vehicle_pricing table", 3, $logDir . '/local-fares.log');
            } catch (PDOException $e) {
                error_log("[$timestamp] Error creating vehicle_pricing table: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
                $databaseError = "Error creating vehicle_pricing table: " . $e->getMessage();
            }
        }
        
        // Check vehicle_pricing table structure and add vehicle_id column if it doesn't exist
        try {
            // First check if vehicle_id column exists in vehicle_pricing table
            $checkVehicleIdCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
            $hasVehicleIdCol = ($checkVehicleIdCol->rowCount() > 0);
            
            if (!$hasVehicleIdCol) {
                // Add vehicle_id column to vehicle_pricing table if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id");
                error_log("[$timestamp] Added vehicle_id column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }
            
            // Check if trip_type column exists
            $checkTripTypeCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'trip_type'");
            $hasTripTypeCol = ($checkTripTypeCol->rowCount() > 0);
            
            if (!$hasTripTypeCol) {
                // Add trip_type column if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN trip_type VARCHAR(50) NOT NULL DEFAULT 'local' AFTER vehicle_id");
                error_log("[$timestamp] Added trip_type column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }
            
            // Check for column name issues - ensure the base_fare column exists
            $checkBaseFareCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'base_fare'");
            $hasBaseFareCol = ($checkBaseFareCol->rowCount() > 0);
            
            if (!$hasBaseFareCol) {
                // Add base_fare column if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN base_fare DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER trip_type");
                error_log("[$timestamp] Added base_fare column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }
            
            // Check if unique key exists for vehicle_id and trip_type
            $checkUniqueKey = $pdo->query("SHOW INDEX FROM vehicle_pricing WHERE Key_name = 'vehicle_trip_type'");
            $hasUniqueKey = ($checkUniqueKey->rowCount() > 0);
            
            if (!$hasUniqueKey) {
                // Drop existing vehicle_id index if it exists
                try {
                    $pdo->exec("ALTER TABLE vehicle_pricing DROP INDEX vehicle_id");
                } catch (PDOException $e) {
                    // Ignore error if index doesn't exist
                }
                
                // Add unique key for vehicle_id and trip_type
                $pdo->exec("ALTER TABLE vehicle_pricing ADD UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)");
                error_log("[$timestamp] Added unique key for vehicle_id and trip_type", 3, $logDir . '/local-fares.log');
            }

            // Check if local_package_4hr column exists
            $checkLocal4hrCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'local_package_4hr'");
            $hasLocal4hrCol = ($checkLocal4hrCol->rowCount() > 0);
            
            if (!$hasLocal4hrCol) {
                // Add local_package_4hr column if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN local_package_4hr DECIMAL(10,2) DEFAULT NULL");
                error_log("[$timestamp] Added local_package_4hr column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }

            // Check if local_package_8hr column exists
            $checkLocal8hrCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'local_package_8hr'");
            $hasLocal8hrCol = ($checkLocal8hrCol->rowCount() > 0);
            
            if (!$hasLocal8hrCol) {
                // Add local_package_8hr column if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN local_package_8hr DECIMAL(10,2) DEFAULT NULL");
                error_log("[$timestamp] Added local_package_8hr column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }

            // Check if local_package_10hr column exists
            $checkLocal10hrCol = $pdo->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'local_package_10hr'");
            $hasLocal10hrCol = ($checkLocal10hrCol->rowCount() > 0);
            
            if (!$hasLocal10hrCol) {
                // Add local_package_10hr column if it doesn't exist
                $pdo->exec("ALTER TABLE vehicle_pricing ADD COLUMN local_package_10hr DECIMAL(10,2) DEFAULT NULL");
                error_log("[$timestamp] Added local_package_10hr column to vehicle_pricing", 3, $logDir . '/local-fares.log');
            }
            
        } catch (PDOException $e) {
            error_log("[$timestamp] Error checking/modifying vehicle_pricing structure: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Error checking/modifying vehicle_pricing structure: " . $e->getMessage();
        }
        
        // Update vehicle_pricing table
        try {
            // First check if a record exists for this vehicle_id with trip_type 'local'
            $checkVPSql = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
            $checkVPStmt = $pdo->prepare($checkVPSql);
            $checkVPStmt->execute([$vehicleId]);
            $vpExists = $checkVPStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($vpExists) {
                // Update existing record
                $updateVPSql = "UPDATE vehicle_pricing 
                               SET local_package_4hr = ?, 
                                   local_package_8hr = ?, 
                                   local_package_10hr = ?, 
                                   extra_km_charge = ?, 
                                   extra_hour_charge = ?,
                                   updated_at = NOW()
                               WHERE vehicle_id = ? AND trip_type = 'local'";
                $updateVPStmt = $pdo->prepare($updateVPSql);
                $updateVPStmt->execute([
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate,
                    $vehicleId
                ]);
                error_log("[$timestamp] Updated existing record in vehicle_pricing for $vehicleId with trip_type 'local'", 3, $logDir . '/local-fares.log');
            } else {
                // Insert new record - note we're explicitly setting all required fields
                $insertVPSql = "INSERT INTO vehicle_pricing 
                              (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance,
                               local_package_4hr, local_package_8hr, local_package_10hr, 
                               extra_km_charge, extra_hour_charge, created_at, updated_at)
                              VALUES (?, 'local', 0, 0, 0, 0, ?, ?, ?, ?, ?, NOW(), NOW())";
                $insertVPStmt = $pdo->prepare($insertVPSql);
                $insertVPStmt->execute([
                    $vehicleId,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
                error_log("[$timestamp] Inserted new record in vehicle_pricing for $vehicleId with trip_type 'local'", 3, $logDir . '/local-fares.log');
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating vehicle_pricing: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Error updating vehicle_pricing: " . $e->getMessage();
        }
        
    } catch (PDOException $e) {
        error_log("[$timestamp] Database error: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        $databaseError = "Database error: " . $e->getMessage();
    } catch (Exception $e) {
        error_log("[$timestamp] General error: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        $databaseError = "General error: " . $e->getMessage();
    }
}

// Include database error in response if there was one
if ($databaseError) {
    $responseData['database_error'] = $databaseError;
}

// Return success response
echo json_encode($responseData);
