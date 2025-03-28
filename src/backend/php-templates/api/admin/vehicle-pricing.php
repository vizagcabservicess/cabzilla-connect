
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Since the database.php and response.php files were not found, we'll include their functionality directly
// in this file for now

// Set necessary headers for CORS and JSON responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Connect to the database
try {
    $conn = getDbConnection();
} catch (Exception $e) {
    error_log("[" . date('Y-m-d H:i:s') . "] Database connection error: " . $e->getMessage(), 3, $logDir . '/vehicle-pricing.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Log incoming request for debugging
error_log("[" . date('Y-m-d H:i:s') . "] Vehicle pricing request received: " . $method, 3, $logDir . '/vehicle-pricing.log');

// Function to check if a vehicle exists
function vehicleExists($conn, $vehicleId) {
    $stmt = $conn->prepare("SELECT id FROM vehicle_types WHERE id = ? OR vehicle_id = ?");
    if (!$stmt) {
        error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare stmt for checking if vehicle exists: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        return false;
    }
    $stmt->bind_param("ss", $vehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

// Function to sanitize and clean a vehicle ID
function cleanVehicleId($vehicleId) {
    // Remove 'item-' prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        return substr($vehicleId, 5);
    }
    return $vehicleId;
}

// Function to check if a column exists in a table
function columnExists($conn, $table, $column) {
    $query = "SHOW COLUMNS FROM `$table` LIKE '$column'";
    $result = $conn->query($query);
    return ($result && $result->num_rows > 0);
}

// Function to check if a table exists
function tableExists($conn, $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    return ($result && $result->num_rows > 0);
}

// Function to ensure necessary tables exist
function ensureTables($conn) {
    // Check if vehicle_types table exists
    $vehicleTypesExists = tableExists($conn, 'vehicle_types');
    
    if (!$vehicleTypesExists) {
        // Create vehicle_types table
        $sql = "CREATE TABLE IF NOT EXISTS vehicle_types (
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if (!$conn->query($sql)) {
            error_log("[" . date('Y-m-d H:i:s') . "] Error creating vehicle_types table: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        error_log("[" . date('Y-m-d H:i:s') . "] Created vehicle_types table", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    // Check if vehicle_pricing table exists
    $vehiclePricingExists = tableExists($conn, 'vehicle_pricing');
    
    if (!$vehiclePricingExists) {
        // Create vehicle_pricing table
        $sql = "CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50),
            vehicle_type VARCHAR(50),
            trip_type ENUM('outstation', 'local', 'airport') NOT NULL,
            base_fare DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            local_package_4hr DECIMAL(10,2) DEFAULT 0,
            local_package_8hr DECIMAL(10,2) DEFAULT 0,
            local_package_10hr DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(5,2) DEFAULT 0,
            extra_hour_charge DECIMAL(5,2) DEFAULT 0,
            airport_base_price DECIMAL(10,2) DEFAULT 0,
            airport_price_per_km DECIMAL(5,2) DEFAULT 0,
            airport_pickup_price DECIMAL(10,2) DEFAULT 0,
            airport_drop_price DECIMAL(10,2) DEFAULT 0,
            airport_tier1_price DECIMAL(10,2) DEFAULT 0,
            airport_tier2_price DECIMAL(10,2) DEFAULT 0,
            airport_tier3_price DECIMAL(10,2) DEFAULT 0,
            airport_tier4_price DECIMAL(10,2) DEFAULT 0,
            airport_extra_km_charge DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY idx_vehicle_trip (vehicle_id, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if (!$conn->query($sql)) {
            error_log("[" . date('Y-m-d H:i:s') . "] Error creating vehicle_pricing table: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        error_log("[" . date('Y-m-d H:i:s') . "] Created vehicle_pricing table", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    return true;
}

// Ensure necessary tables exist
ensureTables($conn);

// Function to update or create outstation fares
function updateOutstationFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    error_log("[" . date('Y-m-d H:i:s') . "] Updating outstation fares for vehicle: " . $vehicleId, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    
    // Get required fields with fallbacks for both column naming styles
    $baseFare = isset($fareData['baseFare']) ? floatval($fareData['baseFare']) : 
              (isset($fareData['basePrice']) ? floatval($fareData['basePrice']) : 0);
    $pricePerKm = isset($fareData['pricePerKm']) ? floatval($fareData['pricePerKm']) : 0;
    $nightHaltCharge = isset($fareData['nightHaltCharge']) ? floatval($fareData['nightHaltCharge']) : 0;
    $driverAllowance = isset($fareData['driverAllowance']) ? floatval($fareData['driverAllowance']) : 0;
    
    // First check if vehicle exists in vehicle_types table, if not create it
    $vehicleQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $vehicleStmt = $conn->prepare($vehicleQuery);
    if (!$vehicleStmt) {
        error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for vehicle check: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        return false;
    }
    
    $vehicleStmt->bind_param("s", $vehicleId);
    $vehicleStmt->execute();
    $vehicleResult = $vehicleStmt->get_result();
    
    if ($vehicleResult->num_rows == 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleQuery = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active, created_at, updated_at) 
                              VALUES (?, ?, 4, 2, 1, 1, NOW(), NOW())";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        if (!$insertVehicleStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for vehicle insert: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("[" . date('Y-m-d H:i:s') . "] Created new vehicle: $vehicleId with name: $vehicleName", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    // Check if the vehicle_pricing table exists
    $tableExistsResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($tableExistsResult && $tableExistsResult->num_rows > 0) {
        // Check which columns exist in vehicle_pricing
        $hasVehicleIdColumn = columnExists($conn, "vehicle_pricing", "vehicle_id");
        $hasVehicleTypeColumn = columnExists($conn, "vehicle_pricing", "vehicle_type");
        $hasBaseFareColumn = columnExists($conn, "vehicle_pricing", "base_fare");
        $hasBasePriceColumn = columnExists($conn, "vehicle_pricing", "base_price");
        
        // Update vehicle_pricing table using appropriate columns
        try {
            $conditions = [];
            $whereParams = [];
            $whereTypes = "";
            
            if ($hasVehicleIdColumn) {
                $conditions[] = "vehicle_id = ?";
                $whereParams[] = $vehicleId;
                $whereTypes .= "s";
            }
            
            if ($hasVehicleTypeColumn) {
                $conditions[] = "vehicle_type = ?";
                $whereParams[] = $vehicleId;
                $whereTypes .= "s";
            }
            
            if (!empty($conditions)) {
                // Determine base fare/price column
                $baseFareColumnName = $hasBasePriceColumn ? "base_price" : "base_fare";
                
                $updateQuery = "
                    UPDATE vehicle_pricing 
                    SET 
                        $baseFareColumnName = ?,
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        updated_at = NOW() 
                    WHERE (" . implode(" OR ", $conditions) . ") AND trip_type = 'outstation'
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                if (!$updateStmt) {
                    throw new Exception($conn->error);
                }
                
                $types = "dddd" . $whereTypes;
                $params = array_merge([$baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance], $whereParams);
                
                $updateStmt->bind_param($types, ...$params);
                $updateStmt->execute();
                
                if ($updateStmt->affected_rows > 0) {
                    error_log("[" . date('Y-m-d H:i:s') . "] Successfully updated vehicle_pricing for $vehicleId", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
                } else {
                    // Try to insert if update didn't affect any rows
                    $insertColumns = [];
                    $placeholders = [];
                    $insertValues = [];
                    $insertTypes = "";
                    
                    if ($hasVehicleIdColumn) {
                        $insertColumns[] = "vehicle_id";
                        $placeholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    if ($hasVehicleTypeColumn) {
                        $insertColumns[] = "vehicle_type";
                        $placeholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    $insertColumns = array_merge($insertColumns, ["trip_type", $baseFareColumnName, "price_per_km", "night_halt_charge", "driver_allowance"]);
                    $placeholders = array_merge($placeholders, ["?", "?", "?", "?", "?"]);
                    $insertValues = array_merge($insertValues, ["outstation", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance]);
                    $insertTypes .= "sdddd";
                    
                    $insertQuery = "INSERT INTO vehicle_pricing (" . implode(", ", $insertColumns) . 
                                   ") VALUES (" . implode(", ", $placeholders) . ")";
                    
                    $insertStmt = $conn->prepare($insertQuery);
                    if ($insertStmt) {
                        $insertStmt->bind_param($insertTypes, ...$insertValues);
                        $insertStmt->execute();
                        error_log("[" . date('Y-m-d H:i:s') . "] Inserted into vehicle_pricing for $vehicleId", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
                    }
                }
            }
        } catch (Exception $e) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to update/insert vehicle_pricing: " . $e->getMessage(), 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        }
    }
    
    // Check which column name is used in outstation_fares
    $basePriceColumnName = columnExists($conn, "outstation_fares", "base_price") ? "base_price" : "base_fare";
    
    // Check if record exists in outstation_fares
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for outstation fare check: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE outstation_fares SET $basePriceColumnName = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for outstation fare update: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $updateStmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO outstation_fares (vehicle_id, $basePriceColumnName, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for outstation fare insert: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $insertStmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        $success = $insertStmt->execute();
    }
    
    return $success;
}

// Function to update or create local package fares
function updateLocalFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    error_log("[" . date('Y-m-d H:i:s') . "] Updating local fares for vehicle: " . $vehicleId, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    
    // Get prices with multiple fallbacks
    $price4hrs40km = isset($fareData['price4hrs40km']) ? floatval($fareData['price4hrs40km']) : 
                   (isset($fareData['local_package_4hr']) ? floatval($fareData['local_package_4hr']) : 0);
                   
    $price8hrs80km = isset($fareData['price8hrs80km']) ? floatval($fareData['price8hrs80km']) : 
                   (isset($fareData['local_package_8hr']) ? floatval($fareData['local_package_8hr']) : 0);
                   
    $price10hrs100km = isset($fareData['price10hrs100km']) ? floatval($fareData['price10hrs100km']) : 
                     (isset($fareData['local_package_10hr']) ? floatval($fareData['local_package_10hr']) : 0);
                     
    $priceExtraKm = isset($fareData['priceExtraKm']) ? floatval($fareData['priceExtraKm']) : 
                  (isset($fareData['extra_km_charge']) ? floatval($fareData['extra_km_charge']) : 0);
                  
    $priceExtraHour = isset($fareData['priceExtraHour']) ? floatval($fareData['priceExtraHour']) : 
                    (isset($fareData['extra_hour_charge']) ? floatval($fareData['extra_hour_charge']) : 0);
    
    // First check if vehicle exists in vehicle_types table, if not create it
    $vehicleQuery = "SELECT id FROM vehicle_types WHERE vehicle_id = ?";
    $vehicleStmt = $conn->prepare($vehicleQuery);
    if (!$vehicleStmt) {
        error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for vehicle check: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        return false;
    }
    
    $vehicleStmt->bind_param("s", $vehicleId);
    $vehicleStmt->execute();
    $vehicleResult = $vehicleStmt->get_result();
    
    if ($vehicleResult->num_rows == 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleQuery = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active, created_at, updated_at) 
                              VALUES (?, ?, 4, 2, 1, 1, NOW(), NOW())";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        if (!$insertVehicleStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for vehicle insert: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("[" . date('Y-m-d H:i:s') . "] Created new vehicle: $vehicleId with name: $vehicleName", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    // Check if the vehicle_pricing table exists
    $tableExistsResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($tableExistsResult && $tableExistsResult->num_rows > 0) {
        // Check which columns exist in vehicle_pricing
        $hasVehicleIdColumn = columnExists($conn, "vehicle_pricing", "vehicle_id");
        $hasVehicleTypeColumn = columnExists($conn, "vehicle_pricing", "vehicle_type");
        
        // First, try to update the vehicle_pricing table
        try {
            $conditions = [];
            $whereParams = [];
            $whereTypes = "";
            
            if ($hasVehicleIdColumn) {
                $conditions[] = "vehicle_id = ?";
                $whereParams[] = $vehicleId;
                $whereTypes .= "s";
            }
            
            if ($hasVehicleTypeColumn) {
                $conditions[] = "vehicle_type = ?";
                $whereParams[] = $vehicleId;
                $whereTypes .= "s";
            }
            
            if (!empty($conditions)) {
                $updateQuery = "
                    UPDATE vehicle_pricing 
                    SET 
                        local_package_4hr = ?,
                        local_package_8hr = ?,
                        local_package_10hr = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = NOW() 
                    WHERE (" . implode(" OR ", $conditions) . ") AND trip_type = 'local'
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                if (!$updateStmt) {
                    throw new Exception($conn->error);
                }
                
                $types = "ddddd" . $whereTypes;
                $params = array_merge([
                    $price4hrs40km, 
                    $price8hrs80km, 
                    $price10hrs100km, 
                    $priceExtraKm,
                    $priceExtraHour
                ], $whereParams);
                
                $updateStmt->bind_param($types, ...$params);
                $updateStmt->execute();
                
                if ($updateStmt->affected_rows > 0) {
                    error_log("[" . date('Y-m-d H:i:s') . "] Successfully updated vehicle_pricing for $vehicleId (local)", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
                } else {
                    // Try to insert if update didn't affect any rows
                    $insertColumns = [];
                    $placeholders = [];
                    $insertValues = [];
                    $insertTypes = "";
                    
                    if ($hasVehicleIdColumn) {
                        $insertColumns[] = "vehicle_id";
                        $placeholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    if ($hasVehicleTypeColumn) {
                        $insertColumns[] = "vehicle_type";
                        $placeholders[] = "?";
                        $insertValues[] = $vehicleId;
                        $insertTypes .= "s";
                    }
                    
                    $insertColumns = array_merge($insertColumns, [
                        "trip_type", 
                        "local_package_4hr", 
                        "local_package_8hr", 
                        "local_package_10hr", 
                        "extra_km_charge", 
                        "extra_hour_charge"
                    ]);
                    $placeholders = array_merge($placeholders, ["?", "?", "?", "?", "?", "?"]);
                    $insertValues = array_merge($insertValues, [
                        "local", 
                        $price4hrs40km, 
                        $price8hrs80km, 
                        $price10hrs100km, 
                        $priceExtraKm, 
                        $priceExtraHour
                    ]);
                    $insertTypes .= "sddddd";
                    
                    $insertQuery = "INSERT INTO vehicle_pricing (" . implode(", ", $insertColumns) . 
                                  ") VALUES (" . implode(", ", $placeholders) . ")";
                    
                    $insertStmt = $conn->prepare($insertQuery);
                    if ($insertStmt) {
                        $insertStmt->bind_param($insertTypes, ...$insertValues);
                        $insertStmt->execute();
                        error_log("[" . date('Y-m-d H:i:s') . "] Inserted into vehicle_pricing for $vehicleId (local)", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
                    }
                }
            }
        } catch (Exception $e) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to update vehicle_pricing: " . $e->getMessage(), 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        }
    }
    
    // Check if local_package_fares table exists
    $tableExistsResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $localFaresExists = ($tableExistsResult && $tableExistsResult->num_rows > 0);
    
    if (!$localFaresExists) {
        // Create the table if it doesn't exist
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                vehicle_type VARCHAR(50) DEFAULT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);
        error_log("[" . date('Y-m-d H:i:s') . "] Created local_package_fares table", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    // Check if we have a record in local_package_fares table
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for local fare check: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE local_package_fares SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?, price_extra_km = ?, price_extra_hour = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for local fare update: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
        $success = $updateStmt->execute();
        error_log("[" . date('Y-m-d H:i:s') . "] Updated local_package_fares for $vehicleId", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            error_log("[" . date('Y-m-d H:i:s') . "] Failed to prepare statement for local fare insert: " . $conn->error, 3, __DIR__ . '/../../logs/vehicle-pricing.log');
            return false;
        }
        
        $insertStmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        $success = $insertStmt->execute();
        error_log("[" . date('Y-m-d H:i:s') . "] Inserted into local_package_fares for $vehicleId", 3, __DIR__ . '/../../logs/vehicle-pricing.log');
    }
    
    return $success;
}

// Main request handling
if ($method === 'POST') {
    // Get the request body
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    // If JSON parsing failed, try using POST data
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }
    
    // Log the raw request
    error_log("[" . date('Y-m-d H:i:s') . "] Raw request data: " . print_r($data, true), 3, $logDir . '/vehicle-pricing.log');
    
    // Get vehicleId and tripType from the request
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : null;
    $tripType = isset($data['tripType']) ? $data['tripType'] : 'outstation';
    
    if (!$vehicleId) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required'
        ]);
        exit;
    }
    
    // Process based on trip type
    $success = false;
    if ($tripType === 'local') {
        $success = updateLocalFares($conn, $vehicleId, $data);
    } else if ($tripType === 'outstation') {
        $success = updateOutstationFares($conn, $vehicleId, $data);
    } else {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid trip type'
        ]);
        exit;
    }
    
    if ($success) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle pricing updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'tripType' => $tripType
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to update vehicle pricing'
        ]);
    }
} else if ($method === 'GET') {
    // Handle GET request to retrieve pricing
    $vehicleId = isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null;
    $tripType = isset($_GET['tripType']) ? $_GET['tripType'] : null;
    
    // Verify vehicle_types table exists and has data
    $vehicleTypesExist = $conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0;
    $vehicleCount = 0;
    
    if ($vehicleTypesExist) {
        $countResult = $conn->query("SELECT COUNT(*) as count FROM vehicle_types");
        if ($countResult && $countRow = $countResult->fetch_assoc()) {
            $vehicleCount = $countRow['count'];
        }
        
        // If no vehicles exist, create a sample one
        if ($vehicleCount === 0) {
            $sampleVehicles = [
                ['sedan', 'Sedan', 4, 2],
                ['ertiga', 'Ertiga', 6, 3],
                ['innova', 'Innova', 7, 4]
            ];
            
            foreach ($sampleVehicles as $vehicle) {
                $insertQuery = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active) 
                               VALUES (?, ?, ?, ?, 1, 1)";
                $stmt = $conn->prepare($insertQuery);
                $stmt->bind_param("ssii", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3]);
                $stmt->execute();
            }
            
            error_log("[" . date('Y-m-d H:i:s') . "] Created sample vehicles as vehicle_types table was empty", 3, $logDir . '/vehicle-pricing.log');
        }
    }
    
    // Get all vehicles and pricing
    $query = "SELECT vt.id, vt.vehicle_id, vt.name, vt.capacity, vt.luggage_capacity 
              FROM vehicle_types vt 
              WHERE vt.is_active = 1 
              ORDER BY vt.id";
    $vehicles = $conn->query($query);
    
    $response = [
        'status' => 'success',
        'data' => []
    ];
    
    while ($vehicle = $vehicles->fetch_assoc()) {
        $vehicleData = [
            'id' => $vehicle['id'],
            'vehicleId' => $vehicle['vehicle_id'],
            'name' => $vehicle['name'],
            'capacity' => $vehicle['capacity'],
            'luggageCapacity' => $vehicle['luggage_capacity'],
            'pricing' => []
        ];
        
        // Get local pricing
        $localQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $localStmt = $conn->prepare($localQuery);
        $localStmt->bind_param("s", $vehicle['vehicle_id']);
        $localStmt->execute();
        $localResult = $localStmt->get_result();
        
        if ($localResult->num_rows > 0) {
            $localData = $localResult->fetch_assoc();
            $vehicleData['pricing']['local'] = [
                'price4hrs40km' => floatval($localData['price_4hrs_40km']),
                'price8hrs80km' => floatval($localData['price_8hrs_80km']),
                'price10hrs100km' => floatval($localData['price_10hrs_100km']),
                'priceExtraKm' => floatval($localData['price_extra_km']),
                'priceExtraHour' => floatval($localData['price_extra_hour'])
            ];
        }
        
        // Get outstation pricing - handle both column naming conventions
        $outstationQuery = "SELECT * FROM outstation_fares WHERE vehicle_id = ?";
        $outstationStmt = $conn->prepare($outstationQuery);
        $outstationStmt->bind_param("s", $vehicle['vehicle_id']);
        $outstationStmt->execute();
        $outstationResult = $outstationStmt->get_result();
        
        if ($outstationResult->num_rows > 0) {
            $outstationData = $outstationResult->fetch_assoc();
            // Check which column name is used (base_price or base_fare)
            $baseFare = isset($outstationData['base_price']) ? 
                        floatval($outstationData['base_price']) : 
                        floatval($outstationData['base_fare'] ?? 0);
                        
            $vehicleData['pricing']['outstation'] = [
                'baseFare' => $baseFare,
                'pricePerKm' => floatval($outstationData['price_per_km']),
                'nightHaltCharge' => floatval($outstationData['night_halt_charge']),
                'driverAllowance' => floatval($outstationData['driver_allowance'])
            ];
        }
        
        $response['data'][] = $vehicleData;
    }
    
    error_log("[" . date('Y-m-d H:i:s') . "] Returning data for " . count($response['data']) . " vehicles", 3, $logDir . '/vehicle-pricing.log');
    
    echo json_encode($response);
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
}

// Close database connection
$conn->close();
?>
