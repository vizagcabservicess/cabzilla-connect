
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

// Log request for debugging
error_log("local-package-fares.php: " . $_SERVER['REQUEST_METHOD'] . " request received");
error_log("GET params: " . json_encode($_GET));
error_log("POST params: " . file_get_contents('php://input'));

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // First check if local_package_fares table exists
    $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    
    // If table doesn't exist, try to create it
    if (!$localFaresTableExists) {
        $createLocalFaresTable = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
            `id` int NOT NULL AUTO_INCREMENT,
            `vehicle_id` varchar(50) NOT NULL,
            `vehicle_type` varchar(50) NOT NULL DEFAULT '',
            `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
            `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
            `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0,
            `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
            `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `vehicle_id` (`vehicle_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createLocalFaresTable);
        $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        error_log("Created local_package_fares table: " . ($localFaresTableExists ? "success" : "failed"));
        
        // Initialize with default data if table is empty
        if ($localFaresTableExists) {
            $checkEmpty = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
            $row = $checkEmpty->fetch_assoc();
            
            if ($row['count'] == 0) {
                // Insert default values for common cab types
                $defaultVehicles = [
                    ['sedan', 'Sedan', 1200, 2500, 3000, 14, 250],
                    ['ertiga', 'Ertiga', 1800, 3000, 3600, 18, 300],
                    ['innova', 'Innova', 2300, 3800, 4500, 20, 350],
                    ['innova_crysta', 'Innova Crysta', 2300, 3800, 4500, 20, 350],
                    ['tempo', 'Tempo Traveller', 3000, 4500, 5500, 25, 400],
                    ['luxury', 'Luxury Sedan', 3500, 5500, 6500, 30, 450]
                ];
                
                $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                    (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)");
                
                foreach ($defaultVehicles as $vehicle) {
                    $insertStmt->bind_param("ssddddd", 
                        $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5], $vehicle[6]
                    );
                    $insertStmt->execute();
                }
                
                error_log("Initialized local_package_fares with default data");
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
                    (isset($input['vehicle_type']) ? $input['vehicle_type'] : 
                    (isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null)));
                    
        if (!$vehicleId) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Clean vehicleId - remove "item-" prefix if exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Get prices from request data with multiple fallbacks
        $price4hrs40km = 0;
        $price8hrs80km = 0;
        $price10hrs100km = 0;
        $priceExtraKm = 0;
        $priceExtraHour = 0;
        
        // Extract 4hr package price
        foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hrs_40km'] as $field) {
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
        foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hrs_80km'] as $field) {
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
        foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km'] as $field) {
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
        
        // If we don't have at least one price value, error out
        if ($price4hrs40km == 0 && $price8hrs80km == 0 && $price10hrs100km == 0) {
            throw new Exception("At least one package price must be provided");
        }
        
        // Normalize missing prices based on multipliers if we have at least one price
        if ($price8hrs80km > 0 && $price4hrs40km == 0) {
            $price4hrs40km = round($price8hrs80km * 0.6); // 4hr package is typically 60% of 8hr
        }
        
        if ($price8hrs80km > 0 && $price10hrs100km == 0) {
            $price10hrs100km = round($price8hrs80km * 1.2); // 10hr package is typically 120% of 8hr
        }
        
        if ($price4hrs40km > 0 && $price8hrs80km == 0) {
            $price8hrs80km = round($price4hrs40km / 0.6); // Calculate 8hr from 4hr
        }
        
        if ($price10hrs100km > 0 && $price8hrs80km == 0) {
            $price8hrs80km = round($price10hrs100km / 1.2); // Calculate 8hr from 10hr
        }
        
        // Ensure we have the extra rate values
        if ($priceExtraKm == 0) {
            // Default based on vehicle type
            if (stripos($vehicleId, 'sedan') !== false || stripos($vehicleId, 'swift') !== false || stripos($vehicleId, 'dzire') !== false) {
                $priceExtraKm = 14;
            } elseif (stripos($vehicleId, 'ertiga') !== false) {
                $priceExtraKm = 18;
            } elseif (stripos($vehicleId, 'innova') !== false) {
                $priceExtraKm = 20;
            } elseif (stripos($vehicleId, 'luxury') !== false) {
                $priceExtraKm = 25;
            } else {
                $priceExtraKm = 15; // Default
            }
        }
        
        if ($priceExtraHour == 0) {
            // Extra hour is typically 1/8 of the 8hr package
            $priceExtraHour = round($price8hrs80km / 8);
            if ($priceExtraHour < 200) $priceExtraHour = 200;
            if ($priceExtraHour > 500) $priceExtraHour = 500;
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
                    price_4hrs_40km = ?,
                    price_8hrs_80km = ?,
                    price_10hrs_100km = ?,
                    price_extra_km = ?,
                    price_extra_hour = ?,
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
                error_log("Updated local package fares for vehicle: $vehicleId");
            } else {
                // Insert new record
                $vehicleType = isset($input['vehicleType']) ? $input['vehicleType'] : 
                              (isset($input['vehicle_type']) ? $input['vehicle_type'] : $vehicleId);
                
                $insertStmt = $conn->prepare("INSERT INTO local_package_fares 
                    (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)");
                
                $insertStmt->bind_param("ssddddd", 
                    $vehicleId,
                    $vehicleType,
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour
                );
                
                $insertStmt->execute();
                error_log("Inserted new local package fares for vehicle: $vehicleId");
            }
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => "Local package fares updated for $vehicleId",
                'data' => [
                    'vehicleId' => $vehicleId,
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
            error_log("Error updating local package fares: " . $e->getMessage());
            throw new Exception("Database error: " . $e->getMessage());
        }
    }
    
    // Handle GET request to retrieve fares
    $fares = [];
    
    // Fetch from database if table exists
    if ($localFaresTableExists) {
        $query = "SELECT * FROM local_package_fares";
        
        // Filter by vehicle_id if provided
        if ($vehicleId) {
            $query .= " WHERE vehicle_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $vehicleId);
        } else {
            $stmt = $conn->prepare($query);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'];
                
                // Map to standardized properties with all naming variants
                $fares[$id] = [
                    // Standard API property names
                    'price4hrs40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'price8hrs80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'price10hrs100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'priceExtraKm' => floatval($row['price_extra_km'] ?? 0),
                    'priceExtraHour' => floatval($row['price_extra_hour'] ?? 0),
                    
                    // Include original column names for direct mapping
                    'price_4hrs_40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'price_8hrs_80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'price_10hrs_100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'price_extra_km' => floatval($row['price_extra_km'] ?? 0),
                    'price_extra_hour' => floatval($row['price_extra_hour'] ?? 0),
                    
                    // Include alias properties for compatibility
                    'package4hr40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'package8hr80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'package10hr100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'extraKmRate' => floatval($row['price_extra_km'] ?? 0),
                    'extraHourRate' => floatval($row['price_extra_hour'] ?? 0)
                ];
            }
        }
    }
    
    // If no fares found, provide sample data
    if (empty($fares)) {
        $sampleFares = [
            'sedan' => [
                'price4hrs40km' => 1200,
                'price8hrs80km' => 2500,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 250
            ],
            'ertiga' => [
                'price4hrs40km' => 1800,
                'price8hrs80km' => 3000,
                'price10hrs100km' => 3600,
                'priceExtraKm' => 18,
                'priceExtraHour' => 300
            ],
            'innova' => [
                'price4hrs40km' => 2300,
                'price8hrs80km' => 3800,
                'price10hrs100km' => 4500,
                'priceExtraKm' => 20,
                'priceExtraHour' => 350
            ],
            'innova_crysta' => [
                'price4hrs40km' => 2300,
                'price8hrs80km' => 3800,
                'price10hrs100km' => 4500,
                'priceExtraKm' => 20,
                'priceExtraHour' => 350
            ]
        ];
        
        // If vehicle ID is provided, return only that vehicle's fares
        if ($vehicleId && isset($sampleFares[$vehicleId])) {
            $fares[$vehicleId] = $sampleFares[$vehicleId];
        } else {
            $fares = $sampleFares;
        }
    }
    
    // Return response
    echo json_encode([
        'status' => 'success',
        'fares' => $fares,
        'timestamp' => time(),
        'source' => empty($fares) ? 'sample' : 'database',
        'vehicle_id' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in local-package-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
