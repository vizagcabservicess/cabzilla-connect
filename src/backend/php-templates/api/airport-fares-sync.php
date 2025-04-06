
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Creation');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if admin mode is enabled
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';
if (!$isAdminMode) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'Admin access required for this endpoint'
    ]);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_sync_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

try {
    // Get input parameters
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?: [];
    
    file_put_contents($logFile, "[$timestamp] Airport fares sync request: " . json_encode($input) . "\n", FILE_APPEND);
    
    // Check if we should apply default fares when creating new records
    $applyDefaults = isset($input['applyDefaults']) ? (bool)$input['applyDefaults'] : true;
    $specificVehicleId = isset($input['vehicleId']) ? $input['vehicleId'] : null;
    
    // Connect to database
    $conn = getDbConnection();
    
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
    
    // Check if required columns exist and add them if missing
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
    
    // Get all active vehicles
    $vehicleQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    if ($specificVehicleId) {
        $vehicleQuery .= " AND vehicle_id = '$specificVehicleId'";
    }
    
    $vehicleResult = $conn->query($vehicleQuery);
    $vehicles = [];
    while ($row = $vehicleResult->fetch_assoc()) {
        $vehicles[] = $row;
    }
    
    file_put_contents($logFile, "[$timestamp] Found " . count($vehicles) . " active vehicles\n", FILE_APPEND);
    
    // Default airport fare values based on vehicle type
    $defaultFares = [
        'sedan' => [
            'base_price' => 3000,
            'price_per_km' => 12,
            'pickup_price' => 800,
            'drop_price' => 800,
            'tier1_price' => 600,
            'tier2_price' => 800,
            'tier3_price' => 1000,
            'tier4_price' => 1200,
            'extra_km_charge' => 12,
            'night_charges' => 250,
            'extra_waiting_charges' => 150
        ],
        'ertiga' => [
            'base_price' => 3500,
            'price_per_km' => 15,
            'pickup_price' => 1000,
            'drop_price' => 1000,
            'tier1_price' => 800,
            'tier2_price' => 1000,
            'tier3_price' => 1200,
            'tier4_price' => 1400,
            'extra_km_charge' => 15,
            'night_charges' => 300,
            'extra_waiting_charges' => 200
        ],
        'innova' => [
            'base_price' => 4000,
            'price_per_km' => 17,
            'pickup_price' => 1200,
            'drop_price' => 1200,
            'tier1_price' => 1000,
            'tier2_price' => 1200,
            'tier3_price' => 1400,
            'tier4_price' => 1600,
            'extra_km_charge' => 17,
            'night_charges' => 350,
            'extra_waiting_charges' => 250
        ],
        'innova_crysta' => [
            'base_price' => 4000,
            'price_per_km' => 17,
            'pickup_price' => 1200,
            'drop_price' => 1200,
            'tier1_price' => 1000,
            'tier2_price' => 1200,
            'tier3_price' => 1400,
            'tier4_price' => 1600,
            'extra_km_charge' => 17,
            'night_charges' => 350,
            'extra_waiting_charges' => 250
        ],
        'tempo_traveller' => [
            'base_price' => 6000,
            'price_per_km' => 19,
            'pickup_price' => 2000,
            'drop_price' => 2000,
            'tier1_price' => 1600,
            'tier2_price' => 1800,
            'tier3_price' => 2000,
            'tier4_price' => 2500,
            'extra_km_charge' => 19,
            'night_charges' => 400,
            'extra_waiting_charges' => 300
        ],
        'default' => [
            'base_price' => 3500,
            'price_per_km' => 15,
            'pickup_price' => 1000,
            'drop_price' => 1000,
            'tier1_price' => 800,
            'tier2_price' => 1000,
            'tier3_price' => 1200,
            'tier4_price' => 1400,
            'extra_km_charge' => 15,
            'night_charges' => 300,
            'extra_waiting_charges' => 200
        ]
    ];
    
    // Process each vehicle
    $created = 0;
    $updated = 0;
    $skipped = 0;
    
    foreach ($vehicles as $vehicle) {
        $vehicleId = $vehicle['vehicle_id'];
        
        // Check if vehicle already has airport fares
        $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $hasExistingFare = $checkResult->num_rows > 0;
        
        if ($hasExistingFare) {
            // Already exists, update if requested
            if (isset($input['forceUpdate']) && $input['forceUpdate']) {
                // Get the default fare for this vehicle type if available
                $fareDefaults = $defaultFares[$vehicleId] ?? $defaultFares['default'];
                
                $updateQuery = "UPDATE airport_transfer_fares SET
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
                    WHERE vehicle_id = ?";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bind_param("ddddddddddds",
                    $fareDefaults['base_price'],
                    $fareDefaults['price_per_km'],
                    $fareDefaults['pickup_price'],
                    $fareDefaults['drop_price'],
                    $fareDefaults['tier1_price'], 
                    $fareDefaults['tier2_price'],
                    $fareDefaults['tier3_price'],
                    $fareDefaults['tier4_price'],
                    $fareDefaults['extra_km_charge'],
                    $fareDefaults['night_charges'],
                    $fareDefaults['extra_waiting_charges'],
                    $vehicleId
                );
                
                $updateStmt->execute();
                $updateStmt->close();
                
                $updated++;
                file_put_contents($logFile, "[$timestamp] Updated airport fares for vehicle: $vehicleId\n", FILE_APPEND);
            } else {
                $skipped++;
                file_put_contents($logFile, "[$timestamp] Skipped existing airport fares for vehicle: $vehicleId\n", FILE_APPEND);
            }
        } else {
            // No existing fare, create new one
            
            // Decide which values to use
            if ($applyDefaults) {
                // Get the default fare for this vehicle type if available
                $fareDefaults = $defaultFares[$vehicleId] ?? $defaultFares['default'];
                
                // For vehicle types not directly in our defaults, try to match by prefix
                if (!isset($defaultFares[$vehicleId])) {
                    foreach (['sedan', 'ertiga', 'innova', 'tempo_traveller'] as $prefix) {
                        if (strpos($vehicleId, $prefix) === 0) {
                            $fareDefaults = $defaultFares[$prefix];
                            break;
                        }
                    }
                }
                
                $basePrice = $fareDefaults['base_price'];
                $pricePerKm = $fareDefaults['price_per_km'];
                $pickupPrice = $fareDefaults['pickup_price'];
                $dropPrice = $fareDefaults['drop_price'];
                $tier1Price = $fareDefaults['tier1_price'];
                $tier2Price = $fareDefaults['tier2_price'];
                $tier3Price = $fareDefaults['tier3_price'];
                $tier4Price = $fareDefaults['tier4_price'];
                $extraKmCharge = $fareDefaults['extra_km_charge'];
                $nightCharges = $fareDefaults['night_charges'];
                $extraWaitingCharges = $fareDefaults['extra_waiting_charges'];
            } else {
                // Use basic zero values
                $basePrice = 0;
                $pricePerKm = 0;
                $pickupPrice = 0;
                $dropPrice = 0;
                $tier1Price = 0;
                $tier2Price = 0;
                $tier3Price = 0;
                $tier4Price = 0;
                $extraKmCharge = 0;
                $nightCharges = 0;
                $extraWaitingCharges = 0;
            }
            
            // Insert new record
            $insertQuery = "INSERT INTO airport_transfer_fares (
                vehicle_id, 
                base_price, 
                price_per_km, 
                pickup_price, 
                drop_price, 
                tier1_price, 
                tier2_price, 
                tier3_price, 
                tier4_price, 
                extra_km_charge,
                night_charges,
                extra_waiting_charges,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            
            $insertStmt = $conn->prepare($insertQuery);
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
            $insertStmt->close();
            
            $created++;
            file_put_contents($logFile, "[$timestamp] Created airport fares for vehicle: $vehicleId\n", FILE_APPEND);
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Airport fares sync completed successfully",
        'stats' => [
            'total' => count($vehicles),
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped
        ],
        'timestamp' => time()
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
