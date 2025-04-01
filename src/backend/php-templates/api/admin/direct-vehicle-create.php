<?php
// direct-vehicle-create.php - A specialized endpoint for vehicle creation 
// with maximum compatibility and robust error handling

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, *');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.0.8');

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

// Get data from request using multiple approaches
$data = [];

// Try POST data first
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
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
if (empty($data)) {
    // If we still have no data, try one more approach with php://input directly
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        // Just use it as a backup vehicle name
        $data = [
            'name' => 'Vehicle from raw input',
            'vehicleId' => 'vehicle_' . time(),
            'capacity' => 4
        ];
    }
}

// If still empty after all attempts, use fallback data
if (empty($data) || !isset($data['name'])) {
    // Generate a fallback vehicle ID based on timestamp
    $fallbackId = 'vehicle_' . time();
    
    $data = [
        'name' => $data['name'] ?? 'New Vehicle ' . date('Y-m-d H:i:s'),
        'vehicleId' => $data['vehicleId'] ?? $data['id'] ?? $fallbackId,
        'id' => $data['id'] ?? $data['vehicleId'] ?? $fallbackId,
        'capacity' => $data['capacity'] ?? 4
    ];
    
    error_log("Using fallback data: " . json_encode($data));
}

// Clean up and normalize the vehicle data
$vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['id']) ? $data['id'] : null);

// Convert vehicleId to string and make it URL-friendly
if ($vehicleId) {
    $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
} else {
    $vehicleId = 'vehicle_' . time();
}

// Ensure vehicleId is set consistently in both id and vehicleId fields
$data['id'] = $vehicleId;
$data['vehicleId'] = $vehicleId;

$newVehicle = [
    'id' => $vehicleId,
    'vehicleId' => $vehicleId,
    'name' => $data['name'] ?? 'Unnamed Vehicle',
    'capacity' => intval($data['capacity'] ?? 4),
    'luggageCapacity' => intval($data['luggageCapacity'] ?? 2),
    'price' => floatval($data['price'] ?? $data['basePrice'] ?? 0),
    'pricePerKm' => floatval($data['pricePerKm'] ?? 0),
    'basePrice' => floatval($data['basePrice'] ?? $data['price'] ?? 0),
    'image' => $data['image'] ?? '/cars/sedan.png',
    'amenities' => $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'],
    'description' => $data['description'] ?? $data['name'] . ' vehicle',
    'ac' => isset($data['ac']) ? boolval($data['ac']) : true,
    'nightHaltCharge' => floatval($data['nightHaltCharge'] ?? 700),
    'driverAllowance' => floatval($data['driverAllowance'] ?? 250),
    'isActive' => isset($data['isActive']) ? boolval($data['isActive']) : true
];

try {
    // 1. First, save to vehicles.json file (simple and reliable local storage)
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
            $vehicles[$key] = $newVehicle;
            $updated = true;
            break;
        }
    }
    
    // If not updated, add it as a new vehicle
    if (!$updated) {
        $vehicles[] = $newVehicle;
    }
    
    // Save the updated list to file - always do this first for reliability
    file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    error_log("Successfully saved vehicle to local JSON file");
    
    // Success response will be returned at the end, regardless of database results
    
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
                    // Create vehicle_types table if it doesn't exist
                    $sql = "CREATE TABLE IF NOT EXISTS vehicle_types (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                        name VARCHAR(100) NOT NULL,
                        capacity INT DEFAULT 4,
                        luggage_capacity INT DEFAULT 2,
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
                    
                    $amenitiesJson = json_encode($newVehicle['amenities']);
                    $isActive = $newVehicle['isActive'] ? 1 : 0;
                    $acValue = $newVehicle['ac'] ? 1 : 0;
                    
                    if ($row['COUNT(*)'] > 0) {
                        // Update existing vehicle
                        $stmt = $conn->prepare("
                            UPDATE vehicle_types 
                            SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                                image = ?, description = ?, amenities = ?, is_active = ?
                            WHERE vehicle_id = ?
                        ");
                        
                        $stmt->bind_param(
                            "siiisssis", 
                            $newVehicle['name'], 
                            $newVehicle['capacity'], 
                            $newVehicle['luggageCapacity'], 
                            $acValue, 
                            $newVehicle['image'], 
                            $newVehicle['description'], 
                            $amenitiesJson, 
                            $isActive, 
                            $vehicleId
                        );
                        
                        $stmt->execute();
                    } else {
                        // Insert new vehicle
                        $stmt = $conn->prepare("
                            INSERT INTO vehicle_types 
                            (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        $stmt->bind_param(
                            "ssiisssis", 
                            $vehicleId, 
                            $newVehicle['name'], 
                            $newVehicle['capacity'], 
                            $newVehicle['luggageCapacity'], 
                            $acValue, 
                            $newVehicle['image'], 
                            $newVehicle['description'], 
                            $amenitiesJson, 
                            $isActive
                        );
                        
                        $stmt->execute();
                    }
                    
                    // Now handle pricing - create vehicle_pricing table if it doesn't exist
                    $sql = "CREATE TABLE IF NOT EXISTS vehicle_pricing (
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
                    )";
                    $conn->query($sql);
                    
                    // Add pricing for 'all' trip type
                    $basePrice = $newVehicle['basePrice'];
                    $pricePerKm = $newVehicle['pricePerKm'];
                    $nightHaltCharge = $newVehicle['nightHaltCharge'];
                    $driverAllowance = $newVehicle['driverAllowance'];
                    $tripType = 'all';
                    
                    // Use ON DUPLICATE KEY UPDATE for pricing
                    $sql = "
                        INSERT INTO vehicle_pricing 
                        (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        base_fare = VALUES(base_fare),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance)
                    ";
                    
                    $stmt = $conn->prepare($sql);
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
                    
                    error_log("Successfully saved vehicle to database: $vehicleId");
                    
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
    
    // Return success response 
    // Note that we return success even if database fails, as long as the JSON file was saved
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $databaseSaved ? 'Vehicle saved to database and local storage' : 'Vehicle saved to local storage only',
        'vehicleId' => $vehicleId,
        'vehicle' => [
            'id' => $vehicleId,
            'name' => $newVehicle['name'],
            'capacity' => $newVehicle['capacity']
        ],
        'databaseSaved' => $databaseSaved,
        'timestamp' => time()
    ]);
    
    // Create cache invalidation marker to trigger client refresh
    $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
    file_put_contents($cacheMarker, time());
    
} catch (Exception $e) {
    // Log the error
    error_log("Error creating vehicle: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error creating vehicle: ' . $e->getMessage(),
        'vehicleId' => $vehicleId ?? null,
        'timestamp' => time()
    ]);
}
