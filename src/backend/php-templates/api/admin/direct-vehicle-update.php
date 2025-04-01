
<?php
// direct-vehicle-update.php - A specialized endpoint for vehicle updates
// with maximum compatibility and robust error handling

// Set comprehensive CORS headers - HIGHEST PRIORITY
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, Origin, *');
header('Access-Control-Max-Age: 7200');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.1.0');

// Handle preflight OPTIONS request with HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle update request: Method=$requestMethod, URI=$requestUri");

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . $_SERVER['CONTENT_TYPE'] ?? 'not set');
error_log("ALL HEADERS: " . json_encode(getallheaders()));

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

// Clean up and normalize the vehicle data
$vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['id']) ? $data['id'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null));

// Verify we have a vehicle ID
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No vehicle ID provided'
    ]);
    exit;
}

// Convert vehicleId to string and make it URL-friendly
$vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));

// Extract the rest of the vehicle data
$vehicleData = [
    'id' => $vehicleId,
    'vehicleId' => $vehicleId,
    'vehicle_id' => $vehicleId,
    'name' => $data['name'] ?? 'Unnamed Vehicle',
    'capacity' => intval($data['capacity'] ?? 4),
    'luggageCapacity' => intval($data['luggageCapacity'] ?? $data['luggage_capacity'] ?? 2),
    'price' => floatval($data['price'] ?? $data['basePrice'] ?? $data['base_price'] ?? 0),
    'pricePerKm' => floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? 0),
    'basePrice' => floatval($data['basePrice'] ?? $data['price'] ?? $data['base_price'] ?? 0),
    'base_price' => floatval($data['base_price'] ?? $data['price'] ?? $data['basePrice'] ?? 0),
    'image' => $data['image'] ?? '/cars/sedan.png',
    'amenities' => $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'],
    'description' => $data['description'] ?? '',
    'ac' => isset($data['ac']) ? (bool)$data['ac'] : true,
    'nightHaltCharge' => floatval($data['nightHaltCharge'] ?? $data['night_halt_charge'] ?? 700),
    'night_halt_charge' => floatval($data['night_halt_charge'] ?? $data['nightHaltCharge'] ?? 700),
    'driverAllowance' => floatval($data['driverAllowance'] ?? $data['driver_allowance'] ?? 300),
    'driver_allowance' => floatval($data['driver_allowance'] ?? $data['driverAllowance'] ?? 300),
    'isActive' => isset($data['isActive']) ? (bool)$data['isActive'] : (isset($data['is_active']) ? (bool)$data['is_active'] : true),
    'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : (isset($data['isActive']) ? (bool)$data['isActive'] : true)
];

// Handle amenities - ensure it's an array
if (isset($data['amenities'])) {
    if (is_string($data['amenities'])) {
        // Try to decode JSON string
        $decodedAmenities = json_decode($data['amenities'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $vehicleData['amenities'] = $decodedAmenities;
        } else {
            // Split by comma if not JSON
            $vehicleData['amenities'] = array_map('trim', explode(',', $data['amenities']));
        }
    }
}

// Convert array to JSON for database storage
$amenitiesJson = json_encode($vehicleData['amenities']);

try {
    // 1. First, update vehicles.json file (simple and reliable local storage)
    $vehiclesFile = '../../../data/vehicles.json';
    $directory = dirname($vehiclesFile);
    
    // Create directory if it doesn't exist
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }
    
    // Read existing vehicles
    $vehicles = [];
    if (file_exists($vehiclesFile)) {
        $jsonContent = file_get_contents($vehiclesFile);
        if (!empty($jsonContent)) {
            $vehicles = json_decode($jsonContent, true) ?? [];
        }
    }
    
    // Check if vehicle with this ID already exists
    $updated = false;
    foreach ($vehicles as $key => $vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            $vehicles[$key] = array_merge($vehicle, $vehicleData);
            $updated = true;
            break;
        }
    }
    
    // If not updated, add it as a new vehicle
    if (!$updated) {
        $vehicles[] = $vehicleData;
    }
    
    // Save the updated list to file - always do this first for reliability
    file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    error_log("Successfully saved vehicle to local JSON file");
    
    // 2. Now try to save to database if config is available
    $databaseSaved = false;
    
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        try {
            // Try using standard database connection helper
            if (function_exists('getDbConnection')) {
                $conn = getDbConnection();
            } else {
                // Fall back to direct connection if helper isn't available
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            }
            
            if ($conn && !$conn->connect_error) {
                // Begin transaction for database operations
                $conn->begin_transaction();
                
                try {
                    // Apply SQL fixes if provided
                    if (isset($data['sql_fix']) && !empty($data['sql_fix'])) {
                        $sqlFixCommands = explode(';', $data['sql_fix']);
                        foreach ($sqlFixCommands as $command) {
                            if (trim($command)) {
                                $conn->query($command);
                            }
                        }
                        error_log("Applied SQL fixes");
                    }
                    
                    // Create vehicle_types table if it doesn't exist
                    $sql = "CREATE TABLE IF NOT EXISTS vehicle_types (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                        name VARCHAR(100) NOT NULL,
                        capacity INT DEFAULT 4,
                        luggage_capacity INT DEFAULT 2,
                        base_price DECIMAL(10,2) DEFAULT 0,
                        price_per_km DECIMAL(10,2) DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) DEFAULT 700,
                        driver_allowance DECIMAL(10,2) DEFAULT 300,
                        ac TINYINT(1) DEFAULT 1,
                        image VARCHAR(255) DEFAULT '/cars/sedan.png',
                        amenities TEXT DEFAULT NULL,
                        description TEXT DEFAULT NULL,
                        is_active TINYINT(1) DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )";
                    $conn->query($sql);
                    
                    // Check if vehicle already exists in database
                    $stmt = $conn->prepare("SELECT COUNT(*) FROM vehicle_types WHERE vehicle_id = ?");
                    $stmt->bind_param("s", $vehicleId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $row = $result->fetch_assoc();
                    
                    $isActiveValue = $vehicleData['is_active'] ? 1 : 0;
                    $acValue = $vehicleData['ac'] ? 1 : 0;
                    
                    if ($row && isset($row['COUNT(*)']) && $row['COUNT(*)'] > 0) {
                        // Update existing vehicle
                        $stmt = $conn->prepare("
                            UPDATE vehicle_types 
                            SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                                image = ?, description = ?, amenities = ?, is_active = ?,
                                base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
                            WHERE vehicle_id = ?
                        ");
                        
                        $stmt->bind_param(
                            "siissssisssss", 
                            $vehicleData['name'], 
                            $vehicleData['capacity'], 
                            $vehicleData['luggageCapacity'], 
                            $acValue, 
                            $vehicleData['image'], 
                            $vehicleData['description'], 
                            $amenitiesJson, 
                            $isActiveValue,
                            $vehicleData['base_price'],
                            $vehicleData['price_per_km'],
                            $vehicleData['night_halt_charge'],
                            $vehicleData['driver_allowance'],
                            $vehicleId
                        );
                        
                        $stmt->execute();
                    } else {
                        // Insert new vehicle
                        $stmt = $conn->prepare("
                            INSERT INTO vehicle_types 
                            (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active,
                             base_price, price_per_km, night_halt_charge, driver_allowance) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        $stmt->bind_param(
                            "ssiississssss", 
                            $vehicleId, 
                            $vehicleData['name'], 
                            $vehicleData['capacity'], 
                            $vehicleData['luggageCapacity'], 
                            $acValue, 
                            $vehicleData['image'], 
                            $vehicleData['description'], 
                            $amenitiesJson, 
                            $isActiveValue,
                            $vehicleData['base_price'],
                            $vehicleData['price_per_km'],
                            $vehicleData['night_halt_charge'],
                            $vehicleData['driver_allowance']
                        );
                        
                        $stmt->execute();
                    }
                    
                    // Also update vehicles table for backup
                    // First check if it exists
                    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
                    if ($tableCheckResult->num_rows > 0) {
                        // Check if vehicle exists in vehicles table
                        $stmt = $conn->prepare("SELECT COUNT(*) FROM vehicles WHERE vehicle_id = ?");
                        $stmt->bind_param("s", $vehicleId);
                        $stmt->execute();
                        $result = $stmt->get_result();
                        $row = $result->fetch_assoc();
                        
                        if ($row && isset($row['COUNT(*)']) && $row['COUNT(*)'] > 0) {
                            // Update
                            $stmt = $conn->prepare("
                                UPDATE vehicles 
                                SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                                    image = ?, description = ?, amenities = ?, is_active = ?,
                                    base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
                                WHERE vehicle_id = ?
                            ");
                            
                            $stmt->bind_param(
                                "siissssisssss", 
                                $vehicleData['name'], 
                                $vehicleData['capacity'], 
                                $vehicleData['luggageCapacity'], 
                                $acValue, 
                                $vehicleData['image'], 
                                $vehicleData['description'], 
                                $amenitiesJson, 
                                $isActiveValue,
                                $vehicleData['base_price'],
                                $vehicleData['price_per_km'],
                                $vehicleData['night_halt_charge'],
                                $vehicleData['driver_allowance'],
                                $vehicleId
                            );
                            
                            $stmt->execute();
                        } else {
                            // Insert
                            $stmt = $conn->prepare("
                                INSERT INTO vehicles 
                                (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active,
                                base_price, price_per_km, night_halt_charge, driver_allowance) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ");
                            
                            $stmt->bind_param(
                                "ssiississssss", 
                                $vehicleId, 
                                $vehicleData['name'], 
                                $vehicleData['capacity'], 
                                $vehicleData['luggageCapacity'], 
                                $acValue, 
                                $vehicleData['image'], 
                                $vehicleData['description'], 
                                $amenitiesJson, 
                                $isActiveValue,
                                $vehicleData['base_price'],
                                $vehicleData['price_per_km'],
                                $vehicleData['night_halt_charge'],
                                $vehicleData['driver_allowance']
                            );
                            
                            $stmt->execute();
                        }
                    }
                    
                    // Now handle pricing - create vehicle_pricing table if it doesn't exist
                    $conn->query("CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_fare DECIMAL(10,2) DEFAULT 0,
                        price_per_km DECIMAL(10,2) DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) DEFAULT 700,
                        driver_allowance DECIMAL(10,2) DEFAULT 250,
                        trip_type VARCHAR(50) DEFAULT 'all',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
                    )");
                    
                    // Add pricing for 'all' trip type
                    $basePrice = $vehicleData['base_price'];
                    $pricePerKm = $vehicleData['price_per_km'];
                    $nightHaltCharge = $vehicleData['night_halt_charge'];
                    $driverAllowance = $vehicleData['driver_allowance'];
                    $tripType = 'all';
                    
                    // Use ON DUPLICATE KEY UPDATE for pricing
                    $stmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        base_fare = VALUES(base_fare),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance)
                    ");
                    
                    $stmt->bind_param(
                        "ssdddd",
                        $vehicleId,
                        $tripType,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance
                    );
                    
                    $stmt->execute();
                    
                    // Commit all database changes
                    $conn->commit();
                    $databaseSaved = true;
                    
                    error_log("Successfully updated vehicle in database: $vehicleId");
                    
                } catch (Exception $e) {
                    // Rollback on any database error
                    $conn->rollback();
                    error_log("Database error: " . $e->getMessage());
                }
            } else {
                error_log("Database connection failed: " . ($conn ? $conn->connect_error : "Connection attempt failed"));
            }
        } catch (Exception $e) {
            error_log("Error connecting to database: " . $e->getMessage());
        }
    } else {
        error_log("Config file not found, using only file storage");
    }
    
    // Create cache invalidation marker to trigger client refresh
    $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
    file_put_contents($cacheMarker, time());
    
    // Return success response 
    // Note that we return success even if database fails, as long as the JSON file was saved
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $databaseSaved ? 'Vehicle updated in database and local storage' : 'Vehicle updated in local storage only',
        'vehicleId' => $vehicleId,
        'vehicle' => $vehicleData,
        'databaseSaved' => $databaseSaved,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Log the error
    error_log("Error updating vehicle: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error updating vehicle: ' . $e->getMessage(),
        'vehicleId' => $vehicleId ?? null,
        'timestamp' => time()
    ]);
}
