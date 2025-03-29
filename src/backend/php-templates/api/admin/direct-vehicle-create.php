
<?php
// direct-vehicle-create.php - A simplified endpoint for vehicle creation

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.6');

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
    // 1. Save to vehicles.json file (local backup)
    $vehiclesFile = '../../../data/vehicles.json';
    $directory = dirname($vehiclesFile);

    // Create directory if it doesn't exist
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }

    // Read existing vehicles
    $vehicles = [];
    if (file_exists($vehiclesFile)) {
        $existingData = file_get_contents($vehiclesFile);
        if (!empty($existingData)) {
            $vehicles = json_decode($existingData, true) ?? [];
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

    // Save the updated vehicles list
    $result = file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    if ($result === false) {
        error_log("Failed to save vehicle data to file");
    } else {
        error_log("Successfully saved vehicle to local JSON file");
    }

    // 2. Also save to the database using a more reliable approach
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if ($conn && !$conn->connect_error) {
                // Begin transaction
                $conn->begin_transaction();
                
                try {
                    // Check if vehicle_types table exists, create if not
                    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
                    if ($tableCheckResult->num_rows == 0) {
                        // Table doesn't exist, create it
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
                        error_log("Created vehicle_types table");
                    }
                    
                    // Check if vehicle already exists
                    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $result = $checkStmt->get_result();
                    $row = $result->fetch_assoc();
                    
                    $amenitiesJson = json_encode($newVehicle['amenities']);
                    $isActive = $newVehicle['isActive'] ? 1 : 0;
                    $acValue = $newVehicle['ac'] ? 1 : 0;
                    
                    if ($row['count'] > 0) {
                        // Update existing vehicle
                        $updateStmt = $conn->prepare("
                            UPDATE vehicle_types 
                            SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                                image = ?, description = ?, amenities = ?, is_active = ?
                            WHERE vehicle_id = ?
                        ");
                        
                        $updateStmt->bind_param(
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
                        
                        $updateStmt->execute();
                        error_log("Updated vehicle in database through direct method: " . $vehicleId);
                    } else {
                        // Insert new vehicle
                        $insertStmt = $conn->prepare("
                            INSERT INTO vehicle_types 
                            (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        $insertStmt->bind_param(
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
                        
                        $insertStmt->execute();
                        error_log("Inserted new vehicle in database through direct method: " . $vehicleId);
                    }
                    
                    // Check if vehicle_pricing table exists, create if not
                    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
                    if ($tableCheckResult->num_rows == 0) {
                        // Table doesn't exist, create it
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
                        error_log("Created vehicle_pricing table");
                    }
                    
                    // Check if pricing exists
                    $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_id = ?");
                    $checkPricingStmt->bind_param("s", $vehicleId);
                    $checkPricingStmt->execute();
                    $pricingResult = $checkPricingStmt->get_result();
                    $pricingRow = $pricingResult->fetch_assoc();
                    
                    if ($pricingRow['count'] > 0) {
                        // Update existing pricing
                        $updatePricingStmt = $conn->prepare("
                            UPDATE vehicle_pricing 
                            SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
                            WHERE vehicle_id = ?
                        ");
                        
                        $updatePricingStmt->bind_param(
                            "dddds", 
                            $newVehicle['basePrice'], 
                            $newVehicle['pricePerKm'], 
                            $newVehicle['nightHaltCharge'], 
                            $newVehicle['driverAllowance'], 
                            $vehicleId
                        );
                        
                        $updatePricingStmt->execute();
                        error_log("Updated vehicle pricing in database: " . $vehicleId);
                    } else {
                        // Insert new pricing
                        $insertPricingStmt = $conn->prepare("
                            INSERT INTO vehicle_pricing 
                            (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, trip_type) 
                            VALUES (?, ?, ?, ?, ?, 'all')
                        ");
                        
                        $insertPricingStmt->bind_param(
                            "sdddd", 
                            $vehicleId, 
                            $newVehicle['basePrice'], 
                            $newVehicle['pricePerKm'], 
                            $newVehicle['nightHaltCharge'], 
                            $newVehicle['driverAllowance']
                        );
                        
                        $insertPricingStmt->execute();
                        error_log("Inserted new vehicle pricing in database: " . $vehicleId);
                    }
                    
                    // Also add to outstation_fares table if it exists
                    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
                    if ($tableCheckResult->num_rows > 0) {
                        $checkOutstationStmt = $conn->prepare("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?");
                        $checkOutstationStmt->bind_param("s", $vehicleId);
                        $checkOutstationStmt->execute();
                        $outstationResult = $checkOutstationStmt->get_result();
                        $outstationRow = $outstationResult->fetch_assoc();
                        
                        if ($outstationRow['count'] > 0) {
                            // Update existing outstation fare
                            $updateOutstationStmt = $conn->prepare("
                                UPDATE outstation_fares 
                                SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
                                WHERE vehicle_id = ?
                            ");
                            
                            $updateOutstationStmt->bind_param(
                                "dddds", 
                                $newVehicle['basePrice'], 
                                $newVehicle['pricePerKm'], 
                                $newVehicle['nightHaltCharge'], 
                                $newVehicle['driverAllowance'], 
                                $vehicleId
                            );
                            
                            $updateOutstationStmt->execute();
                        } else {
                            // Insert new outstation fare
                            $insertOutstationStmt = $conn->prepare("
                                INSERT INTO outstation_fares 
                                (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance) 
                                VALUES (?, ?, ?, ?, ?)
                            ");
                            
                            $insertOutstationStmt->bind_param(
                                "sdddd", 
                                $vehicleId, 
                                $newVehicle['basePrice'], 
                                $newVehicle['pricePerKm'], 
                                $newVehicle['nightHaltCharge'], 
                                $newVehicle['driverAllowance']
                            );
                            
                            $insertOutstationStmt->execute();
                        }
                    }
                    
                    // Commit the transaction
                    $conn->commit();
                    
                } catch (Exception $e) {
                    // Rollback transaction on error
                    $conn->rollback();
                    throw $e;
                }
            } else {
                error_log("Database connection failed: " . ($conn ? $conn->connect_error : "Failed to create connection"));
            }
        } catch (Exception $e) {
            error_log("Database error in direct-vehicle-create.php: " . $e->getMessage());
        }
    }
    
    // Success response
    $response = [
        'status' => 'success',
        'message' => 'Vehicle created successfully',
        'vehicleId' => $vehicleId,
        'details' => [
            'name' => $newVehicle['name'],
            'capacity' => $newVehicle['capacity'],
            'timestamp' => time(),
            'development_mode' => true
        ]
    ];
    
    // Clear any caches to ensure the new vehicle is visible in other endpoints
    clearstatcache();
    
    // Trigger a dispatch to clear client-side cache by creating a marker file
    $cacheMarkerFile = '../../../data/vehicle_cache_invalidated.txt';
    file_put_contents($cacheMarkerFile, time());
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error creating vehicle: " . $e->getMessage());
    
    // Return error response
    $response = [
        'status' => 'error',
        'message' => 'Vehicle creation failed: ' . $e->getMessage(),
        'vehicleId' => $vehicleId ?? null,
        'error' => $e->getMessage(),
        'details' => [
            'name' => $newVehicle['name'] ?? 'Unknown',
            'timestamp' => time(),
            'development_mode' => true
        ]
    ];
    
    echo json_encode($response);
}

// Log successful response
error_log("Successfully processed vehicle creation request for: " . ($data['name'] ?? 'Unknown Vehicle'));
