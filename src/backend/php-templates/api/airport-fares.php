
<?php
require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: airport-fares.php');
header('X-API-Version: 1.0.2');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

file_put_contents($logFile, "[$timestamp] Airport fares request received\n", FILE_APPEND);

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    if (!$vehicleId && isset($_GET['vehicleId'])) {
        $vehicleId = $_GET['vehicleId'];
    }
    
    // Log the request parameters
    file_put_contents($logFile, "[$timestamp] Request parameters: " . json_encode($_GET) . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Vehicle ID: " . ($vehicleId ? $vehicleId : "not specified") . "\n", FILE_APPEND);
    
    // Check if airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $airportTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // Log which table will be used
    file_put_contents($logFile, "[$timestamp] Checking airport_transfer_fares table exists: " . ($airportTableExists ? 'yes' : 'no') . "\n", FILE_APPEND);
    
    $query = "";
    $useAirportTable = false;
    
    if ($airportTableExists) {
        // First check if the airport_transfer_fares table has data
        $countQuery = "SELECT COUNT(*) as count FROM airport_transfer_fares";
        $countResult = $conn->query($countQuery);
        $row = $countResult->fetch_assoc();
        $hasData = $row['count'] > 0;
        
        file_put_contents($logFile, "[$timestamp] airport_transfer_fares table has data: " . ($hasData ? 'yes (' . $row['count'] . ' rows)' : 'no') . "\n", FILE_APPEND);
        
        if ($hasData) {
            $useAirportTable = true;
            // QUERY SPECIALIZED AIRPORT FARES TABLE
            $query = "
                SELECT 
                    atf.id,
                    atf.vehicle_id,
                    atf.base_price AS basePrice,
                    atf.price_per_km AS pricePerKm,
                    atf.pickup_price AS pickupPrice,
                    atf.drop_price AS dropPrice,
                    atf.tier1_price AS tier1Price,
                    atf.tier2_price AS tier2Price,
                    atf.tier3_price AS tier3Price,
                    atf.tier4_price AS tier4Price,
                    atf.extra_km_charge AS extraKmCharge
                FROM 
                    airport_transfer_fares atf
            ";
            
            // If vehicle_id parameter is provided, filter by it
            if ($vehicleId) {
                $query .= " WHERE atf.vehicle_id = '$vehicleId'";
            }
            
            file_put_contents($logFile, "[$timestamp] Using airport_transfer_fares table with query: $query\n", FILE_APPEND);
        }
    }
    
    // Fallback to vehicle_pricing table if needed
    if (!$useAirportTable) {
        file_put_contents($logFile, "[$timestamp] Falling back to vehicle_pricing table\n", FILE_APPEND);
        
        // First check if vehicle_pricing table exists
        $checkVPQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
        $checkVPResult = $conn->query($checkVPQuery);
        $vpTableExists = $checkVPResult && $checkVPResult->num_rows > 0;
        
        if (!$vpTableExists) {
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
            
            $conn->query($createVPTableSql);
            file_put_contents($logFile, "[$timestamp] Created vehicle_pricing table\n", FILE_APPEND);
        }
        
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.id,
                vp.vehicle_id,
                vp.airport_base_price AS basePrice,
                vp.airport_price_per_km AS pricePerKm,
                vp.airport_pickup_price AS pickupPrice,
                vp.airport_drop_price AS dropPrice,
                vp.airport_tier1_price AS tier1Price,
                vp.airport_tier2_price AS tier2Price,
                vp.airport_tier3_price AS tier3Price,
                vp.airport_tier4_price AS tier4Price,
                vp.airport_extra_km_charge AS extraKmCharge
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'airport'
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        file_put_contents($logFile, "[$timestamp] Using vehicle_pricing table with query: $query\n", FILE_APPEND);
    }
    
    // Execute the query with error handling
    file_put_contents($logFile, "[$timestamp] Executing airport query: " . $query . "\n", FILE_APPEND);
    $result = $conn->query($query);
    
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Query failed: " . $conn->error . "\n", FILE_APPEND);
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Process and structure the data
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $id = $row['vehicle_id'] ?? null;
        
        // Skip entries with null ID
        if (!$id) continue;
        
        file_put_contents($logFile, "[$timestamp] Processing row for vehicle: $id\n", FILE_APPEND);
        
        // Check if this row has any useful fare data
        $hasData = false;
        foreach (['basePrice', 'pickupPrice', 'dropPrice', 'tier1Price', 'tier2Price'] as $key) {
            if (isset($row[$key]) && $row[$key] > 0) {
                $hasData = true;
                break;
            }
        }
        
        if (!$hasData) {
            file_put_contents($logFile, "[$timestamp] Skipping row for $id as it has no useful data\n", FILE_APPEND);
            continue;
        }
        
        // Map to standardized properties
        $fares[$id] = [
            'vehicleId' => $id,
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'pickupPrice' => floatval($row['pickupPrice'] ?? 0),
            'dropPrice' => floatval($row['dropPrice'] ?? 0),
            'tier1Price' => floatval($row['tier1Price'] ?? 0),
            'tier2Price' => floatval($row['tier2Price'] ?? 0),
            'tier3Price' => floatval($row['tier3Price'] ?? 0),
            'tier4Price' => floatval($row['tier4Price'] ?? 0),
            'extraKmCharge' => floatval($row['extraKmCharge'] ?? 0)
        ];
        
        file_put_contents($logFile, "[$timestamp] Fare data for $id: " . json_encode($fares[$id]) . "\n", FILE_APPEND);
    }
    
    // If we have no fares but the vehicle ID was provided, try to create a default entry
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] No fares found for vehicle $vehicleId, creating default entry\n", FILE_APPEND);
        
        // First check if the vehicle exists
        $checkVehicleQuery = "SELECT id FROM vehicles WHERE vehicle_id = ? OR id = ?";
        $checkStmt = $conn->prepare($checkVehicleQuery);
        $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        // If vehicle doesn't exist, create it
        if ($checkResult->num_rows === 0) {
            $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
            $insertVehicleQuery = "INSERT INTO vehicles (vehicle_id, name, is_active) VALUES (?, ?, 1)";
            $insertStmt = $conn->prepare($insertVehicleQuery);
            $insertStmt->bind_param("ss", $vehicleId, $vehicleName);
            $insertStmt->execute();
            file_put_contents($logFile, "[$timestamp] Created vehicle: $vehicleId\n", FILE_APPEND);
        }
        
        // Now create a default airport fare entry
        if ($useAirportTable) {
            $insertFareQuery = "
                INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            ";
            $insertStmt = $conn->prepare($insertFareQuery);
            $insertStmt->bind_param("s", $vehicleId);
            $insertStmt->execute();
            file_put_contents($logFile, "[$timestamp] Created default airport fare entry in airport_transfer_fares\n", FILE_APPEND);
        } else {
            $insertFareQuery = "
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                 airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, airport_extra_km_charge)
                VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0)
            ";
            $insertStmt = $conn->prepare($insertFareQuery);
            $insertStmt->bind_param("s", $vehicleId);
            $insertStmt->execute();
            file_put_contents($logFile, "[$timestamp] Created default airport fare entry in vehicle_pricing\n", FILE_APPEND);
        }
        
        // Add default fare to response
        $fares[$vehicleId] = [
            'vehicleId' => $vehicleId,
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
    
    file_put_contents($logFile, "[$timestamp] Total fares found: " . count($fares) . "\n", FILE_APPEND);
    
    // Return response with debugging info
    $response = [
        'status' => 'success',
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $useAirportTable ? 'airport_transfer_fares' : 'vehicle_pricing',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ];
    
    echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
    file_put_contents($logFile, "[$timestamp] Response sent successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error in airport-fares.php: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
