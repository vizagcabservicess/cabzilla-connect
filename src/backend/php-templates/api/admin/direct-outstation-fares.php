
<?php
/**
 * direct-outstation-fares.php - Direct API endpoint for outstation fares
 * Shows all available vehicles including those without outstation fares set
 */

// Ultra-aggressive CORS headers for maximum compatibility
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Debug-Endpoint: direct-outstation-fares'); // Debug header

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request details
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct outstation fares request: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-outstation-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/direct-outstation-fares.log');

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be'; 
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (Exception $e) {
        throw new Exception("Database connection error: " . $e->getMessage());
    }
}

// Logger function
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    error_log($logMessage, 3, __DIR__ . '/../../logs/direct-outstation-fares.log');
}

// Process request
try {
    // Connect to database
    $conn = getDbConnection();
    
    // Handle GET request to retrieve outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // First, get all active vehicles from the vehicles table
        $includeInactive = isset($_GET['includeInactive']) ? $_GET['includeInactive'] === 'true' : false;
        
        $vehicleQuery = "
            SELECT id, vehicle_id, name 
            FROM vehicles 
            WHERE is_active = 1 OR :includeInactive = 1
            ORDER BY name
        ";
        
        $vehicleStmt = $conn->prepare($vehicleQuery);
        $vehicleStmt->bindValue(':includeInactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $vehicleStmt->execute();
        $vehicles = $vehicleStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Now get all outstation fares
        $fareQuery = "
            SELECT v.id, v.vehicle_id, v.name, vp.* 
            FROM vehicle_pricing vp
            RIGHT JOIN vehicles v ON vp.vehicle_id = v.vehicle_id AND vp.trip_type = 'outstation'
            WHERE v.is_active = 1 OR :includeInactive = 1
            ORDER BY v.name
        ";
        
        $fareStmt = $conn->prepare($fareQuery);
        $fareStmt->bindValue(':includeInactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $fareStmt->execute();
        $fares = $fareStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create a map of vehicle IDs to fares
        $fareMap = [];
        foreach ($fares as $fare) {
            $vehicleId = $fare['vehicle_id'];
            $fareMap[$vehicleId] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $fare['name'],
                'baseFare' => isset($fare['base_fare']) ? floatval($fare['base_fare']) : 0,
                'pricePerKm' => isset($fare['price_per_km']) ? floatval($fare['price_per_km']) : 0,
                'nightHaltCharge' => isset($fare['night_halt_charge']) ? floatval($fare['night_halt_charge']) : 0,
                'driverAllowance' => isset($fare['driver_allowance']) ? floatval($fare['driver_allowance']) : 0,
                'hasFares' => isset($fare['id']) ? true : false
            ];
        }
        
        // Add any vehicles that don't have outstation fares yet
        foreach ($vehicles as $vehicle) {
            $vehicleId = $vehicle['vehicle_id'];
            if (!isset($fareMap[$vehicleId])) {
                $fareMap[$vehicleId] = [
                    'id' => $vehicleId,
                    'vehicleId' => $vehicleId,
                    'name' => $vehicle['name'],
                    'baseFare' => 0,
                    'pricePerKm' => 0,
                    'nightHaltCharge' => 0,
                    'driverAllowance' => 0,
                    'hasFares' => false
                ];
            }
        }
        
        // Return all fares, including placeholder entries for vehicles without fares
        echo json_encode([
            'status' => 'success',
            'fares' => array_values($fareMap),
            'count' => count($fareMap),
            'includeInactive' => $includeInactive,
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Handle POST request to update outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = $_POST;
        $rawVehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
        
        logMessage("Vehicle ID received: " . $rawVehicleId);
        
        // Clean vehicleId - remove "item-" prefix if exists
        $vehicleId = $rawVehicleId;
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Map numeric IDs if needed
        $numericIdMap = [
            '1' => 'sedan', 
            '2' => 'ertiga', 
            '3' => 'innova',
            '4' => 'crysta',
            '5' => 'tempo',
            '180' => 'etios',
            '592' => 'urbania',
            '1266' => 'mpv',
            '1270' => 'mpv'
        ];
        
        if (is_numeric($vehicleId) && isset($numericIdMap[$vehicleId])) {
            $oldId = $vehicleId;
            $vehicleId = $numericIdMap[$vehicleId];
            logMessage("Mapped numeric ID $oldId to vehicle_id: $vehicleId");
        }
        
        // Validate vehicle ID
        if (empty($vehicleId)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Vehicle ID is required'
            ]);
            exit;
        }
        
        // Extract fare values
        $baseFare = isset($data['baseFare']) ? floatval($data['baseFare']) : 
                  (isset($data['base_fare']) ? floatval($data['base_fare']) : 0);
                  
        $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 
                    (isset($data['price_per_km']) ? floatval($data['price_per_km']) : 0);
                    
        $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 
                         (isset($data['night_halt_charge']) ? floatval($data['night_halt_charge']) : 0);
                         
        $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 
                         (isset($data['driver_allowance']) ? floatval($data['driver_allowance']) : 0);
        
        // Begin transaction
        $conn->beginTransaction();
        
        try {
            // First ensure vehicle exists in vehicles table
            $checkVehicleQuery = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id = ?";
            $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
            $checkVehicleStmt->execute([$vehicleId]);
            $vehicleExists = $checkVehicleStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$vehicleExists) {
                // Create the vehicle
                $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                
                $insertVehicleQuery = "
                    INSERT INTO vehicles (vehicle_id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, 1, NOW(), NOW())
                ";
                
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->execute([$vehicleId, $vehicleName]);
                
                logMessage("Created new vehicle: " . $vehicleId);
            } else {
                logMessage("Vehicle exists: " . $vehicleId);
            }
            
            // Check if vehicle_pricing table exists
            $checkTableQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
            $checkTableStmt = $conn->query($checkTableQuery);
            $tableExists = ($checkTableStmt->rowCount() > 0);
            
            if (!$tableExists) {
                // Create the table
                $createTableQuery = "
                    CREATE TABLE vehicle_pricing (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type enum('local','outstation','airport') NOT NULL,
                        base_fare DECIMAL(10,2) DEFAULT 0.00,
                        price_per_km DECIMAL(10,2) DEFAULT 0.00,
                        night_halt_charge DECIMAL(10,2) DEFAULT 0.00,
                        driver_allowance DECIMAL(10,2) DEFAULT 0.00,
                        local_package_4hr DECIMAL(10,2) DEFAULT 0.00,
                        local_package_8hr DECIMAL(10,2) DEFAULT 0.00,
                        local_package_10hr DECIMAL(10,2) DEFAULT 0.00,
                        extra_km_charge DECIMAL(10,2) DEFAULT 0.00,
                        extra_hour_charge DECIMAL(10,2) DEFAULT 0.00,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_type_trip_type (vehicle_id,trip_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ";
                
                $conn->exec($createTableQuery);
                logMessage("Created vehicle_pricing table");
            }
            
            // Check if fare record exists for this vehicle and trip type
            $checkFareQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'";
            $checkFareStmt = $conn->prepare($checkFareQuery);
            $checkFareStmt->execute([$vehicleId]);
            $fareExists = $checkFareStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($fareExists) {
                // Update existing record
                $updateQuery = "
                    UPDATE vehicle_pricing
                    SET base_fare = ?,
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ? AND trip_type = 'outstation'
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->execute([
                    $baseFare,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance,
                    $vehicleId
                ]);
                
                logMessage("Updated outstation fares for vehicle: " . $vehicleId);
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id,
                        trip_type,
                        base_fare,
                        price_per_km,
                        night_halt_charge,
                        driver_allowance,
                        created_at,
                        updated_at
                    ) VALUES (?, 'outstation', ?, ?, ?, ?, NOW(), NOW())
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->execute([
                    $vehicleId,
                    $baseFare,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance
                ]);
                
                logMessage("Inserted outstation fares for vehicle: " . $vehicleId);
            }
            
            $conn->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => "Outstation fares updated for $vehicleId",
                'data' => [
                    'vehicleId' => $vehicleId,
                    'baseFare' => $baseFare,
                    'pricePerKm' => $pricePerKm,
                    'nightHaltCharge' => $nightHaltCharge,
                    'driverAllowance' => $driverAllowance
                ],
                'timestamp' => time()
            ]);
            
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    } else {
        // Method not supported
        echo json_encode([
            'status' => 'error',
            'message' => 'Method not supported',
            'method' => $_SERVER['REQUEST_METHOD']
        ]);
    }
    
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
