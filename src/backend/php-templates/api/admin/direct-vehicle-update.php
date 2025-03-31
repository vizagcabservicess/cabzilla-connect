
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
$luggageCapacity = (int)($data['luggageCapacity'] ?? $data['luggage_capacity'] ?? 2);

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

// Determine pricing fields, ensuring both base_price and price are available
$basePrice = $data['base_price'] ?? $data['basePrice'] ?? $data['price'] ?? 0;
$pricePerKm = $data['pricePerKm'] ?? $data['price_per_km'] ?? 0;
$nightHaltCharge = $data['nightHaltCharge'] ?? $data['night_halt_charge'] ?? 700;
$driverAllowance = $data['driverAllowance'] ?? $data['driver_allowance'] ?? 250;

// Establish DB connection with error handling
try {
    $retries = 0;
    $maxRetries = 3;
    $conn = null;
    
    while ($retries < $maxRetries && !$conn) {
        try {
            // Use global variables defined in config.php
            global $db_host, $db_user, $db_pass, $db_name;
            
            if (empty($db_host) || empty($db_user) || empty($db_name)) {
                throw new Exception("Database configuration not properly set. Please check config.php");
            }
            
            // Log database connection attempt
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connecting to database: host=$db_host, user=$db_user, db=$db_name\n", FILE_APPEND);
            
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            
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
    
    // ==== VEHICLES TABLE ====
    
    // First check if the vehicles table exists and add necessary columns
    $tableResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
    
    if ($tableResult && $tableResult->num_rows > 0) {
        // Check if base_price column exists
        $baseResult = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'base_price'");
        if ($baseResult && $baseResult->num_rows === 0) {
            // Add the column
            $conn->query("ALTER TABLE vehicles ADD COLUMN base_price DECIMAL(10,2) DEFAULT 0");
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Added base_price column to vehicles table\n", FILE_APPEND);
        }
        
        // Check if price_per_km column exists
        $priceResult = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'price_per_km'");
        if ($priceResult && $priceResult->num_rows === 0) {
            // Add the column
            $conn->query("ALTER TABLE vehicles ADD COLUMN price_per_km DECIMAL(5,2) DEFAULT 0");
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Added price_per_km column to vehicles table\n", FILE_APPEND);
        }
        
        // Check if vehicle exists in vehicles table
        $stmt = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement for vehicles table failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update vehicles table
            $updateStmt = $conn->prepare("
                UPDATE vehicles 
                SET name = ?, capacity = ?, luggage_capacity = ?, is_active = ?, 
                    image = ?, ac = ?, amenities = ?, description = ?, 
                    base_price = ?, price_per_km = ?, 
                    night_halt_charge = ?, driver_allowance = ?,
                    updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            
            if (!$updateStmt) {
                throw new Exception("Prepare update statement for vehicles table failed: " . $conn->error);
            }
            
            $updateStmt->bind_param(
                "siiisissddddss", 
                $name, $capacity, $luggageCapacity, $isActive, 
                $image, $ac, $amenitiesJson, $description,
                $basePrice, $pricePerKm, 
                $nightHaltCharge, $driverAllowance,
                $vehicleId
            );
            
            $updateResult = $updateStmt->execute();
            $updateStmt->close();
            
            if (!$updateResult) {
                throw new Exception("Failed to update vehicle in vehicles table: " . $conn->error);
            }
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Updated vehicle in vehicles table\n", FILE_APPEND);
        } else {
            // Insert into vehicles table
            $insertStmt = $conn->prepare("
                INSERT INTO vehicles 
                (vehicle_id, name, capacity, luggage_capacity, is_active, 
                 image, ac, amenities, description, 
                 base_price, price_per_km, night_halt_charge, driver_allowance) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            if (!$insertStmt) {
                throw new Exception("Prepare insert statement for vehicles table failed: " . $conn->error);
            }
            
            $insertStmt->bind_param(
                "ssiiisissddd", 
                $vehicleId, $name, $capacity, $luggageCapacity, $isActive, 
                $image, $ac, $amenitiesJson, $description,
                $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
            );
            
            $insertResult = $insertStmt->execute();
            $insertStmt->close();
            
            if (!$insertResult) {
                throw new Exception("Failed to insert vehicle into vehicles table: " . $conn->error);
            }
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Inserted new vehicle into vehicles table\n", FILE_APPEND);
        }
    }
    
    // ==== VEHICLE_TYPES TABLE ====
    
    // Check if vehicle_types table exists and create it if it doesn't with base_price included
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
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 700,
            driver_allowance DECIMAL(10,2) DEFAULT 250,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    if (!$tableResult) {
        throw new Exception("Error creating vehicle_types table: " . $conn->error);
    }
    
    // Check if the base_price column exists, add it if not
    $checkBasePrice = $conn->query("SHOW COLUMNS FROM vehicle_types LIKE 'base_price'");
    if ($checkBasePrice->num_rows === 0) {
        $addBasePriceResult = $conn->query("ALTER TABLE vehicle_types ADD COLUMN base_price DECIMAL(10,2) DEFAULT 0 AFTER is_active");
        if (!$addBasePriceResult) {
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error adding base_price column: " . $conn->error . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Added base_price column to vehicle_types table\n", FILE_APPEND);
        }
    }
    
    // Also check for price_per_km column
    $checkPricePerKm = $conn->query("SHOW COLUMNS FROM vehicle_types LIKE 'price_per_km'");
    if ($checkPricePerKm->num_rows === 0) {
        $addPricePerKmResult = $conn->query("ALTER TABLE vehicle_types ADD COLUMN price_per_km DECIMAL(5,2) DEFAULT 0 AFTER base_price");
        if (!$addPricePerKmResult) {
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error adding price_per_km column: " . $conn->error . "\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Added price_per_km column to vehicle_types table\n", FILE_APPEND);
        }
    }
    
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Ensured vehicle_types table exists with required columns\n", FILE_APPEND);
    
    // Check if vehicle already exists in vehicle_types
    $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
    if (!$checkStmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Checked if vehicle exists in vehicle_types. Found: " . ($result->num_rows > 0 ? 'yes' : 'no') . "\n", FILE_APPEND);
    
    if ($result->num_rows > 0) {
        // Update existing vehicle - include base_price and other price fields in the update
        $updateStmt = $conn->prepare("
            UPDATE vehicle_types 
            SET name = ?, capacity = ?, luggage_capacity = ?, is_active = ?, 
                image = ?, ac = ?, amenities = ?, description = ?, 
                base_price = ?, price_per_km = ?, 
                night_halt_charge = ?, driver_allowance = ?,
                updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        
        if (!$updateStmt) {
            throw new Exception("Prepare update statement failed: " . $conn->error);
        }
        
        $updateStmt->bind_param(
            "siiisissddddss", 
            $name, $capacity, $luggageCapacity, $isActive, 
            $image, $ac, $amenitiesJson, $description,
            $basePrice, $pricePerKm, 
            $nightHaltCharge, $driverAllowance,
            $vehicleId
        );
        
        $updateResult = $updateStmt->execute();
        
        if (!$updateResult) {
            throw new Exception("Failed to update vehicle in vehicle_types: " . $conn->error . " - Query: UPDATE vehicle_types SET name = '$name', capacity = $capacity, ... WHERE vehicle_id = '$vehicleId'");
        }
        
        $updateStmt->close();
        
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Vehicle updated in vehicle_types table\n", FILE_APPEND);
    } else {
        // Insert new vehicle record
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, is_active, 
             image, ac, amenities, description, 
             base_price, price_per_km, night_halt_charge, driver_allowance) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$insertStmt) {
            throw new Exception("Prepare insert statement failed: " . $conn->error);
        }
        
        $insertStmt->bind_param(
            "ssiiisissddd", 
            $vehicleId, $name, $capacity, $luggageCapacity, $isActive, 
            $image, $ac, $amenitiesJson, $description,
            $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
        );
        
        $insertResult = $insertStmt->execute();
        
        if (!$insertResult) {
            throw new Exception("Failed to insert vehicle: " . $conn->error);
        }
        
        $insertStmt->close();
        
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "New vehicle inserted into vehicle_types table\n", FILE_APPEND);
    }
    
    // Also update the outstation_fares table if it exists
    $checkOutstationTable = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkOutstationTable && $checkOutstationTable->num_rows > 0) {
        // Check if this vehicle has an entry
        $checkOutstation = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
        $checkOutstation->bind_param("s", $vehicleId);
        $checkOutstation->execute();
        $outstationResult = $checkOutstation->get_result();
        
        if ($outstationResult->num_rows > 0) {
            // Update outstation fares record
            $updateOutstation = $conn->prepare("
                UPDATE outstation_fares 
                SET base_price = ?, price_per_km = ?, 
                    night_halt_charge = ?, driver_allowance = ?,
                    updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            
            $updateOutstation->bind_param(
                "dddds", 
                $basePrice, $pricePerKm, 
                $nightHaltCharge, $driverAllowance,
                $vehicleId
            );
            
            $updateOutstation->execute();
            $updateOutstation->close();
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Updated outstation_fares for this vehicle\n", FILE_APPEND);
        } else {
            // Insert into outstation_fares
            $insertOutstation = $conn->prepare("
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $insertOutstation->bind_param(
                "sdddd", 
                $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
            );
            
            $insertOutstation->execute();
            $insertOutstation->close();
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Inserted into outstation_fares for this vehicle\n", FILE_APPEND);
        }
    }
    
    // Try to update the vehicle_pricing table if it exists
    $checkPricingTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($checkPricingTable && $checkPricingTable->num_rows > 0) {
        // Check if this vehicle has a pricing record for outstation
        $checkPricing = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'");
        $checkPricing->bind_param("s", $vehicleId);
        $checkPricing->execute();
        $pricingResult = $checkPricing->get_result();
        
        if ($pricingResult->num_rows > 0) {
            // Update pricing record for outstation
            $updatePricing = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_fare = ?, price_per_km = ?, 
                    night_halt_charge = ?, driver_allowance = ?,
                    base_price = ?, 
                    updated_at = NOW() 
                WHERE vehicle_id = ? AND trip_type = 'outstation'
            ");
            
            $updatePricing->bind_param(
                "ddddds", 
                $basePrice, $pricePerKm, 
                $nightHaltCharge, $driverAllowance,
                $basePrice, 
                $vehicleId
            );
            
            $updatePricing->execute();
            $updatePricing->close();
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Updated vehicle_pricing for outstation trip type\n", FILE_APPEND);
        } else {
            // Create pricing record for outstation
            $insertPricing = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price) 
                VALUES (?, 'outstation', ?, ?, ?, ?, ?)
            ");
            
            $insertPricing->bind_param(
                "sddddd", 
                $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $basePrice
            );
            
            $insertPricing->execute();
            $insertPricing->close();
            
            file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Inserted new record into vehicle_pricing for outstation\n", FILE_APPEND);
        }
    }
    
    // Return success response
    $response = [
        'status' => 'success',
        'message' => 'Vehicle updated successfully',
        'vehicle_id' => $vehicleId,
        'updated_tables' => [],
        'timestamp' => time()
    ];
    
    if ($conn->affected_rows > 0) {
        $response['updated_tables'][] = 'vehicle_types';
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Stack trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
