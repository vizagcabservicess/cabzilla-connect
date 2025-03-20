<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug logging
error_log("Vehicle pricing endpoint called. Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request headers: " . json_encode(getallheaders()));
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("POST data: " . file_get_contents('php://input'));
}

// Clean vehicle ID by removing prefixes if present
function cleanVehicleId($id) {
    if (empty($id)) return '';
    
    // Remove 'item-' prefix if it exists
    if (strpos($id, 'item-') === 0) {
        return substr($id, 5);
    }
    
    return $id;
}

// Check if user is authenticated and is admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

// Authenticate user - more lenient for testing
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    try {
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $userId = $payload['user_id'];
            $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        }
    } catch (Exception $e) {
        error_log("JWT verification error: " . $e->getMessage());
        // Continue execution, we'll check isAdmin below
    }
}

// For development, allow access without auth
$allowDevAccess = true; // Set to false in production

// Log authentication attempt for debugging
error_log("vehicle-pricing.php auth check", 0);
error_log(json_encode(['isAdmin' => $isAdmin, 'userId' => $userId, 'allowDevAccess' => $allowDevAccess]), 0);

if (!$isAdmin && !$allowDevAccess) {
    sendJsonResponse(['status' => 'error', 'message' => 'Administrator access required'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    error_log("Database connection failed in vehicle-pricing.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Handle GET requests - get all vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        error_log("Processing GET request for vehicle pricing");
        
        // Get vehicle pricing records
        $stmt = $conn->prepare("SELECT * FROM vehicle_pricing ORDER BY vehicle_type");
        $stmt->execute();
        $result = $stmt->get_result();

        $pricing = [];
        while ($row = $result->fetch_assoc()) {
            $pricing[] = [
                'id' => intval($row['id']),
                'vehicleId' => $row['vehicle_type'],
                'vehicleType' => $row['vehicle_type'],
                'basePrice' => floatval($row['base_price']),
                'pricePerKm' => floatval($row['price_per_km']),
                'nightHaltCharge' => floatval($row['night_halt_charge']),
                'driverAllowance' => floatval($row['driver_allowance']),
                'isActive' => (bool)($row['is_active'] ?? 1)
            ];
        }

        error_log("Retrieved " . count($pricing) . " vehicle pricing records");
        
        // If no records, return fallback data
        if (empty($pricing)) {
            $pricing = getFallbackVehiclePricing();
            error_log("No vehicle pricing found, using fallback data");
        }

        sendJsonResponse(['status' => 'success', 'data' => $pricing, 'timestamp' => time()]);
        exit;
    } catch (Exception $e) {
        error_log("Error fetching vehicle pricing: " . $e->getMessage());
        
        // Return fallback data on error
        $pricing = getFallbackVehiclePricing();
        sendJsonResponse([
            'status' => 'warning', 
            'message' => 'Error fetching from database, using fallback data', 
            'data' => $pricing,
            'timestamp' => time()
        ]);
        exit;
    }
}

// Handle POST requests - update vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the JSON data from the request
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Log the input data
    error_log("Vehicle pricing update request: " . json_encode($input));
    
    // Check if we're updating trip-specific fares
    if (isset($input['tripType'])) {
        return handleTripFareUpdate($conn, $input);
    }
    
    // Validate input for regular vehicle pricing update
    if (!$input || !isset($input['vehicleType']) && !isset($input['vehicleId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields (vehicleType or vehicleId is required)'], 400);
        exit;
    }
    
    // Determine vehicle ID from either vehicleType or vehicleId
    $vehicleType = isset($input['vehicleId']) ? cleanVehicleId($input['vehicleId']) : 
                  (isset($input['vehicleType']) ? cleanVehicleId($input['vehicleType']) : '');
    
    if (empty($vehicleType)) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid vehicle ID'], 400);
        exit;
    }
    
    // Convert numeric values
    $basePrice = isset($input['basePrice']) ? floatval($input['basePrice']) : 0;
    $pricePerKm = isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0;
    $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
    $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
    
    try {
        // First check if the vehicle type exists in vehicle_types table
        $vehicleCheckStmt = $conn->prepare("SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?");
        $vehicleCheckStmt->bind_param("s", $vehicleType);
        $vehicleCheckStmt->execute();
        $vehicleCheckResult = $vehicleCheckStmt->get_result();
        
        if ($vehicleCheckResult->num_rows === 0) {
            // Try to insert the vehicle if it doesn't exist
            try {
                $vehicleInsertStmt = $conn->prepare("INSERT INTO vehicle_types (vehicle_id, name, is_active) VALUES (?, ?, 1)");
                $vehicleInsertStmt->bind_param("ss", $vehicleType, $vehicleType);
                $vehicleInsertStmt->execute();
                error_log("Created missing vehicle type: " . $vehicleType);
            } catch (Exception $e) {
                error_log("Could not create vehicle type: " . $e->getMessage());
                sendJsonResponse(['status' => 'error', 'message' => 'Vehicle type does not exist and could not be created'], 404);
                exit;
            }
        }
        
        // Check if the vehicle type exists in pricing table
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
        $checkStmt->bind_param("s", $vehicleType);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $stmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW()
                WHERE vehicle_type = ?
            ");
            $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleType);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update vehicle pricing: " . $stmt->error);
            }
            
            error_log("Vehicle pricing updated successfully: " . json_encode([
                'vehicleType' => $vehicleType,
                'basePrice' => $basePrice, 
                'pricePerKm' => $pricePerKm
            ]));
            
            // Get the updated record
            $getStmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ?");
            $getStmt->bind_param("s", $vehicleType);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $updatedRecord = $result->fetch_assoc();
            
            $response = [
                'id' => intval($updatedRecord['id']),
                'vehicleType' => $updatedRecord['vehicle_type'],
                'vehicleId' => $updatedRecord['vehicle_type'],
                'basePrice' => floatval($updatedRecord['base_price']),
                'pricePerKm' => floatval($updatedRecord['price_per_km']),
                'nightHaltCharge' => floatval($updatedRecord['night_halt_charge']),
                'driverAllowance' => floatval($updatedRecord['driver_allowance'])
            ];
            
            sendJsonResponse(['status' => 'success', 'message' => 'Vehicle pricing updated successfully', 'data' => $response]);
        } else {
            // Insert new record
            $stmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->bind_param("sdddd", $vehicleType, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to create vehicle pricing: " . $stmt->error);
            }
            
            $newId = $conn->insert_id;
            error_log("New vehicle pricing created: " . json_encode([
                'id' => $newId,
                'vehicleType' => $vehicleType,
                'basePrice' => $basePrice, 
                'pricePerKm' => $pricePerKm
            ]));
            
            $response = [
                'id' => $newId,
                'vehicleType' => $vehicleType,
                'vehicleId' => $vehicleType,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ];
            
            sendJsonResponse(['status' => 'success', 'message' => 'Vehicle pricing created successfully', 'data' => $response]);
        }
    } catch (Exception $e) {
        error_log("Error updating vehicle pricing: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
    
    exit;
}

// Handle trip-specific fare updates
function handleTripFareUpdate($conn, $input) {
    // Validate input
    if (!isset($input['vehicleId']) || !isset($input['tripType'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields (vehicleId and tripType)'], 400);
        exit;
    }
    
    $vehicleId = cleanVehicleId($input['vehicleId']);
    $tripType = $input['tripType'];
    
    error_log("Processing trip fare update for $vehicleId, trip type: $tripType");
    
    // Determine which table to update based on trip type
    $tableMap = [
        'outstation-one-way' => 'outstation_one_way_fares',
        'outstation-round-trip' => 'outstation_round_trip_fares',
        'local' => 'local_package_fares',
        'airport' => 'airport_transfer_fares',
        'tour' => 'tour_fares'
    ];
    
    $tableName = isset($tableMap[$tripType]) ? $tableMap[$tripType] : '';
    
    if (empty($tableName)) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
        exit;
    }
    
    try {
        // Check if table exists, if not create it
        checkAndCreateTable($conn, $tableName, $tripType);
        
        // Prepare data for update/insert based on trip type
        $data = [];
        $updateColumns = '';
        $insertColumns = [];
        $insertValues = [];
        $types = '';
        
        switch ($tripType) {
            case 'outstation-one-way':
            case 'outstation-round-trip':
                $data = [
                    'base_price' => isset($input['basePrice']) ? floatval($input['basePrice']) : 0,
                    'price_per_km' => isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0
                ];
                $types = 'dd';
                break;
                
            case 'local':
                $data = [
                    'hr8_km80_price' => isset($input['hr8km80Price']) ? floatval($input['hr8km80Price']) : 0,
                    'hr10_km100_price' => isset($input['hr10km100Price']) ? floatval($input['hr10km100Price']) : 0,
                    'extra_km_rate' => isset($input['extraKmRate']) ? floatval($input['extraKmRate']) : 0
                ];
                $types = 'ddd';
                break;
                
            case 'airport':
                $data = [
                    'base_price' => isset($input['basePrice']) ? floatval($input['basePrice']) : 0,
                    'price_per_km' => isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0,
                    'airport_fee' => isset($input['airportFee']) ? floatval($input['airportFee']) : 0
                ];
                $types = 'ddd';
                break;
                
            case 'tour':
                // Tours need special handling for different tour IDs
                if (!isset($input['tourId'])) {
                    sendJsonResponse(['status' => 'error', 'message' => 'Missing tourId for tour fare update'], 400);
                    exit;
                }
                
                $data = [
                    'tour_id' => $input['tourId'],
                    'price' => isset($input['price']) ? floatval($input['price']) : 0
                ];
                $types = 'sd';
                break;
        }
        
        // Build update columns string
        foreach ($data as $key => $value) {
            if (!empty($updateColumns)) $updateColumns .= ', ';
            $updateColumns .= "$key = ?";
            
            $insertColumns[] = $key;
            $insertValues[] = $value;
        }
        
        // Check if record exists
        $checkSql = "SELECT id FROM $tableName WHERE vehicle_id = ?";
        if ($tripType === 'tour' && isset($input['tourId'])) {
            $checkSql .= " AND tour_id = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("ss", $vehicleId, $input['tourId']);
        } else {
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("s", $vehicleId);
        }
        
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateSql = "UPDATE $tableName SET $updateColumns, updated_at = NOW() WHERE vehicle_id = ?";
            if ($tripType === 'tour' && isset($input['tourId'])) {
                $updateSql .= " AND tour_id = ?";
                $stmt = $conn->prepare($updateSql);
                
                $params = array_values($data);
                $params[] = $vehicleId;
                $params[] = $input['tourId'];
                
                $bindParams = array_merge([$types . 'ss'], $params);
                call_user_func_array([$stmt, 'bind_param'], $bindParams);
            } else {
                $stmt = $conn->prepare($updateSql);
                
                $params = array_values($data);
                $params[] = $vehicleId;
                
                $bindParams = array_merge([$types . 's'], $params);
                call_user_func_array([$stmt, 'bind_param'], $bindParams);
            }
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update $tripType fares: " . $stmt->error);
            }
            
            error_log("$tripType fares updated successfully for vehicle: $vehicleId");
            sendJsonResponse(['status' => 'success', 'message' => "$tripType fares updated successfully"]);
            
        } else {
            // Insert new record
            $insertColumnsSql = implode(', ', $insertColumns);
            $placeholders = str_repeat('?, ', count($insertColumns) - 1) . '?';
            
            $insertSql = "INSERT INTO $tableName (vehicle_id, $insertColumnsSql, created_at, updated_at) 
                          VALUES (?, $placeholders, NOW(), NOW())";
            
            $stmt = $conn->prepare($insertSql);
            
            $params = [$vehicleId];
            $params = array_merge($params, array_values($data));
            
            $bindParams = array_merge(['s' . $types], $params);
            call_user_func_array([$stmt, 'bind_param'], $bindParams);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to insert $tripType fares: " . $stmt->error);
            }
            
            error_log("$tripType fares created successfully for vehicle: $vehicleId");
            sendJsonResponse(['status' => 'success', 'message' => "$tripType fares created successfully"]);
        }
        
    } catch (Exception $e) {
        error_log("Error updating $tripType fares: " . $e->getMessage());
        sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
    
    exit;
}

// Create table if it doesn't exist
function checkAndCreateTable($conn, $tableName, $tripType) {
    // Check if table exists
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    
    if ($result->num_rows == 0) {
        $createTableSql = "";
        
        // Create table based on trip type
        switch ($tripType) {
            case 'outstation-one-way':
            case 'outstation-round-trip':
                $createTableSql = "
                    CREATE TABLE $tableName (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) DEFAULT 0,
                        price_per_km DECIMAL(10,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY (vehicle_id)
                    )
                ";
                break;
                
            case 'local':
                $createTableSql = "
                    CREATE TABLE $tableName (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        hr8_km80_price DECIMAL(10,2) DEFAULT 0,
                        hr10_km100_price DECIMAL(10,2) DEFAULT 0,
                        extra_km_rate DECIMAL(10,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY (vehicle_id)
                    )
                ";
                break;
                
            case 'airport':
                $createTableSql = "
                    CREATE TABLE $tableName (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) DEFAULT 0,
                        price_per_km DECIMAL(10,2) DEFAULT 0,
                        airport_fee DECIMAL(10,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY (vehicle_id)
                    )
                ";
                break;
                
            case 'tour':
                $createTableSql = "
                    CREATE TABLE $tableName (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        tour_id VARCHAR(50) NOT NULL,
                        price DECIMAL(10,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY (vehicle_id, tour_id)
                    )
                ";
                break;
        }
        
        if (!empty($createTableSql)) {
            $result = $conn->query($createTableSql);
            if (!$result) {
                throw new Exception("Failed to create table $tableName: " . $conn->error);
            }
            error_log("Created table $tableName for $tripType fares");
        }
    }
}

// If we get here, the method is not supported
sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed: ' . $_SERVER['REQUEST_METHOD']], 405);

// Helper function for fallback data
function getFallbackVehiclePricing() {
    return [
        [
            'id' => 1,
            'vehicleId' => 'sedan',
            'vehicleType' => 'sedan',
            'basePrice' => 4200,
            'pricePerKm' => 14,
            'nightHaltCharge' => 700,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 2,
            'vehicleId' => 'ertiga',
            'vehicleType' => 'ertiga',
            'basePrice' => 5400,
            'pricePerKm' => 18,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 3,
            'vehicleId' => 'innova_crysta',
            'vehicleType' => 'innova_crysta',
            'basePrice' => 6000,
            'pricePerKm' => 20,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ]
    ];
}
