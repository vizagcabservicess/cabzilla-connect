
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
header('X-API-Version: 1.0.3'); // Increased version number
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

// CRITICAL FIX: Map of known numeric IDs to their proper vehicle_ids - EXPANDED
function getKnownVehicleIdMap() {
    return [
        '1' => 'sedan',
        '2' => 'ertiga',
        '180' => 'etios',
        '1266' => 'MPV',
        '592' => 'Urbania',
        '1270' => 'MPV',   // Map these duplicates back to proper vehicle_id
        '1271' => 'etios', // Map these duplicates back to proper vehicle_id
        '1272' => 'etios', // Map these duplicates back to proper vehicle_id
        '1273' => 'etios',
        '1274' => 'etios',
        '1275' => 'etios',
        // Add ANY numeric values that appear as IDs in your database
    ];
}

// IMPROVED: Function to normalize vehicle ID with stricter rules
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
    
    // CRITICAL FIX: If it's a pure numeric ID, it MUST be converted to a string name
    // This is what was creating the duplicate vehicles
    if (is_numeric($normalizedId)) {
        error_log("[$timestamp] NUMERIC ID DETECTED: $normalizedId - must be converted", 3, $logDir . '/direct-local-fares.log');
        
        $knownMap = getKnownVehicleIdMap();
        
        // First check our hardcoded map for known vehicle IDs
        if (isset($knownMap[$normalizedId])) {
            $mappedId = $knownMap[$normalizedId];
            error_log("[$timestamp] MAPPED numeric ID $normalizedId to proper vehicle_id: $mappedId", 3, $logDir . '/direct-local-fares.log');
            return $mappedId;
        }
        
        // Then try to look up the actual vehicle_id in database
        try {
            $conn = getDbConnection();
            
            // First try to find by exact ID match
            $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1");
            $stmt->execute([$normalizedId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                // If found by ID and has a non-numeric vehicle_id, use that
                if (!empty($result['vehicle_id']) && !is_numeric($result['vehicle_id'])) {
                    error_log("[$timestamp] Found vehicle_id '{$result['vehicle_id']}' for numeric ID $normalizedId", 3, $logDir . '/direct-local-fares.log');
                    return $result['vehicle_id'];
                }
                
                // If no good vehicle_id but has a proper name, use that
                if (!empty($result['name']) && $result['name'] !== $normalizedId && !is_numeric($result['name'])) {
                    error_log("[$timestamp] Using name '{$result['name']}' for numeric ID $normalizedId", 3, $logDir . '/direct-local-fares.log');
                    return $result['name'];
                }
            }
            
            // If not found by exact ID, try to find a vehicle with this numeric value as vehicle_id 
            // (it's already in the database incorrectly)
            $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? LIMIT 1");
            $stmt->execute([$normalizedId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                // If it has a name, prefer using that instead of the numeric ID
                if (!empty($result['name']) && !is_numeric($result['name'])) {
                    error_log("[$timestamp] Vehicle exists with numeric vehicle_id, using name '{$result['name']}' instead", 3, $logDir . '/direct-local-fares.log');
                    return $result['name'];
                }
            }
            
            // CRITICAL: We've found no good mapping, so we must reject this numeric ID completely
            error_log("[$timestamp] REJECTED: No mapping found for numeric ID $normalizedId - cannot use as vehicle_id", 3, $logDir . '/direct-local-fares.log');
            throw new Exception("Cannot use numeric ID '$normalizedId' as a vehicle identifier. Please use a proper vehicle ID like 'sedan', 'ertiga', etc.");
            
        } catch (Exception $e) {
            error_log("[$timestamp] Error or rejection during ID normalization: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
            throw $e; // Re-throw to be handled by caller
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
        $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? LIMIT 1");
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($vehicle) {
            error_log("[$timestamp] Vehicle exists with given vehicle_id: " . json_encode($vehicle), 3, $logDir . '/direct-local-fares.log');
            return $vehicle;
        }
        
        // Try by ID as fallback
        $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1");
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($vehicle) {
            error_log("[$timestamp] Vehicle exists by ID: " . json_encode($vehicle), 3, $logDir . '/direct-local-fares.log');
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
        $originalVehicleId = null;
        
        foreach (['vehicleId', 'vehicle_id', 'id', 'vehicle'] as $key) {
            if (!empty($input[$key])) {
                $originalVehicleId = $input[$key];
                $vehicleId = $input[$key];
                break;
            }
        }
        
        error_log("[$timestamp] Original vehicle ID from input: $originalVehicleId", 3, $logDir . '/direct-local-fares.log');
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // CRITICAL STEP: Normalize the vehicle ID with strict checking
        try {
            $vehicleId = normalizeVehicleId($vehicleId);
        } catch (Exception $e) {
            // Return an error response instead of letting the request continue
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage(),
                'originalId' => $originalVehicleId,
                'timestamp' => time()
            ]);
            exit;
        }
        
        if (empty($vehicleId)) {
            throw new Exception("Failed to normalize vehicle ID from: $originalVehicleId");
        }
        
        // CRITICAL: Check again if this is purely numeric after normalization - reject completely
        if (is_numeric($vehicleId)) {
            error_log("[$timestamp] REJECTED: Normalized ID $vehicleId is still numeric", 3, $logDir . '/direct-local-fares.log');
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => "Cannot use numeric ID '$vehicleId' as a vehicle identifier. Please use a proper vehicle ID.",
                'originalId' => $originalVehicleId,
                'timestamp' => time()
            ]);
            exit;
        }
        
        // CRITICAL: Verify the vehicle exists - prevents creating new vehicles
        $vehicle = verifyVehicleExists($vehicleId);
        if (!$vehicle) {
            error_log("[$timestamp] Vehicle with ID '$vehicleId' not found", 3, $logDir . '/direct-local-fares.log');
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => "Vehicle with ID '$vehicleId' not found in the database. Update rejected to prevent ghost record creation.",
                'timestamp' => time()
            ]);
            exit;
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
        
        // IMPORTANT: Always use the vehicle record's vehicle_id to ensure consistency
        $vehicleIdToUse = $vehicleId;
        try {
            $finalCheckStmt = $conn->prepare("SELECT vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1");
            $finalCheckStmt->execute([$vehicleId, $vehicleId]);
            $finalCheck = $finalCheckStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($finalCheck) {
                // Always prefer non-numeric vehicle_id
                if (!empty($finalCheck['vehicle_id']) && !is_numeric($finalCheck['vehicle_id'])) {
                    error_log("[$timestamp] Using verified vehicle_id '{$finalCheck['vehicle_id']}' for update", 3, $logDir . '/direct-local-fares.log');
                    $vehicleIdToUse = $finalCheck['vehicle_id'];
                } 
                // If vehicle_id is numeric but name is not, use the name
                else if (!empty($finalCheck['name']) && !is_numeric($finalCheck['name'])) {
                    error_log("[$timestamp] Using name '{$finalCheck['name']}' for update instead of numeric ID", 3, $logDir . '/direct-local-fares.log');
                    $vehicleIdToUse = $finalCheck['name'];
                }
            }
        } catch (Exception $e) {
            error_log("[$timestamp] Warning: Final vehicle ID check failed: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        }
        
        // FINAL CHECK: Never allow numeric vehicle IDs
        if (is_numeric($vehicleIdToUse)) {
            error_log("[$timestamp] EMERGENCY PREVENTION: Attempted to use numeric vehicle_id: $vehicleIdToUse", 3, $logDir . '/direct-local-fares.log');
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => "Cannot use numeric vehicle ID for fare update. This would create a duplicate vehicle.",
                'originalId' => $originalVehicleId,
                'timestamp' => time()
            ]);
            exit;
        }
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
        $stmt->execute([$vehicleIdToUse]);
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
                $vehicleIdToUse
            ]);
            
            error_log("[$timestamp] Updated local fares for vehicle: $vehicleIdToUse", 3, $logDir . '/direct-local-fares.log');
        } else {
            // Insert new record
            $stmt = $conn->prepare("INSERT INTO local_package_fares 
                (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $vehicleIdToUse,
                $vehicle['name'] ?? $vehicleIdToUse, // Use name from vehicle record if available
                $price4hrs40km,
                $price8hrs80km,
                $price10hrs100km,
                $extraKmRate,
                $extraHourRate
            ]);
            
            error_log("[$timestamp] Inserted local fares for vehicle: $vehicleIdToUse", 3, $logDir . '/direct-local-fares.log');
        }
        
        // Return success response with the actual vehicle ID used
        echo json_encode([
            'status' => 'success',
            'message' => "Local fares updated successfully for $vehicleIdToUse",
            'data' => [
                'originalVehicleId' => $originalVehicleId,
                'vehicleId' => $vehicleIdToUse,
                'price4hrs40km' => $price4hrs40km,
                'price8hrs80km' => $price8hrs80km,
                'price10hrs100km' => $price10hrs100km,
                'extraKmRate' => $extraKmRate,
                'extraHourRate' => $extraHourRate
            ],
            'timestamp' => time()
        ]);
        exit;
        
    } catch (Exception $e) {
        error_log("[$timestamp] Error updating local fares: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => "Failed to update local fares: " . $e->getMessage(),
            'timestamp' => time()
        ]);
        exit;
    }
}

// Handle GET requests to retrieve fares
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get vehicle_id parameter if provided
        $vehicleId = null;
        foreach (['vehicleId', 'vehicle_id', 'id'] as $key) {
            if (!empty($_GET[$key])) {
                $vehicleId = $_GET[$key];
                break;
            }
        }
        
        // If vehicle ID is provided, normalize it
        if (!empty($vehicleId)) {
            try {
                $vehicleId = normalizeVehicleId($vehicleId);
            } catch (Exception $e) {
                // Just log the error but continue with the original ID for GET requests
                error_log("[$timestamp] Warning during GET: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
            }
        }
        
        // Make sure the table exists
        ensureLocalFaresTable();
        
        // Get fares from database
        $conn = getDbConnection();
        $fares = [];
        
        if (!empty($vehicleId)) {
            // Get fares for specific vehicle
            $stmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
            $stmt->execute([$vehicleId]);
        } else {
            // Get all fares
            $stmt = $conn->query("SELECT * FROM local_package_fares");
        }
        
        // Process results
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = $row['vehicle_id'];
            
            // Convert to standardized format
            $fares[$id] = [
                'vehicle_id' => $id,
                'price4hrs40km' => floatval($row['price_4hrs_40km']),
                'price8hrs80km' => floatval($row['price_8hrs_80km']),
                'price10hrs100km' => floatval($row['price_10hrs_100km']),
                'extraKmRate' => floatval($row['price_extra_km']),
                'extraHourRate' => floatval($row['price_extra_hour'])
            ];
        }
        
        // Return response
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'vehicle_id' => $vehicleId,
            'count' => count($fares),
            'timestamp' => time()
        ]);
        exit;
        
    } catch (Exception $e) {
        error_log("[$timestamp] Error retrieving local fares: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => "Failed to retrieve local fares: " . $e->getMessage(),
            'timestamp' => time()
        ]);
        exit;
    }
}

// Handle unsupported methods
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => "Method not allowed. Supported methods: GET, POST, OPTIONS",
    'timestamp' => time()
]);
exit;
