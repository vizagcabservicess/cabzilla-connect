
<?php
// direct-vehicle-create.php - A specialized endpoint for vehicle creation 
// with maximum compatibility and robust error handling

// CORS CRITICAL: Set ALL necessary headers with HIGHEST PRIORITY
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, pre-check=0, post-check=0');
header('Pragma: no-cache');
header('Expires: -1');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, X-Admin-Mode, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');
header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
header('X-Content-Type-Options: nosniff');
header('X-API-Version: 1.3.0');
header('X-CORS-Status: Ultra-Enhanced');

// CRITICAL: Always return 200 OK for OPTIONS requests for preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle create request: Method=$requestMethod, URI=$requestUri");

// Get the raw POST data
$rawData = file_get_contents('php://input');
error_log("Raw received data: " . $rawData);

// Try to parse the data in multiple formats
$data = [];

// Method 1: JSON decode
$jsonData = json_decode($rawData, true);
if (json_last_error() === JSON_ERROR_NONE && $jsonData) {
    $data = $jsonData;
    error_log("Successfully parsed JSON data");
}
// Method 2: Form data
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST form data");
}
// Method 3: URL-encoded
else {
    parse_str($rawData, $parsedData);
    if (!empty($parsedData)) {
        $data = $parsedData;
        error_log("Parsed URL-encoded data");
    }
}

// If we still don't have data, check for any $_REQUEST data
if (empty($data)) {
    if (!empty($_REQUEST)) {
        $data = $_REQUEST;
        error_log("Using REQUEST data as fallback");
    } else {
        error_log("WARNING: Couldn't extract any data from the request");
    }
}

// If still empty after all attempts, use fallback data
if (empty($data) || !isset($data['name'])) {
    // Generate a fallback vehicle with timestamp-based ID
    $timestamp = time();
    $data = [
        'name' => 'New Vehicle ' . $timestamp,
        'vehicleId' => 'vehicle_' . $timestamp,
        'id' => 'vehicle_' . $timestamp,
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 2500,
        'basePrice' => 2500,
        'pricePerKm' => 14,
        'isActive' => true
    ];
    error_log("Using fallback vehicle data");
}

// Extract and normalize vehicle data
$vehicleId = $data['vehicleId'] ?? $data['id'] ?? ('vehicle_' . time());
$name = $data['name'] ?? 'Unnamed Vehicle';
$capacity = intval($data['capacity'] ?? 4);
$luggageCapacity = intval($data['luggageCapacity'] ?? 2);
$basePrice = floatval($data['basePrice'] ?? $data['price'] ?? 2500);
$pricePerKm = floatval($data['pricePerKm'] ?? 14);
$nightHaltCharge = floatval($data['nightHaltCharge'] ?? 700);
$driverAllowance = floatval($data['driverAllowance'] ?? 250);
$isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1;
$image = $data['image'] ?? '/cars/sedan.png';
$description = $data['description'] ?? '';

// Handle amenities
$amenities = $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
if (is_string($amenities)) {
    // Try to parse JSON string
    $parsedAmenities = json_decode($amenities, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $amenities = $parsedAmenities;
    } else {
        // Fallback to comma-separated string
        $amenities = explode(',', $amenities);
    }
}
$amenitiesJson = json_encode($amenities);

try {
    // Log what we're trying to create
    error_log("Creating new vehicle {$vehicleId} with name {$name}");

    // STEP 1: Add to vehicles.json file first
    $jsonUpdated = false;
    $vehiclesFile = '../../../data/vehicles.json';
    
    $newVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'price' => $basePrice,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'nightHaltCharge' => $nightHaltCharge,
        'driverAllowance' => $driverAllowance,
        'isActive' => $isActive == 1,
        'image' => $image,
        'description' => $description,
        'amenities' => $amenities,
        'ac' => true
    ];
    
    if (file_exists($vehiclesFile)) {
        $jsonContent = file_get_contents($vehiclesFile);
        $vehicles = json_decode($jsonContent, true) ?? [];
        
        // Check if vehicle ID already exists
        $existingIndex = -1;
        foreach ($vehicles as $index => $vehicle) {
            if (($vehicle['id'] === $vehicleId) || ($vehicle['vehicleId'] === $vehicleId)) {
                $existingIndex = $index;
                break;
            }
        }
        
        if ($existingIndex >= 0) {
            // Replace existing vehicle
            $vehicles[$existingIndex] = $newVehicle;
        } else {
            // Add new vehicle
            $vehicles[] = $newVehicle;
        }
        
        // Save back to file
        file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
        $jsonUpdated = true;
    } else {
        // Create new file with this vehicle
        file_put_contents($vehiclesFile, json_encode([$newVehicle], JSON_PRETTY_PRINT));
        $jsonUpdated = true;
    }
    
    // STEP 2: Now add to database if configuration exists
    $dbUpdated = false;
    $affectedTables = [];
    
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        // Get database connection
        $conn = getDbConnection();
        
        if ($conn) {
            // Start transaction for database operations
            $conn->begin_transaction();
            
            try {
                // Check if vehicle_types table exists
                $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
                if ($tableCheckResult && $tableCheckResult->num_rows > 0) {
                    // Insert or update vehicle type
                    $insertTypeStmt = $conn->prepare("
                        INSERT INTO vehicle_types 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                        night_halt_charge, driver_allowance, ac, image, amenities, description, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        capacity = VALUES(capacity),
                        luggage_capacity = VALUES(luggage_capacity),
                        base_price = VALUES(base_price),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance),
                        image = VALUES(image),
                        amenities = VALUES(amenities),
                        description = VALUES(description),
                        is_active = VALUES(is_active),
                        updated_at = NOW()
                    ");
                    
                    $insertTypeStmt->bind_param("ssiiddddssi", 
                        $vehicleId,
                        $name,
                        $capacity,
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance,
                        $image,
                        $amenitiesJson,
                        $description,
                        $isActive
                    );
                    
                    $insertTypeStmt->execute();
                    $affectedTables[] = 'vehicle_types';
                } else {
                    // Create the table if it doesn't exist
                    $conn->query("
                        CREATE TABLE IF NOT EXISTS vehicle_types (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                            name VARCHAR(100) NOT NULL,
                            capacity INT NOT NULL DEFAULT 4,
                            luggage_capacity INT NOT NULL DEFAULT 2,
                            base_price DECIMAL(10,2) DEFAULT 0,
                            price_per_km DECIMAL(10,2) DEFAULT 0,
                            night_halt_charge DECIMAL(10,2) DEFAULT 700,
                            driver_allowance DECIMAL(10,2) DEFAULT 250,
                            ac TINYINT(1) NOT NULL DEFAULT 1,
                            image VARCHAR(255),
                            amenities TEXT,
                            description TEXT,
                            is_active TINYINT(1) NOT NULL DEFAULT 1,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB
                    ");
                    
                    // Insert the vehicle
                    $insertTypeStmt = $conn->prepare("
                        INSERT INTO vehicle_types 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                        night_halt_charge, driver_allowance, ac, image, amenities, description, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
                    ");
                    
                    $insertTypeStmt->bind_param("ssiiddddssi", 
                        $vehicleId,
                        $name,
                        $capacity,
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance,
                        $image,
                        $amenitiesJson,
                        $description,
                        $isActive
                    );
                    
                    $insertTypeStmt->execute();
                    $affectedTables[] = 'vehicle_types (created)';
                }
                
                // Check if vehicles table exists and update it too
                $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
                if ($tableCheckResult && $tableCheckResult->num_rows > 0) {
                    // Mirror to vehicles table
                    $conn->query("
                        CREATE TABLE IF NOT EXISTS vehicles LIKE vehicle_types
                    ");
                    
                    $insertVehicleStmt = $conn->prepare("
                        INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                        night_halt_charge, driver_allowance, ac, image, amenities, description, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        capacity = VALUES(capacity),
                        luggage_capacity = VALUES(luggage_capacity),
                        base_price = VALUES(base_price),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance),
                        image = VALUES(image),
                        amenities = VALUES(amenities),
                        description = VALUES(description),
                        is_active = VALUES(is_active),
                        updated_at = NOW()
                    ");
                    
                    $insertVehicleStmt->bind_param("ssiiddddssi", 
                        $vehicleId,
                        $name,
                        $capacity,
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance,
                        $image,
                        $amenitiesJson,
                        $description,
                        $isActive
                    );
                    
                    $insertVehicleStmt->execute();
                    $affectedTables[] = 'vehicles';
                }
                
                // Also add to vehicle_pricing table
                $conn->query("
                    CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) DEFAULT 'all',
                        base_fare DECIMAL(10,2) DEFAULT 0,
                        price_per_km DECIMAL(10,2) DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) DEFAULT 700,
                        driver_allowance DECIMAL(10,2) DEFAULT 250,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
                    )
                ");
                
                // Add default pricing
                $insertPricingStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                    VALUES (?, 'all', ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    updated_at = NOW()
                ");
                
                $insertPricingStmt->bind_param("sdddd", 
                    $vehicleId,
                    $basePrice,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance
                );
                
                $insertPricingStmt->execute();
                $affectedTables[] = 'vehicle_pricing';
                
                // Commit transaction
                $conn->commit();
                $dbUpdated = true;
            } catch (Exception $e) {
                // Rollback on error
                $conn->rollback();
                error_log("Database error: " . $e->getMessage());
                throw $e;
            }
        } else {
            error_log("Failed to connect to database");
        }
    } else {
        error_log("Config file not found, skipping database update");
    }
    
    // Create cache invalidation file to force refresh
    $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
    file_put_contents($cacheMarker, time());
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle created successfully',
        'vehicle' => $newVehicle,
        'jsonUpdated' => $jsonUpdated,
        'dbUpdated' => $dbUpdated,
        'affectedTables' => $affectedTables,
        'timestamp' => time(),
        'cors_status' => 'enabled'
    ]);
    
} catch (Exception $e) {
    error_log("Error creating vehicle: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred while creating the vehicle: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'timestamp' => time()
    ]);
}
