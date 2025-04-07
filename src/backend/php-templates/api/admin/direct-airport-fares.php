
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Debug-Endpoint: direct-airport-fares');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

// Log this request
file_put_contents($logFile, "[$timestamp] Direct airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);

// Initialize response array
$response = [
    'status' => 'success',
    'message' => 'No vehicle ID provided, returning all fares',
    'fares' => [],
    'debug' => [
        'get_params' => $_GET,
        'timestamp' => $timestamp
    ]
];

// Get vehicle ID from query parameters - support multiple parameter names
$vehicleId = null;
$possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id'];

foreach ($possibleKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $vehicleId = trim($_GET[$key]);
        file_put_contents($logFile, "[$timestamp] Found vehicle ID in '$key': $vehicleId\n", FILE_APPEND);
        break;
    }
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);

    // First ensure the airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkTableResult = $conn->query($checkTableQuery);
    
    if (!$checkTableResult || $checkTableResult->num_rows === 0) {
        // Create the airport_transfer_fares table if it doesn't exist
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
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }

    // Also check for vehicle_pricing table and sync with it
    $checkVPTableQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVPResult = $conn->query($checkVPTableQuery);
    
    if (!$checkVPResult || $checkVPResult->num_rows === 0) {
        // Create the vehicle_pricing table if it doesn't exist
        $createVPTableSql = "
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL,
                airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVPTableSql)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created vehicle_pricing table\n", FILE_APPEND);
    }

    // Ensure the vehicles table exists and has data
    $vehiclesTableCheck = $conn->query("SHOW TABLES LIKE 'vehicles'");
    if (!$vehiclesTableCheck || $vehiclesTableCheck->num_rows === 0) {
        // Create vehicles table if it doesn't exist
        $createVehiclesTableSql = "
            CREATE TABLE IF NOT EXISTS vehicles (
                id VARCHAR(50) NOT NULL,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT NULL,
                capacity INT(11) DEFAULT 4,
                luggage_capacity INT(11) DEFAULT 2,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($createVehiclesTableSql);
        file_put_contents($logFile, "[$timestamp] Created vehicles table\n", FILE_APPEND);
    }

    // Add default vehicles if the table is empty
    $checkVehiclesCount = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    if ($checkVehiclesCount) {
        $vehiclesCount = $checkVehiclesCount->fetch_assoc();
        
        if ($vehiclesCount['count'] == 0) {
            // Insert default vehicles
            $defaultVehicles = [
                ['sedan', 'Sedan', 'Standard', 4, 2],
                ['ertiga', 'Ertiga', 'Standard', 6, 3],
                ['innova_crysta', 'Innova Crysta', 'Premium', 6, 4],
                ['luxury', 'Luxury', 'Luxury', 4, 2],
                ['tempo_traveller', 'Tempo Traveller', 'Group', 12, 10]
            ];
            
            $insertVehicleStmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, category, capacity, luggage_capacity, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            
            if ($insertVehicleStmt) {
                foreach ($defaultVehicles as $vehicle) {
                    $insertVehicleStmt->bind_param("ssssii", $vehicle[0], $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4]);
                    $insertVehicleStmt->execute();
                }
                
                file_put_contents($logFile, "[$timestamp] Inserted default vehicles\n", FILE_APPEND);
            }
        }
    }

    // If no vehicle ID provided, return all fares with vehicle info
    if (!$vehicleId) {
        // Get all vehicles to ensure we have complete data
        $allVehiclesQuery = "SELECT id, vehicle_id, name, category, capacity, luggage_capacity, is_active FROM vehicles WHERE is_active = 1";
        $allVehiclesResult = $conn->query($allVehiclesQuery);
        
        $allFares = [];
        
        if ($allVehiclesResult && $allVehiclesResult->num_rows > 0) {
            while ($vehicle = $allVehiclesResult->fetch_assoc()) {
                $vid = $vehicle['vehicle_id'];
                
                // Try to get fare data for this vehicle
                $fareQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
                $fareStmt = $conn->prepare($fareQuery);
                
                if (!$fareStmt) {
                    file_put_contents($logFile, "[$timestamp] Failed to prepare fare query for vehicle: $vid, error: " . $conn->error . "\n", FILE_APPEND);
                    continue;
                }
                
                $fareStmt->bind_param("s", $vid);
                $fareStmt->execute();
                $fareResult = $fareStmt->get_result();
                
                if ($fareResult && $fareResult->num_rows > 0) {
                    $fare = $fareResult->fetch_assoc();
                    
                    $allFares[] = [
                        'vehicleId' => $vid,
                        'vehicle_id' => $vid,
                        'name' => $vehicle['name'],
                        'category' => $vehicle['category'],
                        'capacity' => (int)$vehicle['capacity'],
                        'luggage' => (int)$vehicle['luggage_capacity'],
                        'active' => (bool)$vehicle['is_active'],
                        'basePrice' => floatval($fare['base_price']),
                        'pricePerKm' => floatval($fare['price_per_km']),
                        'pickupPrice' => floatval($fare['pickup_price']),
                        'dropPrice' => floatval($fare['drop_price']),
                        'tier1Price' => floatval($fare['tier1_price']),
                        'tier2Price' => floatval($fare['tier2_price']),
                        'tier3Price' => floatval($fare['tier3_price']),
                        'tier4Price' => floatval($fare['tier4_price']),
                        'extraKmCharge' => floatval($fare['extra_km_charge'])
                    ];
                } else {
                    // Create default fare entry for this vehicle
                    $insertFareQuery = "
                        INSERT INTO airport_transfer_fares 
                        (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                        VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                    ";
                    $insertFareStmt = $conn->prepare($insertFareQuery);
                    
                    if ($insertFareStmt) {
                        $insertFareStmt->bind_param("s", $vid);
                        $insertFareStmt->execute();
                        
                        $allFares[] = [
                            'vehicleId' => $vid,
                            'vehicle_id' => $vid,
                            'name' => $vehicle['name'],
                            'category' => $vehicle['category'],
                            'capacity' => (int)$vehicle['capacity'],
                            'luggage' => (int)$vehicle['luggage_capacity'],
                            'active' => (bool)$vehicle['is_active'],
                            'basePrice' => 0,
                            'pricePerKm' => 0,
                            'pickupPrice' => 0,
                            'dropPrice' => 0,
                            'tier1Price' => 0,
                            'tier2Price' => 0,
                            'tier3Price' => 0,
                            'tier4Price' => 0,
                            'extraKmCharge' => 0
                        ];
                    }
                }
            }
        }
        
        $response['fares'] = $allFares;
        $response['count'] = count($allFares);
        $response['message'] = 'Retrieved all airport fares for all vehicles';
        
        echo json_encode($response);
        exit;
    }

    // First ensure the vehicle exists in vehicles table
    $checkVehicleQuery = "SELECT id, vehicle_id, name, category, capacity, luggage_capacity, is_active FROM vehicles WHERE vehicle_id = ? OR id = ?";
    $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
    
    if (!$checkVehicleStmt) {
        throw new Exception("Prepare statement failed for vehicle check: " . $conn->error);
    }
    
    $checkVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkVehicleStmt->execute();
    $checkVehicleResult = $checkVehicleStmt->get_result();
    
    $vehicleData = null;
    
    // If vehicle doesn't exist, create it
    if ($checkVehicleResult->num_rows === 0) {
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        
        $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, is_active) VALUES (?, ?, ?, 1)";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        
        if (!$insertVehicleStmt) {
            throw new Exception("Prepare statement failed for vehicle insert: " . $conn->error);
        }
        
        $insertVehicleStmt->bind_param("sss", $vehicleId, $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        
        file_put_contents($logFile, "[$timestamp] Created new vehicle: $vehicleId, $vehicleName\n", FILE_APPEND);
        
        $vehicleData = [
            'id' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => $vehicleName,
            'category' => 'Standard',
            'capacity' => 4,
            'luggage_capacity' => 2,
            'is_active' => 1
        ];
    } else {
        $vehicleData = $checkVehicleResult->fetch_assoc();
        file_put_contents($logFile, "[$timestamp] Found existing vehicle: " . json_encode($vehicleData) . "\n", FILE_APPEND);
    }
    
    // Now get airport fare for this vehicle from airport_transfer_fares table
    $query = "
        SELECT 
            id,
            vehicle_id,
            base_price,
            price_per_km,
            pickup_price,
            drop_price,
            tier1_price,
            tier2_price,
            tier3_price,
            tier4_price,
            extra_km_charge
        FROM 
            airport_transfer_fares
        WHERE 
            vehicle_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $fare = null;
    
    if ($result && $result->num_rows > 0) {
        // Fetch existing fare data
        $row = $result->fetch_assoc();
        $fare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => $vehicleData['name'],
            'category' => $vehicleData['category'],
            'capacity' => (int)$vehicleData['capacity'],
            'luggage' => (int)$vehicleData['luggage_capacity'],
            'active' => (bool)$vehicleData['is_active'],
            'basePrice' => floatval($row['base_price']),
            'pricePerKm' => floatval($row['price_per_km']),
            'pickupPrice' => floatval($row['pickup_price']),
            'dropPrice' => floatval($row['drop_price']),
            'tier1Price' => floatval($row['tier1_price']),
            'tier2Price' => floatval($row['tier2_price']),
            'tier3Price' => floatval($row['tier3_price']),
            'tier4Price' => floatval($row['tier4_price']),
            'extraKmCharge' => floatval($row['extra_km_charge'])
        ];
        
        file_put_contents($logFile, "[$timestamp] Found existing fare data for vehicle: $vehicleId\n", FILE_APPEND);
    } else {
        // Create a default airport fare entry
        $insertQuery = "
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at) 
            VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW())
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            throw new Exception("Prepare insert statement failed: " . $conn->error);
        }
        
        $insertStmt->bind_param("s", $vehicleId);
        $insertStmt->execute();
        
        // Define default fare data with vehicle info
        $fare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => $vehicleData['name'],
            'category' => $vehicleData['category'],
            'capacity' => (int)$vehicleData['capacity'],
            'luggage' => (int)$vehicleData['luggage_capacity'],
            'active' => (bool)$vehicleData['is_active'],
            'basePrice' => 0,
            'pricePerKm' => 0,
            'pickupPrice' => 0,
            'dropPrice' => 0,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0
        ];
        
        file_put_contents($logFile, "[$timestamp] Created default fare data for vehicle: $vehicleId\n", FILE_APPEND);
    }
    
    // Also sync with vehicle_pricing table for compatibility
    $syncVehiclePricingQuery = "
        INSERT INTO vehicle_pricing 
        (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, 
        airport_drop_price, airport_tier1_price, airport_tier2_price, airport_tier3_price, 
        airport_tier4_price, airport_extra_km_charge, updated_at)
        VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        airport_base_price = VALUES(airport_base_price),
        airport_price_per_km = VALUES(airport_price_per_km),
        airport_pickup_price = VALUES(airport_pickup_price),
        airport_drop_price = VALUES(airport_drop_price),
        airport_tier1_price = VALUES(airport_tier1_price),
        airport_tier2_price = VALUES(airport_tier2_price),
        airport_tier3_price = VALUES(airport_tier3_price),
        airport_tier4_price = VALUES(airport_tier4_price),
        airport_extra_km_charge = VALUES(airport_extra_km_charge),
        updated_at = NOW()
    ";
    
    $syncStmt = $conn->prepare($syncVehiclePricingQuery);
    if ($syncStmt) {
        $basePrice = $fare['basePrice'];
        $pricePerKm = $fare['pricePerKm'];
        $pickupPrice = $fare['pickupPrice'];
        $dropPrice = $fare['dropPrice'];
        $tier1Price = $fare['tier1Price'];
        $tier2Price = $fare['tier2Price'];
        $tier3Price = $fare['tier3Price'];
        $tier4Price = $fare['tier4Price'];
        $extraKmCharge = $fare['extraKmCharge'];
        
        $syncStmt->bind_param(
            "sddddddddd", 
            $vehicleId, 
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
        $syncStmt->execute();
        
        file_put_contents($logFile, "[$timestamp] Synced data to vehicle_pricing table for vehicle: $vehicleId\n", FILE_APPEND);
    }
    
    // Return fare data
    $response = [
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'fares' => [$fare],
        'debug' => [
            'vehicle_id' => $vehicleId,
            'timestamp' => time()
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'debug' => [
            'vehicle_id' => $vehicleId ?? 'Not provided',
            'timestamp' => time(),
            'error' => $e->getMessage()
        ]
    ]);
}
