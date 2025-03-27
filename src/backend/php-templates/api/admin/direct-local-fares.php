
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

// Log all request details for debugging
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("QUERY STRING: " . $_SERVER['QUERY_STRING']);
error_log("REQUEST BODY: " . file_get_contents('php://input'));

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

// Ensure the local_package_fares table exists
function ensureLocalPackageFaresTable($conn) {
    try {
        // First check if table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        
        if ($tableCheckResult->num_rows == 0) {
            error_log("Creating local_package_fares table");
            
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
                error_log("local_package_fares table created successfully");
                return true;
            } else {
                error_log("Error creating local_package_fares table: " . $conn->error);
                return false;
            }
        } else {
            // Table exists
            error_log("local_package_fares table already exists");
            return true;
        }
    } catch (Exception $e) {
        error_log("Error ensuring local_package_fares table: " . $e->getMessage());
        return false;
    }
}

// Function to initialize default package fares if table is empty
function initializeDefaultPackageFares($conn) {
    try {
        // Check if table is empty
        $checkEmpty = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
        $emptyResult = $checkEmpty->fetch_assoc();
        
        if ($emptyResult['count'] == 0) {
            error_log("Initializing default local package fares");
            
            // Default vehicles
            $defaultVehicles = [
                ['sedan', 'Sedan', 1200, 2500, 3000, 14, 250],
                ['ertiga', 'Ertiga', 1800, 3000, 3600, 18, 300],
                ['innova', 'Innova Crysta', 2300, 3800, 4500, 20, 350],
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
                error_log("Default local package fares initialized successfully");
            } else {
                error_log("Error preparing statement for default fares: " . $conn->error);
            }
        } else {
            error_log("local_package_fares table already has data, skipping initialization");
        }
    } catch (Exception $e) {
        error_log("Error initializing default package fares: " . $e->getMessage());
    }
}

// Function to update local package fares
function updateLocalPackageFare($conn, $vehicleId, $data) {
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
    if (isset($data['extra_km_rate'])) $priceExtraKm = $data['extra_km_rate'];
    
    if (isset($data['priceExtraHour'])) $priceExtraHour = $data['priceExtraHour'];
    if (isset($data['price_extra_hour'])) $priceExtraHour = $data['price_extra_hour'];
    if (isset($data['extra_hour_rate'])) $priceExtraHour = $data['extra_hour_rate'];
    
    // Set default values if not provided
    if ($priceExtraKm <= 0) {
        $priceExtraKm = ($vehicleId == 'sedan') ? 14 : 
                        (($vehicleId == 'ertiga') ? 18 : 
                        (($vehicleId == 'innova' || $vehicleId == 'innova_crysta') ? 20 : 25));
    }
    
    if ($priceExtraHour <= 0) {
        $priceExtraHour = ($vehicleId == 'sedan') ? 250 : 
                          (($vehicleId == 'ertiga') ? 300 : 
                          (($vehicleId == 'innova' || $vehicleId == 'innova_crysta') ? 350 : 400));
    }
    
    // Log the extracted data for debugging
    error_log("Local fares for vehicle $vehicleId: " . json_encode([
        'price4hrs40km' => $price4hrs40km,
        'price8hrs80km' => $price8hrs80km, 
        'price10hrs100km' => $price10hrs100km,
        'priceExtraKm' => $priceExtraKm,
        'priceExtraHour' => $priceExtraHour
    ]));
    
    try {
        // First check if the record exists
        $checkSQL = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkSQL);
        
        if (!$checkStmt) {
            error_log("Error preparing check statement: " . $conn->error);
            return false;
        }
        
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateSQL = "UPDATE local_package_fares SET 
                vehicle_type = ?,
                price_4hrs_40km = ?,
                price_8hrs_80km = ?,
                price_10hrs_100km = ?,
                price_extra_km = ?,
                price_extra_hour = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?";
                
            $updateStmt = $conn->prepare($updateSQL);
            
            if (!$updateStmt) {
                error_log("Error preparing update statement: " . $conn->error);
                return false;
            }
            
            $updateStmt->bind_param("sddddds", 
                $vehicleType, 
                $price4hrs40km, 
                $price8hrs80km, 
                $price10hrs100km, 
                $priceExtraKm, 
                $priceExtraHour, 
                $vehicleId
            );
            
            if ($updateStmt->execute()) {
                error_log("Updated local package fares for vehicle: $vehicleId");
                return true;
            } else {
                error_log("Error updating local package fares: " . $updateStmt->error);
                return false;
            }
        } else {
            // Insert new record
            $insertSQL = "INSERT INTO local_package_fares 
                (vehicle_id, vehicle_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
                
            $insertStmt = $conn->prepare($insertSQL);
            
            if (!$insertStmt) {
                error_log("Error preparing insert statement: " . $conn->error);
                return false;
            }
            
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
                error_log("Inserted new local package fares for vehicle: $vehicleId");
                return true;
            } else {
                error_log("Error inserting local package fares: " . $insertStmt->error);
                return false;
            }
        }
    } catch (Exception $e) {
        error_log("Error updating local package fare: " . $e->getMessage());
        return false;
    }
}

// Function to get all local package fares
function getAllLocalPackageFares($conn) {
    try {
        $fares = [];
        
        $query = "SELECT * FROM local_package_fares ORDER BY id";
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $fares[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'vehicleType' => $row['vehicle_type'],
                    'price4hrs40km' => (float)$row['price_4hrs_40km'],
                    'price8hrs80km' => (float)$row['price_8hrs_80km'],
                    'price10hrs100km' => (float)$row['price_10hrs_100km'],
                    'priceExtraKm' => (float)$row['price_extra_km'],
                    'priceExtraHour' => (float)$row['price_extra_hour'],
                    'updatedAt' => $row['updated_at']
                ];
            }
        }
        
        return $fares;
    } catch (Exception $e) {
        error_log("Error getting all local package fares: " . $e->getMessage());
        return [];
    }
}

// Main execution
try {
    // Try to connect to database
    $conn = null;
    
    try {
        $conn = getDbConnection();
        error_log("Database connection successful in direct-local-fares.php");
    } catch (Exception $e) {
        error_log("Database connection failed in direct-local-fares.php: " . $e->getMessage());
    }
    
    // Default response for GET requests (fetch all fares)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $fares = [];
        
        if ($conn) {
            // Ensure table exists
            if (ensureLocalPackageFaresTable($conn)) {
                // Initialize default fares if table is empty
                initializeDefaultPackageFares($conn);
                
                // Get all fares
                $fares = getAllLocalPackageFares($conn);
            }
        }
        
        // If no fares found or database error, use sample data
        if (empty($fares)) {
            // Provide sample data as fallback
            $fares = [
                [
                    'id' => 1,
                    'vehicleId' => 'sedan',
                    'vehicleType' => 'Sedan',
                    'price4hrs40km' => 1200,
                    'price8hrs80km' => 2500,
                    'price10hrs100km' => 3000,
                    'priceExtraKm' => 14,
                    'priceExtraHour' => 250,
                    'updatedAt' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 2,
                    'vehicleId' => 'ertiga',
                    'vehicleType' => 'Ertiga',
                    'price4hrs40km' => 1800,
                    'price8hrs80km' => 3000,
                    'price10hrs100km' => 3600,
                    'priceExtraKm' => 18,
                    'priceExtraHour' => 300,
                    'updatedAt' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 3,
                    'vehicleId' => 'innova',
                    'vehicleType' => 'Innova Crysta',
                    'price4hrs40km' => 2300,
                    'price8hrs80km' => 3800,
                    'price10hrs100km' => 4500,
                    'priceExtraKm' => 20,
                    'priceExtraHour' => 350,
                    'updatedAt' => date('Y-m-d H:i:s')
                ]
            ];
        }
        
        // Return success response with fares
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'source' => $conn ? 'database' : 'sample',
            'timestamp' => time(),
            'version' => '1.0.55'
        ]);
        exit;
    }
    
    // Handle POST requests (update fares)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        error_log("Processing POST request for local package fares update");
        
        // Support both direct vehicle_id parameter and request body
        $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : (
            isset($input['vehicleId']) ? $input['vehicleId'] : (
                isset($input['vehicle_id']) ? $input['vehicle_id'] : (
                    isset($input['vehicle_type']) ? $input['vehicle_type'] : null
                )
            )
        );
        
        // If no vehicle ID, try to get it from the body
        if (!$vehicleId && is_array($input)) {
            foreach (['id', 'cab_id', 'cab_type', 'cabType', 'cab'] as $possibleKey) {
                if (isset($input[$possibleKey]) && !empty($input[$possibleKey])) {
                    $vehicleId = $input[$possibleKey];
                    break;
                }
            }
        }
        
        // Log what we've extracted
        error_log("Extracted vehicle ID: " . ($vehicleId ?? 'NULL'));
        error_log("Input data: " . json_encode($input));
        
        // If still no vehicle ID but we have package data, extract from package name
        if (!$vehicleId && isset($input['packageId'])) {
            $parts = explode('-', $input['packageId']);
            if (count($parts) > 1) {
                // Extract the vehicle part
                $vehicleId = $parts[0];
            }
        }
        
        if ($vehicleId && $conn) {
            // Ensure table exists
            if (ensureLocalPackageFaresTable($conn)) {
                // Log the vehicle ID and input
                error_log("Updating local package fares for vehicle: $vehicleId");
                error_log("Input data: " . json_encode($input));
                
                // Update the fare
                $success = updateLocalPackageFare($conn, $vehicleId, $input);
                
                if ($success) {
                    // Get all fares including the updated one
                    $fares = getAllLocalPackageFares($conn);
                    
                    // Return success response
                    echo json_encode([
                        'status' => 'success',
                        'message' => "Local package fares updated for $vehicleId",
                        'fares' => $fares,
                        'source' => 'database',
                        'timestamp' => time(),
                        'version' => '1.0.55'
                    ]);
                    exit;
                } else {
                    // Return error response
                    http_response_code(500);
                    echo json_encode([
                        'status' => 'error',
                        'message' => "Failed to update local package fares for $vehicleId",
                        'timestamp' => time(),
                        'version' => '1.0.55'
                    ]);
                    exit;
                }
            } else {
                // Table creation failed
                http_response_code(500);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Failed to create local_package_fares table",
                    'timestamp' => time(),
                    'version' => '1.0.55'
                ]);
                exit;
            }
        } else {
            // Missing vehicle ID or database connection
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => $conn ? "Missing vehicle ID" : "Database connection failed",
                'timestamp' => time(),
                'version' => '1.0.55'
            ]);
            exit;
        }
    }
    
    // Default response if no action taken
    echo json_encode([
        'status' => 'error',
        'message' => "Invalid request method or missing parameters",
        'method' => $_SERVER['REQUEST_METHOD'],
        'timestamp' => time(),
        'version' => '1.0.55'
    ]);

} catch (Exception $e) {
    // Log the error
    error_log("Error in direct-local-fares.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => "Internal server error: " . $e->getMessage(),
        'timestamp' => time(),
        'version' => '1.0.55'
    ]);
}
