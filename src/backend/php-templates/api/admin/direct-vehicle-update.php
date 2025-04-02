
<?php
// direct-vehicle-update.php - Endpoint for updating vehicle data directly

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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

// Extract vehicle data
$vehicleId = $_POST['vehicleId'] ?? $_POST['vehicle_id'] ?? $_POST['id'] ?? null;
$name = $_POST['name'] ?? '';
$description = $_POST['description'] ?? '';
$image = $_POST['image'] ?? '';

// Ensure capacity and luggageCapacity are numeric
$capacity = isset($_POST['capacity']) ? (int)$_POST['capacity'] : 4;
$luggageCapacity = isset($_POST['luggageCapacity']) ? (int)$_POST['luggageCapacity'] : 
                  (isset($_POST['luggage_capacity']) ? (int)$_POST['luggage_capacity'] : 2);

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
        $stmt = $conn->prepare(
            "UPDATE vehicle_types SET 
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
            WHERE vehicle_id = ?"
        );
        
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
        
        $success = $stmt->execute();
        $stmt->close();
        
        if (!$success) {
            throw new Exception("Error updating vehicle: " . $conn->error);
        }
        
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
        $stmt->close();
        
        if (!$success) {
            throw new Exception("Error inserting vehicle: " . $conn->error);
        }
        
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
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
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
    
    // Check if the vehicle exists in the vehicles table
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicleExists = $result->num_rows > 0;
    $stmt->close();
    
    if ($vehicleExists) {
        // Update the vehicle in the vehicles table
        $stmt = $conn->prepare(
            "UPDATE vehicles SET 
                name = ?, 
                capacity = ?, 
                luggage_capacity = ?, 
                image = ?,
                description = ?,
                amenities = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE vehicle_id = ?"
        );
        
        $stmt->bind_param("siisssis", $name, $capacity, $luggageCapacity, $image, $description, $amenities, $isActive, $vehicleId);
        $stmt->execute();
        $stmt->close();
    } else {
        // Insert the vehicle into the vehicles table
        $stmt = $conn->prepare(
            "INSERT INTO vehicles (
                vehicle_id, name, capacity, luggage_capacity, image, description, amenities, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        $stmt->bind_param("ssiisssi", $vehicleId, $name, $capacity, $luggageCapacity, $image, $description, $amenities, $isActive);
        $stmt->execute();
        $stmt->close();
    }
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
