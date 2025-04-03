
<?php
// local-fares-update.php - Ultra simplified local fare update endpoint
// No configuration files, no includes, pure standalone script

// Set CORS headers for all cases - MORE AGGRESSIVE
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Debug-Endpoint: local-fares-update'); // Debug header

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

// Helper functions for column checking
function columnExists($conn, $table, $column) {
    $result = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
    return ($result && $result->num_rows > 0);
}

function getCorrectColumnName($conn, $table, $possibleNames) {
    foreach ($possibleNames as $name) {
        if (columnExists($conn, $table, $name)) {
            return $name;
        }
    }
    return $possibleNames[0]; // Default to first name if none found
}

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

// CRITICAL FIX: Comprehensive ID mapping with all known numeric IDs
$knownMappings = [
    // Single numeric IDs
    '1' => 'sedan',
    '2' => 'ertiga',
    '3' => 'innova',
    '4' => 'crysta',
    '5' => 'tempo',
    '6' => 'bus',
    '7' => 'van',
    '8' => 'suv',
    '9' => 'traveller',
    '10' => 'luxury',
    '180' => 'etios',
    '592' => 'urbania',
    '1266' => 'mpv',
    '1270' => 'mpv',
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
    '1281' => 'mpv',
    '1282' => 'sedan',
    '1283' => 'sedan',
    '1284' => 'etios',
    '1285' => 'etios',
    '1286' => 'etios',
    '1287' => 'etios',
    '1288' => 'etios',
    '1289' => 'etios',
    '1290' => 'etios',
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '103' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga',
    '202' => 'ertiga',
    '300' => 'innova',
    '301' => 'innova',
    '302' => 'innova',
    '400' => 'crysta',
    '401' => 'crysta',
    '402' => 'crysta',
    '500' => 'tempo',
    '501' => 'tempo',
    '502' => 'tempo'
];

// Log the original and cleaned vehicleId
error_log("[$timestamp] Original vehicle ID: $originalVehicleId, Cleaned: $vehicleId", 3, $logDir . '/local-fares.log');

// CRITICAL CHECK: Handle comma-separated lists which are causing the issues
if (strpos($vehicleId, ',') !== false) {
    // Get the first ID in the list and use that
    $idParts = explode(',', $vehicleId);
    $firstId = trim($idParts[0]); // Get first ID
    
    if (array_key_exists($firstId, $knownMappings)) {
        $oldId = $vehicleId;
        $vehicleId = $knownMappings[$firstId];
        error_log("[$timestamp] Fixed comma-separated ID '$oldId' - using first ID '$firstId' mapped to: $vehicleId", 3, $logDir . '/local-fares.log');
    } else {
        // If we can't map the first ID, use 'sedan' as a fallback
        $oldId = $vehicleId;
        $vehicleId = 'sedan';
        error_log("[$timestamp] Cannot map first ID in list '$oldId' - using fallback vehicle_id: $vehicleId", 3, $logDir . '/local-fares.log');
    }
}
// Handle single numeric IDs
else if (is_numeric($vehicleId)) {
    // Check if we have a mapping for this numeric ID
    if (array_key_exists($vehicleId, $knownMappings)) {
        $numericId = $vehicleId;
        $vehicleId = $knownMappings[$numericId];
        error_log("[$timestamp] Mapped numeric ID '$numericId' to proper vehicle_id: $vehicleId", 3, $logDir . '/local-fares.log');
    } else {
        // Use 'sedan' as fallback for unmapped numeric IDs
        $oldId = $vehicleId;
        $vehicleId = 'sedan';
        error_log("[$timestamp] Unmapped numeric ID '$oldId' - using fallback vehicle_id: $vehicleId", 3, $logDir . '/local-fares.log');
    }
}

// If vehicleId is still empty, use a default value
if (empty($vehicleId) || $vehicleId === 'undefined') {
    $vehicleId = 'sedan';
    error_log("[$timestamp] Empty or undefined vehicle ID - using default: $vehicleId", 3, $logDir . '/local-fares.log');
}

// SECOND CHECK: Make sure we don't have any numeric ID at this point
if (is_numeric($vehicleId)) {
    $oldId = $vehicleId;
    $vehicleId = 'sedan'; // Default fallback
    error_log("[$timestamp] Still have numeric ID after processing: $oldId - using fallback: $vehicleId", 3, $logDir . '/local-fares.log');
}

// Normalize vehicle ID to lowercase to prevent duplicate vehicles with different cases
$vehicleId = strtolower($vehicleId);
error_log("[$timestamp] Normalized vehicle ID to lowercase: $vehicleId", 3, $logDir . '/local-fares.log');

// Extract pricing data with multiple fallbacks
$package4hr = 0;
foreach (['package4hr40km', 'price4hrs40km', 'price4hr40km', 'hr4km40Price', 'local_package_4hr', 'price_4hr_40km', 'price_4hrs_40km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package4hr = floatval($data[$field]);
        break;
    }
}

$package8hr = 0;
foreach (['package8hr80km', 'price8hrs80km', 'price8hr80km', 'hr8km80Price', 'local_package_8hr', 'price_8hr_80km', 'price_8hrs_80km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package8hr = floatval($data[$field]);
        break;
    }
}

$package10hr = 0;
foreach (['package10hr100km', 'price10hrs100km', 'price10hr100km', 'hr10km100Price', 'local_package_10hr', 'price_10hr_100km', 'price_10hrs_100km'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $package10hr = floatval($data[$field]);
        break;
    }
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

// Also process packages JSON if provided
if (isset($data['packages'])) {
    $packages = $data['packages'];
    if (!is_array($packages)) {
        try {
            $packageData = json_decode($packages, true);
            if (is_array($packageData)) {
                if (isset($packageData['4hrs-40km']) && is_numeric($packageData['4hrs-40km'])) {
                    $package4hr = floatval($packageData['4hrs-40km']);
                }
                if (isset($packageData['8hrs-80km']) && is_numeric($packageData['8hrs-80km'])) {
                    $package8hr = floatval($packageData['8hrs-80km']);
                }
                if (isset($packageData['10hrs-100km']) && is_numeric($packageData['10hrs-100km'])) {
                    $package10hr = floatval($packageData['10hrs-100km']);
                }
            }
        } catch (Exception $e) {
            error_log("[$timestamp] Error parsing packages JSON: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        }
    } else if (is_array($packages)) {
        if (isset($packages['4hrs-40km']) && is_numeric($packages['4hrs-40km'])) {
            $package4hr = floatval($packages['4hrs-40km']);
        }
        if (isset($packages['8hrs-80km']) && is_numeric($packages['8hrs-80km'])) {
            $package8hr = floatval($packages['8hrs-80km']);
        }
        if (isset($packages['10hrs-100km']) && is_numeric($packages['10hrs-100km'])) {
            $package10hr = floatval($packages['10hrs-100km']);
        }
    }
}

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be';
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new mysqli($host, $username, $password, $dbname);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        return $conn;
    } catch (Exception $e) {
        global $timestamp, $logDir;
        error_log("[$timestamp] DB Connection Error: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
        throw $e;
    }
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    // CRITICAL FIX: First verify the vehicle exists
    // Check if vehicle exists in the database, case insensitive lookup
    $checkVehicleQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?) LIMIT 1";
    $checkStmt = $conn->prepare($checkVehicleQuery);
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        // Vehicle exists - get the exact vehicle_id from database to maintain case consistency
        $existingVehicle = $result->fetch_assoc();
        $vehicleId = $existingVehicle['vehicle_id']; // Use the exact existing ID from database
        error_log("[$timestamp] Using existing vehicle: " . json_encode($existingVehicle), 3, $logDir . '/local-fares.log');
    } else {
        // Vehicle doesn't exist - only create it if it's a known standard vehicle type
        $standardTypes = ['sedan', 'ertiga', 'innova', 'crysta', 'tempo', 'traveller', 'bus', 'luxury', 'etios', 'suv', 'van', 'urbania', 'mpv'];
        $vehicleIdLower = strtolower($vehicleId);
        
        $isStandardType = false;
        foreach ($standardTypes as $type) {
            if ($vehicleIdLower === strtolower($type)) {
                $isStandardType = true;
                // Use the standard casing
                $vehicleId = $type;
                break;
            }
        }
        
        if ($isStandardType) {
            // Create the vehicle with proper naming
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            
            $insertVehicleQuery = "
                INSERT INTO vehicles (vehicle_id, name, is_active, created_at, updated_at)
                VALUES (?, ?, 1, NOW(), NOW())
            ";
            
            $insertStmt = $conn->prepare($insertVehicleQuery);
            $insertStmt->bind_param("ss", $vehicleId, $vehicleName);
            $insertStmt->execute();
            
            error_log("[$timestamp] Created new standard vehicle: $vehicleId", 3, $logDir . '/local-fares.log');
        } else {
            // Not a standard vehicle type - reject it
            error_log("[$timestamp] REJECTED: Non-standard vehicle type: $vehicleId", 3, $logDir . '/local-fares.log');
            echo json_encode([
                'status' => 'error',
                'message' => "Cannot use non-standard vehicle ID '$vehicleId'. Please use a standard type like 'sedan', 'ertiga', etc."
            ]);
            exit;
        }
    }
    
    // Check if local_package_fares table exists
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($checkTableResult->num_rows == 0) {
        // Create table
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hr_40km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_8hr_80km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_10hr_100km` decimal(10,2) NOT NULL DEFAULT 0,
                `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0,
                `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $conn->query($createTableQuery);
        error_log("[$timestamp] Created local_package_fares table", 3, $logDir . '/local-fares.log');
    }
    
    // Dynamic column name handling - check which column naming convention exists
    $price4hrColumn = columnExists($conn, 'local_package_fares', 'price_4hr_40km') ? 
                      'price_4hr_40km' : 'price_4hrs_40km';
    
    $price8hrColumn = columnExists($conn, 'local_package_fares', 'price_8hr_80km') ? 
                      'price_8hr_80km' : 'price_8hrs_80km';
    
    $price10hrColumn = columnExists($conn, 'local_package_fares', 'price_10hr_100km') ? 
                       'price_10hr_100km' : 'price_10hrs_100km';
    
    // If columns with 'hrs' exist but not 'hr', add the 'hr' versions
    if ($price4hrColumn === 'price_4hrs_40km' && !columnExists($conn, 'local_package_fares', 'price_4hr_40km')) {
        $conn->query("ALTER TABLE local_package_fares ADD `price_4hr_40km` decimal(10,2) NOT NULL DEFAULT 0");
        error_log("[$timestamp] Added column price_4hr_40km for compatibility", 3, $logDir . '/local-fares.log');
    }
    
    if ($price8hrColumn === 'price_8hrs_80km' && !columnExists($conn, 'local_package_fares', 'price_8hr_80km')) {
        $conn->query("ALTER TABLE local_package_fares ADD `price_8hr_80km` decimal(10,2) NOT NULL DEFAULT 0");
        error_log("[$timestamp] Added column price_8hr_80km for compatibility", 3, $logDir . '/local-fares.log');
    }
    
    if ($price10hrColumn === 'price_10hrs_100km' && !columnExists($conn, 'local_package_fares', 'price_10hr_100km')) {
        $conn->query("ALTER TABLE local_package_fares ADD `price_10hr_100km` decimal(10,2) NOT NULL DEFAULT 0");
        error_log("[$timestamp] Added column price_10hr_100km for compatibility", 3, $logDir . '/local-fares.log');
    }
    
    // Check if fare record exists for this vehicle
    $checkFareQuery = "SELECT id FROM local_package_fares WHERE LOWER(vehicle_id) = LOWER(?)";
    $checkFareStmt = $conn->prepare($checkFareQuery);
    $checkFareStmt->bind_param("s", $vehicleId);
    $checkFareStmt->execute();
    $fareResult = $checkFareStmt->get_result();
    
    if ($fareResult->num_rows > 0) {
        // Dynamic column update using prepared statement
        $updateQuery = "
            UPDATE local_package_fares
            SET `$price4hrColumn` = ?,
                `$price8hrColumn` = ?,
                `$price10hrColumn` = ?,
                extra_km_rate = ?,
                extra_hour_rate = ?,
                updated_at = NOW()
            WHERE LOWER(vehicle_id) = LOWER(?)
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param("ddddds", 
            $package4hr,
            $package8hr,
            $package10hr,
            $extraKmRate,
            $extraHourRate,
            $vehicleId
        );
        
        $updateStmt->execute();
        error_log("[$timestamp] Updated local package fares for vehicle: $vehicleId", 3, $logDir . '/local-fares.log');
        
        // Also update the hr version columns if hrs versions were used
        if ($price4hrColumn === 'price_4hrs_40km') {
            $conn->query("UPDATE local_package_fares SET price_4hr_40km = $package4hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
        
        if ($price8hrColumn === 'price_8hrs_80km') {
            $conn->query("UPDATE local_package_fares SET price_8hr_80km = $package8hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
        
        if ($price10hrColumn === 'price_10hrs_100km') {
            $conn->query("UPDATE local_package_fares SET price_10hr_100km = $package10hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
    } else {
        // Insert new record - always use the standard 'hr' column names
        $insertQuery = "
            INSERT INTO local_package_fares 
            (vehicle_id, price_4hr_40km, price_8hr_80km, price_10hr_100km, extra_km_rate, extra_hour_rate)
            VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param("sddddd", 
            $vehicleId,
            $package4hr,
            $package8hr,
            $package10hr,
            $extraKmRate,
            $extraHourRate
        );
        
        $insertStmt->execute();
        error_log("[$timestamp] Inserted local package fares for vehicle: $vehicleId", 3, $logDir . '/local-fares.log');
        
        // Also add values to 'hrs' columns if they exist
        if (columnExists($conn, 'local_package_fares', 'price_4hrs_40km')) {
            $conn->query("UPDATE local_package_fares SET price_4hrs_40km = $package4hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
        
        if (columnExists($conn, 'local_package_fares', 'price_8hrs_80km')) {
            $conn->query("UPDATE local_package_fares SET price_8hrs_80km = $package8hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
        
        if (columnExists($conn, 'local_package_fares', 'price_10hrs_100km')) {
            $conn->query("UPDATE local_package_fares SET price_10hrs_100km = $package10hr WHERE LOWER(vehicle_id) = LOWER('$vehicleId')");
        }
    }
    
    // Also update vehicle_pricing table for backward compatibility 
    $checkPricingTableResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($checkPricingTableResult->num_rows > 0) {
        // Check if pricing exists for this vehicle
        $checkPricingQuery = "SELECT id FROM vehicle_pricing WHERE LOWER(vehicle_id) = LOWER(?) AND trip_type = 'local'";
        $checkPricingStmt = $conn->prepare($checkPricingQuery);
        $checkPricingStmt->bind_param("s", $vehicleId);
        $checkPricingStmt->execute();
        $pricingResult = $checkPricingStmt->get_result();
        
        if ($pricingResult->num_rows > 0) {
            // Update existing record
            $updatePricingQuery = "
                UPDATE vehicle_pricing
                SET local_package_4hr = ?,
                    local_package_8hr = ?,
                    local_package_10hr = ?,
                    extra_km_charge = ?,
                    extra_hour_charge = ?,
                    updated_at = NOW()
                WHERE LOWER(vehicle_id) = LOWER(?) AND trip_type = 'local'
            ";
            
            $updatePricingStmt = $conn->prepare($updatePricingQuery);
            $updatePricingStmt->bind_param("ddddds", 
                $package4hr,
                $package8hr,
                $package10hr,
                $extraKmRate,
                $extraHourRate,
                $vehicleId
            );
            
            $updatePricingStmt->execute();
            error_log("[$timestamp] Updated vehicle_pricing table for backward compatibility", 3, $logDir . '/local-fares.log');
        } else {
            // Insert new record
            $insertPricingQuery = "
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge)
                VALUES (?, 'local', ?, ?, ?, ?, ?)
            ";
            
            $insertPricingStmt = $conn->prepare($insertPricingQuery);
            $insertPricingStmt->bind_param("sddddd", 
                $vehicleId,
                $package4hr,
                $package8hr,
                $package10hr,
                $extraKmRate,
                $extraHourRate
            );
            
            $insertPricingStmt->execute();
            error_log("[$timestamp] Inserted into vehicle_pricing table for backward compatibility", 3, $logDir . '/local-fares.log');
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Local package fares updated for $vehicleId",
        'data' => [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'originalId' => $originalVehicleId,
            'price4hr40km' => $package4hr,
            'price8hr80km' => $package8hr,
            'price10hr100km' => $package10hr,
            'priceExtraKm' => $extraKmRate,
            'priceExtraHour' => $extraHourRate,
            'columnNames' => [
                'price4hr' => $price4hrColumn,
                'price8hr' => $price8hrColumn,
                'price10hr' => $price10hrColumn
            ]
        ],
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("[$timestamp] ERROR: " . $e->getMessage(), 3, $logDir . '/local-fares.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => "Database error: " . $e->getMessage(),
        'vehicleId' => $vehicleId,
        'timestamp' => time()
    ]);
}
