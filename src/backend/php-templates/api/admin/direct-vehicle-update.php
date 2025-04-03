
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

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Function to log messages to a file
function logMessage($message, $filename = 'direct-vehicle-update.log') {
    global $logDir;
    $logFile = $logDir . '/' . $filename;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Log request information
logMessage("Vehicle update request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Allow POST/PUT methods
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    $response['message'] = 'Only POST or PUT methods are allowed';
    echo json_encode($response);
    exit;
}

// Log POST data for debugging
logMessage("POST data: " . json_encode($_POST, JSON_PARTIAL_OUTPUT_ON_ERROR));

// Get vehicle data from the request
try {
    // Parse input data (support both JSON and form data)
    $vehicleData = [];
    
    // Try using POST data first (most reliable with multipart/form-data)
    if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle update");
    } 
    // If no POST data, try to parse JSON from request body
    else {
        // Read raw input once and store it
        $rawInput = file_get_contents('php://input');
        logMessage("Raw input: " . $rawInput);
        
        // Try to parse as JSON
        $jsonData = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $vehicleData = $jsonData;
            logMessage("Parsed vehicle data from JSON");
        }
        // Try to parse as URL-encoded
        else {
            parse_str($rawInput, $parsedData);
            if (!empty($parsedData)) {
                $vehicleData = $parsedData;
                logMessage("Parsed vehicle data as URL-encoded");
            }
        }
    }
    
    // Check if vehicle data is in SERVER for direct inclusion
    if (empty($vehicleData) && isset($_SERVER['VEHICLE_DATA']) && !empty($_SERVER['VEHICLE_DATA'])) {
        $vehicleData = $_SERVER['VEHICLE_DATA'];
        logMessage("Using vehicle data from SERVER variable");
    }
    
    if (empty($vehicleData)) {
        throw new Exception("No vehicle data provided");
    }
    
    logMessage("Vehicle data after parsing: " . json_encode($vehicleData, JSON_PARTIAL_OUTPUT_ON_ERROR));
    
    // Extract vehicle ID with fallbacks for different naming conventions
    $vehicleId = null;
    $possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];
    
    foreach ($possibleVehicleIdFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleId = $vehicleData[$field];
            logMessage("Found vehicle ID in field '$field': $vehicleId");
            break;
        }
    }
    
    // Make sure we have a vehicle ID
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Create cache directory if needed
    $cacheDir = __DIR__ . '/../../cache';
    if (!file_exists($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    
    // The persistent cache file path
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    // Try to load existing persistent data
    $persistentData = [];
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            try {
                $data = json_decode($persistentJson, true);
                if (is_array($data)) {
                    $persistentData = $data;
                }
            } catch (Exception $e) {
                // Failed to parse JSON, start fresh
                logMessage("Error parsing persistent data: " . $e->getMessage());
            }
        }
    }
    
    // CRITICAL: Handle the isActive flag with proper fallbacks (default to TRUE if not specified)
    $isActive = 1; // Default value is TRUE/active
    
    // Check if isActive is explicitly set in the request
    if (isset($vehicleData['isActive'])) {
        $isActive = filter_var($vehicleData['isActive'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        logMessage("isActive explicitly set to: " . ($isActive ? "true" : "false"));
    } 
    else if (isset($vehicleData['is_active'])) {
        $isActive = filter_var($vehicleData['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        logMessage("is_active explicitly set to: " . ($isActive ? "true" : "false"));
    }
    
    // CRITICAL: Handle other fields with proper consistency
    $vehicleName = isset($vehicleData['name']) && !empty($vehicleData['name']) ? $vehicleData['name'] : $vehicleId;
    
    // Handle capacity and luggage capacity
    $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                      (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 2);
    
    // Handle price fields
    $basePrice = isset($vehicleData['basePrice']) && $vehicleData['basePrice'] !== "" ? floatval($vehicleData['basePrice']) : 
                (isset($vehicleData['base_price']) && $vehicleData['base_price'] !== "" ? floatval($vehicleData['base_price']) : 
                (isset($vehicleData['price']) && $vehicleData['price'] !== "" ? floatval($vehicleData['price']) : 0));
    
    $pricePerKm = isset($vehicleData['pricePerKm']) && $vehicleData['pricePerKm'] !== "" ? floatval($vehicleData['pricePerKm']) : 
                 (isset($vehicleData['price_per_km']) && $vehicleData['price_per_km'] !== "" ? floatval($vehicleData['price_per_km']) : 0);
    
    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) && $vehicleData['nightHaltCharge'] !== "" ? floatval($vehicleData['nightHaltCharge']) : 
                      (isset($vehicleData['night_halt_charge']) && $vehicleData['night_halt_charge'] !== "" ? floatval($vehicleData['night_halt_charge']) : 700);
    
    $driverAllowance = isset($vehicleData['driverAllowance']) && $vehicleData['driverAllowance'] !== "" ? floatval($vehicleData['driverAllowance']) : 
                      (isset($vehicleData['driver_allowance']) && $vehicleData['driver_allowance'] !== "" ? floatval($vehicleData['driver_allowance']) : 250);
    
    // Handle AC field
    $ac = isset($vehicleData['ac']) ? (filter_var($vehicleData['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 1;
    
    // Handle description and image path
    $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
    $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : "/cars/$vehicleId.png";
    
    // Process amenities
    $amenities = [];
    if (isset($vehicleData['amenities'])) {
        if (is_array($vehicleData['amenities'])) {
            $amenities = $vehicleData['amenities'];
        } else {
            // Try to parse as JSON
            try {
                $amenitiesData = json_decode($vehicleData['amenities'], true);
                if (is_array($amenitiesData)) {
                    $amenities = $amenitiesData;
                } else {
                    // Fallback to comma-separated string
                    $amenities = array_map('trim', explode(',', $vehicleData['amenities']));
                }
            } catch (Exception $e) {
                // Fallback to comma-separated string
                $amenities = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        }
    }
    
    if (empty($amenities)) {
        $amenities = ['AC']; // Default amenity
    }
    
    // Prepare the final vehicle data
    $formattedVehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $vehicleName,
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'price' => $basePrice,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'image' => $image,
        'amenities' => $amenities,
        'description' => $description,
        'ac' => $ac == 1,
        'nightHaltCharge' => $nightHaltCharge,
        'driverAllowance' => $driverAllowance,
        'isActive' => $isActive == 1
    ];
    
    // Find if vehicle already exists in persistent data
    $vehicleIndex = -1;
    foreach ($persistentData as $index => $vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            $vehicleIndex = $index;
            break;
        }
    }
    
    // Update or add the vehicle in persistent data
    if ($vehicleIndex >= 0) {
        // Update existing vehicle
        $persistentData[$vehicleIndex] = array_merge($persistentData[$vehicleIndex], $formattedVehicle);
        logMessage("Updated existing vehicle in persistent data");
    } else {
        // Add new vehicle
        $persistentData[] = $formattedVehicle;
        logMessage("Added new vehicle to persistent data");
    }
    
    // Save the updated data back to the persistent cache file
    if (file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT))) {
        logMessage("Successfully saved persistent vehicle data");
    } else {
        logMessage("Failed to save persistent vehicle data");
    }
    
    // Clear any regular cache files to ensure fresh data is loaded
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    foreach ($cacheFiles as $file) {
        if ($file !== $persistentCacheFile) {
            @unlink($file);
        }
    }
    
    // Format response with the updated vehicle data
    $response = [
        'status' => 'success',
        'message' => 'Vehicle updated successfully',
        'id' => $vehicleId,
        'timestamp' => time(),
        'vehicle' => $formattedVehicle
    ];
    
} catch (Exception $e) {
    logMessage("Error updating vehicle: " . $e->getMessage());
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
}

// Send the response
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
exit;
