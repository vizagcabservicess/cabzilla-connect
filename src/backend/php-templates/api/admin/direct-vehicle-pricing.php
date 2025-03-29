
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
    
    // Check if vehicle exists in vehicle_types
    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ? OR id = ?");
    if (!$checkStmt) {
        error_log("DIRECT VEHICLE PRICING: Prepare statement failed for vehicle_types: " . $conn->error);
        // Try vehicles table instead
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE id = ? OR vehicle_id = ?");
        if (!$checkStmt) {
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $conn->error
            ]);
            exit;
        }
    }
    
    $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $row = $checkResult->fetch_assoc();
    $vehicleExists = $row['count'] > 0;
    
    // Check if vehicle_pricing table exists
    $pricingTableExists = false;
    $result = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($result && $result->num_rows > 0) {
        $pricingTableExists = true;
    } else {
        // Create vehicle_pricing table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 0,
                driver_allowance DECIMAL(10,2) DEFAULT 0,
                trip_type VARCHAR(50) DEFAULT 'all',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $pricingTableExists = true;
        error_log("DIRECT VEHICLE PRICING: Created vehicle_pricing table");
    }
    
    // Check if outstation_fares table exists
    $outstationTableExists = false;
    $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($result && $result->num_rows > 0) {
        $outstationTableExists = true;
    }
    
    if ($vehicleExists) {
        $updates = [];
        
        // Update vehicle_pricing table
        if ($pricingTableExists) {
            $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_id = ?");
            $checkPricingStmt->bind_param("s", $vehicleId);
            $checkPricingStmt->execute();
            $pricingResult = $checkPricingStmt->get_result();
            $pricingRow = $pricingResult->fetch_assoc();
            
            if ($pricingRow['count'] > 0) {
                // Update existing pricing
                $updateStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() 
                    WHERE vehicle_id = ?
                ");
                
                if (!$updateStmt) {
                    error_log("DIRECT VEHICLE PRICING: Update prepare failed for vehicle_pricing: " . $conn->error);
                } else {
                    $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                    $success = $updateStmt->execute();
                    
                    if ($success) {
                        $updates[] = "vehicle_pricing";
                    } else {
                        error_log("DIRECT VEHICLE PRICING: Update execute failed for vehicle_pricing: " . $updateStmt->error);
                    }
                }
            } else {
                // Insert new pricing
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, trip_type, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, 'all', NOW(), NOW())
                ");
                
                if (!$insertStmt) {
                    error_log("DIRECT VEHICLE PRICING: Insert prepare failed for vehicle_pricing: " . $conn->error);
                } else {
                    $insertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    $success = $insertStmt->execute();
                    
                    if ($success) {
                        $updates[] = "vehicle_pricing (new)";
                    } else {
                        error_log("DIRECT VEHICLE PRICING: Insert execute failed for vehicle_pricing: " . $insertStmt->error);
                    }
                }
            }
        }
        
        // Update outstation_fares table if it exists
        if ($outstationTableExists) {
            $checkOutstationStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
            $checkOutstationStmt->bind_param("s", $vehicleId);
            $checkOutstationStmt->execute();
            $outstationResult = $checkOutstationStmt->get_result();
            $outstationRow = $outstationResult->fetch_assoc();
            
            if ($outstationRow['count'] > 0) {
                // Update existing outstation fare
                $updateStmt = $conn->prepare("
                    UPDATE outstation_fares 
                    SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ? 
                    WHERE vehicle_id = ?
                ");
                
                if (!$updateStmt) {
                    error_log("DIRECT VEHICLE PRICING: Update prepare failed for outstation_fares: " . $conn->error);
                } else {
                    $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                    $success = $updateStmt->execute();
                    
                    if ($success) {
                        $updates[] = "outstation_fares";
                    } else {
                        error_log("DIRECT VEHICLE PRICING: Update execute failed for outstation_fares: " . $updateStmt->error);
                    }
                }
            } else {
                // Insert new outstation fare
                $insertStmt = $conn->prepare("
                    INSERT INTO outstation_fares 
                    (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                
                if (!$insertStmt) {
                    error_log("DIRECT VEHICLE PRICING: Insert prepare failed for outstation_fares: " . $conn->error);
                } else {
                    $insertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    $success = $insertStmt->execute();
                    
                    if ($success) {
                        $updates[] = "outstation_fares (new)";
                    } else {
                        error_log("DIRECT VEHICLE PRICING: Insert execute failed for outstation_fares: " . $insertStmt->error);
                    }
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
                    $vehicleUpdated = true;
                    break;
                }
            }
            
            // If vehicle wasn't found in the array, get it from database and append
            if (!$vehicleUpdated) {
                $getVehicleStmt = $conn->prepare("
                    SELECT * FROM vehicle_types WHERE vehicle_id = ? OR id = ?
                ");
                
                if ($getVehicleStmt) {
                    $getVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
                    $getVehicleStmt->execute();
                    $vehicleResult = $getVehicleStmt->get_result();
                    
                    if ($vehicleResult && $vehicleResult->num_rows > 0) {
                        $vehicleData = $vehicleResult->fetch_assoc();
                        
                        // Parse amenities
                        $amenities = [];
                        if (!empty($vehicleData['amenities'])) {
                            $decoded = json_decode($vehicleData['amenities'], true);
                            if (json_last_error() === JSON_ERROR_NONE) {
                                $amenities = $decoded;
                            } else {
                                $amenities = array_map('trim', explode(',', $vehicleData['amenities']));
                            }
                        }
                        
                        // Create new vehicle entry
                        $newVehicle = [
                            'id' => $vehicleId,
                            'vehicleId' => $vehicleId,
                            'name' => $vehicleData['name'] ?? 'Unknown Vehicle',
                            'capacity' => intval($vehicleData['capacity'] ?? 4),
                            'luggageCapacity' => intval($vehicleData['luggage_capacity'] ?? 2),
                            'basePrice' => $basePrice,
                            'price' => $basePrice,
                            'pricePerKm' => $pricePerKm,
                            'nightHaltCharge' => $nightHaltCharge,
                            'driverAllowance' => $driverAllowance,
                            'image' => $vehicleData['image'] ?? '/cars/sedan.png',
                            'amenities' => $amenities,
                            'description' => $vehicleData['description'] ?? '',
                            'ac' => (bool)($vehicleData['ac'] ?? 1),
                            'isActive' => (bool)($vehicleData['is_active'] ?? 1)
                        ];
                        
                        $vehicles[] = $newVehicle;
                        $updates[] = "JSON file (new vehicle)";
                    }
                }
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
        // Vehicle doesn't exist, create it in vehicle_types table
        $name = ucfirst(str_replace('_', ' ', $vehicleId));
        
        // Check if vehicle_types table exists
        $tableExists = false;
        $result = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($result && $result->num_rows > 0) {
            $tableExists = true;
        } else {
            // Create vehicle_types table if it doesn't exist
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
            $tableExists = true;
            error_log("DIRECT VEHICLE PRICING: Created vehicle_types table");
        }
        
        if ($tableExists) {
            // Insert new vehicle
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, is_active) 
                VALUES (?, ?, 4, 2, 1, 1)
            ");
            
            if (!$insertStmt) {
                error_log("DIRECT VEHICLE PRICING: Insert prepare failed for vehicle_types: " . $conn->error);
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $conn->error
                ]);
                exit;
            }
            
            $insertStmt->bind_param("ss", $vehicleId, $name);
            $success = $insertStmt->execute();
            
            if (!$success) {
                error_log("DIRECT VEHICLE PRICING: Insert execute failed for vehicle_types: " . $insertStmt->error);
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $insertStmt->error
                ]);
                exit;
            }
            
            // Also insert pricing
            if ($pricingTableExists) {
                $insertPricingStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, trip_type) 
                    VALUES (?, ?, ?, ?, ?, 'all')
                ");
                
                if ($insertPricingStmt) {
                    $insertPricingStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    $insertPricingStmt->execute();
                }
            }
            
            // If outstation_fares exists, add there too
            if ($outstationTableExists) {
                $insertOutstationStmt = $conn->prepare("
                    INSERT INTO outstation_fares 
                    (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                
                if ($insertOutstationStmt) {
                    $insertOutstationStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    $insertOutstationStmt->execute();
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
                
            } catch (Exception $e) {
                error_log("DIRECT VEHICLE PRICING: Error updating JSON file with new vehicle: " . $e->getMessage());
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'New vehicle added successfully',
                'vehicleId' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ]);
        }
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
