
<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
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
                `vehicle_type` VARCHAR(50) NOT NULL,
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
                UNIQUE KEY `vehicle_trip_type` (`vehicle_type`, `trip_type`)
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
        
        // Extract pricing data with fallbacks for different field naming conventions
        $price4hrs40km = 0;
        $possibleFields4hr = [
            'price4hrs40km', 'price_4hrs_40km', '4hrPrice', '4hr40kmPrice', 
            'package4hr40km', 'local_package_4hr', '4hrs-40km'
        ];
        
        foreach ($possibleFields4hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price4hrs40km = floatval($postData[$field]);
                logMessage("Found 4hr price in field '$field': $price4hrs40km");
                break;
            }
        }
        
        // Check in packages or fares object (typical in React clients)
        if ($price4hrs40km == 0 && isset($postData['packages'])) {
            $packages = $postData['packages'];
            if (isset($packages['4hrs-40km']) && is_numeric($packages['4hrs-40km'])) {
                $price4hrs40km = floatval($packages['4hrs-40km']);
                logMessage("Found 4hr price in packages['4hrs-40km']: $price4hrs40km");
            }
        }
        
        if ($price4hrs40km == 0 && isset($postData['fares'])) {
            $fares = $postData['fares'];
            if (isset($fares['4hrs-40km']) && is_numeric($fares['4hrs-40km'])) {
                $price4hrs40km = floatval($fares['4hrs-40km']);
                logMessage("Found 4hr price in fares['4hrs-40km']: $price4hrs40km");
            }
        }
        
        // Similarly extract 8hr and 10hr package prices
        $price8hrs80km = 0;
        $possibleFields8hr = [
            'price8hrs80km', 'price_8hrs_80km', '8hrPrice', '8hr80kmPrice', 
            'package8hr80km', 'local_package_8hr', '8hrs-80km'
        ];
        
        foreach ($possibleFields8hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price8hrs80km = floatval($postData[$field]);
                logMessage("Found 8hr price in field '$field': $price8hrs80km");
                break;
            }
        }
        
        if ($price8hrs80km == 0 && isset($postData['packages'])) {
            if (isset($postData['packages']['8hrs-80km']) && is_numeric($postData['packages']['8hrs-80km'])) {
                $price8hrs80km = floatval($postData['packages']['8hrs-80km']);
                logMessage("Found 8hr price in packages['8hrs-80km']: $price8hrs80km");
            }
        }
        
        if ($price8hrs80km == 0 && isset($postData['fares'])) {
            if (isset($postData['fares']['8hrs-80km']) && is_numeric($postData['fares']['8hrs-80km'])) {
                $price8hrs80km = floatval($postData['fares']['8hrs-80km']);
                logMessage("Found 8hr price in fares['8hrs-80km']: $price8hrs80km");
            }
        }
        
        $price10hrs100km = 0;
        $possibleFields10hr = [
            'price10hrs100km', 'price_10hrs_100km', '10hrPrice', '10hr100kmPrice', 
            'package10hr100km', 'local_package_10hr', '10hrs-100km'
        ];
        
        foreach ($possibleFields10hr as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $price10hrs100km = floatval($postData[$field]);
                logMessage("Found 10hr price in field '$field': $price10hrs100km");
                break;
            }
        }
        
        if ($price10hrs100km == 0 && isset($postData['packages'])) {
            if (isset($postData['packages']['10hrs-100km']) && is_numeric($postData['packages']['10hrs-100km'])) {
                $price10hrs100km = floatval($postData['packages']['10hrs-100km']);
                logMessage("Found 10hr price in packages['10hrs-100km']: $price10hrs100km");
            }
        }
        
        if ($price10hrs100km == 0 && isset($postData['fares'])) {
            if (isset($postData['fares']['10hrs-100km']) && is_numeric($postData['fares']['10hrs-100km'])) {
                $price10hrs100km = floatval($postData['fares']['10hrs-100km']);
                logMessage("Found 10hr price in fares['10hrs-100km']: $price10hrs100km");
            }
        }
        
        // Extract extra km and hour rates
        $priceExtraKm = 0;
        $possibleFieldsExtraKm = [
            'priceExtraKm', 'price_extra_km', 'extraKmRate', 'extraKmPrice', 
            'extra_km_charge', 'extra-km'
        ];
        
        foreach ($possibleFieldsExtraKm as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $priceExtraKm = floatval($postData[$field]);
                logMessage("Found extra km price in field '$field': $priceExtraKm");
                break;
            }
        }
        
        if ($priceExtraKm == 0 && isset($postData['packages']) && isset($postData['packages']['extra-km']) && is_numeric($postData['packages']['extra-km'])) {
            $priceExtraKm = floatval($postData['packages']['extra-km']);
            logMessage("Found extra km price in packages['extra-km']: $priceExtraKm");
        }
        
        if ($priceExtraKm == 0 && isset($postData['fares']) && isset($postData['fares']['extra-km']) && is_numeric($postData['fares']['extra-km'])) {
            $priceExtraKm = floatval($postData['fares']['extra-km']);
            logMessage("Found extra km price in fares['extra-km']: $priceExtraKm");
        }
        
        $priceExtraHour = 0;
        $possibleFieldsExtraHour = [
            'priceExtraHour', 'price_extra_hour', 'extraHourRate', 'extraHourPrice', 
            'extra_hour_charge', 'extra-hour'
        ];
        
        foreach ($possibleFieldsExtraHour as $field) {
            if (isset($postData[$field]) && is_numeric($postData[$field])) {
                $priceExtraHour = floatval($postData[$field]);
                logMessage("Found extra hour price in field '$field': $priceExtraHour");
                break;
            }
        }
        
        if ($priceExtraHour == 0 && isset($postData['packages']) && isset($postData['packages']['extra-hour']) && is_numeric($postData['packages']['extra-hour'])) {
            $priceExtraHour = floatval($postData['packages']['extra-hour']);
            logMessage("Found extra hour price in packages['extra-hour']: $priceExtraHour");
        }
        
        if ($priceExtraHour == 0 && isset($postData['fares']) && isset($postData['fares']['extra-hour']) && is_numeric($postData['fares']['extra-hour'])) {
            $priceExtraHour = floatval($postData['fares']['extra-hour']);
            logMessage("Found extra hour price in fares['extra-hour']: $priceExtraHour");
        }
        
        // Validate vehicle ID
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Make sure at least one of the package prices is set
        if ($price4hrs40km <= 0 && $price8hrs80km <= 0 && $price10hrs100km <= 0) {
            throw new Exception("At least one package price must be provided");
        }
        
        // Calculate missing prices if only one is provided
        if ($price8hrs80km > 0) {
            if ($price4hrs40km <= 0) {
                $price4hrs40km = round($price8hrs80km * 0.6); // 4hr package is typically 60% of 8hr
                logMessage("Calculated 4hr price as 60% of 8hr price: $price4hrs40km");
            }
            if ($price10hrs100km <= 0) {
                $price10hrs100km = round($price8hrs80km * 1.2); // 10hr package is typically 120% of 8hr
                logMessage("Calculated 10hr price as 120% of 8hr price: $price10hrs100km");
            }
        } else if ($price4hrs40km > 0) {
            $price8hrs80km = round($price4hrs40km / 0.6); // Calculate 8hr from 4hr
            logMessage("Calculated 8hr price from 4hr price: $price8hrs80km");
            $price10hrs100km = round($price8hrs80km * 1.2); // 10hr is 120% of 8hr
            logMessage("Calculated 10hr price as 120% of calculated 8hr price: $price10hrs100km");
        } else if ($price10hrs100km > 0) {
            $price8hrs80km = round($price10hrs100km / 1.2); // Calculate 8hr from 10hr
            logMessage("Calculated 8hr price from 10hr price: $price8hrs80km");
            $price4hrs40km = round($price8hrs80km * 0.6); // 4hr is 60% of 8hr
            logMessage("Calculated 4hr price as 60% of calculated 8hr price: $price4hrs40km");
        }
        
        // Determine appropriate extra rates based on vehicle type if not provided
        if ($priceExtraKm <= 0) {
            $vehicleIdLower = strtolower($vehicleId);
            if (strpos($vehicleIdLower, 'sedan') !== false || 
                strpos($vehicleIdLower, 'swift') !== false || 
                strpos($vehicleIdLower, 'dzire') !== false ||
                strpos($vehicleIdLower, 'etios') !== false) {
                $priceExtraKm = 14;
            } else if (strpos($vehicleIdLower, 'ertiga') !== false) {
                $priceExtraKm = 18;
            } else if (strpos($vehicleIdLower, 'innova') !== false) {
                $priceExtraKm = 20;
            } else if (strpos($vehicleIdLower, 'tempo') !== false) {
                $priceExtraKm = 22;
            } else if (strpos($vehicleIdLower, 'luxury') !== false) {
                $priceExtraKm = 25;
            } else {
                $priceExtraKm = 15; // Default
            }
            logMessage("Set default extra km price based on vehicle type: $priceExtraKm");
        }
        
        if ($priceExtraHour <= 0) {
            $vehicleIdLower = strtolower($vehicleId);
            if (strpos($vehicleIdLower, 'sedan') !== false || 
                strpos($vehicleIdLower, 'swift') !== false || 
                strpos($vehicleIdLower, 'dzire') !== false ||
                strpos($vehicleIdLower, 'etios') !== false) {
                $priceExtraHour = 250;
            } else if (strpos($vehicleIdLower, 'ertiga') !== false) {
                $priceExtraHour = 300;
            } else if (strpos($vehicleIdLower, 'innova') !== false) {
                $priceExtraHour = 350;
            } else if (strpos($vehicleIdLower, 'tempo') !== false) {
                $priceExtraHour = 400;
            } else if (strpos($vehicleIdLower, 'luxury') !== false) {
                $priceExtraHour = 450;
            } else {
                $priceExtraHour = 300; // Default
            }
            logMessage("Set default extra hour price based on vehicle type: $priceExtraHour");
        }
        
        // Update local_package_fares table
        $updatedLocalPackageFares = false;
        if ($localPackageTableExists) {
            // Check if vehicle exists
            $checkQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bind_param('s', $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing record
                $updateQuery = "
                    UPDATE local_package_fares 
                    SET price_4hrs_40km = ?,
                        price_8hrs_80km = ?,
                        price_10hrs_100km = ?,
                        price_extra_km = ?,
                        price_extra_hour = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bind_param('ddddds', 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $priceExtraKm, 
                    $priceExtraHour, 
                    $vehicleId
                );
                
                if ($updateStmt->execute()) {
                    $updatedLocalPackageFares = true;
                    logMessage("Updated existing record in local_package_fares for vehicle $vehicleId");
                } else {
                    logMessage("Error updating local_package_fares: " . $updateStmt->error);
                }
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO local_package_fares 
                    (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                    VALUES (?, ?, ?, ?, ?, ?)
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param('sddddd', 
                    $vehicleId, 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $priceExtraKm, 
                    $priceExtraHour
                );
                
                if ($insertStmt->execute()) {
                    $updatedLocalPackageFares = true;
                    logMessage("Inserted new record in local_package_fares for vehicle $vehicleId");
                } else {
                    logMessage("Error inserting into local_package_fares: " . $insertStmt->error);
                }
            }
        }
        
        // Update vehicle_pricing table for backward compatibility
        $updatedVehiclePricing = false;
        if ($vehiclePricingTableExists) {
            // Check if vehicle exists with trip_type 'local'
            $checkVpQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'local'";
            $checkVpStmt = $conn->prepare($checkVpQuery);
            $checkVpStmt->bind_param('s', $vehicleId);
            $checkVpStmt->execute();
            $checkVpResult = $checkVpStmt->get_result();
            
            if ($checkVpResult->num_rows > 0) {
                // Update existing record
                $updateVpQuery = "
                    UPDATE vehicle_pricing 
                    SET local_package_4hr = ?,
                        local_package_8hr = ?,
                        local_package_10hr = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_type = ? AND trip_type = 'local'
                ";
                
                $updateVpStmt = $conn->prepare($updateVpQuery);
                $updateVpStmt->bind_param('ddddds', 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $priceExtraKm, 
                    $priceExtraHour, 
                    $vehicleId
                );
                
                if ($updateVpStmt->execute()) {
                    $updatedVehiclePricing = true;
                    logMessage("Updated existing record in vehicle_pricing for vehicle $vehicleId");
                } else {
                    logMessage("Error updating vehicle_pricing: " . $updateVpStmt->error);
                }
            } else {
                // Insert new record
                $insertVpQuery = "
                    INSERT INTO vehicle_pricing 
                    (vehicle_type, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                     extra_km_charge, extra_hour_charge, base_fare, price_per_km)
                    VALUES (?, 'local', ?, ?, ?, ?, ?, 0, 0)
                ";
                
                $insertVpStmt = $conn->prepare($insertVpQuery);
                $insertVpStmt->bind_param('sddddd', 
                    $vehicleId, 
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $priceExtraKm, 
                    $priceExtraHour
                );
                
                if ($insertVpStmt->execute()) {
                    $updatedVehiclePricing = true;
                    logMessage("Inserted new record in vehicle_pricing for vehicle $vehicleId");
                } else {
                    logMessage("Error inserting into vehicle_pricing: " . $insertVpStmt->error);
                }
            }
        }
        
        // Prepare response
        if ($updatedLocalPackageFares || $updatedVehiclePricing) {
            $response['status'] = 'success';
            $response['message'] = 'Local fares updated successfully';
            $response['data'] = [
                'vehicle_id' => $vehicleId,
                'prices' => [
                    '4hrs_40km' => $price4hrs40km,
                    '8hrs_80km' => $price8hrs80km,
                    '10hrs_100km' => $price10hrs100km,
                    'extra_km' => $priceExtraKm,
                    'extra_hour' => $priceExtraHour
                ],
                'updated_tables' => [
                    'local_package_fares' => $updatedLocalPackageFares,
                    'vehicle_pricing' => $updatedVehiclePricing
                ]
            ];
            logMessage("Successfully updated fares for vehicle $vehicleId");
        } else {
            throw new Exception("Failed to update any records");
        }
        
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = $e->getMessage();
        logMessage("Error processing fare update: " . $e->getMessage());
    }
}

// Send the final response
echo json_encode($response);
