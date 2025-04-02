
<?php
// direct-vehicle-update.php - Endpoint for updating vehicle data directly

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log the request for debugging
$logDir = __DIR__ . '/../../logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';

$requestData = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'get_params' => $_GET,
    'post_params' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'timestamp' => date('Y-m-d H:i:s'),
];

file_put_contents($logFile, json_encode($requestData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// Get database connection utilities
require_once __DIR__ . '/../utils/database.php';

// Debug: Log all incoming data
error_log("VEHICLE UPDATE: POST data: " . print_r($_POST, true));
error_log("VEHICLE UPDATE: GET data: " . print_r($_GET, true));
error_log("VEHICLE UPDATE: Raw input: " . file_get_contents('php://input'));

// Extract vehicle data
$vehicleId = $_POST['vehicleId'] ?? $_POST['vehicle_id'] ?? $_POST['id'] ?? null;
$name = $_POST['name'] ?? '';
$description = $_POST['description'] ?? '';
$image = $_POST['image'] ?? '';

// CRITICAL FIX: Dump all input data for better debugging
file_put_contents($logFile, "ALL POST DATA: " . print_r($_POST, true) . "\n\n", FILE_APPEND);
error_log("ALL POST DATA: " . print_r($_POST, true));

// CRITICAL FIX: Handle capacities properly with additional logging
$capacity = null;
$luggageCapacity = null;

// Log detailed debugging for capacities
error_log("CAPACITY DEBUG: capacity POST value: " . (isset($_POST['capacity']) ? $_POST['capacity'] : 'not set') . 
          ", type: " . (isset($_POST['capacity']) ? gettype($_POST['capacity']) : 'N/A'));
error_log("CAPACITY DEBUG: luggageCapacity POST value: " . (isset($_POST['luggageCapacity']) ? $_POST['luggageCapacity'] : 'not set') . 
          ", type: " . (isset($_POST['luggageCapacity']) ? gettype($_POST['luggageCapacity']) : 'N/A'));
error_log("CAPACITY DEBUG: luggage_capacity POST value: " . (isset($_POST['luggage_capacity']) ? $_POST['luggage_capacity'] : 'not set') . 
          ", type: " . (isset($_POST['luggage_capacity']) ? gettype($_POST['luggage_capacity']) : 'N/A'));
              
// Set capacity with proper fallbacks
if (isset($_POST['capacity'])) {
    // Cast to int with explicit check
    $capacity = filter_var($_POST['capacity'], FILTER_VALIDATE_INT);
    if ($capacity === false) {
        // Try parsing it manually
        $capacity = intval($_POST['capacity']);
        if ($capacity === 0 && $_POST['capacity'] !== '0') {
            $capacity = 4; // Default value if parsing fails
        }
    }
} else {
    $capacity = 4; // Default value
}

// Set luggage capacity with proper fallbacks
if (isset($_POST['luggageCapacity'])) {
    $luggageCapacity = filter_var($_POST['luggageCapacity'], FILTER_VALIDATE_INT);
    if ($luggageCapacity === false) {
        $luggageCapacity = intval($_POST['luggageCapacity']);
        if ($luggageCapacity === 0 && $_POST['luggageCapacity'] !== '0') {
            $luggageCapacity = 2; // Default value if parsing fails
        }
    }
} else if (isset($_POST['luggage_capacity'])) {
    $luggageCapacity = filter_var($_POST['luggage_capacity'], FILTER_VALIDATE_INT);
    if ($luggageCapacity === false) {
        $luggageCapacity = intval($_POST['luggage_capacity']);
        if ($luggageCapacity === 0 && $_POST['luggage_capacity'] !== '0') {
            $luggageCapacity = 2; // Default value if parsing fails
        }
    }
} else {
    $luggageCapacity = 2; // Default value
}

// CRITICAL FIX: Additional debug info for capacities
error_log("CAPACITY VALUES AFTER PROCESSING: capacity=$capacity, luggageCapacity=$luggageCapacity");
file_put_contents($logFile, "CAPACITY VALUES AFTER PROCESSING: capacity=$capacity, luggageCapacity=$luggageCapacity\n", FILE_APPEND);

// Log the final capacity values after processing
error_log("CAPACITY FINAL: capacity=" . $capacity . ", luggageCapacity=" . $luggageCapacity);

// Extract numeric fields
$basePrice = isset($_POST['basePrice']) ? (float)$_POST['basePrice'] : 0;
$price = isset($_POST['price']) ? (float)$_POST['price'] : $basePrice;
$pricePerKm = isset($_POST['pricePerKm']) ? (float)$_POST['pricePerKm'] : 0;
$nightHaltCharge = isset($_POST['nightHaltCharge']) ? (float)$_POST['nightHaltCharge'] : 700;
$driverAllowance = isset($_POST['driverAllowance']) ? (float)$_POST['driverAllowance'] : 250;

// Extract boolean fields
$ac = isset($_POST['ac']) ? ($_POST['ac'] == '1' || $_POST['ac'] === 'true' ? 1 : 0) : 1;
$isActive = isset($_POST['isActive']) ? ($_POST['isActive'] == '1' || $_POST['isActive'] === 'true' ? 1 : 0) : 
           (isset($_POST['is_active']) ? ($_POST['is_active'] == '1' || $_POST['is_active'] === 'true' ? 1 : 0) : 1);

// Extract amenities
$amenities = isset($_POST['amenities']) ? $_POST['amenities'] : '[]';
if (is_array($amenities)) {
    $amenities = json_encode($amenities);
} else {
    // Try to parse it if it's not already JSON
    if (!isJson($amenities)) {
        // Convert comma-separated string to array then to JSON
        $amenitiesArray = explode(',', $amenities);
        $amenitiesArray = array_map('trim', $amenitiesArray);
        $amenities = json_encode($amenitiesArray);
    }
}

// Log the processed data for debugging
$processedData = [
    'vehicleId' => $vehicleId,
    'name' => $name,
    'capacity' => $capacity,
    'luggageCapacity' => $luggageCapacity,
    'basePrice' => $basePrice,
    'price' => $price,
    'pricePerKm' => $pricePerKm,
    'nightHaltCharge' => $nightHaltCharge,
    'driverAllowance' => $driverAllowance,
    'ac' => $ac,
    'isActive' => $isActive,
    'image' => $image,
    'amenities' => $amenities,
    'description' => $description,
];

file_put_contents($logFile, "Processed data:\n" . json_encode($processedData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

try {
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
            base_price DECIMAL(10,2) DEFAULT 0,
            price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            night_halt_charge DECIMAL(8,2) DEFAULT 700,
            driver_allowance DECIMAL(8,2) DEFAULT 250,
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
    $stmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    
    if ($result->num_rows > 0) {
        // Vehicle exists, update it
        $sql = "UPDATE vehicle_types SET 
                name = ?, 
                capacity = ?, 
                luggage_capacity = ?, 
                ac = ?, 
                image = ?,
                amenities = ?,
                description = ?,
                base_price = ?,
                price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE vehicle_id = ?";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error . " for SQL: " . $sql);
        }
        
        error_log("BINDING PARAMS: capacity=$capacity (type:" . gettype($capacity) . "), luggageCapacity=$luggageCapacity (type:" . gettype($luggageCapacity) . ")");
        
        // CRITICAL FIX: Explicitly bind parameters with proper types and log the actual values being bound
        file_put_contents($logFile, "BINDING PARAMS FOR UPDATE: capacity=$capacity (type:" . gettype($capacity) . "), luggageCapacity=$luggageCapacity (type:" . gettype($luggageCapacity) . ")\n", FILE_APPEND);
        
        try {
            $stmt->bind_param(
                "siiisssddddsis", 
                $name, 
                $capacity, 
                $luggageCapacity, 
                $ac, 
                $image, 
                $amenities, 
                $description,
                $basePrice,
                $price,
                $pricePerKm,
                $nightHaltCharge,
                $driverAllowance,
                $isActive,
                $vehicleId
            );
        } catch (Exception $e) {
            file_put_contents($logFile, "BIND PARAM ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
            throw new Exception("Error binding parameters: " . $e->getMessage());
        }
        
        $success = $stmt->execute();
        if (!$success) {
            // Log detailed error
            error_log("VEHICLE UPDATE ERROR: " . $stmt->error);
            file_put_contents($logFile, "UPDATE ERROR: " . $stmt->error . "\n\n", FILE_APPEND);
            throw new Exception("Error executing update: " . $stmt->error);
        }
        $stmt->close();
        
        // Log the SQL update for debugging
        file_put_contents($logFile, "Updated vehicle with ID: $vehicleId\nAffected rows: " . $conn->affected_rows . "\n\n", FILE_APPEND);
        
        // Make sure the vehicle exists in vehicles table too (for backward compatibility)
        syncVehicleToVehiclesTable($conn, $vehicleId, $name, $capacity, $luggageCapacity, $image, $description, $isActive, $amenities);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle updated successfully',
            'vehicle_id' => $vehicleId,
            'capacity' => $capacity,
            'luggage_capacity' => $luggageCapacity
        ]);
    } else {
        // Vehicle doesn't exist, insert it
        $stmt = $conn->prepare(
            "INSERT INTO vehicle_types (
                vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description,
                base_price, price, price_per_km, night_halt_charge, driver_allowance, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param(
            "ssiissssdddddi", 
            $vehicleId, 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $ac, 
            $image, 
            $amenities, 
            $description,
            $basePrice,
            $price,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $isActive
        );
        
        $success = $stmt->execute();
        if (!$success) {
            // Log detailed error
            error_log("VEHICLE INSERT ERROR: " . $stmt->error);
            file_put_contents($logFile, "INSERT ERROR: " . $stmt->error . "\n\n", FILE_APPEND);
            throw new Exception("Error executing insert: " . $stmt->error);
        }
        $stmt->close();
        
        // Log the SQL insert for debugging
        file_put_contents($logFile, "Inserted new vehicle with ID: $vehicleId\n\n", FILE_APPEND);
        
        // Make sure the vehicle exists in vehicles table too (for backward compatibility)
        syncVehicleToVehiclesTable($conn, $vehicleId, $name, $capacity, $luggageCapacity, $image, $description, $isActive, $amenities);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle created successfully',
            'vehicle_id' => $vehicleId,
            'capacity' => $capacity,
            'luggage_capacity' => $luggageCapacity
        ]);
    }
    
    // Also update the outstation_fares, local_package_fares, and airport_transfer_fares tables
    syncVehicleFareTables($conn, $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
    
} catch (Exception $e) {
    error_log("VEHICLE UPDATE EXCEPTION: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString() // Include stack trace for better debugging
    ]);
    
    // Log the error for debugging
    file_put_contents($logFile, "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n\n", FILE_APPEND);
}

/**
 * Helper function to sync vehicle data to the vehicles table
 */
function syncVehicleToVehiclesTable($conn, $vehicleId, $name, $capacity, $luggageCapacity, $image, $description, $isActive, $amenities) {
    // Check if vehicles table exists
    $result = $conn->query("SHOW TABLES LIKE 'vehicles'");
    if ($result->num_rows == 0) {
        // Skip if the vehicles table doesn't exist
        return;
    }
    
    // CRITICAL FIX: Add more debug logging
    error_log("SYNC TO VEHICLES: id=$vehicleId, capacity=$capacity (" . gettype($capacity) . "), luggageCapacity=$luggageCapacity (" . gettype($luggageCapacity) . ")");
    
    // Check if the vehicle exists in the vehicles table
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicleExists = $result->num_rows > 0;
    $stmt->close();
    
    // CRITICAL FIX: Force capacity and luggage_capacity to be integers
    $capacityInt = (int)$capacity;
    $luggageCapacityInt = (int)$luggageCapacity;
    
    if ($vehicleExists) {
        // Update the vehicle in the vehicles table
        $sql = "UPDATE vehicles SET 
                name = ?, 
                capacity = ?, 
                luggage_capacity = ?, 
                image = ?,
                description = ?,
                amenities = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE vehicle_id = ?";
            
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            error_log("SYNC TO VEHICLES: Prepare statement failed: " . $conn->error);
            return;
        }
        
        $stmt->bind_param("siisssis", $name, $capacityInt, $luggageCapacityInt, $image, $description, $amenities, $isActive, $vehicleId);
        $result = $stmt->execute();
        if (!$result) {
            error_log("SYNC TO VEHICLES UPDATE ERROR: " . $stmt->error);
        } else {
            // DEBUG: Log the update
            error_log("UPDATED VEHICLE IN VEHICLES TABLE: id=$vehicleId, capacity=$capacityInt, luggageCapacity=$luggageCapacityInt, affected rows=" . $stmt->affected_rows);
        }
        $stmt->close();
    } else {
        // Insert the vehicle into the vehicles table
        $stmt = $conn->prepare(
            "INSERT INTO vehicles (
                vehicle_id, name, capacity, luggage_capacity, image, description, amenities, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        if (!$stmt) {
            error_log("SYNC TO VEHICLES: Prepare statement failed: " . $conn->error);
            return;
        }
        
        $stmt->bind_param("ssiisssi", $vehicleId, $name, $capacityInt, $luggageCapacityInt, $image, $description, $amenities, $isActive);
        $result = $stmt->execute();
        if (!$result) {
            error_log("SYNC TO VEHICLES INSERT ERROR: " . $stmt->error);
        } else {
            // DEBUG: Log the insert
            error_log("INSERTED VEHICLE INTO VEHICLES TABLE: id=$vehicleId, capacity=$capacityInt, luggageCapacity=$luggageCapacityInt, insert id=" . $stmt->insert_id);
        }
        $stmt->close();
    }
    
    // CRITICAL FIX: Verify the data was actually written
    $verifyStmt = $conn->prepare("SELECT capacity, luggage_capacity FROM vehicles WHERE vehicle_id = ?");
    $verifyStmt->bind_param("s", $vehicleId);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();
    if ($verifyRow = $verifyResult->fetch_assoc()) {
        error_log("VERIFY VEHICLES TABLE: id=$vehicleId, capacity=" . $verifyRow['capacity'] . ", luggage_capacity=" . $verifyRow['luggage_capacity']);
    }
    $verifyStmt->close();
}

/**
 * Helper function to sync vehicle data to fare tables
 */
function syncVehicleFareTables($conn, $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance) {
    // Outstation fares
    $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($result->num_rows > 0) {
        $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $fareExists = $result->num_rows > 0;
        $stmt->close();
        
        if ($fareExists) {
            $stmt = $conn->prepare(
                "UPDATE outstation_fares SET 
                    base_price = ?, 
                    price_per_km = ?, 
                    night_halt_charge = ?, 
                    driver_allowance = ?
                WHERE vehicle_id = ?"
            );
            $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            $stmt->execute();
            $stmt->close();
        } else {
            $stmt = $conn->prepare(
                "INSERT INTO outstation_fares (
                    vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance
                ) VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            $stmt->execute();
            $stmt->close();
        }
    }
    
    // Repeat similar pattern for local_package_fares and airport_transfer_fares if needed
}

/**
 * Helper function to check if a string is valid JSON
 */
function isJson($string) {
    if (!is_string($string)) {
        return false;
    }
    
    json_decode($string);
    return (json_last_error() == JSON_ERROR_NONE);
}
