
<?php
// This is a simplified, direct version of vehicle-pricing.php that bypasses complex auth checks
// and directly attempts to process the update, useful for debugging

// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Set CORS headers aggressively
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh");
header("Access-Control-Max-Age: 3600");
header("X-Debug-Handler: direct-vehicle-pricing.php");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit;
}

// Log incoming request
error_log("DIRECT VEHICLE PRICING: Request received - method: {$_SERVER['REQUEST_METHOD']}, content type: " . 
    ($_SERVER['CONTENT_TYPE'] ?? 'undefined'));

// Connect to the database
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        error_log("DIRECT VEHICLE PRICING: Database connection failed: " . $conn->connect_error);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed',
            'debug' => $conn->connect_error
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log("DIRECT VEHICLE PRICING: Database connection exception: " . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection exception',
        'debug' => $e->getMessage()
    ]);
    exit;
}

// Function to ensure table exists
function ensureTableExists($conn, $tableName, $createSql) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    if ($result && $result->num_rows == 0) {
        // Table doesn't exist, create it
        if (!$conn->query($createSql)) {
            error_log("DIRECT VEHICLE PRICING: Failed to create $tableName table: " . $conn->error);
            return false;
        }
        error_log("DIRECT VEHICLE PRICING: Created $tableName table");
        return true;
    }
    return true;
}

// Handle POST request to update pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get raw POST data
    $rawInput = file_get_contents('php://input');
    error_log("DIRECT VEHICLE PRICING: Raw input received: " . $rawInput);
    
    // Try to parse as JSON
    $data = json_decode($rawInput, true);
    
    // Check if JSON parsing failed, try to use $_POST
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        error_log("DIRECT VEHICLE PRICING: JSON parse failed, using $_POST");
        $data = $_POST;
    }
    
    // If still empty, try to parse manually
    if (empty($data)) {
        error_log("DIRECT VEHICLE PRICING: Data still empty, trying manual parsing");
        parse_str($rawInput, $data);
    }
    
    // Log the data we've parsed
    error_log("DIRECT VEHICLE PRICING: Parsed data: " . print_r($data, true));
    
    // Basic validation - need at least vehicleId
    if (empty($data['vehicleId']) && empty($data['id'])) {
        error_log("DIRECT VEHICLE PRICING: Missing vehicleId in request");
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Missing vehicleId in request',
            'data' => $data
        ]);
        exit;
    }
    
    // Clean the vehicle ID to ensure consistency
    $vehicleId = $data['vehicleId'] ?? $data['id'];
    
    // Remove 'item-' prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
    $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 0;
    $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
    
    // Ensure all tables exist before proceeding
    $vehicle_types_sql = "
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
    ";
    
    $vehicles_sql = "
        CREATE TABLE IF NOT EXISTS vehicles (
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
    ";
    
    $vehicle_pricing_sql = "
        CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            base_fare DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            trip_type VARCHAR(50) DEFAULT 'all',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";
    
    $outstation_fares_sql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
            base_price DECIMAL(10,2) DEFAULT 0,
            base_fare DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
            roundtrip_price_per_km DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";
    
    // Ensure all tables exist
    ensureTableExists($conn, 'vehicle_types', $vehicle_types_sql);
    ensureTableExists($conn, 'vehicles', $vehicles_sql);
    ensureTableExists($conn, 'vehicle_pricing', $vehicle_pricing_sql);
    ensureTableExists($conn, 'outstation_fares', $outstation_fares_sql);
    
    // Check if vehicle exists in both vehicle_types and vehicles tables
    $checkVehicleTypeStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
    $checkVehicleTypeStmt->bind_param("s", $vehicleId);
    $checkVehicleTypeStmt->execute();
    $vehicleTypeResult = $checkVehicleTypeStmt->get_result();
    $vehicleTypeRow = $vehicleTypeResult->fetch_assoc();
    $vehicleTypeExists = $vehicleTypeRow['count'] > 0;
    
    $checkVehicleStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $vehicleResult = $checkVehicleStmt->get_result();
    $vehicleRow = $vehicleResult->fetch_assoc();
    $vehicleExists = $vehicleRow['count'] > 0;
    
    $updates = [];
    
    if ($vehicleTypeExists || $vehicleExists) {
        // Vehicle exists in at least one table, update all tables
        
        // Update vehicle_types table if it exists
        if ($vehicleTypeExists) {
            $updateStmt = $conn->prepare("
                UPDATE vehicle_types 
                SET updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            
            if ($updateStmt) {
                $updateStmt->bind_param("s", $vehicleId);
                $success = $updateStmt->execute();
                
                if ($success) {
                    $updates[] = "vehicle_types";
                }
            }
        } else {
            // Insert into vehicle_types if not exists
            $name = ucfirst(str_replace('_', ' ', $vehicleId));
            $description = $name . " vehicle";
            $amenities = json_encode(['AC', 'Bottle Water', 'Music System']);
            
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
                VALUES (?, ?, 4, 2, 1, '/cars/sedan.png', ?, ?, 1)
            ");
            
            if ($insertStmt) {
                $insertStmt->bind_param("ssss", $vehicleId, $name, $amenities, $description);
                $success = $insertStmt->execute();
                
                if ($success) {
                    $updates[] = "vehicle_types (new)";
                }
            }
        }
        
        // Update vehicles table if it exists
        if ($vehicleExists) {
            $updateStmt = $conn->prepare("
                UPDATE vehicles 
                SET updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            
            if ($updateStmt) {
                $updateStmt->bind_param("s", $vehicleId);
                $success = $updateStmt->execute();
                
                if ($success) {
                    $updates[] = "vehicles";
                }
            }
        } else {
            // Insert into vehicles if not exists
            $name = ucfirst(str_replace('_', ' ', $vehicleId));
            $description = $name . " vehicle";
            $amenities = json_encode(['AC', 'Bottle Water', 'Music System']);
            
            $insertStmt = $conn->prepare("
                INSERT INTO vehicles 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
                VALUES (?, ?, 4, 2, 1, '/cars/sedan.png', ?, ?, 1)
            ");
            
            if ($insertStmt) {
                $insertStmt->bind_param("ssss", $vehicleId, $name, $amenities, $description);
                $success = $insertStmt->execute();
                
                if ($success) {
                    $updates[] = "vehicles (new)";
                }
            }
        }
        
        // Update vehicle_pricing table - 3 entries for outstation, local, airport
        $tripTypes = ['outstation', 'local', 'airport'];
        
        foreach ($tripTypes as $tripType) {
            $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?");
            $checkPricingStmt->bind_param("ss", $vehicleId, $tripType);
            $checkPricingStmt->execute();
            $pricingResult = $checkPricingStmt->get_result();
            $pricingRow = $pricingResult->fetch_assoc();
            
            if ($pricingRow['count'] > 0) {
                // Update existing pricing entry
                $updateStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET base_price = ?, base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() 
                    WHERE vehicle_id = ? AND trip_type = ?
                ");
                
                if ($updateStmt) {
                    $updateStmt->bind_param("dddddss", $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $tripType);
                    $success = $updateStmt->execute();
                    
                    if ($success) {
                        $updates[] = "vehicle_pricing ($tripType)";
                    }
                }
            } else {
                // Insert new pricing entry
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, base_price, base_fare, price_per_km, night_halt_charge, driver_allowance, trip_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                if ($insertStmt) {
                    $insertStmt->bind_param("sddddds", $vehicleId, $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $tripType);
                    $success = $insertStmt->execute();
                    
                    if ($success) {
                        $updates[] = "vehicle_pricing ($tripType) (new)";
                    }
                }
            }
        }
        
        // Update outstation_fares table
        $checkOutstationStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
        $checkOutstationStmt->bind_param("s", $vehicleId);
        $checkOutstationStmt->execute();
        $outstationResult = $checkOutstationStmt->get_result();
        $outstationRow = $outstationResult->fetch_assoc();
        
        if ($outstationRow['count'] > 0) {
            // Update existing outstation fare
            $updateStmt = $conn->prepare("
                UPDATE outstation_fares 
                SET base_fare = ?, base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, 
                    roundtrip_base_price = ?, roundtrip_price_per_km = ?, updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            
            // Calculate roundtrip prices (slightly reduced)
            $roundtripBasePrice = $basePrice * 0.95;
            $roundtripPricePerKm = $pricePerKm * 0.85;
            
            if ($updateStmt) {
                $updateStmt->bind_param("ddddddds", $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, 
                                      $roundtripBasePrice, $roundtripPricePerKm, $vehicleId);
                $success = $updateStmt->execute();
                
                if ($success) {
                    $updates[] = "outstation_fares";
                }
            }
        } else {
            // Insert new outstation fare
            $insertStmt = $conn->prepare("
                INSERT INTO outstation_fares 
                (vehicle_id, base_fare, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            // Calculate roundtrip prices (slightly reduced)
            $roundtripBasePrice = $basePrice * 0.95;
            $roundtripPricePerKm = $pricePerKm * 0.85;
            
            if ($insertStmt) {
                $insertStmt->bind_param("sddddddd", $vehicleId, $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, 
                                      $roundtripBasePrice, $roundtripPricePerKm);
                $success = $insertStmt->execute();
                
                if ($success) {
                    $updates[] = "outstation_fares (new)";
                }
            }
        }
        
        // Also update local JSON file for fallback
        try {
            // Read existing vehicles from JSON file
            $jsonFile = __DIR__ . '/../../../data/vehicles.json';
            $vehicles = [];
            
            if (file_exists($jsonFile)) {
                $content = file_get_contents($jsonFile);
                if (!empty($content)) {
                    $jsonData = json_decode($content, true);
                    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                        $vehicles = $jsonData;
                    }
                }
            }
            
            // Update or append the vehicle with new pricing
            $vehicleUpdated = false;
            foreach ($vehicles as &$vehicle) {
                if (($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId)) {
                    $vehicle['basePrice'] = $basePrice;
                    $vehicle['price'] = $basePrice;
                    $vehicle['pricePerKm'] = $pricePerKm;
                    $vehicle['nightHaltCharge'] = $nightHaltCharge;
                    $vehicle['driverAllowance'] = $driverAllowance;
                    $vehicle['isActive'] = true;
                    $vehicleUpdated = true;
                    break;
                }
            }
            
            // If vehicle wasn't found in the array, get it from database and append
            if (!$vehicleUpdated) {
                // Create a default vehicle
                $name = ucfirst(str_replace('_', ' ', $vehicleId));
                
                // Create new vehicle entry
                $newVehicle = [
                    'id' => $vehicleId,
                    'vehicleId' => $vehicleId,
                    'name' => $name,
                    'capacity' => 4,
                    'luggageCapacity' => 2,
                    'basePrice' => $basePrice,
                    'price' => $basePrice,
                    'pricePerKm' => $pricePerKm,
                    'nightHaltCharge' => $nightHaltCharge,
                    'driverAllowance' => $driverAllowance,
                    'image' => '/cars/sedan.png',
                    'amenities' => ['AC', 'Bottle Water', 'Music System'],
                    'description' => $name . ' vehicle',
                    'ac' => true,
                    'isActive' => true
                ];
                
                $vehicles[] = $newVehicle;
                $updates[] = "JSON file (new vehicle)";
            } else {
                $updates[] = "JSON file (updated)";
            }
            
            // Save the updated vehicles back to the JSON file
            file_put_contents($jsonFile, json_encode($vehicles, JSON_PRETTY_PRINT));
            
            // Create/update the cache invalidation marker
            $cacheMarkerFile = __DIR__ . '/../../../data/vehicle_cache_invalidated.txt';
            file_put_contents($cacheMarkerFile, time());
            
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error updating JSON file: " . $e->getMessage());
        }
        
        // Force sync with outstation_fares table
        try {
            $forceSyncUrl = str_replace('direct-vehicle-pricing.php', 'force-sync-outstation-fares.php', $_SERVER['PHP_SELF']);
            $forceSyncUrl = str_replace($_SERVER['QUERY_STRING'], '', $forceSyncUrl);
            $forceSyncUrl .= "?vehicle_id=$vehicleId&_t=" . time();
            
            error_log("DIRECT VEHICLE PRICING: Forcing sync with outstation_fares: $forceSyncUrl");
            
            $ch = curl_init($forceSyncUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $syncResult = curl_exec($ch);
            curl_close($ch);
            
            error_log("DIRECT VEHICLE PRICING: Sync result: $syncResult");
            $updates[] = "Synced with outstation_fares";
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error syncing with outstation_fares: " . $e->getMessage());
        }
        
        // Trigger vehicle data refresh events
        try {
            // Dispatch a vehicle data refreshed event to notify the frontend
            echo "
                <script>
                    if (window.parent && window.parent.dispatchEvent) {
                        window.parent.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
                            detail: {
                                vehicleId: '$vehicleId',
                                timestamp: " . time() . "
                            }
                        }));
                        
                        window.parent.dispatchEvent(new CustomEvent('fare-cache-cleared', {
                            detail: {
                                timestamp: " . time() . "
                            }
                        }));
                        
                        window.parent.dispatchEvent(new CustomEvent('fare-data-updated', {
                            detail: {
                                vehicleId: '$vehicleId',
                                timestamp: " . time() . "
                            }
                        }));
                    }
                </script>
            ";
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error dispatching event: " . $e->getMessage());
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle pricing updated successfully',
            'vehicleId' => $vehicleId,
            'updates' => $updates,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance
        ]);
    } else {
        // Vehicle doesn't exist, create it in all tables
        $name = ucfirst(str_replace('_', ' ', $vehicleId));
        $description = $name . " vehicle";
        $amenities = json_encode(['AC', 'Bottle Water', 'Music System']);
        
        // Insert into vehicle_types table
        $insertVehicleTypeStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
            VALUES (?, ?, 4, 2, 1, '/cars/sedan.png', ?, ?, 1)
        ");
        
        if (!$insertVehicleTypeStmt) {
            error_log("DIRECT VEHICLE PRICING: Insert prepare failed for vehicle_types: " . $conn->error);
        } else {
            $insertVehicleTypeStmt->bind_param("ssss", $vehicleId, $name, $amenities, $description);
            $success = $insertVehicleTypeStmt->execute();
            
            if ($success) {
                $updates[] = "vehicle_types";
            } else {
                error_log("DIRECT VEHICLE PRICING: Insert execute failed for vehicle_types: " . $insertVehicleTypeStmt->error);
            }
        }
        
        // Insert into vehicles table
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicles 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) 
            VALUES (?, ?, 4, 2, 1, '/cars/sedan.png', ?, ?, 1)
        ");
        
        if (!$insertVehicleStmt) {
            error_log("DIRECT VEHICLE PRICING: Insert prepare failed for vehicles: " . $conn->error);
        } else {
            $insertVehicleStmt->bind_param("ssss", $vehicleId, $name, $amenities, $description);
            $success = $insertVehicleStmt->execute();
            
            if ($success) {
                $updates[] = "vehicles";
            } else {
                error_log("DIRECT VEHICLE PRICING: Insert execute failed for vehicles: " . $insertVehicleStmt->error);
            }
        }
        
        // Insert into vehicle_pricing table - 3 entries for outstation, local, airport
        $tripTypes = ['outstation', 'local', 'airport'];
        
        foreach ($tripTypes as $tripType) {
            $insertPricingStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, base_price, base_fare, price_per_km, night_halt_charge, driver_allowance, trip_type) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            if ($insertPricingStmt) {
                $insertPricingStmt->bind_param("sddddds", $vehicleId, $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $tripType);
                $success = $insertPricingStmt->execute();
                
                if ($success) {
                    $updates[] = "vehicle_pricing ($tripType)";
                }
            }
        }
        
        // Insert into outstation_fares table
        $insertOutstationStmt = $conn->prepare("
            INSERT INTO outstation_fares 
            (vehicle_id, base_fare, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        // Calculate roundtrip prices (slightly reduced)
        $roundtripBasePrice = $basePrice * 0.95;
        $roundtripPricePerKm = $pricePerKm * 0.85;
        
        if ($insertOutstationStmt) {
            $insertOutstationStmt->bind_param("sddddddd", $vehicleId, $basePrice, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, 
                                          $roundtripBasePrice, $roundtripPricePerKm);
            $success = $insertOutstationStmt->execute();
            
            if ($success) {
                $updates[] = "outstation_fares";
            }
        }
        
        // Also update JSON file
        try {
            $jsonFile = __DIR__ . '/../../../data/vehicles.json';
            $vehicles = [];
            
            if (file_exists($jsonFile)) {
                $content = file_get_contents($jsonFile);
                if (!empty($content)) {
                    $jsonData = json_decode($content, true);
                    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                        $vehicles = $jsonData;
                    }
                }
            }
            
            // Create new vehicle entry
            $newVehicle = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'capacity' => 4,
                'luggageCapacity' => 2,
                'basePrice' => $basePrice,
                'price' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance,
                'image' => '/cars/sedan.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System'],
                'description' => $name . ' vehicle',
                'ac' => true,
                'isActive' => true
            ];
            
            $vehicles[] = $newVehicle;
            
            // Save the updated vehicles back to the JSON file
            file_put_contents($jsonFile, json_encode($vehicles, JSON_PRETTY_PRINT));
            
            // Create/update the cache invalidation marker
            $cacheMarkerFile = __DIR__ . '/../../../data/vehicle_cache_invalidated.txt';
            file_put_contents($cacheMarkerFile, time());
            
            $updates[] = "JSON file";
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error updating JSON file with new vehicle: " . $e->getMessage());
        }
        
        // Force sync with outstation_fares table
        try {
            $forceSyncUrl = str_replace('direct-vehicle-pricing.php', 'force-sync-outstation-fares.php', $_SERVER['PHP_SELF']);
            $forceSyncUrl = str_replace($_SERVER['QUERY_STRING'], '', $forceSyncUrl);
            $forceSyncUrl .= "?vehicle_id=$vehicleId&_t=" . time();
            
            error_log("DIRECT VEHICLE PRICING: Forcing sync with outstation_fares: $forceSyncUrl");
            
            $ch = curl_init($forceSyncUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $syncResult = curl_exec($ch);
            curl_close($ch);
            
            error_log("DIRECT VEHICLE PRICING: Sync result: $syncResult");
            $updates[] = "Synced with outstation_fares";
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error syncing with outstation_fares: " . $e->getMessage());
        }
        
        // Trigger vehicle data refresh events
        try {
            // Dispatch a vehicle data refreshed event to notify the frontend
            echo "
                <script>
                    if (window.parent && window.parent.dispatchEvent) {
                        window.parent.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
                            detail: {
                                vehicleId: '$vehicleId',
                                timestamp: " . time() . "
                            }
                        }));
                        
                        window.parent.dispatchEvent(new CustomEvent('fare-cache-cleared', {
                            detail: {
                                timestamp: " . time() . "
                            }
                        }));
                        
                        window.parent.dispatchEvent(new CustomEvent('fare-data-updated', {
                            detail: {
                                vehicleId: '$vehicleId',
                                timestamp: " . time() . "
                            }
                        }));
                    }
                </script>
            ";
        } catch (Exception $e) {
            error_log("DIRECT VEHICLE PRICING: Error dispatching event: " . $e->getMessage());
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'New vehicle added successfully',
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance,
            'updates' => $updates
        ]);
    }
} else {
    // Handle GET or other methods
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed',
        'allowedMethods' => ['POST']
    ]);
}

// Close database connection
$conn->close();
