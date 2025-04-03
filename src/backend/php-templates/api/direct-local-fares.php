
<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable verbose error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-local-fares.log');
}

// Log basic request information
logMessage("Request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);
logMessage("Raw input: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response data
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'debug' => []
];

// ENHANCED: More comprehensive ID mapping with all known numeric IDs
$numericIdMapExtended = [
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

// Process the initialize=true parameter for table creation
$initialize = isset($_GET['initialize']) && $_GET['initialize'] === 'true';
if ($initialize) {
    logMessage("Initialize mode activated");
    $response['debug'][] = "Initialize mode activated";
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../config.php')) {
        require_once dirname(__FILE__) . '/../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
        $response['debug'][] = "Connected via config.php";
    } 
    // Fallback to hardcoded credentials if config doesn't exist or failed
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
    
    // Return error response
    echo json_encode($response);
    exit;
}

// Check if tables exist or create them in initialize mode
try {
    // Check if local_package_fares table exists
    $localPackageTableExists = false;
    $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $localPackageTableExists = ($result && $result->num_rows > 0);
    
    // Create local_package_fares table if it doesn't exist or initialize mode is active
    if (!$localPackageTableExists || $initialize) {
        logMessage("Creating local_package_fares table");
        $createLocalPackageTableSql = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `vehicle_id` VARCHAR(50) NOT NULL,
                `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createLocalPackageTableSql)) {
            throw new Exception("Error creating local_package_fares table: " . $conn->error);
        }
        
        $response['debug'][] = "local_package_fares table created or verified";
        logMessage("local_package_fares table created or verified");
    }
    
    // Check if vehicle_pricing table exists
    $vehiclePricingTableExists = false;
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $vehiclePricingTableExists = ($result && $result->num_rows > 0);
    
    // Create vehicle_pricing table if it doesn't exist or initialize mode is active
    if (!$vehiclePricingTableExists || $initialize) {
        logMessage("Creating vehicle_pricing table");
        $createVehiclePricingTableSql = "
            CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `vehicle_id` VARCHAR(50) NOT NULL,
                `trip_type` VARCHAR(20) NOT NULL DEFAULT 'local',
                `local_package_4hr` DECIMAL(10,2) DEFAULT 0,
                `local_package_8hr` DECIMAL(10,2) DEFAULT 0,
                `local_package_10hr` DECIMAL(10,2) DEFAULT 0,
                `extra_km_charge` DECIMAL(5,2) DEFAULT 0,
                `extra_hour_charge` DECIMAL(5,2) DEFAULT 0,
                `base_fare` DECIMAL(10,2) DEFAULT 0,
                `price_per_km` DECIMAL(5,2) DEFAULT 0,
                `night_halt_charge` DECIMAL(10,2) DEFAULT 0,
                `driver_allowance` DECIMAL(10,2) DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `vehicle_trip_type` (`vehicle_id`, `trip_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createVehiclePricingTableSql)) {
            throw new Exception("Error creating vehicle_pricing table: " . $conn->error);
        }
        
        $response['debug'][] = "vehicle_pricing table created or verified";
        logMessage("vehicle_pricing table created or verified");
    }
    
    // If this is just an initialization request, return success now
    if ($initialize && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $response['status'] = 'success';
        $response['message'] = 'Database tables initialized successfully';
        echo json_encode($response);
        exit;
    }
    
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Error initializing tables: ' . $e->getMessage();
    $response['debug'][] = $e->getMessage();
    logMessage("Error initializing tables: " . $e->getMessage());
    
    // Return error response
    echo json_encode($response);
    exit;
}

// If it's a GET request but not initialize, return list of fares
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$initialize) {
    try {
        // Query against local_package_fares, not vehicle_pricing to avoid the column issue
        $query = "SELECT * FROM local_package_fares";
        $result = $conn->query($query);
        
        $fares = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $fares[] = $row;
            }
        }
        
        $response['status'] = 'success';
        $response['message'] = 'Local package fares retrieved successfully';
        $response['fares'] = $fares;
        $response['count'] = count($fares);
        
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Error retrieving fares: ' . $e->getMessage();
        echo json_encode($response);
        exit;
    }
}

// For POST requests - updating fares
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get raw POST data
        $rawData = file_get_contents('php://input');
        $postData = [];
        
        // Try to parse as JSON
        $jsonData = json_decode($rawData, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $postData = $jsonData;
            logMessage("Parsed input as JSON data");
        } 
        // Fallback to POST data
        else if (!empty($_POST)) {
            $postData = $_POST;
            logMessage("Using standard POST data");
        }
        // Try to parse as URL-encoded
        else {
            parse_str($rawData, $parsedData);
            if (!empty($parsedData)) {
                $postData = $parsedData;
                logMessage("Parsed input as URL-encoded data");
            }
        }
        
        // Log received data for debugging
        logMessage("Processed input data: " . print_r($postData, true));
        
        // Extract vehicle ID with fallbacks for different naming conventions
        $vehicleId = null;
        $possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id', 'cabType', 'cab_type', 'vehicle_type', 'vehicleType'];
        
        foreach ($possibleVehicleIdFields as $field) {
            if (isset($postData[$field]) && !empty($postData[$field])) {
                $vehicleId = $postData[$field];
                logMessage("Found vehicle ID in field '$field': $vehicleId");
                break;
            }
        }
        
        // If we still don't have a vehicle ID, check nested objects
        if (!$vehicleId && isset($postData['vehicle']) && is_array($postData['vehicle'])) {
            foreach ($possibleVehicleIdFields as $field) {
                if (isset($postData['vehicle'][$field]) && !empty($postData['vehicle'][$field])) {
                    $vehicleId = $postData['vehicle'][$field];
                    logMessage("Found vehicle ID in nested field 'vehicle.$field': $vehicleId");
                    break;
                }
            }
        }
        
        // Clean up vehicle ID (remove potential item- prefix)
        if (is_string($vehicleId) && strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            logMessage("Cleaned vehicle ID by removing 'item-' prefix: $vehicleId");
        }

        // CRITICAL: Validate vehicle ID
        if (empty($vehicleId)) {
            $response['status'] = 'error';
            $response['message'] = 'Vehicle ID is required';
            echo json_encode($response);
            exit;
        }

        // CRITICAL: Block numeric vehicle IDs that are not in our mapping
        $originalVehicleId = $vehicleId;
        if (is_numeric($vehicleId)) {
            logMessage("WARNING: Received numeric vehicle ID: $vehicleId");
            
            // Only allow specific mapped numeric IDs
            if (isset($numericIdMapExtended[$vehicleId])) {
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped numeric ID $originalVehicleId to standard vehicle ID: $vehicleId");
                $response['debug'][] = "Mapped numeric ID $originalVehicleId to $vehicleId";
            } else {
                // BLOCK ALL other numeric IDs
                $response['status'] = 'error';
                $response['message'] = "Invalid numeric vehicle ID: $originalVehicleId. Please use standard vehicle names.";
                $response['validOptions'] = array_values(array_unique(array_values($numericIdMapExtended)));
                
                logMessage("BLOCKED unmapped numeric ID: $originalVehicleId");
                echo json_encode($response);
                exit;
            }
        }

        // Normalize vehicle ID (lowercase, replace spaces with underscores)
        $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
        logMessage("Normalized vehicle ID: $vehicleId");
        
        // Define standard vehicle IDs - ALL LOWERCASE for case-insensitive comparison
        $standardVehicles = [
            'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 'tempo', 
            'traveller', 'etios', 'mpv', 'hycross', 'urbania', 'suv'
        ];
        
        // Check if the normalized ID is a standard vehicle type
        $isStandardVehicle = in_array($vehicleId, $standardVehicles);
        
        if (!$isStandardVehicle) {
            // Map common variations
            if ($vehicleId == 'mpv' || $vehicleId == 'innova_hycross' || $vehicleId == 'hycross') {
                $vehicleId = 'innova_crysta';
                $isStandardVehicle = true;
                logMessage("Mapped variation to standard vehicle: $vehicleId");
            } else if ($vehicleId == 'dzire' || $vehicleId == 'swift') {
                $vehicleId = 'sedan';
                $isStandardVehicle = true;
                logMessage("Mapped variation to standard vehicle: $vehicleId");
            }
            
            // If it's still not a standard vehicle, reject it
            if (!$isStandardVehicle) {
                $response['status'] = 'error';
                $response['message'] = "Invalid vehicle type: $originalVehicleId. Please use standard vehicle names.";
                $response['validOptions'] = $standardVehicles;
                
                logMessage("REJECTED non-standard vehicle type: $originalVehicleId -> $vehicleId");
                echo json_encode($response);
                exit;
            }
        }
        
        // CRITICAL: Check if vehicle exists in vehicles table before updating fares
        $checkVehicleQuery = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkVehicleQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $row = $checkResult->fetch_assoc();
        
        if ($row['count'] == 0) {
            // Vehicle doesn't exist - try case-insensitive search
            $checkCaseQuery = "SELECT vehicle_id FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?)";
            $checkCaseStmt = $conn->prepare($checkCaseQuery);
            $checkCaseStmt->bind_param('s', $vehicleId);
            $checkCaseStmt->execute();
            $caseResult = $checkCaseStmt->get_result();
            
            if ($caseResult->num_rows > 0) {
                $caseRow = $caseResult->fetch_assoc();
                $vehicleId = $caseRow['vehicle_id']; // Use existing case from database
                logMessage("Found vehicle with case-insensitive match: $vehicleId");
            } else {
                // Vehicle doesn't exist and no case-insensitive match - REJECT
                $response['status'] = 'error';
                $response['message'] = "Vehicle '$vehicleId' does not exist. Please create it first.";
                $response['vehicleExists'] = false;
                $response['originalId'] = $originalVehicleId;
                
                logMessage("REJECTED: Vehicle does not exist: $vehicleId");
                echo json_encode($response);
                exit;
            }
        }

        // Extract pricing data with fallbacks for different field naming conventions
        $price4hrs40km = 0;
        $possibleFields4hr = [
            'price4hrs40km', 'price_4hrs_40km', 'price_4hr_40km', '4hrPrice', '4hr40kmPrice', 
            'package4hr40km', 'local_package_4hr', '4hrs-40km'
        ];
        
        foreach ($possibleFields4hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price4hrs40km = floatval($postData[$field]);
                logMessage("Found 4hr price in field '$field': $price4hrs40km");
                break;
            }
        }
        
        // Check in packages object (typical in React clients)
        if ($price4hrs40km == 0 && isset($postData['packages'])) {
            $packages = $postData['packages'];
            if (is_string($packages)) {
                $packages = json_decode($packages, true);
            }
            
            if (is_array($packages)) {
                if (isset($packages['4hrs-40km']) && is_numeric($packages['4hrs-40km'])) {
                    $price4hrs40km = floatval($packages['4hrs-40km']);
                    logMessage("Found 4hr price in packages['4hrs-40km']: $price4hrs40km");
                }
            }
        }
        
        // Similarly extract 8hr and 10hr package prices
        $price8hrs80km = 0;
        $possibleFields8hr = [
            'price8hrs80km', 'price_8hrs_80km', 'price_8hr_80km', '8hrPrice', '8hr80kmPrice', 
            'package8hr80km', 'local_package_8hr', '8hrs-80km'
        ];
        
        foreach ($possibleFields8hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price8hrs80km = floatval($postData[$field]);
                logMessage("Found 8hr price in field '$field': $price8hrs80km");
                break;
            }
        }
        
        // Check in packages object
        if ($price8hrs80km == 0 && isset($postData['packages'])) {
            $packages = $postData['packages'];
            if (is_string($packages)) {
                $packages = json_decode($packages, true);
            }
            
            if (is_array($packages)) {
                if (isset($packages['8hrs-80km']) && is_numeric($packages['8hrs-80km'])) {
                    $price8hrs80km = floatval($packages['8hrs-80km']);
                    logMessage("Found 8hr price in packages['8hrs-80km']: $price8hrs80km");
                }
            }
        }
        
        // Extract 10hr package prices
        $price10hrs100km = 0;
        $possibleFields10hr = [
            'price10hrs100km', 'price_10hrs_100km', 'price_10hr_100km', '10hrPrice', '10hr100kmPrice', 
            'package10hr100km', 'local_package_10hr', '10hrs-100km'
        ];
        
        foreach ($possibleFields10hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price10hrs100km = floatval($postData[$field]);
                logMessage("Found 10hr price in field '$field': $price10hrs100km");
                break;
            }
        }
        
        // Check in packages object
        if ($price10hrs100km == 0 && isset($postData['packages'])) {
            $packages = $postData['packages'];
            if (is_string($packages)) {
                $packages = json_decode($packages, true);
            }
            
            if (is_array($packages)) {
                if (isset($packages['10hrs-100km']) && is_numeric($packages['10hrs-100km'])) {
                    $price10hrs100km = floatval($packages['10hrs-100km']);
                    logMessage("Found 10hr price in packages['10hrs-100km']: $price10hrs100km");
                }
            }
        }
        
        // Extract extra rates with various field name conventions
        $extraKmRate = 0;
        $possibleExtraKmFields = [
            'extraKmRate', 'extra_km_rate', 'price_extra_km', 'extra_km_charge'
        ];
        
        foreach ($possibleExtraKmFields as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $extraKmRate = floatval($postData[$field]);
                logMessage("Found extra KM rate in field '$field': $extraKmRate");
                break;
            }
        }
        
        $extraHourRate = 0;
        $possibleExtraHourFields = [
            'extraHourRate', 'extra_hour_rate', 'price_extra_hour', 'extra_hour_charge'
        ];
        
        foreach ($possibleExtraHourFields as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $extraHourRate = floatval($postData[$field]);
                logMessage("Found extra hour rate in field '$field': $extraHourRate");
                break;
            }
        }
        
        // Set reasonable defaults if values are still zero
        if ($price4hrs40km <= 0) $price4hrs40km = 1200;
        if ($price8hrs80km <= 0) $price8hrs80km = 2200;
        if ($price10hrs100km <= 0) $price10hrs100km = 2800;
        if ($extraKmRate <= 0) $extraKmRate = 14;
        if ($extraHourRate <= 0) $extraHourRate = 150;
        
        // Begin transaction
        $conn->begin_transaction();
        
        try {
            // First update the local_package_fares table
            $upsertLocalSql = "
                INSERT INTO local_package_fares (
                    vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                    price_extra_km, price_extra_hour, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    price_4hrs_40km = VALUES(price_4hrs_40km),
                    price_8hrs_80km = VALUES(price_8hrs_80km),
                    price_10hrs_100km = VALUES(price_10hrs_100km),
                    price_extra_km = VALUES(price_extra_km),
                    price_extra_hour = VALUES(price_extra_hour),
                    updated_at = NOW()
            ";
            
            $upsertStmt = $conn->prepare($upsertLocalSql);
            $upsertStmt->bind_param(
                "sddddd", 
                $vehicleId, 
                $price4hrs40km, 
                $price8hrs80km, 
                $price10hrs100km, 
                $extraKmRate, 
                $extraHourRate
            );
            
            if (!$upsertStmt->execute()) {
                throw new Exception("Failed to update local_package_fares table: " . $conn->error);
            }
            
            logMessage("Updated local_package_fares for vehicle: $vehicleId");
            
            // Also update the vehicle_pricing table for backward compatibility
            $checkVehiclePricingQuery = "
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local'
            ";
            
            $checkStmt = $conn->prepare($checkVehiclePricingQuery);
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateQuery = "
                    UPDATE vehicle_pricing SET
                        local_package_4hr = ?,
                        local_package_8hr = ?,
                        local_package_10hr = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ? AND trip_type = 'local'
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bind_param(
                    "ddddds", 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $extraKmRate, 
                    $extraHourRate, 
                    $vehicleId
                );
                
                if (!$updateStmt->execute()) {
                    throw new Exception("Failed to update vehicle_pricing table: " . $conn->error);
                }
                
                logMessage("Updated existing record in vehicle_pricing table");
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr,
                        extra_km_charge, extra_hour_charge, updated_at
                    ) VALUES (?, 'local', ?, ?, ?, ?, ?, NOW())
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param(
                    "sddddd", 
                    $vehicleId, 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $extraKmRate, 
                    $extraHourRate
                );
                
                if (!$insertStmt->execute()) {
                    throw new Exception("Failed to insert into vehicle_pricing table: " . $conn->error);
                }
                
                logMessage("Inserted new record into vehicle_pricing table");
            }
            
            // Clear any fare cache files
            $cacheDir = dirname(__FILE__) . '/../cache';
            if (file_exists($cacheDir)) {
                $cacheFiles = glob($cacheDir . '/fares_*.json');
                foreach ($cacheFiles as $file) {
                    @unlink($file);
                    logMessage("Cleared fare cache: " . basename($file));
                }
            }
            
            // Commit all changes
            $conn->commit();
            
            // Return success response
            $response['status'] = 'success';
            $response['message'] = 'Local package fares updated successfully';
            $response['vehicleId'] = $vehicleId;
            $response['normalizedId'] = $vehicleId;
            $response['originalId'] = $originalVehicleId;
            $response['timestamp'] = time();
            
        } catch (Exception $e) {
            // Rollback transaction on error
            $conn->rollback();
            throw $e; // Re-throw to be caught by outer try-catch
        }
        
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Error updating fares: ' . $e->getMessage();
        logMessage("Error: " . $e->getMessage());
    }
    
    echo json_encode($response);
    exit;
}

// If we get here, it's an unsupported request
$response['message'] = 'Unsupported request method';
echo json_encode($response);
