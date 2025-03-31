
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Mode, X-Force-Refresh');
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

// Create logs directory if it doesn't exist
if (!is_dir(__DIR__ . '/../../logs')) {
    mkdir(__DIR__ . '/../../logs', 0755, true);
}

// Parse input data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

// If JSON parsing failed, try POST data
if (!$data) {
    $data = $_POST;
}

// Write to debug log with timestamp
$logFile = __DIR__ . '/../../logs/vehicle_update_' . date('Y-m-d') . '.log';
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Direct vehicle update received data: " . print_r($data, true) . "\n", FILE_APPEND);

// Check for XDebug and disable it to prevent memory issues
if (function_exists('xdebug_disable')) {
    xdebug_disable();
}

// Ensure all fields are set to prevent database errors
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['id'] ?? null;

// Send detailed error back if no vehicle ID
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'data' => $data,
        'endpoint' => 'direct-vehicle-update.php',
        'timestamp' => date('Y-m-d H:i:s')
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
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Processing isActive field\n", FILE_APPEND);

if (isset($data['isActive'])) {
    if (is_bool($data['isActive'])) {
        $isActive = $data['isActive'] ? 1 : 0;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "isActive (bool): " . ($data['isActive'] ? 'true' : 'false') . " => $isActive\n", FILE_APPEND);
    } else if (is_string($data['isActive'])) {
        $isActive = (strtolower($data['isActive']) === 'true' || $data['isActive'] === '1') ? 1 : 0;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "isActive (string): " . $data['isActive'] . " => $isActive\n", FILE_APPEND);
    } else {
        $isActive = (int)$data['isActive'];
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "isActive (other): " . $data['isActive'] . " => $isActive\n", FILE_APPEND);
    }
} else if (isset($data['is_active'])) {
    if (is_bool($data['is_active'])) {
        $isActive = $data['is_active'] ? 1 : 0;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "is_active (bool): " . ($data['is_active'] ? 'true' : 'false') . " => $isActive\n", FILE_APPEND);
    } else if (is_string($data['is_active'])) {
        $isActive = (strtolower($data['is_active']) === 'true' || $data['is_active'] === '1') ? 1 : 0;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "is_active (string): " . $data['is_active'] . " => $isActive\n", FILE_APPEND);
    } else {
        $isActive = (int)$data['is_active'];
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "is_active (other): " . $data['is_active'] . " => $isActive\n", FILE_APPEND);
    }
}

// Ensure value is definitely 0 or 1
$isActive = $isActive ? 1 : 0;

// For debugging
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "isActive raw value: " . (isset($data['isActive']) ? var_export($data['isActive'], true) : 'not set') . "\n", FILE_APPEND);
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "is_active raw value: " . (isset($data['is_active']) ? var_export($data['is_active'], true) : 'not set') . "\n", FILE_APPEND);
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Final isActive value: $isActive\n", FILE_APPEND);

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
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Original image path: " . ($data['image'] ?? 'not set') . "\n", FILE_APPEND);
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Normalized image path: $image\n", FILE_APPEND);

$ac = isset($data['ac']) ? (int)$data['ac'] : 1;
$description = $data['description'] ?? '';

// Process amenities
$amenities = $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
if (is_array($amenities)) {
    $amenitiesJson = json_encode($amenities);
} else {
    if (is_string($amenities) && substr($amenities, 0, 1) === '[') {
        // Already a JSON string
        $amenitiesJson = $amenities;
    } else {
        // Single item, convert to json array
        $amenitiesJson = json_encode([$amenities]);
    }
}

// Establish DB connection with error handling
try {
    $retries = 0;
    $maxRetries = 3;
    $conn = null;
    
    while ($retries < $maxRetries && !$conn) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Database connection established after $retries retries\n", FILE_APPEND);
        } catch (Exception $e) {
            $retries++;
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Database connection attempt $retries failed: " . $e->getMessage() . "\n", FILE_APPEND);
            
            if ($retries >= $maxRetries) {
                throw $e;
            }
            
            // Wait before retrying
            sleep(1);
        }
    }
    
    // Set the connection mode to ensure stricter SQL
    $conn->query("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
    
    // Check if vehicle_types table exists
    $tableResult = $conn->query("
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
    
    if (!$tableResult) {
        throw new Exception("Error creating vehicle_types table: " . $conn->error);
    }
    
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Ensured vehicle_types table exists\n", FILE_APPEND);
    
    // Check if vehicle already exists
    $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
    if (!$checkStmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Checked if vehicle exists. Found: " . ($result->num_rows > 0 ? 'yes' : 'no') . "\n", FILE_APPEND);
    
    if ($result->num_rows > 0) {
        // Update existing vehicle
        $updateStmt = $conn->prepare("
            UPDATE vehicle_types 
            SET name = ?, capacity = ?, luggage_capacity = ?, is_active = ?, 
                image = ?, ac = ?, amenities = ?, description = ?, updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        
        if (!$updateStmt) {
            throw new Exception("Prepare update statement failed: " . $conn->error);
        }
        
        $updateStmt->bind_param(
            "siisiss", 
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
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Vehicle updated successfully\n", FILE_APPEND);
    } else {
        // Insert new vehicle
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, is_active, image, ac, amenities, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$insertStmt) {
            throw new Exception("Prepare insert statement failed: " . $conn->error);
        }
        
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
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "New vehicle created successfully\n", FILE_APPEND);
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
    $pricingUpdateResult = $conn->query("
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
    
    if (!$pricingUpdateResult) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error updating vehicle_pricing: " . $conn->error . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Updated vehicle_pricing table\n", FILE_APPEND);
    }
    
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
    $osUpdateResult = $conn->query("
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
    
    if (!$osUpdateResult) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error updating outstation_fares: " . $conn->error . "\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Updated outstation_fares table\n", FILE_APPEND);
    }
    
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
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Successfully updated JSON file with " . count($vehicles) . " vehicles\n", FILE_APPEND);
        
    } catch (Exception $e) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error updating JSON file: " . $e->getMessage() . "\n", FILE_APPEND);
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
    // Log detailed error information
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'endpoint' => 'direct-vehicle-update.php',
        'requestMethod' => $_SERVER['REQUEST_METHOD'],
        'requestHeaders' => getallheaders(),
        'phpVersion' => PHP_VERSION,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
