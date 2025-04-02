
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
$originalVehicleId = '';
foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id'] as $field) {
    if (!empty($data[$field])) {
        $originalVehicleId = $data[$field]; // Keep original for debugging
        $vehicleId = trim($data[$field]);
        break;
    }
}

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// CRITICAL FIX: Expanded ID mapping with all known numeric IDs - THIS IS THE KEY CHANGE
$knownMappings = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    // Special cases observed in logs
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga',
];

// Log the original and cleaned vehicleId
error_log("[$timestamp] Original vehicle ID: $originalVehicleId, Cleaned: $vehicleId", 3, $logDir . '/local-fares.log');

// CRITICAL CHECK: If this is ANY numeric ID, we MUST map it or reject it completely
if (is_numeric($vehicleId)) {
    // If in mappings, use proper vehicle_id
    if (isset($knownMappings[$vehicleId])) {
        $numericId = $vehicleId;
        $vehicleId = $knownMappings[$vehicleId];
        error_log("[$timestamp] Mapped numeric ID $numericId to vehicle_id: $vehicleId", 3, $logDir . '/local-fares.log');
    }
    // If not in mappings, ALWAYS reject numeric IDs completely
    else {
        error_log("[$timestamp] REJECTED unmapped numeric ID: $vehicleId - will not allow this to create a duplicate", 3, $logDir . '/local-fares.log');
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => "Cannot use numeric ID '$vehicleId'. Please use a proper vehicle ID like 'sedan', 'ertiga', 'etios', etc.",
            'isNumericId' => true,
            'originalId' => $originalVehicleId
        ]);
        exit;
    }
}

// If vehicleId is still empty or invalid, report error
if (empty($vehicleId) || $vehicleId === 'undefined') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Valid vehicle ID is required',
        'received_data' => $data,
        'original_id' => $originalVehicleId
    ]);
    exit;
}

// SECOND CHECK: Make sure we don't have any numeric ID at this point
if (is_numeric($vehicleId)) {
    error_log("[$timestamp] CRITICAL: Still have numeric ID after processing: $vehicleId", 3, $logDir . '/local-fares.log');
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => "Cannot use numeric ID '$vehicleId'. Only string-based vehicle IDs are allowed.",
        'isNumericId' => true,
        'originalId' => $originalVehicleId
    ]);
    exit;
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
error_log("[$timestamp] Final vehicle ID being used: $vehicleId", 3, $logDir . '/local-fares.log');
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
        
        // CRITICAL: Check that vehicleId is not numeric AGAIN just before DB operations
        if (is_numeric($vehicleId)) {
            error_log("[$timestamp] CRITICAL SAFETY CHECK: Numeric vehicle ID detected before DB operation: $vehicleId", 3, $logDir . '/local-fares.log');
            throw new Exception("Cannot use numeric ID '$vehicleId' as a valid vehicle identifier");
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
            // IMPORTANT: Before updating, verify if this vehicle_id actually exists in the vehicles table
            // This prevents creating fares for non-existent vehicles
            $checkVehicleSQL = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?";
            $checkVehicleStmt = $pdo->prepare($checkVehicleSQL);
            $checkVehicleStmt->execute([$vehicleId]);
            $vehicleExists = $checkVehicleStmt->fetch(PDO::FETCH_ASSOC);
            
            // Log whether the vehicle exists
            error_log("[$timestamp] Vehicle exists check for '$vehicleId': " . ($vehicleExists['count'] > 0 ? "Yes" : "No"), 3, $logDir . '/local-fares.log');
            
            if ($vehicleExists['count'] == 0) {
                // Vehicle doesn't exist in the database! 
                // Log this issue and return an error to prevent ghost entries
                error_log("[$timestamp] ERROR: Attempted to update fares for non-existent vehicle: $vehicleId", 3, $logDir . '/local-fares.log');
                
                // Return an error response
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Vehicle with ID '$vehicleId' doesn't exist in the database. Please create the vehicle first.",
                    'vehicleId' => $vehicleId
                ]);
                exit;
            }
            
            // Now check if record exists in local_package_fares
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
                $vehicleType = isset($data['vehicleType']) ? $data['vehicleType'] : 
                              (isset($data['vehicle_type']) ? $data['vehicle_type'] : $vehicleId);
                
                $insertSql = "INSERT INTO local_package_fares 
                              (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                               price_extra_km, price_extra_hour) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    $vehicleId,
                    $vehicleType,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
                error_log("[$timestamp] Inserted new record in local_package_fares for $vehicleId", 3, $logDir . '/local-fares.log');
            }
            
            $responseData['database'] = 'Updated successfully';
            
            // Sync this change to the vehicles table as well to ensure consistency
            try {
                $syncSql = "UPDATE vehicles SET local_package_4hr = ?, local_package_8hr = ?, local_package_10hr = ?, 
                           local_extra_km = ?, local_extra_hour = ? WHERE vehicle_id = ?";
                $syncStmt = $pdo->prepare($syncSql);
                $syncStmt->execute([
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate,
                    $vehicleId
                ]);
                error_log("[$timestamp] Synced local fares to vehicles table for $vehicleId", 3, $logDir . '/local-fares.log');
            } catch (Exception $syncError) {
                error_log("[$timestamp] Warning: Could not sync to vehicles table: " . $syncError->getMessage(), 3, $logDir . '/local-fares.log');
            }
        } catch (PDOException $e) {
            error_log("[$timestamp] Error updating local_package_fares: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
            $databaseError = "Error updating local_package_fares: " . $e->getMessage();
            throw $e;
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
