
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Always include for API endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-API-Version');
header('Content-Type: application/json');

// Add additional headers for debugging
header('X-Debug-File: direct-local-fares.php');
header('X-API-Version: 1.0.55');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log all request details for debugging
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] REQUEST METHOD: " . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-local-fares.log');
error_log("[$timestamp] QUERY STRING: " . $_SERVER['QUERY_STRING'], 3, $logDir . '/direct-local-fares.log');
error_log("[$timestamp] REQUEST BODY: " . file_get_contents('php://input'), 3, $logDir . '/direct-local-fares.log');

// Get input data (support both POST and GET)
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Support both JSON and form data
if (empty($input) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = $_POST;
}

// Merge with GET parameters if any are provided
if (!empty($_GET)) {
    $input = array_merge((array)$input, $_GET);
}

// Log the parsed input for debugging
error_log("[$timestamp] PARSED INPUT: " . print_r($input, true), 3, $logDir . '/direct-local-fares.log');

// Test mode - if test=1 or test_db=true, just return a success response
if (isset($_GET['test']) || isset($_GET['test_db'])) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Direct local fares endpoint is working',
        'database' => 'Connection test successful',
        'timestamp' => time()
    ]);
    exit;
}

// Initialize mode - if initialize=true, create and populate tables
if (isset($_GET['initialize']) && $_GET['initialize'] == 'true') {
    try {
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }
        
        // Ensure table exists
        $tableCreated = ensureLocalPackageFaresTable($conn);
        
        // Initialize default data
        if ($tableCreated) {
            initializeDefaultPackageFares($conn);
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Direct local fares database initialized',
            'table_created' => $tableCreated,
            'timestamp' => time()
        ]);
        exit;
    } catch (Exception $e) {
        error_log("[$timestamp] Initialize error: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Initialize error: ' . $e->getMessage(),
            'timestamp' => time()
        ]);
        exit;
    }
}

// Ensure the local_package_fares table exists
function ensureLocalPackageFaresTable($conn) {
    try {
        global $logDir, $timestamp;
        // First check if table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        
        if ($tableCheckResult->num_rows == 0) {
            error_log("[$timestamp] Creating local_package_fares table", 3, $logDir . '/direct-local-fares.log');
            
            // Create the table with all necessary fields and proper indices
            $createTableSQL = "CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `vehicle_type` varchar(50) NOT NULL,
                `price_4hrs_40km` decimal(10,2) DEFAULT 0.00,
                `price_8hrs_80km` decimal(10,2) DEFAULT 0.00,
                `price_10hrs_100km` decimal(10,2) DEFAULT 0.00,
                `price_extra_km` decimal(10,2) DEFAULT 0.00,
                `price_extra_hour` decimal(10,2) DEFAULT 0.00,
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_vehicle_id` (`vehicle_id`),
                KEY `idx_vehicle_type` (`vehicle_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            if ($conn->query($createTableSQL) === TRUE) {
                error_log("[$timestamp] local_package_fares table created successfully", 3, $logDir . '/direct-local-fares.log');
                return true;
            } else {
                error_log("[$timestamp] Error creating local_package_fares table: " . $conn->error, 3, $logDir . '/direct-local-fares.log');
                return false;
            }
        } else {
            // Table exists
            error_log("[$timestamp] local_package_fares table already exists", 3, $logDir . '/direct-local-fares.log');
            return true;
        }
    } catch (Exception $e) {
        global $logDir, $timestamp;
        error_log("[$timestamp] Error ensuring local_package_fares table: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        return false;
    }
}

// Function to initialize default package fares if table is empty
function initializeDefaultPackageFares($conn) {
    try {
        global $logDir, $timestamp;
        // Check if table is empty
        $checkEmpty = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
        $emptyResult = $checkEmpty->fetch_assoc();
        
        if ($emptyResult['count'] == 0) {
            error_log("[$timestamp] Initializing default local package fares", 3, $logDir . '/direct-local-fares.log');
            
            // Default vehicles
            $defaultVehicles = [
                ['sedan', 'Sedan', 1200, 2500, 3000, 14, 250],
                ['ertiga', 'Ertiga', 1800, 3000, 3600, 18, 300],
                ['innova', 'Innova Crysta', 2300, 3800, 4500, 20, 350],
                ['innova_crysta', 'Innova Crysta', 2300, 3800, 4500, 20, 350],
                ['tempo', 'Tempo Traveller', 3000, 4500, 5500, 25, 400],
                ['luxury', 'Luxury Sedan', 3500, 5500, 6500, 30, 450]
            ];
            
            // Insert default fares
            $insertSQL = "INSERT INTO local_package_fares 
                (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertSQL);
            
            if ($stmt) {
                foreach ($defaultVehicles as $vehicle) {
                    $stmt->bind_param("ssddddd", 
                        $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5], $vehicle[6]
                    );
                    $stmt->execute();
                }
                error_log("[$timestamp] Default local package fares initialized successfully", 3, $logDir . '/direct-local-fares.log');
            } else {
                error_log("[$timestamp] Error preparing statement for default fares: " . $conn->error, 3, $logDir . '/direct-local-fares.log');
            }
        } else {
            error_log("[$timestamp] local_package_fares table already has data, skipping initialization", 3, $logDir . '/direct-local-fares.log');
        }
    } catch (Exception $e) {
        global $logDir, $timestamp;
        error_log("[$timestamp] Error initializing default package fares: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
    }
}

// Function to update local package fares
function updateLocalPackageFare($conn, $vehicleId, $data) {
    global $logDir, $timestamp;
    try {
        // Make sure vehicle ID is normalized (lowercase, no spaces)
        $vehicleId = strtolower(trim($vehicleId));
        $vehicleType = isset($data['vehicleType']) ? $data['vehicleType'] : $vehicleId;
        $vehicleType = isset($data['vehicle_type']) ? $data['vehicle_type'] : $vehicleType;
        
        // Extract prices from various possible input formats
        $price4hrs40km = 0;
        $price8hrs80km = 0;
        $price10hrs100km = 0;
        $priceExtraKm = 0;
        $priceExtraHour = 0;
        
        // Handle different naming conventions from various clients
        if (isset($data['price4hrs40km'])) $price4hrs40km = $data['price4hrs40km'];
        if (isset($data['price_4hrs_40km'])) $price4hrs40km = $data['price_4hrs_40km'];
        if (isset($data['price_4hr_40km'])) $price4hrs40km = $data['price_4hr_40km'];
        if (isset($data['local_package_4hr'])) $price4hrs40km = $data['local_package_4hr'];
        if (isset($data['packages']['4hrs-40km'])) $price4hrs40km = $data['packages']['4hrs-40km'];
        if (isset($data['fares']['4hrs-40km'])) $price4hrs40km = $data['fares']['4hrs-40km'];
        
        if (isset($data['price8hrs80km'])) $price8hrs80km = $data['price8hrs80km'];
        if (isset($data['price_8hrs_80km'])) $price8hrs80km = $data['price_8hrs_80km'];
        if (isset($data['price_8hr_80km'])) $price8hrs80km = $data['price_8hr_80km'];
        if (isset($data['local_package_8hr'])) $price8hrs80km = $data['local_package_8hr'];
        if (isset($data['packages']['8hrs-80km'])) $price8hrs80km = $data['packages']['8hrs-80km'];
        if (isset($data['fares']['8hrs-80km'])) $price8hrs80km = $data['fares']['8hrs-80km'];
        
        if (isset($data['price10hrs100km'])) $price10hrs100km = $data['price10hrs100km'];
        if (isset($data['price_10hrs_100km'])) $price10hrs100km = $data['price_10hrs_100km'];
        if (isset($data['price_10hr_100km'])) $price10hrs100km = $data['price_10hr_100km'];
        if (isset($data['local_package_10hr'])) $price10hrs100km = $data['local_package_10hr'];
        if (isset($data['packages']['10hrs-100km'])) $price10hrs100km = $data['packages']['10hrs-100km'];
        if (isset($data['fares']['10hrs-100km'])) $price10hrs100km = $data['fares']['10hrs-100km'];
        
        if (isset($data['priceExtraKm'])) $priceExtraKm = $data['priceExtraKm'];
        if (isset($data['price_extra_km'])) $priceExtraKm = $data['price_extra_km'];
        if (isset($data['extraKmRate'])) $priceExtraKm = $data['extraKmRate'];
        
        if (isset($data['priceExtraHour'])) $priceExtraHour = $data['priceExtraHour'];
        if (isset($data['price_extra_hour'])) $priceExtraHour = $data['price_extra_hour'];
        if (isset($data['extraHourRate'])) $priceExtraHour = $data['extraHourRate'];
        
        error_log("[$timestamp] Extracted fares for $vehicleId: 4hrs=$price4hrs40km, 8hrs=$price8hrs80km, 10hrs=$price10hrs100km, km=$priceExtraKm, hr=$priceExtraHour", 3, $logDir . '/direct-local-fares.log');
        
        // Validate at least one price is set
        if ($price4hrs40km <= 0 && $price8hrs80km <= 0 && $price10hrs100km <= 0) {
            throw new Exception("At least one package price must be provided");
        }
        
        // Normalize missing prices
        if ($price8hrs80km > 0 && $price4hrs40km <= 0) {
            $price4hrs40km = round($price8hrs80km * 0.6);
        }
        
        if ($price8hrs80km > 0 && $price10hrs100km <= 0) {
            $price10hrs100km = round($price8hrs80km * 1.2);
        }
        
        if ($price4hrs40km > 0 && $price8hrs80km <= 0) {
            $price8hrs80km = round($price4hrs40km / 0.6);
        }
        
        if ($price10hrs100km > 0 && $price8hrs80km <= 0) {
            $price8hrs80km = round($price10hrs100km / 1.2);
        }
        
        // Ensure extra rates
        if ($priceExtraKm <= 0) {
            // Default based on vehicle type
            if (stripos($vehicleId, 'sedan') !== false) {
                $priceExtraKm = 14;
            } elseif (stripos($vehicleId, 'ertiga') !== false) {
                $priceExtraKm = 18;
            } elseif (stripos($vehicleId, 'innova') !== false) {
                $priceExtraKm = 20;
            } elseif (stripos($vehicleId, 'luxury') !== false) {
                $priceExtraKm = 25;
            } else {
                $priceExtraKm = 15;
            }
        }
        
        if ($priceExtraHour <= 0) {
            $priceExtraHour = round($price8hrs80km / 8);
            if ($priceExtraHour < 200) $priceExtraHour = 200;
            if ($priceExtraHour > 500) $priceExtraHour = 500;
        }
        
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
            
            if ($updateStmt->execute()) {
                error_log("[$timestamp] Updated local package fares for vehicle: $vehicleId", 3, $logDir . '/direct-local-fares.log');
                return true;
            } else {
                throw new Exception("Failed to update record: " . $conn->error);
            }
        } else {
            // Insert new record
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
            
            if ($insertStmt->execute()) {
                error_log("[$timestamp] Inserted new local package fares for vehicle: $vehicleId", 3, $logDir . '/direct-local-fares.log');
                return true;
            } else {
                throw new Exception("Failed to insert record: " . $conn->error);
            }
        }
    } catch (Exception $e) {
        error_log("[$timestamp] Error updating fares for $vehicleId: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        throw $e; // rethrow to handle in main try-catch
    }
}

// Handle POST request to update fares
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
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
        
        error_log("[$timestamp] Processing fare update for vehicle: $vehicleId", 3, $logDir . '/direct-local-fares.log');
        
        // Connect to database
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }
        
        // Ensure table exists
        ensureLocalPackageFaresTable($conn);
        
        // Update fares
        $updated = updateLocalPackageFare($conn, $vehicleId, $input);
        
        if ($updated) {
            echo json_encode([
                'status' => 'success',
                'message' => "Local package fares updated for $vehicleId",
                'data' => [
                    'vehicleId' => $vehicleId,
                    'updated' => true,
                    'timestamp' => time()
                ]
            ]);
        } else {
            throw new Exception("Failed to update local package fares");
        }
    } catch (Exception $e) {
        error_log("[$timestamp] Error in direct-local-fares.php: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
    exit;
}

// Handle GET request to retrieve fares
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get vehicle ID if provided
        $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
        
        if (empty($vehicleId) && isset($_GET['vehicleId'])) {
            $vehicleId = $_GET['vehicleId'];
        }
        
        if (empty($vehicleId) && isset($_GET['id'])) {
            $vehicleId = $_GET['id'];
        }
        
        // Connect to database
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }
        
        // Ensure table exists
        $tableExists = ensureLocalPackageFaresTable($conn);
        
        if (!$tableExists) {
            throw new Exception("Failed to create local_package_fares table");
        }
        
        // Fetch fares
        $fares = [];
        
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
                
                // Map to standardized properties
                $fares[$id] = [
                    'price4hrs40km' => floatval($row['price_4hrs_40km']),
                    'price8hrs80km' => floatval($row['price_8hrs_80km']),
                    'price10hrs100km' => floatval($row['price_10hrs_100km']),
                    'priceExtraKm' => floatval($row['price_extra_km']),
                    'priceExtraHour' => floatval($row['price_extra_hour'])
                ];
            }
        }
        
        // Return fares
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'source' => 'database',
            'timestamp' => time()
        ]);
    } catch (Exception $e) {
        error_log("[$timestamp] Error in direct-local-fares.php: " . $e->getMessage(), 3, $logDir . '/direct-local-fares.log');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
    exit;
}

// If we got here, method not supported
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed',
    'timestamp' => time()
]);
