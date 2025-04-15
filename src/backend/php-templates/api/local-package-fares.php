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
header('X-API-Version: 1.0.57');
header('X-Timestamp: ' . time());
header('X-Request-URI: ' . $_SERVER['REQUEST_URI']);
header('X-Query-String: ' . $_SERVER['QUERY_STRING']);

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
error_log("[$timestamp] Request URI: " . $_SERVER['REQUEST_URI'], 3, $logDir . '/local-package-fares.log');
error_log("[$timestamp] Query string: " . $_SERVER['QUERY_STRING'], 3, $logDir . '/local-package-fares.log');
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
                // Calculate dynamic prices for different vehicle categories
                $dynamicPrices = [];
                
                // Dynamically calculate prices based on vehicle category and multiplier
                function calculateDynamicPrices($baseValue, $multiplier) {
                    return [
                        'price_4hr_40km' => round($baseValue * $multiplier * 1.2),
                        'price_8hr_80km' => round($baseValue * $multiplier * 2.0),
                        'price_10hr_100km' => round($baseValue * $multiplier * 2.5),
                        'extra_km_rate' => round($baseValue * $multiplier * 0.012),
                        'extra_hour_rate' => round($baseValue * $multiplier * 0.1)
                    ];
                }
                
                // Base value for calculations
                $baseValue = 1000;
                
                // Define vehicle categories and their multipliers
                $vehicleCategories = [
                    'sedan' => 1.0,
                    'ertiga' => 1.25,
                    'innova' => 1.5,
                    'innova_crysta' => 1.5,
                    'tempo' => 2.0,
                    'luxury' => 3.5
                ];
                
                // Create the dynamic prices array
                $defaultVehicles = [];
                foreach ($vehicleCategories as $vehicleType => $multiplier) {
                    $prices = calculateDynamicPrices($baseValue, $multiplier);
                    $defaultVehicles[] = [
                        $vehicleType,
                        $prices['price_4hr_40km'],
                        $prices['price_8hr_80km'],
                        $prices['price_10hr_100km'],
                        $prices['extra_km_rate'],
                        $prices['extra_hour_rate']
                    ];
                }
                
                $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                    (vehicle_id, price_4hr_40km, price_8hr_80km, price_10hr_100km, extra_km_rate, extra_hour_rate) 
                    VALUES (?, ?, ?, ?, ?, ?)");
                
                foreach ($defaultVehicles as $vehicle) {
                    $insertStmt->bind_param("sddddd", 
                        $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]
                    );
                    $insertStmt->execute();
                }
                
                error_log("[$timestamp] Initialized local_package_fares with dynamically calculated data", 3, $logDir . '/local-package-fares.log');
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
                // Use dynamic calculation as fallback
                $dynamicPrice = calculateDynamicPriceForVehicle($vehicleId, $packageId);
                if ($dynamicPrice > 0) {
                    $price = $dynamicPrice;
                    error_log("[$timestamp] Using dynamic price for $vehicleId - $packageId: $price", 3, $logDir . '/local-package-fares.log');
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'status' => 'error',
                        'message' => "Price not available for package $packageId and vehicle $vehicleId",
                        'timestamp' => time()
                    ]);
                    exit;
                }
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
            // Use dynamic calculation if not found in database
            $dynamicPrice = calculateDynamicPriceForVehicle($vehicleId, $packageId);
            if ($dynamicPrice > 0) {
                error_log("[$timestamp] Using dynamic price for $vehicleId - $packageId: $dynamicPrice (not in DB)", 3, $logDir . '/local-package-fares.log');
                
                $packageName = '';
                if (strpos($packageId, '4hr') !== false || strpos($packageId, '4hrs') !== false) {
                    $packageName = '4 Hours Package (40km)';
                } else if (strpos($packageId, '8hr') !== false || strpos($packageId, '8hrs') !== false) {
                    $packageName = '8 Hours Package (80km)';
                } else if (strpos($packageId, '10hr') !== false || strpos($packageId, '10hrs') !== false) {
                    $packageName = '10 Hours Package (100km)';
                }
                
                echo json_encode([
                    'status' => 'success',
                    'vehicleId' => $vehicleId,
                    'packageId' => $packageId,
                    'packageName' => $packageName,
                    'baseFare' => $dynamicPrice,
                    'price' => $dynamicPrice,
                    'source' => 'dynamic-calculation',
                    'timestamp' => time()
                ]);
                exit;
            }
            
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
    
    // If no fares found and a specific vehicle was requested, return dynamic calculation
    if (empty($fares) && $vehicleId) {
        // Provide dynamic price calculation as fallback
        $dynamicFare = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
        ];
        
        // Generate dynamic prices based on vehicle type
        $baseValue = 1000;
        $multiplier = 1.0;
        
        // Adjust multiplier based on vehicle type
        if (stripos($vehicleId, 'sedan') !== false) {
            $multiplier = 1.0;
        } else if (stripos($vehicleId, 'ertiga') !== false) {
            $multiplier = 1.25;
        } else if (stripos($vehicleId, 'innova_crysta') !== false || stripos($vehicleId, 'innova_crystal') !== false) {
            $multiplier = 1.5;
        } else if (stripos($vehicleId, 'innova_hycross') !== false || stripos($vehicleId, 'innova_hycros') !== false) {
            $multiplier = 1.6;
        } else if (stripos($vehicleId, 'innova') !== false) {
            $multiplier = 1.5;
        } else if (stripos($vehicleId, 'tempo') !== false) {
            $multiplier = 2.0;
        } else if (stripos($vehicleId, 'luxury') !== false) {
            $multiplier = 1.7;
        } else if (stripos($vehicleId, 'mpv') !== false) {
            $multiplier = 1.4;
        }
        
        // Calculate prices
        $dynamicFare['price4hrs40km'] = round($baseValue * 1.2 * $multiplier);
        $dynamicFare['price8hrs80km'] = round($baseValue * 2.0 * $multiplier);
        $dynamicFare['price10hrs100km'] = round($baseValue * 2.5 * $multiplier);
        $dynamicFare['priceExtraKm'] = round($baseValue * 0.012 * $multiplier);
        $dynamicFare['priceExtraHour'] = round($baseValue * 0.1 * $multiplier);
        
        // Include original column names
        $dynamicFare['price_4hr_40km'] = $dynamicFare['price4hrs40km'];
        $dynamicFare['price_8hr_80km'] = $dynamicFare['price8hrs80km'];
        $dynamicFare['price_10hr_100km'] = $dynamicFare['price10hrs100km'];
        $dynamicFare['price_extra_km'] = $dynamicFare['priceExtraKm'];
        $dynamicFare['price_extra_hour'] = $dynamicFare['priceExtraHour'];
        
        $fares[$vehicleId] = $dynamicFare;
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

// Helper function to calculate dynamic price when not in database
function calculateDynamicPriceForVehicle($vehicleId, $packageId) {
    // Base prices for different vehicle types
    $basePrices = [
        'sedan' => [
            '4hrs-40km' => 2400, 
            '8hrs-80km' => 3000, 
            '10hrs-100km' => 3500
        ],
        'ertiga' => [
            '4hrs-40km' => 2800, 
            '8hrs-80km' => 3500, 
            '10hrs-100km' => 4000
        ],
        'innova_crysta' => [
            '4hrs-40km' => 3200, 
            '8hrs-80km' => 4000, 
            '10hrs-100km' => 4500
        ],
        'innova_hycross' => [
            '4hrs-40km' => 3600, 
            '8hrs-80km' => 4500, 
            '10hrs-100km' => 5000
        ],
        'dzire_cng' => [
            '4hrs-40km' => 2400, 
            '8hrs-80km' => 3000, 
            '10hrs-100km' => 3500
        ],
        'tempo_traveller' => [
            '4hrs-40km' => 4000, 
            '8hrs-80km' => 5500, 
            '10hrs-100km' => 7000
        ],
        'mpv' => [
            '4hrs-40km' => 3600, 
            '8hrs-80km' => 4500, 
            '10hrs-100km' => 5000
        ],
        'innova' => [
            '4hrs-40km' => 3200, 
            '8hrs-80km' => 4000, 
            '10hrs-100km' => 4500
        ]
    ];
    
    // Normalize vehicle ID and package ID
    $normalizedVehicleId = strtolower($vehicleId);
    $normalizedVehicleId = str_replace(' ', '_', $normalizedVehicleId);
    
    $normalizedPackageId = strtolower($packageId);
    
    // Map package ID variants to standard keys
    if (strpos($normalizedPackageId, '4hr') !== false || strpos($normalizedPackageId, '4hrs') !== false) {
        $normalizedPackageId = '4hrs-40km';
    } else if (strpos($normalizedPackageId, '8hr') !== false || strpos($normalizedPackageId, '8hrs') !== false) {
        $normalizedPackageId = '8hrs-80km';
    } else if (strpos($normalizedPackageId, '10hr') !== false || strpos($normalizedPackageId, '10hrs') !== false) {
        $normalizedPackageId = '10hrs-100km';
    }
    
    // Get the correct vehicle category
    $vehicleCategory = null;
    
    // Direct match
    if (isset($basePrices[$normalizedVehicleId])) {
        $vehicleCategory = $normalizedVehicleId;
    } else {
        // Check for partial matches
        if (strpos($normalizedVehicleId, 'sedan') !== false) {
            $vehicleCategory = 'sedan';
        } else if (strpos($normalizedVehicleId, 'ertiga') !== false) {
            $vehicleCategory = 'ertiga';
        } else if (strpos($normalizedVehicleId, 'crysta') !== false || strpos($normalizedVehicleId, 'crystal') !== false) {
            $vehicleCategory = 'innova_crysta';
        } else if (strpos($normalizedVehicleId, 'hycross') !== false || strpos($normalizedVehicleId, 'hycros') !== false) {
            $vehicleCategory = 'innova_hycross';
        } else if (strpos($normalizedVehicleId, 'innova') !== false || strpos($normalizedVehicleId, 'mpv') !== false) {
            $vehicleCategory = 'innova';
        } else if (strpos($normalizedVehicleId, 'dzire') !== false || strpos($normalizedVehicleId, 'cng') !== false) {
            $vehicleCategory = 'dzire_cng';
        } else if (strpos($normalizedVehicleId, 'tempo') !== false || strpos($normalizedVehicleId, 'traveller') !== false) {
            $vehicleCategory = 'tempo_traveller';
        } else {
            // Default to sedan if no match found
            $vehicleCategory = 'sedan';
        }
    }
    
    // Get the price for this vehicle category and package
    if (isset($basePrices[$vehicleCategory][$normalizedPackageId])) {
        return $basePrices[$vehicleCategory][$normalizedPackageId];
    }
    
    // Default price if we couldn't find a match
    return 0;
}
