
<?php
/**
 * direct-local-fares.php - Direct endpoint for updating local package fares
 * Focused on properly handling vehicle IDs and preventing creation of ghost vehicles
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-API-Version');
header('Content-Type: application/json');

// Add additional headers for debugging
header('X-Debug-File: direct-local-fares.php');
header('X-API-Version: 1.0.1');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log all request details for debugging
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] REQUEST METHOD: " . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-local-fares.log');
error_log("[$timestamp] QUERY STRING: " . $_SERVER['QUERY_STRING'], 3, $logDir . '/direct-local-fares.log');
error_log("[$timestamp] REQUEST BODY: " . file_get_contents('php://input'), 3, $logDir . '/direct-local-fares.log');

// Get input data (support both POST and GET)
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Support both JSON and form data
if (empty($input) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = $_POST;
}

// Merge with GET parameters if any are provided
if (!empty($_GET)) {
    $input = array_merge((array)$input, $_GET);
}

// Log the parsed input for debugging
error_log("[$timestamp] PARSED INPUT: " . print_r($input, true), 3, $logDir . '/direct-local-fares.log');

// Database connection function
function getDbConnection() {
    try {
        global $logDir, $timestamp;
        
        $host = 'localhost';
        $dbname = 'u644605165_new_bookingdb';
        $username = 'u644605165_new_bookingusr';
        $password = 'Vizag@1213';
        
        // Log connection attempt
        error_log("[$timestamp] Attempting to connect to database: $host, $dbname, $username", 3, $logDir . '/direct-local-fares.log');
        
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        error_log("[$timestamp] Database connection successful", 3, $logDir . '/direct-local-fares.log');
        return $conn;
    } catch (Exception $e) {
        error_log("[$timestamp] Database connection error: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        throw $e; // Re-throw the exception to be caught by the caller
    }
}

// Function to normalize vehicle ID
function normalizeVehicleId($rawId) {
    global $logDir, $timestamp;
    
    if (empty($rawId)) {
        return null;
    }
    
    // Start with trimming
    $normalizedId = trim($rawId);
    
    // Remove "item-" prefix if present
    if (strpos($normalizedId, 'item-') === 0) {
        $normalizedId = substr($normalizedId, 5);
    }
    
    // If it's a numeric ID, it might be a database ID rather than a vehicle_id
    // Try to look up the actual vehicle_id
    if (is_numeric($normalizedId)) {
        try {
            $conn = getDbConnection();
            $stmt = $conn->prepare("SELECT vehicle_id FROM vehicles WHERE id = ?");
            $stmt->execute([$normalizedId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && !empty($result['vehicle_id'])) {
                error_log("[$timestamp] Converted numeric ID $normalizedId to vehicle_id: {$result['vehicle_id']}", 3, $logDir . '/direct-local-fares.log');
                $normalizedId = $result['vehicle_id'];
            }
        } catch (Exception $e) {
            error_log("[$timestamp] Error looking up vehicle_id: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        }
    }
    
    error_log("[$timestamp] Normalized vehicle ID from '$rawId' to '$normalizedId'", 3, $logDir . '/direct-local-fares.log');
    return $normalizedId;
}

// Function to verify vehicle exists before updating
function verifyVehicleExists($vehicleId) {
    global $logDir, $timestamp;
    
    if (empty($vehicleId)) {
        return false;
    }
    
    try {
        $conn = getDbConnection();
        
        // Check if vehicle exists in the vehicles table
        $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ?");
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($vehicle) {
            error_log("[$timestamp] Vehicle exists: " . json_encode($vehicle), 3, $logDir . '/direct-local-fares.log');
            return $vehicle;
        }
        
        error_log("[$timestamp] Vehicle not found with ID: $vehicleId", 3, $logDir . '/direct-local-fares.log');
        return false;
    } catch (Exception $e) {
        error_log("[$timestamp] Error checking if vehicle exists: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        return false;
    }
}

// Function to ensure local_package_fares table exists
function ensureLocalFaresTable() {
    global $logDir, $timestamp;
    
    try {
        $conn = getDbConnection();
        
        // Check if table exists
        $tableExists = false;
        $stmt = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        $tableExists = ($stmt->rowCount() > 0);
        
        if (!$tableExists) {
            // Create table
            $createTableSQL = "CREATE TABLE `local_package_fares` (
                `id` int NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `vehicle_type` varchar(50) DEFAULT NULL,
                `price_4hrs_40km` decimal(10,2) DEFAULT '0.00',
                `price_8hrs_80km` decimal(10,2) DEFAULT '0.00',
                `price_10hrs_100km` decimal(10,2) DEFAULT '0.00',
                `price_extra_km` decimal(10,2) DEFAULT '0.00',
                `price_extra_hour` decimal(10,2) DEFAULT '0.00',
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_vehicle_id` (`vehicle_id`),
                KEY `idx_vehicle_type` (`vehicle_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $conn->exec($createTableSQL);
            error_log("[$timestamp] Created local_package_fares table", 3, $logDir . '/direct-local-fares.log');
            return true;
        }
        
        error_log("[$timestamp] Table local_package_fares already exists", 3, $logDir . '/direct-local-fares.log');
        return true;
    } catch (Exception $e) {
        error_log("[$timestamp] Error ensuring table: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        return false;
    }
}

// Main handler for POST request (update fares)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Extract the vehicle ID
        $vehicleId = null;
        foreach (['vehicleId', 'vehicle_id', 'id', 'vehicle'] as $key) {
            if (!empty($input[$key])) {
                $vehicleId = $input[$key];
                break;
            }
        }
        
        // Normalize the vehicle ID
        $vehicleId = normalizeVehicleId($vehicleId);
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Verify the vehicle exists
        $vehicle = verifyVehicleExists($vehicleId);
        if (!$vehicle) {
            throw new Exception("Vehicle with ID '$vehicleId' not found in the database");
        }
        
        // Extract pricing information
        $packages = [];
        if (!empty($input['packages'])) {
            // Could be a JSON string or already an array
            if (is_string($input['packages'])) {
                $packages = json_decode($input['packages'], true);
            } else {
                $packages = $input['packages'];
            }
        }
        
        // Get individual package prices with multiple fallbacks
        $price4hrs40km = 0;
        if (!empty($packages['4hrs-40km'])) $price4hrs40km = $packages['4hrs-40km'];
        if (!empty($input['package4hr40km'])) $price4hrs40km = $input['package4hr40km'];
        if (!empty($input['price_4hrs_40km'])) $price4hrs40km = $input['price_4hrs_40km'];
        if (!empty($input['price4hrs40km'])) $price4hrs40km = $input['price4hrs40km'];
        
        $price8hrs80km = 0;
        if (!empty($packages['8hrs-80km'])) $price8hrs80km = $packages['8hrs-80km'];
        if (!empty($input['package8hr80km'])) $price8hrs80km = $input['package8hr80km'];
        if (!empty($input['price_8hrs_80km'])) $price8hrs80km = $input['price_8hrs_80km'];
        if (!empty($input['price8hrs80km'])) $price8hrs80km = $input['price8hrs80km'];
        
        $price10hrs100km = 0;
        if (!empty($packages['10hrs-100km'])) $price10hrs100km = $packages['10hrs-100km'];
        if (!empty($input['package10hr100km'])) $price10hrs100km = $input['package10hr100km'];
        if (!empty($input['price_10hrs_100km'])) $price10hrs100km = $input['price_10hrs_100km'];
        if (!empty($input['price10hrs100km'])) $price10hrs100km = $input['price10hrs100km'];
        
        $extraKmRate = 0;
        foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'price_extra_km', 'extra-km'] as $key) {
            if (isset($input[$key]) && is_numeric($input[$key])) {
                $extraKmRate = floatval($input[$key]);
                break;
            }
        }
        if (!$extraKmRate && !empty($packages['extra-km'])) {
            $extraKmRate = floatval($packages['extra-km']);
        }
        
        $extraHourRate = 0;
        foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'price_extra_hour', 'extra-hour'] as $key) {
            if (isset($input[$key]) && is_numeric($input[$key])) {
                $extraHourRate = floatval($input[$key]);
                break;
            }
        }
        if (!$extraHourRate && !empty($packages['extra-hour'])) {
            $extraHourRate = floatval($packages['extra-hour']);
        }
        
        // Ensure the table exists
        ensureLocalFaresTable();
        
        // Now update or insert the fares
        $conn = getDbConnection();
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
        $stmt->execute([$vehicleId]);
        $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingRecord) {
            // Update existing record
            $stmt = $conn->prepare("UPDATE local_package_fares SET 
                price_4hrs_40km = ?, 
                price_8hrs_80km = ?, 
                price_10hrs_100km = ?, 
                price_extra_km = ?, 
                price_extra_hour = ?, 
                updated_at = NOW() 
                WHERE vehicle_id = ?");
            
            $stmt->execute([
                $price4hrs40km,
                $price8hrs80km,
                $price10hrs100km,
                $extraKmRate,
                $extraHourRate,
                $vehicleId
            ]);
            
            error_log("[$timestamp] Updated local fares for vehicle: $vehicleId", 3, $logDir . '/direct-local-fares.log');
        } else {
            // Insert new record
            $stmt = $conn->prepare("INSERT INTO local_package_fares 
                (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $vehicleId,
                $vehicle['name'] ?? $vehicleId, // Use name from vehicle record if available
                $price4hrs40km,
                $price8hrs80km,
                $price10hrs100km,
                $extraKmRate,
                $extraHourRate
            ]);
            
            error_log("[$timestamp] Inserted local fares for vehicle: $vehicleId", 3, $logDir . '/direct-local-fares.log');
        }
        
        // Also sync these values to the vehicles table to ensure consistency
        try {
            // Check if the vehicles table has the necessary columns
            $columnsStmt = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'local_package_%'");
            $hasLocalColumns = ($columnsStmt->rowCount() > 0);
            
            if ($hasLocalColumns) {
                $stmt = $conn->prepare("UPDATE vehicles SET 
                    local_package_4hr = ?, 
                    local_package_8hr = ?, 
                    local_package_10hr = ?, 
                    local_extra_km = ?, 
                    local_extra_hour = ? 
                    WHERE vehicle_id = ?");
                
                $stmt->execute([
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $extraKmRate,
                    $extraHourRate,
                    $vehicleId
                ]);
                
                error_log("[$timestamp] Synced local fares to vehicles table for: $vehicleId", 3, $logDir . '/direct-local-fares.log');
            } else {
                error_log("[$timestamp] Vehicles table does not have local_package columns, skipping sync", 3, $logDir . '/direct-local-fares.log');
            }
        } catch (Exception $syncError) {
            error_log("[$timestamp] Warning: Error syncing to vehicles table: " . $syncError->getMessage(), 3, $logDir . '/direct-local-fares.log');
        }
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Fare updated successfully',
            'vehicleId' => $vehicleId,
            'tripType' => 'local',
            'fares' => [
                '4hrs-40km' => $price4hrs40km,
                '8hrs-80km' => $price8hrs80km,
                '10hrs-100km' => $price10hrs100km,
                'extra-km' => $extraKmRate,
                'extra-hour' => $extraHourRate
            ],
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        error_log("[$timestamp] Error: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
    exit;
}

// Handler for GET request (fetch fares)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Extract the vehicle ID if one was provided
        $vehicleId = null;
        if (!empty($_GET['vehicleId'])) {
            $vehicleId = $_GET['vehicleId'];
        } elseif (!empty($_GET['vehicle_id'])) {
            $vehicleId = $_GET['vehicle_id'];
        } elseif (!empty($_GET['id'])) {
            $vehicleId = $_GET['id'];
        }
        
        // If a vehicle ID was provided, normalize it
        if ($vehicleId) {
            $vehicleId = normalizeVehicleId($vehicleId);
        }
        
        // Ensure the table exists
        ensureLocalFaresTable();
        
        // Fetch the fares
        $conn = getDbConnection();
        
        if ($vehicleId) {
            // Fetch fares for a specific vehicle
            $stmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
            $stmt->execute([$vehicleId]);
        } else {
            // Fetch all fares
            $stmt = $conn->query("SELECT * FROM local_package_fares");
        }
        
        $fares = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $vId = $row['vehicle_id'];
            $fares[$vId] = [
                'vehicleId' => $vId,
                'vehicle_id' => $vId,
                'vehicle_type' => $row['vehicle_type'],
                '4hrs-40km' => floatval($row['price_4hrs_40km']),
                '8hrs-80km' => floatval($row['price_8hrs_80km']),
                '10hrs-100km' => floatval($row['price_10hrs_100km']),
                'extra-km' => floatval($row['price_extra_km']),
                'extra-hour' => floatval($row['price_extra_hour']),
                'price_4hrs_40km' => floatval($row['price_4hrs_40km']),
                'price_8hrs_80km' => floatval($row['price_8hrs_80km']),
                'price_10hrs_100km' => floatval($row['price_10hrs_100km']),
                'price_extra_km' => floatval($row['price_extra_km']),
                'price_extra_hour' => floatval($row['price_extra_hour']),
                'updated_at' => $row['updated_at'],
                'created_at' => $row['created_at']
            ];
        }
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'count' => count($fares),
            'vehicle_id' => $vehicleId,
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        error_log("[$timestamp] Error: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
    exit;
}

// If we got here, unsupported method
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed',
    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],
    'timestamp' => time()
]);
