<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// CORS Headers - Always include for API endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-API-Version');
header('Content-Type: application/json');

// Add debugging headers
header('X-Debug-File: local-package-fares.php');
header('X-API-Version: 1.0.56');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request for debugging
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] local-package-fares.php: " . $_SERVER['REQUEST_METHOD'] . " request received", 3, $logDir . '/local-package-fares.log');
error_log("[$timestamp] GET params: " . json_encode($_GET), 3, $logDir . '/local-package-fares.log');

// Map numeric IDs to proper vehicle_ids - keep this mapping consistent across all files
$numericIdMapExtended = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga'
];

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => "Database connection failed",
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Map numeric ID to string ID if needed
    if (is_numeric($vehicleId) && isset($numericIdMapExtended[$vehicleId])) {
        error_log("[$timestamp] Mapped numeric ID $vehicleId to " . $numericIdMapExtended[$vehicleId], 3, $logDir . '/local-package-fares.log');
        $vehicleId = $numericIdMapExtended[$vehicleId];
    }
    
    // Check if package_id parameter is present
    $packageId = isset($_GET['package_id']) ? $_GET['package_id'] : null;
    
    // First check if local_package_fares table exists
    $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    
    // If table doesn't exist, try to create it
    if (!$localFaresTableExists) {
        $createLocalFaresTable = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
            `id` int NOT NULL AUTO_INCREMENT,
            `vehicle_id` varchar(50) NOT NULL,
            `price_4hr_40km` decimal(10,2) NOT NULL DEFAULT 0,
            `price_8hr_80km` decimal(10,2) NOT NULL DEFAULT 0,
            `price_10hr_100km` decimal(10,2) NOT NULL DEFAULT 0,
            `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0,
            `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createLocalFaresTable);
        $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        error_log("[$timestamp] Created local_package_fares table: " . ($localFaresTableExists ? "success" : "failed"), 3, $logDir . '/local-package-fares.log');
        
        // Initialize with default data if table is empty
        if ($localFaresTableExists) {
            $checkEmpty = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
            $row = $checkEmpty->fetch_assoc();
            
            if ($row['count'] == 0) {
                // Insert default values for common cab types
                $defaultVehicles = [
                    ['sedan', 1200, 2500, 3000, 14, 250],
                    ['ertiga', 1800, 3000, 3600, 18, 300],
                    ['innova', 2300, 3800, 4500, 20, 350],
                    ['innova_crysta', 2300, 3800, 4500, 20, 350],
                    ['tempo', 3000, 4500, 5500, 25, 400],
                    ['luxury', 3500, 5500, 6500, 30, 450]
                ];
                
                $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                    (vehicle_id, price_4hr_40km, price_8hr_80km, price_10hr_100km, extra_km_rate, extra_hour_rate) 
                    VALUES (?, ?, ?, ?, ?, ?)");
                
                foreach ($defaultVehicles as $vehicle) {
                    $insertStmt->bind_param("sddddd", 
                        $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]
                    );
                    $insertStmt->execute();
                }
                
                error_log("[$timestamp] Initialized local_package_fares with default data", 3, $logDir . '/local-package-fares.log');
            }
        }
    }
    
    // Handle POST request to update fares
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
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => "Vehicle ID is required",
                'timestamp' => time()
            ]);
            exit;
        }
        
        // Clean vehicleId - remove "item-" prefix if exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Map numeric ID to string ID if needed
        if (is_numeric($vehicleId)) {
            if (isset($numericIdMapExtended[$vehicleId])) {
                $originalId = $vehicleId; 
                $vehicleId = $numericIdMapExtended[$vehicleId];
                error_log("[$timestamp] Mapped numeric ID $originalId to $vehicleId", 3, $logDir . '/local-package-fares.log');
            } else {
                error_log("[$timestamp] REJECTED: Unmapped numeric ID $vehicleId not allowed", 3, $logDir . '/local-package-fares.log');
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id like 'sedan', 'ertiga', etc.",
                    'timestamp' => time()
                ]);
                exit;
            }
        }
        
        // If vehicleId is still numeric at this point, reject it
        if (is_numeric($vehicleId)) {
            error_log("[$timestamp] CRITICAL: ID is still numeric after processing: $vehicleId", 3, $logDir . '/local-package-fares.log');
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => "Cannot use numeric ID '$vehicleId'. Only string-based vehicle IDs are allowed.",
                'timestamp' => time()
            ]);
            exit;
        }
        
        // Get prices from request data with multiple fallbacks
        $price4hrs40km = 0;
        $price8hrs80km = 0;
        $price10hrs100km = 0;
        $priceExtraKm = 0;
        $priceExtraHour = 0;
        
        // Extract 4hr package price
        foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hr_40km'] as $field) {
            if (isset($input[$field]) && is_numeric($input[$field])) {
                $price4hrs40km = floatval($input[$field]);
                break;
            }
        }
        
        // Also check in packages or fares objects
        if ($price4hrs40km == 0 && isset($input['packages']) && isset($input['packages']['4hrs-40km'])) {
            $price4hrs40km = floatval($input['packages']['4hrs-40km']);
        }
        if ($price4hrs40km == 0 && isset($input['fares']) && isset($input['fares']['4hrs-40km'])) {
            $price4hrs40km = floatval($input['fares']['4hrs-40km']);
        }
        
        // Extract 8hr package price
        foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hr_80km'] as $field) {
            if (isset($input[$field]) && is_numeric($input[$field])) {
                $price8hrs80km = floatval($input[$field]);
                break;
            }
        }
        
        // Also check in packages or fares objects
        if ($price8hrs80km == 0 && isset($input['packages']) && isset($input['packages']['8hrs-80km'])) {
            $price8hrs80km = floatval($input['packages']['8hrs-80km']);
        }
        if ($price8hrs80km == 0 && isset($input['fares']) && isset($input['fares']['8hrs-80km'])) {
            $price8hrs80km = floatval($input['fares']['8hrs-80km']);
        }
        
        // Extract 10hr package price
        foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hr_100km'] as $field) {
            if (isset($input[$field]) && is_numeric($input[$field])) {
                $price10hrs100km = floatval($input[$field]);
                break;
            }
        }
        
        // Also check in packages or fares objects
        if ($price10hrs100km == 0 && isset($input['packages']) && isset($input['packages']['10hrs-100km'])) {
            $price10hrs100km = floatval($input['packages']['10hrs-100km']);
        }
        if ($price10hrs100km == 0 && isset($input['fares']) && isset($input['fares']['10hrs-100km'])) {
            $price10hrs100km = floatval($input['fares']['10hrs-100km']);
        }
        
        // Extract extra km rate
        foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'price_extra_km'] as $field) {
            if (isset($input[$field]) && is_numeric($input[$field])) {
                $priceExtraKm = floatval($input[$field]);
                break;
            }
        }
        
        // Extract extra hour rate
        foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'price_extra_hour'] as $field) {
            if (isset($input[$field]) && is_numeric($input[$field])) {
                $priceExtraHour = floatval($input[$field]);
                break;
            }
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
            
            error_log("[$timestamp] Created new vehicle: $vehicleId", 3, $logDir . '/local-package-fares.log');
        }
        
        // Try to update the database
        try {
            // Check if record exists
            $checkStmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing record
                $updateStmt = $conn->prepare("UPDATE local_package_fares SET 
                    price_4hr_40km = ?,
                    price_8hr_80km = ?,
                    price_10hr_100km = ?,
                    extra_km_rate = ?,
                    extra_hour_rate = ?,
                    updated_at = NOW()
                    WHERE vehicle_id = ?");
                    
                $updateStmt->bind_param("ddddds", 
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour,
                    $vehicleId
                );
                
                $updateStmt->execute();
                error_log("[$timestamp] Updated local package fares for vehicle: $vehicleId", 3, $logDir . '/local-package-fares.log');
            } else {
                // Insert new record
                $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                    (vehicle_id, price_4hr_40km, price_8hr_80km, price_10hr_100km, extra_km_rate, extra_hour_rate) 
                    VALUES (?, ?, ?, ?, ?, ?)");
                
                $insertStmt->bind_param("sddddd", 
                    $vehicleId,
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour
                );
                
                $insertStmt->execute();
                error_log("[$timestamp] Inserted new local package fares for vehicle: $vehicleId", 3, $logDir . '/local-package-fares.log');
            }
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => "Local package fares updated for $vehicleId",
                'data' => [
                    'vehicleId' => $vehicleId,
                    'vehicle_id' => $vehicleId,
                    'price4hrs40km' => $price4hrs40km,
                    'price8hrs80km' => $price8hrs80km,
                    'price10hrs100km' => $price10hrs100km,
                    'priceExtraKm' => $priceExtraKm,
                    'priceExtraHour' => $priceExtraHour
                ],
                'timestamp' => time()
            ]);
            exit;
        } catch (Exception $e) {
            error_log("[$timestamp] Error updating local package fares: " . $e->getMessage(), 3, $logDir . '/local-package-fares.log');
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => "Database error: " . $e->getMessage(),
                'timestamp' => time()
            ]);
            exit;
        }
    }
    
    // If specific packageId is requested, only return that single package's price for a vehicle
    if ($packageId && $vehicleId) {
        // Get the specific package price for the vehicle
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            // Determine which price to return based on package ID
            $price = 0;
            $packageName = '';
            
            if (strpos($packageId, '4hr') !== false || strpos($packageId, '4hrs') !== false) {
                $price = floatval($row['price_4hr_40km']);
                $packageName = '4 Hours Package (40km)';
            } else if (strpos($packageId, '8hr') !== false || strpos($packageId, '8hrs') !== false) {
                $price = floatval($row['price_8hr_80km']);
                $packageName = '8 Hours Package (80km)';
            } else if (strpos($packageId, '10hr') !== false || strpos($packageId, '10hrs') !== false) {
                $price = floatval($row['price_10hr_100km']);
                $packageName = '10 Hours Package (100km)';
            }
            
            if ($price <= 0) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Price not available for package $packageId and vehicle $vehicleId",
                    'timestamp' => time()
                ]);
                exit;
            }
            
            echo json_encode([
                'status' => 'success',
                'vehicleId' => $vehicleId,
                'packageId' => $packageId,
                'packageName' => $packageName,
                'baseFare' => $price,
                'price' => $price,
                'timestamp' => time()
            ]);
            exit;
        } else {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => "No fare found for vehicle $vehicleId",
                'timestamp' => time()
            ]);
            exit;
        }
    }
    
    // Handle GET request to retrieve all fares
    // If here, we're getting all vehicles with their local package fares
    $query = "
        SELECT v.vehicle_id, v.name, lpf.* 
        FROM vehicles v
        LEFT JOIN local_package_fares lpf ON v.vehicle_id = lpf.vehicle_id
        WHERE v.is_active = 1 OR ?
        ORDER BY v.name
    ";
    
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $includeInactive);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $fares = [];
    
    while ($row = $result->fetch_assoc()) {
        $id = $row['vehicle_id'];
        
        // Filter by vehicle_id if provided
        if ($vehicleId && $id != $vehicleId) {
            continue;
        }
        
        // Map to standardized properties with all naming variants
        $fares[$id] = [
            // Standard API property names
            'id' => $id,
            'vehicleId' => $id,
            'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $id)),
            'price4hrs40km' => floatval($row['price_4hr_40km'] ?? 0),
            'price8hrs80km' => floatval($row['price_8hr_80km'] ?? 0),
            'price10hrs100km' => floatval($row['price_10hr_100km'] ?? 0),
            'priceExtraKm' => floatval($row['extra_km_rate'] ?? 0),
            'priceExtraHour' => floatval($row['extra_hour_rate'] ?? 0),
            
            // Include original column names for direct mapping
            'price_4hr_40km' => floatval($row['price_4hr_40km'] ?? 0),
            'price_8hr_80km' => floatval($row['price_8hr_80km'] ?? 0),
            'price_10hr_100km' => floatval($row['price_10hr_100km'] ?? 0),
            'price_extra_km' => floatval($row['extra_km_rate'] ?? 0),
            'price_extra_hour' => floatval($row['extra_hour_rate'] ?? 0)
        ];
    }
    
    // If no fares found and a specific vehicle was requested, return 404
    if (empty($fares) && $vehicleId) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => "No fare found for vehicle $vehicleId",
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Return all fares
    echo json_encode([
        'status' => 'success',
        'fares' => $fares,
        'count' => count($fares),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("[$timestamp] Error in local-package-fares.php: " . $e->getMessage(), 3, $logDir . '/local-package-fares.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => "Server error: " . $e->getMessage(),
        'timestamp' => time()
    ]);
}
