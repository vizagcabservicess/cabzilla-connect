
<?php
// direct-airport-fares.php - Direct endpoint for airport fares

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database config
require_once __DIR__ . '/../config.php';

// Simple sendJSON function 
function sendJSON($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Create log directory for debugging
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Get the vehicle ID from query params or body
$vehicleId = $_GET['vehicleId'] ?? $_GET['vehicle_id'] ?? null;

// Log for debugging
$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Direct airport fares request for vehicle ID: $vehicleId\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET parameters: " . json_encode($_GET) . "\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Check if airport_transfer_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $tableResult = $conn->query($tableCheckQuery);
    
    if ($tableResult->num_rows === 0) {
        // Create the table if it doesn't exist
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createTableSql)) {
            file_put_contents($logFile, "[$timestamp] Failed to create airport_transfer_fares table: " . $conn->error . "\n", FILE_APPEND);
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Define SQL query based on method
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Handle different HTTP methods
    if ($method === 'GET') {
        // If no vehicle ID specified, return all fares
        $sql = "SELECT * FROM airport_transfer_fares";
        $params = [];
        $types = "";
        
        // If vehicle ID is specified, filter by it (case-insensitive)
        if ($vehicleId) {
            $sql .= " WHERE LOWER(vehicle_id) = LOWER(?)";
            $params[] = $vehicleId;
            $types .= "s";
            
            file_put_contents($logFile, "[$timestamp] Querying for vehicle ID (case-insensitive): $vehicleId\n", FILE_APPEND);
        }
        
        // Prepare and execute the query
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            file_put_contents($logFile, "[$timestamp] Prepare statement failed: " . $conn->error . "\n", FILE_APPEND);
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            file_put_contents($logFile, "[$timestamp] Query execution failed: " . $stmt->error . "\n", FILE_APPEND);
            throw new Exception("Query execution failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        // Format the output
        $fares = [];
        while ($row = $result->fetch_assoc()) {
            $fares[] = [
                'id' => (int)$row['id'],
                'vehicleId' => $row['vehicle_id'],
                'vehicle_id' => $row['vehicle_id'],
                'basePrice' => (float)$row['base_price'],
                'base_price' => (float)$row['base_price'],
                'pricePerKm' => (float)$row['price_per_km'],
                'price_per_km' => (float)$row['price_per_km'],
                'pickupPrice' => (float)$row['pickup_price'],
                'pickup_price' => (float)$row['pickup_price'],
                'dropPrice' => (float)$row['drop_price'],
                'drop_price' => (float)$row['drop_price'],
                'tier1Price' => (float)$row['tier1_price'],
                'tier1_price' => (float)$row['tier1_price'],
                'tier2Price' => (float)$row['tier2_price'],
                'tier2_price' => (float)$row['tier2_price'],
                'tier3Price' => (float)$row['tier3_price'],
                'tier3_price' => (float)$row['tier3_price'],
                'tier4Price' => (float)$row['tier4_price'],
                'tier4_price' => (float)$row['tier4_price'],
                'extraKmCharge' => (float)$row['extra_km_charge'],
                'extra_km_charge' => (float)$row['extra_km_charge']
            ];
        }
        
        // If no specific vehicle and no fares yet, return empty array
        if (empty($fares) && !$vehicleId) {
            sendJSON([
                'status' => 'success',
                'message' => 'No airport fares found',
                'data' => [],
                'fares' => []
            ]);
            exit;
        }
        
        // If specific vehicle requested but no fare found, create default
        if (empty($fares) && $vehicleId) {
            file_put_contents($logFile, "[$timestamp] No fare found for vehicle $vehicleId, creating default\n", FILE_APPEND);
            
            // Insert a default record with ON DUPLICATE KEY UPDATE
            $defaultInsertSql = "
                INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            ";
            
            $insertStmt = $conn->prepare($defaultInsertSql);
            if (!$insertStmt) {
                file_put_contents($logFile, "[$timestamp] Failed to prepare insert statement: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Failed to prepare insert statement: " . $conn->error);
            }
            
            $insertStmt->bind_param("s", $vehicleId);
            if (!$insertStmt->execute()) {
                file_put_contents($logFile, "[$timestamp] Failed to insert default fare: " . $insertStmt->error . "\n", FILE_APPEND);
                throw new Exception("Failed to insert default fare: " . $insertStmt->error);
            }
            
            // Get the inserted record id
            $newId = $conn->insert_id;
            
            // Return the default fare
            $fares[] = [
                'id' => $newId,
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'basePrice' => 0,
                'base_price' => 0,
                'pricePerKm' => 0,
                'price_per_km' => 0,
                'pickupPrice' => 0,
                'pickup_price' => 0,
                'dropPrice' => 0,
                'drop_price' => 0,
                'tier1Price' => 0,
                'tier1_price' => 0,
                'tier2Price' => 0,
                'tier2_price' => 0,
                'tier3Price' => 0,
                'tier3_price' => 0,
                'tier4Price' => 0,
                'tier4_price' => 0,
                'extraKmCharge' => 0,
                'extra_km_charge' => 0
            ];
        }
        
        file_put_contents($logFile, "[$timestamp] Returning " . count($fares) . " fares\n", FILE_APPEND);
        
        // Return success with fares
        sendJSON([
            'status' => 'success',
            'message' => 'Airport fares retrieved successfully',
            'data' => $fares,
            'fares' => $fares
        ]);
    }
    // Handle POST request to update fares
    else if ($method === 'POST') {
        // Get request body
        $rawInput = file_get_contents('php://input');
        file_put_contents($logFile, "[$timestamp] Raw POST input: " . $rawInput . "\n", FILE_APPEND);
        
        $inputData = json_decode($rawInput, true);
        
        // If JSON parsing failed, try to parse as form data
        if (json_last_error() !== JSON_ERROR_NONE && !empty($_POST)) {
            file_put_contents($logFile, "[$timestamp] JSON parsing failed, using POST data\n", FILE_APPEND);
            $inputData = $_POST;
        }
        
        if (!$inputData) {
            file_put_contents($logFile, "[$timestamp] No input data found in request\n", FILE_APPEND);
            throw new Exception("No input data found in request");
        }
        
        if (!isset($inputData['vehicleId']) && !isset($inputData['vehicle_id'])) {
            file_put_contents($logFile, "[$timestamp] Vehicle ID not found in input data\n", FILE_APPEND);
            throw new Exception("Vehicle ID is required");
        }
        
        $inputVehicleId = $inputData['vehicleId'] ?? $inputData['vehicle_id'] ?? null;
        
        if (!$inputVehicleId) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Prepare data for insert or update
        $basePrice = isset($inputData['basePrice']) ? floatval($inputData['basePrice']) : (isset($inputData['base_price']) ? floatval($inputData['base_price']) : 0);
        $pricePerKm = isset($inputData['pricePerKm']) ? floatval($inputData['pricePerKm']) : (isset($inputData['price_per_km']) ? floatval($inputData['price_per_km']) : 0);
        $pickupPrice = isset($inputData['pickupPrice']) ? floatval($inputData['pickupPrice']) : (isset($inputData['pickup_price']) ? floatval($inputData['pickup_price']) : 0);
        $dropPrice = isset($inputData['dropPrice']) ? floatval($inputData['dropPrice']) : (isset($inputData['drop_price']) ? floatval($inputData['drop_price']) : 0);
        $tier1Price = isset($inputData['tier1Price']) ? floatval($inputData['tier1Price']) : (isset($inputData['tier1_price']) ? floatval($inputData['tier1_price']) : 0);
        $tier2Price = isset($inputData['tier2Price']) ? floatval($inputData['tier2Price']) : (isset($inputData['tier2_price']) ? floatval($inputData['tier2_price']) : 0);
        $tier3Price = isset($inputData['tier3Price']) ? floatval($inputData['tier3Price']) : (isset($inputData['tier3_price']) ? floatval($inputData['tier3_price']) : 0);
        $tier4Price = isset($inputData['tier4Price']) ? floatval($inputData['tier4Price']) : (isset($inputData['tier4_price']) ? floatval($inputData['tier4_price']) : 0);
        $extraKmCharge = isset($inputData['extraKmCharge']) ? floatval($inputData['extraKmCharge']) : (isset($inputData['extra_km_charge']) ? floatval($inputData['extra_km_charge']) : 0);
        
        // Insert or update record using ON DUPLICATE KEY UPDATE
        $insertSql = "
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price,
            tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            pickup_price = VALUES(pickup_price),
            drop_price = VALUES(drop_price),
            tier1_price = VALUES(tier1_price),
            tier2_price = VALUES(tier2_price),
            tier3_price = VALUES(tier3_price),
            tier4_price = VALUES(tier4_price),
            extra_km_charge = VALUES(extra_km_charge),
            updated_at = NOW()
        ";
        
        $insertStmt = $conn->prepare($insertSql);
        if (!$insertStmt) {
            file_put_contents($logFile, "[$timestamp] Failed to prepare insert statement: " . $conn->error . "\n", FILE_APPEND);
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        $insertStmt->bind_param(
            "sddddddddd", 
            $inputVehicleId, 
            $basePrice, 
            $pricePerKm, 
            $pickupPrice, 
            $dropPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge
        );
        
        if (!$insertStmt->execute()) {
            file_put_contents($logFile, "[$timestamp] Failed to insert/update fare: " . $insertStmt->error . "\n", FILE_APPEND);
            throw new Exception("Failed to insert/update fare: " . $insertStmt->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Successfully inserted/updated airport fare for vehicle: $inputVehicleId\n", FILE_APPEND);
        
        // Return success response
        sendJSON([
            'status' => 'success',
            'message' => 'Airport fare saved successfully',
            'data' => [
                'vehicleId' => $inputVehicleId,
                'vehicle_id' => $inputVehicleId,
                'basePrice' => (float)$basePrice,
                'base_price' => (float)$basePrice,
                'pricePerKm' => (float)$pricePerKm,
                'price_per_km' => (float)$pricePerKm,
                'pickupPrice' => (float)$pickupPrice,
                'pickup_price' => (float)$pickupPrice,
                'dropPrice' => (float)$dropPrice,
                'drop_price' => (float)$dropPrice,
                'tier1Price' => (float)$tier1Price,
                'tier1_price' => (float)$tier1Price,
                'tier2Price' => (float)$tier2Price,
                'tier2_price' => (float)$tier2Price,
                'tier3Price' => (float)$tier3Price,
                'tier3_price' => (float)$tier3Price,
                'tier4Price' => (float)$tier4Price,
                'tier4_price' => (float)$tier4Price,
                'extraKmCharge' => (float)$extraKmCharge,
                'extra_km_charge' => (float)$extraKmCharge
            ]
        ]);
    } else {
        file_put_contents($logFile, "[$timestamp] Method not allowed: $method\n", FILE_APPEND);
        sendJSON([
            'status' => 'error',
            'message' => 'Method not allowed'
        ], 405);
    }
    
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Stack trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    // Return error response
    sendJSON([
        'status' => 'error',
        'message' => 'Failed to process airport fares: ' . $e->getMessage()
    ], 500);
}
