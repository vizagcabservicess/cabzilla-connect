
<?php
// direct-airport-fares.php - Endpoint specifically for airport fare updates

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if database config is included
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

// Debugging - Log request details
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestHeaders = getallheaders();
$rawInput = file_get_contents('php://input');
error_log("Airport fare update request: Method=$requestMethod, Headers=" . json_encode($requestHeaders) . ", Raw input: $rawInput", 3, __DIR__ . '/../../error.log');

// Try to extract request data from multiple sources
$data = [];
$json_data = json_decode($rawInput, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
} else {
    parse_str($rawInput, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
    } else {
        $data = $_POST ?: $_REQUEST ?: [];
    }
}

// Log the request data
error_log("Airport fare update request data: " . print_r($data, true), 3, __DIR__ . '/../../error.log');

// Function to ensure tables exist
function ensureTablesExist($conn) {
    try {
        // Check if vehicle_types table exists
        $checkVehicleTypes = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($checkVehicleTypes->num_rows === 0) {
            // Create vehicle_types table
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            error_log("Created vehicle_types table");
        }

        // Check if airport_transfer_fares table exists
        $checkAirport = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        if ($checkAirport->num_rows === 0) {
            // Create airport_transfer_fares table
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            error_log("Created airport_transfer_fares table");
        }
        
        // Check if vehicle_pricing table exists
        $checkVehiclePricing = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkVehiclePricing->num_rows === 0) {
            // Create vehicle_pricing table
            $conn->query("
                CREATE TABLE IF NOT EXISTS vehicle_pricing (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    trip_type VARCHAR(20) NOT NULL DEFAULT 'outstation',
                    base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                    driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                    airport_base_price DECIMAL(10,2) DEFAULT 0,
                    airport_price_per_km DECIMAL(5,2) DEFAULT 0,
                    airport_pickup_price DECIMAL(10,2) DEFAULT 0,
                    airport_drop_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier1_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier2_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier3_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier4_price DECIMAL(10,2) DEFAULT 0,
                    airport_extra_km_charge DECIMAL(5,2) DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            error_log("Created vehicle_pricing table");
        }
        else {
            // Check if the column vehicle_type exists, if so add vehicle_id column
            $checkVehicleTypeColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_type'");
            if ($checkVehicleTypeColumn->num_rows > 0) {
                // Add vehicle_id column if it doesn't exist
                $checkVehicleIdColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
                if ($checkVehicleIdColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id");
                    error_log("Added vehicle_id column to vehicle_pricing table");
                    
                    // Copy data from vehicle_type to vehicle_id
                    $conn->query("UPDATE vehicle_pricing SET vehicle_id = vehicle_type");
                    error_log("Copied data from vehicle_type to vehicle_id");
                }
            }
            
            // Check if airport columns exist in vehicle_pricing, add them if they don't
            $columns = [
                'airport_base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_price_per_km' => 'DECIMAL(5,2) DEFAULT 0',
                'airport_pickup_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_drop_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier1_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier2_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier3_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier4_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_extra_km_charge' => 'DECIMAL(5,2) DEFAULT 0'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN $column $definition");
                    error_log("Added $column column to vehicle_pricing table");
                }
            }
            
            // Make sure unique key exists
            $checkUniqueKey = $conn->query("SHOW INDEX FROM vehicle_pricing WHERE Key_name = 'unique_vehicle_trip'");
            if ($checkUniqueKey->num_rows === 0) {
                // If no unique key, try to create it
                try {
                    $conn->query("ALTER TABLE vehicle_pricing ADD CONSTRAINT unique_vehicle_trip UNIQUE (vehicle_id, trip_type)");
                    error_log("Added unique constraint to vehicle_pricing table");
                } catch (Exception $e) {
                    // If constraint creation fails, it might be due to duplicates
                    error_log("Failed to add unique constraint to vehicle_pricing: " . $e->getMessage());
                }
            }
        }

        return true;
    } catch (Exception $e) {
        error_log("Error ensuring tables exist: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
        return false;
    }
}

// Establish database connection
try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure necessary tables exist
    ensureTablesExist($conn);
    
    // Extract vehicle ID from various possible fields
    $vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? $data['cabType'] ?? '';
    
    // Normalize the vehicle ID (remove any prefix)
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    if (empty($vehicleId)) {
        // Log error and respond with detailed message about missing vehicle ID
        error_log("Vehicle ID is required. Data received: " . json_encode($data));
        throw new Exception("Vehicle ID is required. Please check form data and ensure 'vehicleId' field is present.");
    }
    
    // Check if vehicle exists in vehicle_types
    $checkVehicleStmt = $conn->prepare("SELECT vehicle_id, name FROM vehicle_types WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Format vehicle name from ID
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        
        // Insert the new vehicle type if it doesn't exist
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicle_types (vehicle_id, name, is_active) 
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1
        ");
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("Created new vehicle: $vehicleId with name $vehicleName");
    } else {
        $vehicleData = $checkResult->fetch_assoc();
        $vehicleName = $vehicleData['name'];
        error_log("Found existing vehicle: $vehicleId with name $vehicleName");
    }
    
    // Extract values with multiple field name possibilities
    $basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? 0);
    $pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? 0);
    $pickupPrice = floatval($data['pickupPrice'] ?? $data['pickup_price'] ?? 0);
    $dropPrice = floatval($data['dropPrice'] ?? $data['drop_price'] ?? 0);
    $tier1Price = floatval($data['tier1Price'] ?? $data['tier1_price'] ?? 0);
    $tier2Price = floatval($data['tier2Price'] ?? $data['tier2_price'] ?? 0);
    $tier3Price = floatval($data['tier3Price'] ?? $data['tier3_price'] ?? 0);
    $tier4Price = floatval($data['tier4Price'] ?? $data['tier4_price'] ?? 0);
    $extraKmCharge = floatval($data['extraKmCharge'] ?? $data['extra_km_charge'] ?? 0);
    
    error_log("Airport fare update for $vehicleId: Base=$basePrice, PerKm=$pricePerKm, Pickup=$pickupPrice, Drop=$dropPrice", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Update airport_transfer_fares table
        $stmt = $conn->prepare("
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
             tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            base_price = VALUES(base_price),
            price_per_km = VALUES(price_per_km),
            pickup_price = VALUES(pickup_price),
            drop_price = VALUES(drop_price),
            tier1_price = VALUES(tier1_price),
            tier2_price = VALUES(tier2_price),
            tier3_price = VALUES(tier3_price),
            tier4_price = VALUES(tier4_price),
            extra_km_charge = VALUES(extra_km_charge),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("sddddddddd", 
            $vehicleId,
            $basePrice,
            $pricePerKm,
            $pickupPrice,
            $dropPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge
        );
        
        $stmt->execute();
        $stmt->close();
        
        // 2. Update vehicle_pricing table with 'airport' trip type
        $tripType = 'airport';
        
        // Check if already exists in vehicle_pricing
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?");
        $checkStmt->bind_param("ss", $vehicleId, $tripType);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $checkStmt->close();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateStmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_fare = ?,
                    price_per_km = ?,
                    airport_base_price = ?,
                    airport_price_per_km = ?,
                    airport_pickup_price = ?,
                    airport_drop_price = ?,
                    airport_tier1_price = ?,
                    airport_tier2_price = ?,
                    airport_tier3_price = ?,
                    airport_tier4_price = ?,
                    airport_extra_km_charge = ?,
                    updated_at = NOW()
                WHERE vehicle_id = ? AND trip_type = ?
            ");
            
            $updateStmt->bind_param("dddddddddddss", 
                $basePrice,
                $pricePerKm,
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $vehicleId,
                $tripType
            );
            
            $updateStmt->execute();
            $updateStmt->close();
            error_log("Updated existing record in vehicle_pricing for $vehicleId with trip_type $tripType");
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, base_fare, price_per_km, 
                 airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                 airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                 airport_extra_km_charge, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $insertStmt->bind_param("ssddddddddddd", 
                $vehicleId,
                $tripType,
                $basePrice,
                $pricePerKm,
                $basePrice,
                $pricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge
            );
            
            $insertStmt->execute();
            $insertStmt->close();
            error_log("Inserted new record in vehicle_pricing for $vehicleId with trip_type $tripType");
        }
        
        // Insert default records for other trip types if they don't exist
        $otherTripTypes = ['outstation', 'local'];
        foreach ($otherTripTypes as $otherTripType) {
            $checkOtherStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?");
            $checkOtherStmt->bind_param("ss", $vehicleId, $otherTripType);
            $checkOtherStmt->execute();
            $checkOtherResult = $checkOtherStmt->get_result();
            $checkOtherStmt->close();
            
            if ($checkOtherResult->num_rows === 0) {
                // Default values for each trip type
                $defaultBaseFare = ($otherTripType === 'outstation') ? 2000 : 1000;
                $defaultPricePerKm = ($otherTripType === 'outstation') ? 15 : 12;
                
                $insertOtherStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                ");
                
                $insertOtherStmt->bind_param("ssdd", 
                    $vehicleId,
                    $otherTripType,
                    $defaultBaseFare,
                    $defaultPricePerKm
                );
                
                $insertOtherStmt->execute();
                $insertOtherStmt->close();
                error_log("Created default pricing for $vehicleId with trip_type $otherTripType");
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        error_log("Airport fare update successful for vehicle $vehicleId", 3, __DIR__ . '/../../error.log');
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
    
    echo json_encode([
        "status" => "success",
        "message" => "Airport fare updated successfully",
        "vehicleId" => $vehicleId,
        "tripType" => "airport"
    ]);
    
} catch (Exception $e) {
    error_log("Error in airport fare update: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
}
