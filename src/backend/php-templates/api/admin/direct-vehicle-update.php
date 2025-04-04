
<?php
/**
 * direct-vehicle-update.php - Update an existing vehicle and sync across all vehicle tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/direct_vehicle_update_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get input data from various sources
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
}

if (!$vehicleData && !empty($_GET)) {
    $vehicleData = $_GET;
}

logDebug("Received update request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => $vehicleData,
    'raw' => $inputData
]);

// Check if we have valid data
if (empty($vehicleData)) {
    logDebug("No vehicle data provided");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No vehicle data provided'
    ]);
    exit;
}

// Get vehicle ID
$vehicleId = null;
if (isset($vehicleData['id'])) {
    $vehicleId = $vehicleData['id'];
} elseif (isset($vehicleData['vehicleId'])) {
    $vehicleId = $vehicleData['vehicleId'];
} elseif (isset($vehicleData['vehicle_id'])) {
    $vehicleId = $vehicleData['vehicle_id'];
} elseif (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

if (!$vehicleId) {
    logDebug("Vehicle ID is required");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

logDebug("Processing vehicle ID: $vehicleId");

// Load persistent data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    try {
        $persistentJson = file_get_contents($persistentCacheFile);
        $persistentData = json_decode($persistentJson, true);
        if (!is_array($persistentData)) {
            $persistentData = [];
        }
    } catch (Exception $e) {
        logDebug("Error reading persistent cache: " . $e->getMessage());
        $persistentData = [];
    }
}

// Find vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $vehicle) {
    $curId = isset($vehicle['id']) ? $vehicle['id'] : (isset($vehicle['vehicleId']) ? $vehicle['vehicleId'] : '');
    if ($curId === $vehicleId) {
        $vehicleIndex = $index;
        break;
    }
}

// If vehicle not found, create new one
if ($vehicleIndex < 0) {
    $newVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => isset($vehicleData['name']) ? $vehicleData['name'] : ucwords(str_replace('_', ' ', $vehicleId)),
        'capacity' => isset($vehicleData['capacity']) ? (int)$vehicleData['capacity'] : 4,
        'luggageCapacity' => isset($vehicleData['luggageCapacity']) ? (int)$vehicleData['luggageCapacity'] : 2,
        'price' => isset($vehicleData['price']) ? (float)$vehicleData['price'] : 0,
        'basePrice' => isset($vehicleData['basePrice']) ? (float)$vehicleData['basePrice'] : 0,
        'pricePerKm' => isset($vehicleData['pricePerKm']) ? (float)$vehicleData['pricePerKm'] : 0,
        'image' => isset($vehicleData['image']) ? $vehicleData['image'] : "/cars/{$vehicleId}.png",
        'amenities' => isset($vehicleData['amenities']) ? $vehicleData['amenities'] : ['AC'],
        'description' => isset($vehicleData['description']) ? $vehicleData['description'] : '',
        'ac' => isset($vehicleData['ac']) ? (bool)$vehicleData['ac'] : true,
        'nightHaltCharge' => isset($vehicleData['nightHaltCharge']) ? (float)$vehicleData['nightHaltCharge'] : 700,
        'driverAllowance' => isset($vehicleData['driverAllowance']) ? (float)$vehicleData['driverAllowance'] : 250,
        'isActive' => isset($vehicleData['isActive']) ? (bool)$vehicleData['isActive'] : true
    ];
    
    $persistentData[] = $newVehicle;
    $vehicle = $newVehicle;
    logDebug("Created new vehicle", $newVehicle);
} else {
    // Update existing vehicle
    $vehicle = $persistentData[$vehicleIndex];
    
    // Update fields if provided
    if (isset($vehicleData['name'])) {
        $vehicle['name'] = $vehicleData['name'];
    }
    
    if (isset($vehicleData['capacity'])) {
        $vehicle['capacity'] = (int)$vehicleData['capacity'];
    }
    
    if (isset($vehicleData['luggageCapacity'])) {
        $vehicle['luggageCapacity'] = (int)$vehicleData['luggageCapacity'];
    }
    
    if (isset($vehicleData['price'])) {
        $vehicle['price'] = (float)$vehicleData['price'];
        $vehicle['basePrice'] = (float)$vehicleData['price']; // Keep consistent
    }
    
    if (isset($vehicleData['basePrice'])) {
        $vehicle['basePrice'] = (float)$vehicleData['basePrice'];
        $vehicle['price'] = (float)$vehicleData['basePrice']; // Keep consistent
    }
    
    if (isset($vehicleData['pricePerKm'])) {
        $vehicle['pricePerKm'] = (float)$vehicleData['pricePerKm'];
    }
    
    if (isset($vehicleData['image'])) {
        $vehicle['image'] = $vehicleData['image'];
    }
    
    if (isset($vehicleData['amenities'])) {
        if (is_string($vehicleData['amenities'])) {
            try {
                $amenities = json_decode($vehicleData['amenities'], true);
                if (is_array($amenities)) {
                    $vehicle['amenities'] = $amenities;
                } else {
                    $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
                }
            } catch (Exception $e) {
                $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } else {
            $vehicle['amenities'] = $vehicleData['amenities'];
        }
    }
    
    if (isset($vehicleData['description'])) {
        $vehicle['description'] = $vehicleData['description'];
    }
    
    if (isset($vehicleData['ac'])) {
        $vehicle['ac'] = (bool)$vehicleData['ac'];
    }
    
    if (isset($vehicleData['nightHaltCharge'])) {
        $vehicle['nightHaltCharge'] = (float)$vehicleData['nightHaltCharge'];
    }
    
    if (isset($vehicleData['driverAllowance'])) {
        $vehicle['driverAllowance'] = (float)$vehicleData['driverAllowance'];
    }
    
    if (isset($vehicleData['isActive'])) {
        $vehicle['isActive'] = (bool)$vehicleData['isActive'];
    }
    
    $persistentData[$vehicleIndex] = $vehicle;
    logDebug("Updated existing vehicle", $vehicle);
}

// Save back to persistent cache
if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
    logDebug("Saved to persistent cache");
} else {
    logDebug("Failed to save to persistent cache");
}

// Clear any temporary cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
    }
}

// Try to update database if possible
$dbUpdated = false;
try {
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn) {
                // Format amenities for database storage
                $amenitiesJson = is_array($vehicle['amenities']) 
                    ? json_encode($vehicle['amenities']) 
                    : json_encode([]);
                
                // Check if vehicle exists
                $checkQuery = "SELECT id FROM vehicles WHERE vehicle_id = ?";
                $stmt = $conn->prepare($checkQuery);
                $stmt->bind_param('s', $vehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    // Update existing
                    $query = "UPDATE vehicles SET 
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
                        updated_at = NOW()
                        WHERE vehicle_id = ?";
                    
                    $stmt = $conn->prepare($query);
                    
                    $name = $vehicle['name'];
                    $capacity = $vehicle['capacity'];
                    $luggageCapacity = $vehicle['luggageCapacity'];
                    $basePrice = $vehicle['basePrice'];
                    $pricePerKm = $vehicle['pricePerKm'];
                    $image = $vehicle['image'];
                    $description = $vehicle['description'];
                    $ac = $vehicle['ac'] ? 1 : 0;
                    $nightHaltCharge = $vehicle['nightHaltCharge'];
                    $driverAllowance = $vehicle['driverAllowance'];
                    $isActive = $vehicle['isActive'] ? 1 : 0;
                    
                    $stmt->bind_param('siiddsssidis', 
                        $name, 
                        $capacity, 
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $image,
                        $amenitiesJson,
                        $description,
                        $ac,
                        $nightHaltCharge,
                        $driverAllowance,
                        $isActive,
                        $vehicleId
                    );
                    
                    $stmt->execute();
                    logDebug("Updated in database: " . $stmt->affected_rows . " rows");
                    $dbUpdated = true;
                } else {
                    // Insert new
                    $query = "INSERT INTO vehicles 
                        (vehicle_id, name, capacity, luggage_capacity, base_price, price_per_km, 
                        image, amenities, description, ac, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                    
                    $stmt = $conn->prepare($query);
                    
                    $name = $vehicle['name'];
                    $capacity = $vehicle['capacity'];
                    $luggageCapacity = $vehicle['luggageCapacity'];
                    $basePrice = $vehicle['basePrice'];
                    $pricePerKm = $vehicle['pricePerKm'];
                    $image = $vehicle['image'];
                    $description = $vehicle['description'];
                    $ac = $vehicle['ac'] ? 1 : 0;
                    $nightHaltCharge = $vehicle['nightHaltCharge'];
                    $driverAllowance = $vehicle['driverAllowance'];
                    $isActive = $vehicle['isActive'] ? 1 : 0;
                    
                    $stmt->bind_param('ssiiddssidii', 
                        $vehicleId,
                        $name, 
                        $capacity, 
                        $luggageCapacity,
                        $basePrice,
                        $pricePerKm,
                        $image,
                        $amenitiesJson,
                        $description,
                        $ac,
                        $nightHaltCharge,
                        $driverAllowance,
                        $isActive
                    );
                    
                    $stmt->execute();
                    logDebug("Inserted in database: " . $conn->insert_id);
                    $dbUpdated = true;
                }
                
                $conn->close();
            }
        }
    }
} catch (Exception $e) {
    logDebug("Database error: " . $e->getMessage());
}

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully via direct endpoint',
    'vehicle' => $vehicle,
    'dbUpdated' => $dbUpdated
]);

// After successful update, trigger a reload to ensure all systems get updated data
try {
    // Copy our current request into a new request to reload-vehicles.php
    $ch = curl_init(dirname($_SERVER['SCRIPT_URI']) . "/reload-vehicles.php");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    $reloadResult = curl_exec($ch);
    curl_close($ch);
    logDebug("Triggered vehicle reload after update");
} catch (Exception $e) {
    logDebug("Failed to trigger reload: " . $e->getMessage());
}
