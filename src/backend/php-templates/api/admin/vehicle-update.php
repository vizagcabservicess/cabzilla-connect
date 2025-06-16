<?php
// Main vehicle update script

// CORS headers are already set in the calling script

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log debug info
function logUpdateDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

logUpdateDebug("Starting vehicle update");

// Get the vehicle data from the calling script or from the request
$vehicleData = $_SERVER['VEHICLE_DATA'] ?? null;

if (!$vehicleData) {
    // Try to get from raw input
    $rawInput = file_get_contents('php://input');
    logUpdateDebug("Raw input data", $rawInput);
    
    $vehicleData = json_decode($rawInput, true);
    
    if (!$vehicleData && !empty($_POST)) {
        $vehicleData = $_POST;
        logUpdateDebug("Using POST data instead of JSON", $_POST);
    }
}

// Check if vehicle data is valid
if (!$vehicleData) {
    logUpdateDebug("Invalid or missing vehicle data");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid or missing vehicle data'
    ]);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
    logUpdateDebug("Vehicle ID is required");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Get the vehicle ID from various possible fields
$vehicleId = isset($vehicleData['id']) ? $vehicleData['id'] : 
            (isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['vehicle_id']);

logUpdateDebug("Processing update for vehicle ID: $vehicleId");

// Load existing persistent data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                $persistentData = [];
            } else {
                logUpdateDebug("Loaded " . count($persistentData) . " vehicles from persistent cache");
            }
        } catch (Exception $e) {
            logUpdateDebug("Failed to parse persistent JSON: " . $e->getMessage());
            // Start with empty array
            $persistentData = [];
        }
    }
}

// Try to update the database if possible
$databaseUpdated = false;
if (file_exists(__DIR__ . '/../../config.php')) {
    try {
        require_once __DIR__ . '/../../config.php';
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn) {
                logUpdateDebug("Connected to database successfully");
                
                // Create amenities string
                $amenitiesValue = '';
                if (isset($vehicleData['amenities'])) {
                    if (is_array($vehicleData['amenities'])) {
                        $amenitiesValue = json_encode($vehicleData['amenities']);
                    } else if (is_string($vehicleData['amenities'])) {
                        $amenitiesValue = $vehicleData['amenities'];
                    }
                }
                
                // Prepare new fields
                $inclusions = isset($vehicleData['inclusions']) ? (is_array($vehicleData['inclusions']) ? json_encode($vehicleData['inclusions']) : $vehicleData['inclusions']) : null;
                $exclusions = isset($vehicleData['exclusions']) ? (is_array($vehicleData['exclusions']) ? json_encode($vehicleData['exclusions']) : $vehicleData['exclusions']) : null;
                $cancellationPolicy = $vehicleData['cancellationPolicy'] ?? null;
                $fuelType = $vehicleData['fuelType'] ?? null;
                
                // Check if vehicle exists
                $checkSql = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
                $stmt = $conn->prepare($checkSql);
                $stmt->bind_param("ss", $vehicleId, $vehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    // Update existing vehicle
                    logUpdateDebug("Updating existing vehicle in database");
                    
                    $sql = "UPDATE vehicles SET 
                        name = ?, 
                        capacity = ?, 
                        luggage_capacity = ?, 
                        base_price = ?, 
                        price_per_km = ?, 
                        image = ?, 
                        amenities = ?, 
                        description = ?, 
                        ac = ?, 
                        night_halt_charge = ?, 
                        driver_allowance = ?, 
                        is_active = ?,
                        inclusions = ?, 
                        exclusions = ?, 
                        cancellation_policy = ?, 
                        fuel_type = ?
                    WHERE vehicle_id = ? OR id = ?";
                    
                    $stmt = $conn->prepare($sql);
                    
                    $name = $vehicleData['name'] ?? '';
                    $capacity = isset($vehicleData['capacity']) ? (int)$vehicleData['capacity'] : 4;
                    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? (int)$vehicleData['luggageCapacity'] : 
                                      (isset($vehicleData['luggage_capacity']) ? (int)$vehicleData['luggage_capacity'] : 2);
                    $basePrice = isset($vehicleData['basePrice']) ? (float)$vehicleData['basePrice'] : 
                                (isset($vehicleData['base_price']) ? (float)$vehicleData['base_price'] : 
                                (isset($vehicleData['price']) ? (float)$vehicleData['price'] : 0));
                    $pricePerKm = isset($vehicleData['pricePerKm']) ? (float)$vehicleData['pricePerKm'] : 
                                 (isset($vehicleData['price_per_km']) ? (float)$vehicleData['price_per_km'] : 0);
                    $image = $vehicleData['image'] ?? '';
                    $description = $vehicleData['description'] ?? '';
                    $ac = isset($vehicleData['ac']) ? (int)(bool)$vehicleData['ac'] : 1;
                    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? (float)$vehicleData['nightHaltCharge'] : 
                                      (isset($vehicleData['night_halt_charge']) ? (float)$vehicleData['night_halt_charge'] : 700);
                    $driverAllowance = isset($vehicleData['driverAllowance']) ? (float)$vehicleData['driverAllowance'] : 
                                      (isset($vehicleData['driver_allowance']) ? (float)$vehicleData['driver_allowance'] : 250);
                    $isActive = isset($vehicleData['isActive']) ? (int)(bool)$vehicleData['isActive'] : 
                               (isset($vehicleData['is_active']) ? (int)(bool)$vehicleData['is_active'] : 1);
                    
                    $stmt->bind_param("siiddsssiddisssss", 
                        $name, 
                        $capacity, 
                        $luggageCapacity, 
                        $basePrice, 
                        $pricePerKm, 
                        $image, 
                        $amenitiesValue, 
                        $description, 
                        $ac, 
                        $nightHaltCharge, 
                        $driverAllowance, 
                        $isActive,
                        $inclusions, $exclusions, $cancellationPolicy, $fuelType,
                        $vehicleId, $vehicleId
                    );
                    
                    if ($stmt->execute()) {
                        logUpdateDebug("Vehicle updated in database successfully");
                        $databaseUpdated = true;
                    } else {
                        logUpdateDebug("Failed to update vehicle in database: " . $stmt->error);
                    }
                } else {
                    // Insert new vehicle
                    logUpdateDebug("Inserting new vehicle into database");
                    
                    $sql = "INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, image, amenities, description, ac, night_halt_charge, driver_allowance, is_active, inclusions, exclusions, cancellation_policy, fuel_type) 
                    VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    
                    $stmt = $conn->prepare($sql);
                    
                    $name = $vehicleData['name'] ?? '';
                    $capacity = isset($vehicleData['capacity']) ? (int)$vehicleData['capacity'] : 4;
                    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? (int)$vehicleData['luggageCapacity'] : 
                                      (isset($vehicleData['luggage_capacity']) ? (int)$vehicleData['luggage_capacity'] : 2);
                    $basePrice = isset($vehicleData['basePrice']) ? (float)$vehicleData['basePrice'] : 
                                (isset($vehicleData['base_price']) ? (float)$vehicleData['base_price'] : 
                                (isset($vehicleData['price']) ? (float)$vehicleData['price'] : 0));
                    $pricePerKm = isset($vehicleData['pricePerKm']) ? (float)$vehicleData['pricePerKm'] : 
                                 (isset($vehicleData['price_per_km']) ? (float)$vehicleData['price_per_km'] : 0);
                    $image = $vehicleData['image'] ?? '';
                    $description = $vehicleData['description'] ?? '';
                    $ac = isset($vehicleData['ac']) ? (int)(bool)$vehicleData['ac'] : 1;
                    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? (float)$vehicleData['nightHaltCharge'] : 
                                      (isset($vehicleData['night_halt_charge']) ? (float)$vehicleData['night_halt_charge'] : 700);
                    $driverAllowance = isset($vehicleData['driverAllowance']) ? (float)$vehicleData['driverAllowance'] : 
                                      (isset($vehicleData['driver_allowance']) ? (float)$vehicleData['driver_allowance'] : 250);
                    $isActive = isset($vehicleData['isActive']) ? (int)(bool)$vehicleData['isActive'] : 
                               (isset($vehicleData['is_active']) ? (int)(bool)$vehicleData['is_active'] : 1);
                    
                    $stmt->bind_param("ssiiddsssiddiisss", 
                        $vehicleId, 
                        $name, 
                        $capacity, 
                        $luggageCapacity, 
                        $basePrice, 
                        $pricePerKm, 
                        $image, 
                        $amenitiesValue, 
                        $description, 
                        $ac, 
                        $nightHaltCharge, 
                        $driverAllowance, 
                        $isActive,
                        $inclusions, $exclusions, $cancellationPolicy, $fuelType
                    );
                    
                    if ($stmt->execute()) {
                        logUpdateDebug("Vehicle inserted into database successfully");
                        $databaseUpdated = true;
                    } else {
                        logUpdateDebug("Failed to insert vehicle into database: " . $stmt->error);
                    }
                }
                
                $conn->close();
            }
        }
    } catch (Exception $e) {
        logUpdateDebug("Database error: " . $e->getMessage());
    }
}

// Find the vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $vehicle) {
    if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
        (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
        $vehicleIndex = $index;
        logUpdateDebug("Found vehicle at index $index in persistent data");
        break;
    }
}

// If vehicle not found, create a new one
if ($vehicleIndex < 0) {
    logUpdateDebug("Vehicle not found in persistent data, creating new entry");
    $newVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $vehicleData['name'] ?? 'New Vehicle',
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 0,
        'basePrice' => 0,
        'pricePerKm' => 0,
        'image' => '',
        'amenities' => ['AC', 'Music System'],
        'description' => '',
        'ac' => true,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'isActive' => true,
        'inclusions' => [],
        'exclusions' => [],
        'cancellationPolicy' => '',
        'fuelType' => ''
    ];
    $persistentData[] = $newVehicle;
    $vehicleIndex = count($persistentData) - 1;
}

// Update with new values
$normalizedVehicle = $persistentData[$vehicleIndex];

// Only update these fields if they are provided
if (isset($vehicleData['name'])) {
    $normalizedVehicle['name'] = $vehicleData['name'];
}

if (isset($vehicleData['capacity'])) {
    $normalizedVehicle['capacity'] = (int)$vehicleData['capacity'];
}

if (isset($vehicleData['luggageCapacity'])) {
    $normalizedVehicle['luggageCapacity'] = (int)$vehicleData['luggageCapacity'];
} else if (isset($vehicleData['luggage_capacity'])) {
    $normalizedVehicle['luggageCapacity'] = (int)$vehicleData['luggage_capacity'];
}

if (isset($vehicleData['ac'])) {
    $normalizedVehicle['ac'] = (bool)$vehicleData['ac'];
}

if (isset($vehicleData['image'])) {
    $normalizedVehicle['image'] = $vehicleData['image'];
}

if (isset($vehicleData['amenities'])) {
    if (is_string($vehicleData['amenities'])) {
        try {
            // Try to parse as JSON first
            $amenities = json_decode($vehicleData['amenities'], true);
            if (is_array($amenities)) {
                $normalizedVehicle['amenities'] = $amenities;
            } else {
                // If not valid JSON, try as comma-separated string
                $normalizedVehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } catch (Exception $e) {
            // Fallback to comma-separated
            $normalizedVehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
        }
    } else {
        $normalizedVehicle['amenities'] = $vehicleData['amenities'];
    }
}

if (isset($vehicleData['description'])) {
    $normalizedVehicle['description'] = $vehicleData['description'];
}

if (isset($vehicleData['isActive'])) {
    $normalizedVehicle['isActive'] = (bool)$vehicleData['isActive'];
} else if (isset($vehicleData['is_active'])) {
    $normalizedVehicle['isActive'] = (bool)$vehicleData['is_active'];
}

if (isset($vehicleData['price'])) {
    $normalizedVehicle['price'] = (float)$vehicleData['price'];
}

if (isset($vehicleData['basePrice'])) {
    $normalizedVehicle['basePrice'] = (float)$vehicleData['basePrice'];
} else if (isset($vehicleData['base_price'])) {
    $normalizedVehicle['basePrice'] = (float)$vehicleData['base_price'];
}

// Ensure price and basePrice are consistent
if (isset($vehicleData['price']) && !isset($vehicleData['basePrice'])) {
    $normalizedVehicle['basePrice'] = $normalizedVehicle['price'];
} else if (!isset($vehicleData['price']) && isset($vehicleData['basePrice'])) {
    $normalizedVehicle['price'] = $normalizedVehicle['basePrice'];
}

if (isset($vehicleData['pricePerKm'])) {
    $normalizedVehicle['pricePerKm'] = (float)$vehicleData['pricePerKm'];
} else if (isset($vehicleData['price_per_km'])) {
    $normalizedVehicle['pricePerKm'] = (float)$vehicleData['price_per_km'];
}

if (isset($vehicleData['nightHaltCharge'])) {
    $normalizedVehicle['nightHaltCharge'] = (float)$vehicleData['nightHaltCharge'];
} else if (isset($vehicleData['night_halt_charge'])) {
    $normalizedVehicle['nightHaltCharge'] = (float)$vehicleData['night_halt_charge'];
}

if (isset($vehicleData['driverAllowance'])) {
    $normalizedVehicle['driverAllowance'] = (float)$vehicleData['driverAllowance'];
} else if (isset($vehicleData['driver_allowance'])) {
    $normalizedVehicle['driverAllowance'] = (float)$vehicleData['driver_allowance'];
}

if (isset($vehicleData['inclusions'])) {
    $normalizedVehicle['inclusions'] = is_string($vehicleData['inclusions'])
        ? array_map('trim', explode(',', $vehicleData['inclusions']))
        : $vehicleData['inclusions'];
}

if (isset($vehicleData['exclusions'])) {
    $normalizedVehicle['exclusions'] = is_string($vehicleData['exclusions'])
        ? array_map('trim', explode(',', $vehicleData['exclusions']))
        : $vehicleData['exclusions'];
}

if (isset($vehicleData['cancellationPolicy'])) {
    $normalizedVehicle['cancellationPolicy'] = $vehicleData['cancellationPolicy'];
}

if (isset($vehicleData['fuelType'])) {
    $normalizedVehicle['fuelType'] = $vehicleData['fuelType'];
}

logUpdateDebug("Normalized vehicle data", $normalizedVehicle);

// Update the vehicle in persistent data
$persistentData[$vehicleIndex] = $normalizedVehicle;

// Save the updated data back to the persistent cache file
if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
    logUpdateDebug("Updated persistent cache file");
} else {
    logUpdateDebug("Failed to update persistent cache file");
}

// Clear any regular cache files to ensure fresh data is loaded
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logUpdateDebug("Cleared cache file: " . basename($file));
    }
}

// Attempt to reload vehicles from persistent storage
$reloadUrl = str_replace('update-vehicle.php', 'reload-vehicles.php', $_SERVER['PHP_SELF']) . '?_t=' . time();
$reloadUrl = preg_replace('/\/vehicle-update\.php/', '/reload-vehicles.php', $reloadUrl);

logUpdateDebug("Triggering reload from: $reloadUrl");

// Tell the client to reload vehicles after update
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully' . ($databaseUpdated ? ' and saved to database' : ''),
    'vehicle' => $normalizedVehicle,
    'reload' => true,
    'reloadUrl' => $reloadUrl
]);
