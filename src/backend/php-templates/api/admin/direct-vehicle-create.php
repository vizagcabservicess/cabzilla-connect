
<?php
// direct-vehicle-create.php - A simplified endpoint for vehicle creation

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.4');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle create request: Method=$requestMethod, URI=$requestUri");

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
$headersList = function_exists('getallheaders') ? getallheaders() : [];
error_log("ALL HEADERS: " . json_encode($headersList));

// Include database configuration - adjust path as necessary
$configPath = __DIR__ . '/../../config.php';
if (file_exists($configPath)) {
    require_once $configPath;
} else {
    error_log("Config file not found at: " . $configPath);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server configuration not found',
    ]);
    exit;
}

// Get data from request using multiple approaches
$data = [];

// Try POST data first
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true));
}
// Then try JSON input
else {
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    // Try JSON decode
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Successfully parsed JSON data");
    }
    // Try form-urlencoded
    else {
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Successfully parsed form-urlencoded data");
        }
    }
}

// Final validation
if (empty($data) || !isset($data['name'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required field: name',
        'receivedData' => $data
    ]);
    exit;
}

// Extract and clean vehicle ID
$vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : '';
if (empty($vehicleId) && isset($data['name'])) {
    // Generate vehicleId from name
    $vehicleId = preg_replace('/[^a-z0-9_]/', '_', strtolower($data['name']));
}

// Make sure we have a valid vehicleId
$vehicleId = preg_replace('/[^a-z0-9_]/', '_', strtolower($vehicleId));

// Basic info - with fallbacks for all fields
$name = isset($data['name']) ? $data['name'] : 'Unknown Vehicle';
$capacity = isset($data['capacity']) ? intval($data['capacity']) : 4;
$luggageCapacity = isset($data['luggageCapacity']) ? intval($data['luggageCapacity']) : 2;
$image = isset($data['image']) ? $data['image'] : '/cars/sedan.png';
$description = isset($data['description']) ? $data['description'] : $name . ' vehicle';

// Pricing info (defaults)
$basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
$pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
$driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 250;
$nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 700;

// Handle amenities
$amenities = ['AC', 'Bottle Water', 'Music System'];
if (isset($data['amenities'])) {
    if (is_array($data['amenities'])) {
        $amenities = $data['amenities'];
    } else if (is_string($data['amenities']) && !empty($data['amenities'])) {
        // Try to parse JSON string
        $decodedAmenities = json_decode($data['amenities'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decodedAmenities)) {
            $amenities = $decodedAmenities;
        }
    }
} else if (isset($data['amenitiesJson']) && is_string($data['amenitiesJson']) && !empty($data['amenitiesJson'])) {
    // Try to parse from amenitiesJson field
    $decodedAmenities = json_decode($data['amenitiesJson'], true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedAmenities)) {
        $amenities = $decodedAmenities;
    }
}
$amenitiesJson = json_encode($amenities);

try {
    // Connect to database
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    error_log("Database connected successfully");
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle already exists
        $checkStmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
        if (!$checkStmt) {
            throw new Exception("Failed to prepare check statement: " . $conn->error);
        }
        $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Vehicle already exists with ID: ' . $vehicleId
            ]);
            exit;
        }

        // Also check vehicle_types table
        $checkTypesStmt = $conn->prepare("SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?");
        if ($checkTypesStmt) {
            $checkTypesStmt->bind_param("s", $vehicleId);
            $checkTypesStmt->execute();
            $typesResult = $checkTypesStmt->get_result();
            
            if ($typesResult->num_rows > 0) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Vehicle type already exists with ID: ' . $vehicleId
                ]);
                exit;
            }
            $checkTypesStmt->close();
        }
        
        error_log("Vehicle doesn't exist, proceeding with creation...");
        
        // Create vehicle first - check if the vehicles table exists
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
        $vehiclesTableExists = $tableCheckResult && $tableCheckResult->num_rows > 0;
        
        if ($vehiclesTableExists) {
            $createVehicleStmt = $conn->prepare("
                INSERT INTO vehicles 
                (id, vehicle_id, name, capacity, luggage_capacity, image, description, amenities, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            
            if (!$createVehicleStmt) {
                throw new Exception("Failed to prepare vehicle insert statement: " . $conn->error);
            }
            
            $createVehicleStmt->bind_param(
                "sssiisss", 
                $vehicleId, 
                $vehicleId, 
                $name, 
                $capacity, 
                $luggageCapacity,
                $image,
                $description,
                $amenitiesJson
            );
            
            if (!$createVehicleStmt->execute()) {
                throw new Exception("Failed to create vehicle: " . $createVehicleStmt->error);
            }
            
            $createVehicleStmt->close();
            error_log("Created vehicle in vehicles table");
        } else {
            error_log("Vehicles table doesn't exist, skipping vehicles table insert");
        }
        
        // Add to vehicle_types for compatibility - this is the most important table
        $createVehicleTypeStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, image, description, amenities, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        ");
        
        if (!$createVehicleTypeStmt) {
            throw new Exception("Failed to prepare vehicle_types insert statement: " . $conn->error);
        }
        
        $createVehicleTypeStmt->bind_param(
            "ssiisss", 
            $vehicleId, 
            $name, 
            $capacity, 
            $luggageCapacity,
            $image,
            $description,
            $amenitiesJson
        );
        
        if (!$createVehicleTypeStmt->execute()) {
            throw new Exception("Failed to create vehicle type: " . $createVehicleTypeStmt->error);
        }
        
        $createVehicleTypeStmt->close();
        error_log("Created vehicle in vehicle_types table");
        
        // Check if vehicle_pricing table exists
        $pricingTableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        $pricingTableExists = $pricingTableCheckResult && $pricingTableCheckResult->num_rows > 0;
        
        if ($pricingTableExists) {
            // Add base pricing in vehicle_pricing - determine which column name to use
            $baseColumnName = "base_price";
            $columnCheckResult = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'base_price'");
            if (!$columnCheckResult->num_rows) {
                $baseColumnName = "base_fare"; // Use alternative column name
            }
            
            $createPricingStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, vehicle_type, trip_type, $baseColumnName, price_per_km, driver_allowance, night_halt_charge, created_at, updated_at)
                VALUES (?, ?, 'all', ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$createPricingStmt) {
                throw new Exception("Failed to prepare pricing statement: " . $conn->error);
            }
            
            $createPricingStmt->bind_param(
                "ssdddd", 
                $vehicleId, 
                $vehicleId, 
                $basePrice, 
                $pricePerKm, 
                $driverAllowance, 
                $nightHaltCharge
            );
            
            if (!$createPricingStmt->execute()) {
                throw new Exception("Failed to create pricing: " . $createPricingStmt->error);
            }
            
            $createPricingStmt->close();
            error_log("Created pricing in vehicle_pricing table");
        } else {
            error_log("vehicle_pricing table doesn't exist, skipping pricing insert");
        }
        
        // Check if outstation_fares table exists
        $outstationTableCheckResult = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        $outstationTableExists = $outstationTableCheckResult && $outstationTableCheckResult->num_rows > 0;
        
        if ($outstationTableExists) {
            // Determine which column name to use for outstation fares
            $outstationBaseColumn = "base_price";
            $outstationColumnCheck = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'base_price'");
            if (!$outstationColumnCheck->num_rows) {
                $outstationBaseColumn = "base_fare";
            }
            
            // Add outstation fares
            $outstationStmt = $conn->prepare("
                INSERT INTO outstation_fares 
                (vehicle_id, $outstationBaseColumn, price_per_km, driver_allowance, night_halt_charge, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$outstationStmt) {
                throw new Exception("Failed to prepare outstation fares statement: " . $conn->error);
            }
            
            $outstationStmt->bind_param(
                "sdddd", 
                $vehicleId, 
                $basePrice, 
                $pricePerKm, 
                $driverAllowance, 
                $nightHaltCharge
            );
            
            if (!$outstationStmt->execute()) {
                throw new Exception("Failed to create outstation fares: " . $outstationStmt->error);
            }
            
            $outstationStmt->close();
            error_log("Created outstation fares");
        } else {
            error_log("outstation_fares table doesn't exist, skipping outstation fares insert");
        }
        
        // Check if local_package_fares table exists
        $localTableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        $localTableExists = $localTableCheckResult && $localTableCheckResult->num_rows > 0;
        
        if ($localTableExists) {
            // Add local package fares with defaults
            $localStmt = $conn->prepare("
                INSERT INTO local_package_fares 
                (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$localStmt) {
                throw new Exception("Failed to prepare local fares statement: " . $conn->error);
            }
            
            $price8hrs80km = 1500;
            $price10hrs100km = 1800;
            $priceExtraKm = 15;
            $priceExtraHour = 200;
            
            $localStmt->bind_param(
                "sdddd", 
                $vehicleId, 
                $price8hrs80km, 
                $price10hrs100km, 
                $priceExtraKm, 
                $priceExtraHour
            );
            
            if (!$localStmt->execute()) {
                throw new Exception("Failed to create local package fares: " . $localStmt->error);
            }
            
            $localStmt->close();
            error_log("Created local package fares");
        } else {
            error_log("local_package_fares table doesn't exist, skipping local fares insert");
        }
        
        // Check if airport_transfer_fares table exists
        $airportTableCheckResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        $airportTableExists = $airportTableCheckResult && $airportTableCheckResult->num_rows > 0;
        
        if ($airportTableExists) {
            // Add airport fares with defaults
            $airportStmt = $conn->prepare("
                INSERT INTO airport_transfer_fares 
                (vehicle_id, pickup_fare, drop_fare, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())
            ");
            
            if (!$airportStmt) {
                throw new Exception("Failed to prepare airport fares statement: " . $conn->error);
            }
            
            $pickupFare = 1000;
            $dropFare = 1000;
            
            $airportStmt->bind_param(
                "sdd", 
                $vehicleId, 
                $pickupFare, 
                $dropFare
            );
            
            if (!$airportStmt->execute()) {
                throw new Exception("Failed to create airport fares: " . $airportStmt->error);
            }
            
            $airportStmt->close();
            error_log("Created airport fares");
        } else {
            error_log("airport_transfer_fares table doesn't exist, skipping airport fares insert");
        }
        
        // Commit all changes
        $conn->commit();
        error_log("All changes committed successfully");
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle created successfully',
            'vehicleId' => $vehicleId,
            'details' => [
                'vehicle_id' => $vehicleId,
                'name' => $name,
                'capacity' => $capacity,
                'luggageCapacity' => $luggageCapacity,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm
            ]
        ]);
        exit;
        
    } catch (Exception $e) {
        // Roll back on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Error creating vehicle: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to create vehicle: ' . $e->getMessage(),
        'debug' => $data,
        'trace' => $e->getTraceAsString()
    ]);
    exit;
}
