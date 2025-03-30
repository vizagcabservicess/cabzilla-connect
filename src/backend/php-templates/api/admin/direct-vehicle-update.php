
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include configuration
require_once __DIR__ . '/../../config.php';

// Parse input data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

// If JSON parsing failed, try POST data
if (!$data) {
    $data = $_POST;
}

// Write to debug log
error_log("Direct vehicle update received data: " . print_r($data, true), 3, __DIR__ . '/../../error.log');

// Ensure all fields are set to prevent database errors
$vehicleId = $data['vehicleId'] ?? $data['id'] ?? null;

// Validate vehicle ID
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'data' => $data
    ]);
    exit;
}

// Remove 'item-' prefix if it exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Prepare the update data
$name = $data['name'] ?? ucfirst(str_replace('_', ' ', $vehicleId));
$capacity = (int)($data['capacity'] ?? 4);
$luggageCapacity = (int)($data['luggageCapacity'] ?? 2);

// Handle boolean or integer isActive values - fixed to ensure proper conversion
$isActive = 1; // Default to active

// Debug isActive handling
error_log("Processing isActive field");

if (isset($data['isActive'])) {
    if (is_bool($data['isActive'])) {
        $isActive = $data['isActive'] ? 1 : 0;
        error_log("isActive (bool): " . ($data['isActive'] ? 'true' : 'false') . " => $isActive");
    } else if (is_string($data['isActive'])) {
        $isActive = (strtolower($data['isActive']) === 'true' || $data['isActive'] === '1') ? 1 : 0;
        error_log("isActive (string): " . $data['isActive'] . " => $isActive");
    } else {
        $isActive = (int)$data['isActive'];
        error_log("isActive (other): " . $data['isActive'] . " => $isActive");
    }
} else if (isset($data['is_active'])) {
    if (is_bool($data['is_active'])) {
        $isActive = $data['is_active'] ? 1 : 0;
        error_log("is_active (bool): " . ($data['is_active'] ? 'true' : 'false') . " => $isActive");
    } else if (is_string($data['is_active'])) {
        $isActive = (strtolower($data['is_active']) === 'true' || $data['is_active'] === '1') ? 1 : 0;
        error_log("is_active (string): " . $data['is_active'] . " => $isActive");
    } else {
        $isActive = (int)$data['is_active'];
        error_log("is_active (other): " . $data['is_active'] . " => $isActive");
    }
}

// Ensure value is definitely 0 or 1
$isActive = $isActive ? 1 : 0;

// For debugging
error_log("isActive raw value: " . (isset($data['isActive']) ? var_export($data['isActive'], true) : 'not set'), 3, __DIR__ . '/../../error.log');
error_log("is_active raw value: " . (isset($data['is_active']) ? var_export($data['is_active'], true) : 'not set'), 3, __DIR__ . '/../../error.log');
error_log("Final isActive value: $isActive", 3, __DIR__ . '/../../error.log');

// Ensure image has proper URL - FIXED to handle both relative and absolute paths
$image = $data['image'] ?? '/cars/sedan.png';

// Fix image path if needed - ensure it's a local path starting with /cars/
if (strpos($image, 'http') !== false) {
    // Extract the filename from the URL
    $filename = basename(parse_url($image, PHP_URL_PATH));
    $image = '/cars/' . $filename;
} else if (strpos($image, '/cars/') === false) {
    $image = '/cars/' . basename($image);
}

// Additional debug for image path
error_log("Original image path: " . ($data['image'] ?? 'not set'), 3, __DIR__ . '/../../error.log');
error_log("Normalized image path: $image", 3, __DIR__ . '/../../error.log');

$ac = isset($data['ac']) ? (int)$data['ac'] : 1;
$description = $data['description'] ?? '';

// Process amenities
$amenities = $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
if (is_array($amenities)) {
    $amenitiesJson = json_encode($amenities);
} else {
    $amenitiesJson = $amenities;
}

// Establish DB connection
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Check if vehicle_types table exists
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255) DEFAULT '/cars/sedan.png',
            amenities TEXT DEFAULT NULL,
            description TEXT DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    // Check if vehicle already exists
    $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing vehicle
        $updateStmt = $conn->prepare("
            UPDATE vehicle_types 
            SET name = ?, capacity = ?, luggage_capacity = ?, is_active = ?, 
                image = ?, ac = ?, amenities = ?, description = ?, updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        
        $updateStmt->bind_param(
            "siisisss", 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $isActive, 
            $image, 
            $ac, 
            $amenitiesJson, 
            $description, 
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            throw new Exception("Error updating vehicle: " . $updateStmt->error);
        }
        
        $message = "Vehicle updated successfully";
    } else {
        // Insert new vehicle
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, is_active, image, ac, amenities, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $insertStmt->bind_param(
            "ssiisiss", 
            $vehicleId, 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $isActive, 
            $image, 
            $ac, 
            $amenitiesJson, 
            $description
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Error creating vehicle: " . $insertStmt->error);
        }
        
        $message = "Vehicle created successfully";
    }
    
    // Also ensure vehicle pricing exists for this vehicle in vehicle_pricing table
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            trip_type VARCHAR(50) DEFAULT 'all',
            base_fare DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            local_package_4hr DECIMAL(10,2) DEFAULT 0,
            local_package_8hr DECIMAL(10,2) DEFAULT 0,
            local_package_10hr DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(5,2) DEFAULT 0,
            extra_hour_charge DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    // Check if pricing exists
    $baseFare = isset($data['basePrice']) ? floatval($data['basePrice']) : (isset($data['price']) ? floatval($data['price']) : 0);
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
    $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 700;
    $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 250;
    
    // Insert or update pricing for 'all' trip type
    $conn->query("
        INSERT INTO vehicle_pricing 
        (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance) 
        VALUES ('$vehicleId', 'all', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance)
        ON DUPLICATE KEY UPDATE 
        base_fare = VALUES(base_fare),
        price_per_km = VALUES(price_per_km),
        night_halt_charge = VALUES(night_halt_charge),
        driver_allowance = VALUES(driver_allowance),
        updated_at = NOW()
    ");
    
    // Also make sure outstation_fares table has an entry for this vehicle
    $conn->query("
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
            roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    // Insert or update outstation_fares
    $conn->query("
        INSERT INTO outstation_fares 
        (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance) 
        VALUES ('$vehicleId', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance)
        ON DUPLICATE KEY UPDATE 
        base_price = VALUES(base_price),
        price_per_km = VALUES(price_per_km),
        night_halt_charge = VALUES(night_halt_charge),
        driver_allowance = VALUES(driver_allowance),
        updated_at = NOW()
    ");
    
    // Also update the JSON file
    $jsonFile = __DIR__ . '/../../../data/vehicles.json';
    try {
        $vehicles = [];
        if (file_exists($jsonFile)) {
            $jsonContent = file_get_contents($jsonFile);
            if (!empty($jsonContent)) {
                $vehicles = json_decode($jsonContent, true) ?: [];
            }
        }
        
        // Find and update or add the vehicle
        $vehicleFound = false;
        foreach ($vehicles as &$vehicle) {
            if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                $vehicle['name'] = $name;
                $vehicle['capacity'] = $capacity;
                $vehicle['luggageCapacity'] = $luggageCapacity;
                $vehicle['isActive'] = (bool)$isActive; 
                $vehicle['image'] = $image;
                $vehicle['ac'] = (bool)$ac;
                $vehicle['amenities'] = is_array($amenities) ? $amenities : [$amenities];
                $vehicle['description'] = $description;
                $vehicle['basePrice'] = $baseFare;
                $vehicle['price'] = $baseFare;
                $vehicle['pricePerKm'] = $pricePerKm;
                $vehicle['nightHaltCharge'] = $nightHaltCharge;
                $vehicle['driverAllowance'] = $driverAllowance;
                $vehicleFound = true;
                break;
            }
        }
        
        if (!$vehicleFound) {
            // Add new vehicle to the array
            $vehicles[] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'capacity' => $capacity,
                'luggageCapacity' => $luggageCapacity,
                'basePrice' => $baseFare,
                'price' => $baseFare,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance,
                'image' => $image,
                'amenities' => is_array($amenities) ? $amenities : [$amenities],
                'description' => $description,
                'ac' => (bool)$ac,
                'isActive' => (bool)$isActive
            ];
        }
        
        // Save the updated JSON file
        file_put_contents($jsonFile, json_encode($vehicles, JSON_PRETTY_PRINT));
        
        // Update cache invalidation marker
        file_put_contents(__DIR__ . '/../../../data/vehicle_cache_invalidated.txt', time());
        
        // Log success of JSON update
        error_log("Successfully updated JSON file with " . count($vehicles) . " vehicles");
        
    } catch (Exception $e) {
        error_log("Error updating JSON file: " . $e->getMessage());
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'vehicleId' => $vehicleId,
        'isActive' => (bool)$isActive,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
    error_log("Direct vehicle update error: " . $e->getMessage());
}
