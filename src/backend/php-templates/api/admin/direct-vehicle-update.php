
<?php
// direct-vehicle-update.php - A specialized endpoint for vehicle updates with enhanced CORS support

// CORS CRITICAL: Set ALL necessary headers with HIGHEST PRIORITY
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// CORS headers with wildcard - CRITICAL for preflight
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Origin, X-Admin-Mode');
header('Access-Control-Max-Age: 3600');
header('Access-Control-Expose-Headers: Content-Length, X-JSON');
header('Vary: Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
header('X-API-Version: 1.2.0');
header('X-CORS-Enabled: true');

// CRITICAL: Always return 200 OK for OPTIONS requests for preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle update request: Method=$requestMethod, URI=$requestUri");

// Get the raw POST data
$rawData = file_get_contents('php://input');
error_log("Raw received data: " . $rawData);

// Try to parse the data in multiple formats
$data = [];

// Method 1: JSON decode
$jsonData = json_decode($rawData, true);
if (json_last_error() === JSON_ERROR_NONE && $jsonData) {
    $data = $jsonData;
    error_log("Successfully parsed JSON data");
}
// Method 2: Form data
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST form data");
}
// Method 3: URL-encoded
else {
    parse_str($rawData, $parsedData);
    if (!empty($parsedData)) {
        $data = $parsedData;
        error_log("Parsed URL-encoded data");
    }
}

// If we still don't have data, check for any $_REQUEST data
if (empty($data)) {
    if (!empty($_REQUEST)) {
        $data = $_REQUEST;
        error_log("Using REQUEST data as fallback");
    } else {
        error_log("WARNING: Couldn't extract any data from the request");
    }
}

// Critical validation - ensure we have required fields
if (empty($data) || (!isset($data['id']) && !isset($data['vehicleId']))) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID or data',
        'received' => [
            'raw' => substr($rawData, 0, 500),
            'parsed' => $data,
            'method' => $_SERVER['REQUEST_METHOD'],
            'contentType' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
        ]
    ]);
    exit;
}

// Normalize vehicle data
$vehicleId = $data['id'] ?? $data['vehicleId'] ?? '';
$name = $data['name'] ?? '';
$capacity = intval($data['capacity'] ?? 4);
$luggageCapacity = intval($data['luggageCapacity'] ?? 2);
$basePrice = floatval($data['basePrice'] ?? $data['price'] ?? 0);
$pricePerKm = floatval($data['pricePerKm'] ?? 0);
$nightHaltCharge = floatval($data['nightHaltCharge'] ?? 700);
$driverAllowance = floatval($data['driverAllowance'] ?? 250);
$isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1;
$image = $data['image'] ?? '/cars/sedan.png';
$description = $data['description'] ?? '';

// Handle amenities
$amenities = $data['amenities'] ?? [];
if (is_string($amenities)) {
    // Try to parse JSON string
    $parsedAmenities = json_decode($amenities, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $amenities = $parsedAmenities;
    } else {
        // Fallback to comma-separated string
        $amenities = explode(',', $amenities);
    }
}
$amenitiesJson = json_encode($amenities);

try {
    // Log what we're trying to update
    error_log("Attempting to update vehicle {$vehicleId} with name {$name}");
    
    // STEP 1: First update vehicles.json file
    $jsonUpdated = false;
    $vehiclesFile = '../../../data/vehicles.json';
    
    if (file_exists($vehiclesFile)) {
        $jsonContent = file_get_contents($vehiclesFile);
        $vehicles = json_decode($jsonContent, true) ?? [];
        
        $found = false;
        foreach ($vehicles as &$vehicle) {
            if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                // Update properties
                $vehicle['name'] = $name;
                $vehicle['capacity'] = $capacity;
                $vehicle['luggageCapacity'] = $luggageCapacity;
                $vehicle['price'] = $basePrice;
                $vehicle['basePrice'] = $basePrice;
                $vehicle['pricePerKm'] = $pricePerKm;
                $vehicle['nightHaltCharge'] = $nightHaltCharge;
                $vehicle['driverAllowance'] = $driverAllowance;
                $vehicle['isActive'] = $isActive == 1;
                $vehicle['image'] = $image;
                $vehicle['description'] = $description;
                $vehicle['amenities'] = $amenities;
                $found = true;
                break;
            }
        }
        
        // If vehicle wasn't found, add it
        if (!$found) {
            $newVehicle = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'capacity' => $capacity,
                'luggageCapacity' => $luggageCapacity,
                'price' => $basePrice,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance,
                'isActive' => $isActive == 1,
                'image' => $image,
                'description' => $description,
                'amenities' => $amenities
            ];
            $vehicles[] = $newVehicle;
        }
        
        // Save back to file
        file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
        $jsonUpdated = true;
    }
    
    // STEP 2: Now update the database if configuration exists
    $dbUpdated = false;
    $affectedTables = [];
    
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
        
        // Get database connection
        $conn = getDbConnection();
        
        if ($conn) {
            // Start transaction for database operations
            $conn->begin_transaction();
            
            try {
                // Check if vehicle_types table exists
                $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
                if ($tableCheckResult && $tableCheckResult->num_rows > 0) {
                    // First check if vehicle exists
                    $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                    
                    if ($checkResult->num_rows > 0) {
                        // Update existing vehicle
                        $updateStmt = $conn->prepare("
                            UPDATE vehicle_types SET 
                            name = ?,
                            capacity = ?,
                            luggage_capacity = ?,
                            ac = 1,
                            image = ?,
                            amenities = ?,
                            description = ?,
                            is_active = ?,
                            updated_at = NOW()
                            WHERE vehicle_id = ?
                        ");
                        
                        $updateStmt->bind_param("siisssss", 
                            $name,
                            $capacity,
                            $luggageCapacity,
                            $image,
                            $amenitiesJson,
                            $description,
                            $isActive,
                            $vehicleId
                        );
                        
                        $updateStmt->execute();
                        $affectedTables[] = 'vehicle_types';
                    } else {
                        // Insert new vehicle
                        $insertStmt = $conn->prepare("
                            INSERT INTO vehicle_types 
                            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, created_at, updated_at)
                            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
                        ");
                        
                        $insertStmt->bind_param("ssiisssi", 
                            $vehicleId,
                            $name,
                            $capacity,
                            $luggageCapacity,
                            $image,
                            $amenitiesJson,
                            $description,
                            $isActive
                        );
                        
                        $insertStmt->execute();
                        $affectedTables[] = 'vehicle_types (new)';
                    }
                } else {
                    error_log("vehicle_types table doesn't exist; creating it");
                    
                    // Create the table if it doesn't exist
                    $conn->query("
                        CREATE TABLE IF NOT EXISTS vehicle_types (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                            name VARCHAR(100) NOT NULL,
                            capacity INT NOT NULL DEFAULT 4,
                            luggage_capacity INT NOT NULL DEFAULT 2,
                            base_price DECIMAL(10,2) DEFAULT 0,
                            price_per_km DECIMAL(10,2) DEFAULT 0,
                            night_halt_charge DECIMAL(10,2) DEFAULT 700,
                            driver_allowance DECIMAL(10,2) DEFAULT 250,
                            ac TINYINT(1) NOT NULL DEFAULT 1,
                            image VARCHAR(255),
                            amenities TEXT,
                            description TEXT,
                            is_active TINYINT(1) NOT NULL DEFAULT 1,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB
                    ");
                    
                    // Insert the vehicle
                    $insertStmt = $conn->prepare("
                        INSERT INTO vehicle_types 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, ac, image, amenities, description, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
                    ");
                    
                    $insertStmt->bind_param("ssiiddsssi", 
                        $vehicleId,
                        $name,
                        $capacity,
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $image,
                        $amenitiesJson,
                        $description,
                        $isActive
                    );
                    
                    $insertStmt->execute();
                    $affectedTables[] = 'vehicle_types (created)';
                }
                
                // Check if vehicles table exists and update it too
                $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
                if ($tableCheckResult && $tableCheckResult->num_rows > 0) {
                    // Update vehicles table with same info
                    $upsertStmt = $conn->prepare("
                        INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, night_halt_charge, driver_allowance, ac, image, amenities, description, is_active, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        capacity = VALUES(capacity),
                        luggage_capacity = VALUES(luggage_capacity),
                        base_price = VALUES(base_price),
                        price_per_km = VALUES(price_per_km),
                        night_halt_charge = VALUES(night_halt_charge),
                        driver_allowance = VALUES(driver_allowance),
                        image = VALUES(image),
                        amenities = VALUES(amenities),
                        description = VALUES(description),
                        is_active = VALUES(is_active),
                        updated_at = NOW()
                    ");
                    
                    $upsertStmt->bind_param("ssiiddddsssi", 
                        $vehicleId,
                        $name,
                        $capacity,
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance,
                        $image,
                        $amenitiesJson,
                        $description,
                        $isActive
                    );
                    
                    $upsertStmt->execute();
                    $affectedTables[] = 'vehicles';
                }
                
                // Also update pricing tables
                $tableCheckResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
                if ($tableCheckResult && $tableCheckResult->num_rows > 0) {
                    // Update generic pricing entry
                    $upsertPricingStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing 
                        (vehicle_id, trip_type, base_fare, price_per_km, updated_at)
                        VALUES (?, 'all', ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        base_fare = VALUES(base_fare),
                        price_per_km = VALUES(price_per_km),
                        updated_at = NOW()
                    ");
                    
                    $upsertPricingStmt->bind_param("sdd", 
                        $vehicleId,
                        $basePrice,
                        $pricePerKm
                    );
                    
                    $upsertPricingStmt->execute();
                    $affectedTables[] = 'vehicle_pricing';
                }
                
                // Commit transaction
                $conn->commit();
                $dbUpdated = true;
            } catch (Exception $e) {
                // Rollback on error
                $conn->rollback();
                error_log("Database error: " . $e->getMessage());
                throw $e;
            }
        } else {
            error_log("Failed to connect to database");
        }
    } else {
        error_log("Config file not found, skipping database update");
    }
    
    // Create cache invalidation file to force refresh
    $cacheMarker = "../../../data/vehicle_cache_invalidated.txt";
    file_put_contents($cacheMarker, time());
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle updated successfully',
        'vehicle' => [
            'id' => $vehicleId,
            'name' => $name,
            'capacity' => $capacity,
            'luggageCapacity' => $luggageCapacity,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance,
            'isActive' => $isActive == 1,
            'image' => $image,
            'description' => $description,
            'amenities' => $amenities
        ],
        'jsonUpdated' => $jsonUpdated,
        'dbUpdated' => $dbUpdated,
        'affectedTables' => $affectedTables,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error updating vehicle: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred while updating the vehicle: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
