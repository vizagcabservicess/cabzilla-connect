
<?php
// vehicles-update.php - Endpoint for creating and updating vehicles

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Set error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Create logs directory if it doesn't exist
if (!is_dir(__DIR__ . '/../../logs')) {
    mkdir(__DIR__ . '/../../logs', 0755, true);
}

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log the request for debugging
$requestPath = __DIR__ . '/../../logs/vehicle_requests.log';
$requestData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'url' => $_SERVER['REQUEST_URI'],
    'params' => $_REQUEST,
    'input' => file_get_contents('php://input')
];

// Make sure the log directory exists
$logDir = dirname($requestPath);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log the request
file_put_contents($requestPath, json_encode($requestData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// Include necessary files
// Try multiple possible locations for the database utilities
$utilPaths = [
    __DIR__ . '/../utils/database.php',
    __DIR__ . '/../../api/utils/database.php',
    __DIR__ . '/../../utils/database.php'
];

$databaseUtilsLoaded = false;
foreach ($utilPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $databaseUtilsLoaded = true;
        break;
    }
}

if (!$databaseUtilsLoaded) {
    // Try to look for config.php if database utils not found
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Database utilities not found',
            'searched_paths' => $utilPaths
        ]);
        exit;
    }
}

// Define response function if not found
if (!function_exists('sendErrorResponse')) {
    function sendErrorResponse($message, $code = 500, $details = []) {
        http_response_code($code);
        echo json_encode([
            'status' => 'error',
            'message' => $message,
            'details' => $details
        ]);
        exit;
    }
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'No action taken',
    'details' => []
];

// Check if this is a GET request for all vehicles
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'getAll') {
    try {
        // Connect to database
        $conn = getDbConnection();
        if (!$conn) {
            throw new Exception("Failed to connect to database");
        }
        
        // Log database connection success
        error_log("Database connection successful for vehicles-update.php getAll");
        
        // Ensure necessary tables exist
        if (function_exists('ensureDatabaseTables')) {
            ensureDatabaseTables($conn);
        }
        
        // First try vehicle_types table
        $vehicles = [];
        $tablesChecked = [];
        
        // Check if vehicle_types table exists
        if (function_exists('tableExists')) {
            $vehicleTypesExists = tableExists($conn, 'vehicle_types');
            $tablesChecked['vehicle_types'] = $vehicleTypesExists;
            
            if ($vehicleTypesExists) {
                // Determine whether to include inactive vehicles
                $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
                
                // Build the SQL query
                $sql = "SELECT * FROM vehicle_types";
                if (!$includeInactive) {
                    $sql .= " WHERE is_active = 1";
                }
                $sql .= " ORDER BY name ASC";
                
                // Execute the query
                $result = $conn->query($sql);
                
                if (!$result) {
                    $tablesChecked['vehicle_types_error'] = $conn->error;
                } else {
                    while ($row = $result->fetch_assoc()) {
                        // Normalize vehicle_id to id
                        $row['id'] = $row['vehicle_id'];
                        
                        // Convert amenities from JSON string to array if it exists
                        if (isset($row['amenities']) && !empty($row['amenities'])) {
                            try {
                                $amenities = json_decode($row['amenities'], true);
                                if (json_last_error() === JSON_ERROR_NONE) {
                                    $row['amenities'] = $amenities;
                                } else {
                                    $row['amenities'] = [];
                                }
                            } catch (Exception $e) {
                                $row['amenities'] = [];
                            }
                        } else {
                            $row['amenities'] = [];
                        }
                        
                        // Standardize isActive property
                        $row['isActive'] = (bool)$row['is_active'];
                        
                        $vehicles[] = $row;
                    }
                }
            }
        }
        
        // If no vehicles found in vehicle_types, try vehicles table
        if (empty($vehicles) && function_exists('tableExists')) {
            $vehiclesExists = tableExists($conn, 'vehicles');
            $tablesChecked['vehicles'] = $vehiclesExists;
            
            if ($vehiclesExists) {
                // Determine whether to include inactive vehicles
                $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
                
                // Build the SQL query
                $sql = "SELECT * FROM vehicles";
                if (!$includeInactive && function_exists('columnExists') && columnExists($conn, 'vehicles', 'is_active')) {
                    $sql .= " WHERE is_active = 1";
                }
                $sql .= " ORDER BY name ASC";
                
                // Execute the query
                $result = $conn->query($sql);
                
                if (!$result) {
                    $tablesChecked['vehicles_error'] = $conn->error;
                } else {
                    while ($row = $result->fetch_assoc()) {
                        // Normalize vehicle_id to id
                        $row['id'] = $row['vehicle_id'] ?? $row['id'];
                        
                        // Convert amenities from JSON string to array if it exists
                        if (isset($row['amenities']) && !empty($row['amenities'])) {
                            try {
                                $amenities = json_decode($row['amenities'], true);
                                if (json_last_error() === JSON_ERROR_NONE) {
                                    $row['amenities'] = $amenities;
                                } else {
                                    $row['amenities'] = [];
                                }
                            } catch (Exception $e) {
                                $row['amenities'] = [];
                            }
                        } else {
                            $row['amenities'] = [];
                        }
                        
                        // Standardize isActive property
                        $row['isActive'] = isset($row['is_active']) ? (bool)$row['is_active'] : true;
                        
                        $vehicles[] = $row;
                    }
                }
            }
        }
        
        // If still no vehicles, try vehicle_pricing table as a fallback
        if (empty($vehicles) && function_exists('tableExists')) {
            $vehiclePricingExists = tableExists($conn, 'vehicle_pricing');
            $tablesChecked['vehicle_pricing'] = $vehiclePricingExists;
            
            if ($vehiclePricingExists) {
                // Check which ID column exists
                $idColumns = ['vehicle_id', 'vehicle_type', 'cab_type'];
                $foundColumn = false;
                
                foreach ($idColumns as $column) {
                    if (function_exists('columnExists') && columnExists($conn, 'vehicle_pricing', $column)) {
                        // Query using this column
                        $sql = "SELECT DISTINCT $column as id FROM vehicle_pricing";
                        $result = $conn->query($sql);
                        
                        if ($result) {
                            while ($row = $result->fetch_assoc()) {
                                $id = $row['id'];
                                if (!empty($id)) {
                                    $vehicles[] = [
                                        'id' => $id,
                                        'vehicle_id' => $id,
                                        'name' => ucfirst(str_replace('_', ' ', $id)),
                                        'capacity' => 4,
                                        'luggage_capacity' => 2,
                                        'ac' => 1,
                                        'is_active' => 1,
                                        'isActive' => true,
                                        'amenities' => ['AC'],
                                        'image' => '/cars/' . strtolower($id) . '.png'
                                    ];
                                }
                            }
                            $foundColumn = true;
                            break;
                        }
                    }
                }
                
                if (!$foundColumn) {
                    $tablesChecked['vehicle_pricing_error'] = 'No ID column found';
                }
            }
        }
        
        // If still no vehicles, provide default fallback
        if (empty($vehicles)) {
            $vehicles = [
                [
                    'id' => 'sedan',
                    'vehicle_id' => 'sedan',
                    'name' => 'Sedan',
                    'capacity' => 4,
                    'luggage_capacity' => 2,
                    'ac' => 1,
                    'is_active' => 1,
                    'isActive' => true,
                    'amenities' => ['AC', 'Bottle Water', 'Music System'],
                    'image' => '/cars/sedan.png',
                    'description' => 'Comfortable sedan suitable for 4 passengers.'
                ],
                [
                    'id' => 'ertiga',
                    'vehicle_id' => 'ertiga',
                    'name' => 'Ertiga',
                    'capacity' => 6,
                    'luggage_capacity' => 3,
                    'ac' => 1,
                    'is_active' => 1,
                    'isActive' => true,
                    'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                    'image' => '/cars/ertiga.png',
                    'description' => 'Spacious SUV suitable for 6 passengers.'
                ],
                [
                    'id' => 'innova_crysta',
                    'vehicle_id' => 'innova_crysta',
                    'name' => 'Innova Crysta',
                    'capacity' => 7,
                    'luggage_capacity' => 4,
                    'ac' => 1,
                    'is_active' => 1,
                    'isActive' => true,
                    'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
                    'image' => '/cars/innova.png',
                    'description' => 'Premium SUV with ample space for 7 passengers.'
                ]
            ];
            $response['details']['used_fallback'] = true;
        }
        
        $response['status'] = 'success';
        $response['message'] = 'Vehicles retrieved successfully';
        $response['data'] = $vehicles;
        $response['details']['count'] = count($vehicles);
        $response['details']['tables_checked'] = $tablesChecked;
        
        // Add debug information
        if (isset($_GET['debug']) && $_GET['debug'] === 'true') {
            $response['details']['tables'] = [];
            $tablesResult = $conn->query("SHOW TABLES");
            if ($tablesResult) {
                while ($table = $tablesResult->fetch_array(MYSQLI_NUM)) {
                    $response['details']['tables'][] = $table[0];
                }
            } else {
                $response['details']['tables_error'] = $conn->error;
            }
            
            // Check for vehicle_types table columns
            if (tableExists($conn, 'vehicle_types') && function_exists('getTableColumns')) {
                $response['details']['vehicle_types_columns'] = getTableColumns($conn, 'vehicle_types');
            }
            
            // Check for vehicle_pricing table columns
            if (tableExists($conn, 'vehicle_pricing') && function_exists('getTableColumns')) {
                $response['details']['vehicle_pricing_columns'] = getTableColumns($conn, 'vehicle_pricing');
            }
            
            // Add database health check
            if (function_exists('checkDatabaseHealth')) {
                $response['details']['health'] = checkDatabaseHealth();
            }
        }
        
        // Return the response
        echo json_encode($response);
        exit();
    } catch (Exception $e) {
        error_log("Error in vehicles-update.php getAll: " . $e->getMessage());
        sendErrorResponse("Error retrieving vehicles: " . $e->getMessage(), 500, [
            'error_trace' => $e->getTraceAsString()
        ]);
    }
}

// Get the raw input and try to parse it as JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// If JSON parsing failed, try POST/GET data
if (json_last_error() !== JSON_ERROR_NONE) {
    $data = $_REQUEST;
}

// Debug information
$response['debug'] = [
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'request_params' => $_REQUEST,
    'post_data' => $_POST,
    'raw_input' => $input,
    'timestamp' => date('Y-m-d H:i:s')
];

// Extract vehicle ID from all possible sources
$vehicleId = null;
if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['id'])) {
    $vehicleId = $data['id'];
}

// Check for create new vehicle mode
$isNewVehicle = isset($data['isNew']) && $data['isNew'] === true;

// If it's a new vehicle and no vehicleId provided, generate one
if ($isNewVehicle && empty($vehicleId)) {
    // Generate a vehicle_id based on name or use a random one
    if (!empty($data['name'])) {
        // Convert name to lowercase, replace spaces with underscores
        $vehicleId = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $data['name']));
        // Ensure uniqueness by adding timestamp if needed
        if (strlen($vehicleId) < 3) {
            $vehicleId .= '_' . time();
        }
    } else {
        // Fallback to a random vehicle ID
        $vehicleId = 'vehicle_' . time();
    }
    
    $response['details']['generated_id'] = true;
}

// Extract other vehicle data
$name = isset($data['name']) ? $data['name'] : '';
$capacity = isset($data['capacity']) ? intval($data['capacity']) : 4;
$luggageCapacity = isset($data['luggageCapacity']) ? intval($data['luggageCapacity']) : 2;
$ac = isset($data['ac']) ? intval($data['ac']) : 1;
$isActive = isset($data['isActive']) ? intval($data['isActive']) : 1;
$image = isset($data['image']) ? $data['image'] : '';
$amenities = isset($data['amenities']) ? $data['amenities'] : '';
$description = isset($data['description']) ? $data['description'] : '';

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Validate required parameters
if (!$vehicleId) {
    $response['message'] = 'Missing required parameter: vehicleId';
    echo json_encode($response);
    exit();
}

// Convert amenities to a JSON string if it's an array
if (is_array($amenities)) {
    $amenities = json_encode($amenities);
}

try {
    // Connect to the database
    $conn = getDbConnection();
    
    // Check if vehicle_types table exists
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
    if ($result->num_rows == 0) {
        // Create vehicle_types table
        $sql = "CREATE TABLE vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255),
            amenities TEXT,
            description TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB;";
        
        if (!$conn->query($sql)) {
            throw new Exception("Error creating vehicle_types table: " . $conn->error);
        }
    }
    
    // Check if vehicle exists
    $checkQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkQuery);
    
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Vehicle exists, update it
        $updateQuery = "UPDATE vehicle_types SET 
                       name = ?, 
                       capacity = ?, 
                       luggage_capacity = ?, 
                       ac = ?, 
                       is_active = ?,
                       image = ?,
                       amenities = ?,
                       description = ?
                       WHERE vehicle_id = ?";
        
        $stmt = $conn->prepare($updateQuery);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        $stmt->bind_param("siiiissss", $name, $capacity, $luggageCapacity, $ac, $isActive, $image, $amenities, $description, $vehicleId);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $response['status'] = 'success';
            $response['message'] = 'Vehicle updated successfully';
            $response['details']['updated'] = true;
        } else {
            $response['status'] = 'success';
            $response['message'] = 'No changes made to vehicle';
            $response['details']['unchanged'] = true;
        }
    } else {
        // Vehicle doesn't exist, create it
        $insertQuery = "INSERT INTO vehicle_types (
                       vehicle_id, name, capacity, luggage_capacity, ac, is_active, image, amenities, description
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($insertQuery);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        $stmt->bind_param("ssiiiisss", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $isActive, $image, $amenities, $description);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $vehicleTypeId = $stmt->insert_id;
            $response['status'] = 'success';
            $response['message'] = 'Vehicle created successfully';
            $response['details']['created'] = true;
            $response['details']['id'] = $vehicleTypeId;
            $response['details']['vehicle_id'] = $vehicleId;
        } else {
            throw new Exception("Failed to insert vehicle: " . $conn->error);
        }
    }
    
    // Create default fare entries if they don't exist - OUTSTATION FARES
    if (tableExists($conn, 'outstation_fares')) {
        $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Default outstation fares
            $basePrice = 2500;
            $pricePerKm = 14;
            $nightHaltCharge = 700;
            $driverAllowance = 250;
            $roundTripBasePrice = 2000;
            $roundTripPricePerKm = 12;
            
            if (stripos($vehicleId, 'ertiga') !== false) {
                $basePrice = 3200;
                $pricePerKm = 18;
                $nightHaltCharge = 1000;
                $roundTripBasePrice = 2800;
                $roundTripPricePerKm = 16;
            } else if (stripos($vehicleId, 'innova') !== false) {
                $basePrice = 3800;
                $pricePerKm = 20;
                $nightHaltCharge = 1000;
                $roundTripBasePrice = 3400;
                $roundTripPricePerKm = 18;
            }
            
            $columns = getTableColumns($conn, 'outstation_fares');
            $useBasePriceColumn = in_array('base_price', $columns);
            $useBaseFareColumn = in_array('base_fare', $columns);
            
            if ($useBasePriceColumn) {
                $insertQuery = "INSERT INTO outstation_fares (
                               vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                               roundtrip_base_price, roundtrip_price_per_km
                               ) VALUES (?, ?, ?, ?, ?, ?, ?)";
            } else if ($useBaseFareColumn) {
                $insertQuery = "INSERT INTO outstation_fares (
                               vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, 
                               roundtrip_base_price, roundtrip_price_per_km
                               ) VALUES (?, ?, ?, ?, ?, ?, ?)";
            } else {
                // If neither column exists, create the table with correct columns
                $conn->query("
                    CREATE TABLE IF NOT EXISTS outstation_fares (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                        roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                        roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ");
                
                $insertQuery = "INSERT INTO outstation_fares (
                               vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                               roundtrip_base_price, roundtrip_price_per_km
                               ) VALUES (?, ?, ?, ?, ?, ?, ?)";
            }
            
            $stmt = $conn->prepare($insertQuery);
            if ($stmt) {
                $stmt->bind_param("sdddddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, 
                              $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm);
                $stmt->execute();
                
                $response['details']['outstation_fares_created'] = true;
            } else {
                $response['details']['outstation_fares_error'] = $conn->error;
            }
        }
    } else {
        // Create outstation_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        $response['details']['outstation_fares_table_created'] = true;
    }
    
    // Create default fare entries if they don't exist - LOCAL PACKAGE FARES
    if (tableExists($conn, 'local_package_fares')) {
        $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Default local package fares
            $price4hrs40km = 1600;
            $price8hrs80km = 2800;
            $price10hrs100km = 3400;
            $priceExtraKm = 14;
            $priceExtraHour = 150;
            
            if (stripos($vehicleId, 'ertiga') !== false) {
                $price4hrs40km = 2200;
                $price8hrs80km = 3800;
                $price10hrs100km = 4400;
                $priceExtraKm = 18;
                $priceExtraHour = 200;
            } else if (stripos($vehicleId, 'innova') !== false) {
                $price4hrs40km = 2600;
                $price8hrs80km = 4400;
                $price10hrs100km = 5000;
                $priceExtraKm = 20;
                $priceExtraHour = 250;
            }
            
            $insertQuery = "INSERT INTO local_package_fares (
                           vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                           price_extra_km, price_extra_hour
                           ) VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertQuery);
            if ($stmt) {
                $stmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, 
                              $priceExtraKm, $priceExtraHour);
                $stmt->execute();
                
                $response['details']['local_fares_created'] = true;
            } else {
                $response['details']['local_fares_error'] = $conn->error;
            }
        }
    } else {
        // Create local_package_fares table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        $response['details']['local_fares_table_created'] = true;
    }
    
    // Create default fare entries if they don't exist - AIRPORT TRANSFER FARES
    if (tableExists($conn, 'airport_transfer_fares')) {
        $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Default airport fares
            $basePrice = 1500;
            $pricePerKm = 14;
            $pickupPrice = 1600;
            $dropPrice = 1500;
            $tier1Price = 1600;
            $tier2Price = 1800;
            $tier3Price = 2200;
            $tier4Price = 2600;
            $extraKmCharge = 14;
            
            if (stripos($vehicleId, 'ertiga') !== false) {
                $basePrice = 2000;
                $pricePerKm = 18;
                $pickupPrice = 2000;
                $dropPrice = 1900;
                $tier1Price = 2000;
                $tier2Price = 2200;
                $tier3Price = 2600;
                $tier4Price = 3000;
                $extraKmCharge = 18;
            } else if (stripos($vehicleId, 'innova') !== false) {
                $basePrice = 2500;
                $pricePerKm = 20;
                $pickupPrice = 2400;
                $dropPrice = 2300;
                $tier1Price = 2400;
                $tier2Price = 2600;
                $tier3Price = 3000;
                $tier4Price = 3400;
                $extraKmCharge = 20;
            }
            
            $insertQuery = "INSERT INTO airport_transfer_fares (
                           vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                           tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
                           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertQuery);
            if ($stmt) {
                $stmt->bind_param("sddddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                               $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge);
                $stmt->execute();
                
                $response['details']['airport_fares_created'] = true;
            } else {
                $response['details']['airport_fares_error'] = $conn->error;
            }
        }
    } else {
        // Create airport_transfer_fares table if it doesn't exist
        $conn->query("
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
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        $response['details']['airport_fares_table_created'] = true;
    }
    
    // Also make sure the vehicle exists in vehicle_pricing for compatibility if the table exists
    if (tableExists($conn, 'vehicle_pricing')) {
        // Check which columns exist for querying
        $hasVehicleIdColumn = columnExists($conn, 'vehicle_pricing', 'vehicle_id');
        $hasVehicleTypeColumn = columnExists($conn, 'vehicle_pricing', 'vehicle_type');
        
        if ($hasVehicleIdColumn || $hasVehicleTypeColumn) {
            // Build the query dynamically based on what columns exist
            $checkQuery = "SELECT id FROM vehicle_pricing WHERE ";
            $conditions = [];
            $queryParams = [];
            $types = "";
            
            if ($hasVehicleIdColumn) {
                $conditions[] = "vehicle_id = ?";
                $queryParams[] = $vehicleId;
                $types .= "s";
            }
            
            if ($hasVehicleTypeColumn) {
                $conditions[] = "vehicle_type = ?";
                $queryParams[] = $vehicleId;
                $types .= "s";
            }
            
            $checkQuery .= implode(" OR ", $conditions);
            
            $stmt = $conn->prepare($checkQuery);
            if ($stmt) {
                $stmt->bind_param($types, ...$queryParams);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    // Need to insert into vehicle_pricing
                    $insertColumns = [];
                    $insertPlaceholders = [];
                    $insertValues = [];
                    $insertTypes = "";
                    
                    if ($hasVehicleIdColumn) {
                        $insertColumns[] = "vehicle_id";
                        $insertPlaceholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    if ($hasVehicleTypeColumn) {
                        $insertColumns[] = "vehicle_type";
                        $insertPlaceholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    $insertColumns[] = "trip_type";
                    $insertPlaceholders[] = "?";
                    $insertValues[] = "all";
                    $insertTypes .= "s";
                    
                    $insertQuery = "INSERT INTO vehicle_pricing (" . implode(", ", $insertColumns) . 
                                  ") VALUES (" . implode(", ", $insertPlaceholders) . ")";
                    
                    $insertStmt = $conn->prepare($insertQuery);
                    if ($insertStmt) {
                        $insertStmt->bind_param($insertTypes, ...$insertValues);
                        $insertStmt->execute();
                        $response['details']['vehicle_pricing_created'] = true;
                    } else {
                        $response['details']['vehicle_pricing_error'] = $conn->error;
                    }
                } else {
                    $response['details']['vehicle_pricing_exists'] = true;
                }
            } else {
                $response['details']['vehicle_pricing_prepare_error'] = $conn->error;
            }
        } else {
            $response['details']['vehicle_pricing_no_id_columns'] = true;
        }
    } else {
        $response['details']['vehicle_pricing_table_not_found'] = true;
    }
    
    // Output the response
    echo json_encode($response);
    exit();
    
} catch (Exception $e) {
    error_log("Error in vehicles-update.php: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['details']['error_trace'] = $e->getTraceAsString();
    $response['details']['error_file'] = $e->getFile();
    $response['details']['error_line'] = $e->getLine();
    
    echo json_encode($response);
    exit();
}
