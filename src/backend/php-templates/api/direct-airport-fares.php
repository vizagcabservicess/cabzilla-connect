
<?php
/**
 * Direct Airport Fares API - Public facing version
 * Implements dynamic vehicle loading and database storage like local fares
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once __DIR__ . '/../config.php';

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the request
file_put_contents($logFile, "[$timestamp] Direct airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Request method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Query string: " . $_SERVER['QUERY_STRING'] . "\n", FILE_APPEND);

// Capture raw input for debugging
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    file_put_contents($logFile, "[$timestamp] Raw input: " . $rawInput . "\n", FILE_APPEND);
}

// Check for vehicle ID in all possible parameter names
$vehicleIdParams = ['id', 'vehicleId', 'vehicle_id', 'vehicleid'];
$vehicleId = null;

// First check URL parameters
foreach ($vehicleIdParams as $param) {
    if (isset($_GET[$param]) && !empty($_GET[$param])) {
        $vehicleId = $_GET[$param];
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in URL parameter '$param': $vehicleId\n", FILE_APPEND);
        break;
    }
}

// If not found in URL, check JSON input
if (!$vehicleId && !empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    if ($jsonData) {
        foreach ($vehicleIdParams as $param) {
            if (isset($jsonData[$param]) && !empty($jsonData[$param])) {
                $vehicleId = $jsonData[$param];
                file_put_contents($logFile, "[$timestamp] Found vehicle ID in JSON input '$param': $vehicleId\n", FILE_APPEND);
                break;
            }
        }
    }
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Handle POST request for updating fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get data from request body
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        
        // Support both JSON and form data
        if (empty($input) && isset($_POST) && !empty($_POST)) {
            $input = $_POST;
        }
        
        // Get vehicle ID from various possible sources
        $vehicleId = isset($input['vehicleId']) ? $input['vehicleId'] : 
                    (isset($input['vehicle_id']) ? $input['vehicle_id'] : 
                    (isset($input['id']) ? $input['id'] : null));
                    
        if (!$vehicleId) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Clean vehicleId - remove "item-" prefix if exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Extract values from request
        $basePrice = isset($input['basePrice']) ? floatval($input['basePrice']) : 0;
        $pricePerKm = isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0;
        $pickupPrice = isset($input['pickupPrice']) ? floatval($input['pickupPrice']) : 0;
        $dropPrice = isset($input['dropPrice']) ? floatval($input['dropPrice']) : 0;
        $tier1Price = isset($input['tier1Price']) ? floatval($input['tier1Price']) : 0;
        $tier2Price = isset($input['tier2Price']) ? floatval($input['tier2Price']) : 0;
        $tier3Price = isset($input['tier3Price']) ? floatval($input['tier3Price']) : 0;
        $tier4Price = isset($input['tier4Price']) ? floatval($input['tier4Price']) : 0;
        $extraKmCharge = isset($input['extraKmCharge']) ? floatval($input['extraKmCharge']) : 0;
        $nightCharges = isset($input['nightCharges']) ? floatval($input['nightCharges']) : 0;
        $extraWaitingCharges = isset($input['extraWaitingCharges']) ? floatval($input['extraWaitingCharges']) : 0;
        
        // Check if the airport_transfer_fares table exists
        $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        $tableExists = $tableResult->num_rows > 0;
        
        // Create table if it doesn't exist
        if (!$tableExists) {
            $createTableQuery = "
                CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
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
                    night_charges DECIMAL(10,2) DEFAULT 0,
                    extra_waiting_charges DECIMAL(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            
            if (!$conn->query($createTableQuery)) {
                throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
            }
            
            file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
        }
        
        // Check for required columns and add if missing
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
        if ($columnsResult->num_rows === 0) {
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
            file_put_contents($logFile, "[$timestamp] Added night_charges column\n", FILE_APPEND);
        }
        
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
        if ($columnsResult->num_rows === 0) {
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
            file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column\n", FILE_APPEND);
        }
        
        // Ensure we have the vehicle in the vehicles table first
        $checkVehicleQuery = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id = ?";
        $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
        $checkVehicleStmt->bind_param("s", $vehicleId);
        $checkVehicleStmt->execute();
        $checkVehicleResult = $checkVehicleStmt->get_result();
        
        if ($checkVehicleResult->num_rows == 0) {
            // Vehicle doesn't exist, create it
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            $insertVehicleQuery = "
                INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 1, NOW(), NOW())
            ";
            
            $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
            $insertVehicleStmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
            $insertVehicleStmt->execute();
            
            file_put_contents($logFile, "[$timestamp] Created new vehicle: $vehicleId\n", FILE_APPEND);
        }
        
        // Check if record exists
        $checkStmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateStmt = $conn->prepare("UPDATE airport_transfer_fares SET 
                base_price = ?,
                price_per_km = ?,
                pickup_price = ?,
                drop_price = ?,
                tier1_price = ?,
                tier2_price = ?,
                tier3_price = ?,
                tier4_price = ?,
                extra_km_charge = ?,
                night_charges = ?,
                extra_waiting_charges = ?,
                updated_at = NOW()
                WHERE vehicle_id = ?");
                
            $updateStmt->bind_param("ddddddddddds", 
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $nightCharges,
                $extraWaitingCharges,
                $vehicleId
            );
            
            $updateStmt->execute();
            file_put_contents($logFile, "[$timestamp] Updated airport fares for vehicle: $vehicleId\n", FILE_APPEND);
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                night_charges, extra_waiting_charges) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $insertStmt->bind_param("sddddddddddd", 
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $nightCharges,
                $extraWaitingCharges
            );
            
            $insertStmt->execute();
            file_put_contents($logFile, "[$timestamp] Inserted new airport fares for vehicle: $vehicleId\n", FILE_APPEND);
        }
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => "Airport fares updated for $vehicleId",
            'data' => [
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'pickupPrice' => $pickupPrice,
                'dropPrice' => $dropPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge,
                'nightCharges' => $nightCharges,
                'extraWaitingCharges' => $extraWaitingCharges
            ],
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Handle GET request - Query for airport fares
    // Get all vehicles with their airport transfer fares
    $query = "
        SELECT v.id, v.vehicle_id, v.name, atf.* 
        FROM vehicles v
        LEFT JOIN airport_transfer_fares atf ON v.vehicle_id = atf.vehicle_id
        WHERE v.is_active = 1 OR :includeInactive = 'true'
        ORDER BY v.name
    ";
    
    $includeInactive = isset($_GET['includeInactive']) ? $_GET['includeInactive'] : 'false';
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':includeInactive', $includeInactive);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $fares = [];
    foreach ($results as $row) {
        $id = $row['vehicle_id'] ?? $row['id'];
        
        // Filter by vehicle_id if provided
        if ($vehicleId && $id != $vehicleId) {
            continue;
        }
        
        // Map to standardized properties
        $fares[$id] = [
            'id' => $id,
            'vehicleId' => $id,
            'vehicle_id' => $id,
            'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $id)),
            'basePrice' => floatval($row['base_price'] ?? 0),
            'pricePerKm' => floatval($row['price_per_km'] ?? 0),
            'pickupPrice' => floatval($row['pickup_price'] ?? 0),
            'dropPrice' => floatval($row['drop_price'] ?? 0),
            'tier1Price' => floatval($row['tier1_price'] ?? 0),
            'tier2Price' => floatval($row['tier2_price'] ?? 0),
            'tier3Price' => floatval($row['tier3_price'] ?? 0),
            'tier4Price' => floatval($row['tier4_price'] ?? 0),
            'extraKmCharge' => floatval($row['extra_km_charge'] ?? 0),
            'nightCharges' => floatval($row['night_charges'] ?? 0),
            'extraWaitingCharges' => floatval($row['extra_waiting_charges'] ?? 0)
        ];
    }
    
    // Default values for common cab types if no fares found
    if (empty($fares) && $vehicleId) {
        $defaultFares = [
            'sedan' => [
                'basePrice' => 3000,
                'pricePerKm' => 12,
                'pickupPrice' => 800,
                'dropPrice' => 800,
                'tier1Price' => 600,
                'tier2Price' => 800,
                'tier3Price' => 1000,
                'tier4Price' => 1200,
                'extraKmCharge' => 12,
                'nightCharges' => 250,
                'extraWaitingCharges' => 150
            ],
            'ertiga' => [
                'basePrice' => 3500,
                'pricePerKm' => 15,
                'pickupPrice' => 1000,
                'dropPrice' => 1000,
                'tier1Price' => 800,
                'tier2Price' => 1000,
                'tier3Price' => 1200,
                'tier4Price' => 1400,
                'extraKmCharge' => 15,
                'nightCharges' => 300,
                'extraWaitingCharges' => 200
            ],
            'innova' => [
                'basePrice' => 4000,
                'pricePerKm' => 17,
                'pickupPrice' => 1200,
                'dropPrice' => 1200,
                'tier1Price' => 1000,
                'tier2Price' => 1200,
                'tier3Price' => 1400,
                'tier4Price' => 1600,
                'extraKmCharge' => 17,
                'nightCharges' => 350,
                'extraWaitingCharges' => 250
            ]
        ];
        
        // If vehicle ID is provided, return only that vehicle's fares
        if (isset($defaultFares[$vehicleId])) {
            $fares[$vehicleId] = array_merge(
                ['id' => $vehicleId, 'vehicleId' => $vehicleId, 'vehicle_id' => $vehicleId, 'name' => ucfirst(str_replace('_', ' ', $vehicleId))],
                $defaultFares[$vehicleId]
            );
        }
    }
    
    // Return response
    echo json_encode([
        'status' => 'success',
        'fares' => $vehicleId ? ($fares[$vehicleId] ?? null) : $fares,
        'timestamp' => time(),
        'source' => empty($fares) ? 'sample' : 'database',
        'vehicle_id' => $vehicleId,
        'count' => count($fares)
    ]);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
