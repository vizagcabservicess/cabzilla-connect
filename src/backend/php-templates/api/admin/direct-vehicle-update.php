
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

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
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
    
    // Define the persistent cache file path - ABSOLUTE PATH for reliability
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    logMessage("Using persistent cache file at: $persistentCacheFile");
    
    // Try to load existing persistent data - CRITICAL FOR CONSISTENCY
    $persistentData = [];
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            try {
                $data = json_decode($persistentJson, true);
                if (is_array($data)) {
                    $persistentData = $data;
                    logMessage("Loaded " . count($persistentData) . " vehicles from persistent cache");
                } else {
                    logMessage("ERROR: Persistent data is not an array - initializing empty array");
                    $persistentData = [];
                }
            } catch (Exception $e) {
                // Failed to parse JSON, start fresh
                logMessage("Error parsing persistent data: " . $e->getMessage());
                $persistentData = [];
            }
        }
    } else {
        logMessage("Persistent cache file not found, will create a new one");
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
    $capacity = isset($vehicleData['capacity']) && $vehicleData['capacity'] !== "" ? intval($vehicleData['capacity']) : 4;
    $luggageCapacity = isset($vehicleData['luggageCapacity']) && $vehicleData['luggageCapacity'] !== "" ? intval($vehicleData['luggageCapacity']) : 
                      (isset($vehicleData['luggage_capacity']) && $vehicleData['luggage_capacity'] !== "" ? intval($vehicleData['luggage_capacity']) : 2);
    
    // Find if the vehicle already exists in persistent data
    $vehicleIndex = -1;
    $existingVehicle = null;
    
    foreach ($persistentData as $index => $vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            $vehicleIndex = $index;
            $existingVehicle = $vehicle;
            break;
        }
    }
    
    // Handle price fields - DON'T RESET THESE TO ZERO!!
    // If vehicle exists and incoming value is empty or zero, use existing value
    $basePrice = 0;
    $pricePerKm = 0;
    $nightHaltCharge = 0;
    $driverAllowance = 0;
    
    if (isset($vehicleData['basePrice']) && $vehicleData['basePrice'] !== "" && $vehicleData['basePrice'] > 0) {
        $basePrice = floatval($vehicleData['basePrice']);
    } else if (isset($vehicleData['base_price']) && $vehicleData['base_price'] !== "" && $vehicleData['base_price'] > 0) {
        $basePrice = floatval($vehicleData['base_price']);
    } else if (isset($vehicleData['price']) && $vehicleData['price'] !== "" && $vehicleData['price'] > 0) {
        $basePrice = floatval($vehicleData['price']);
    } else if ($existingVehicle && isset($existingVehicle['basePrice']) && $existingVehicle['basePrice'] > 0) {
        $basePrice = $existingVehicle['basePrice'];
        logMessage("Using existing basePrice: $basePrice");
    } else if ($existingVehicle && isset($existingVehicle['price']) && $existingVehicle['price'] > 0) {
        $basePrice = $existingVehicle['price'];
        logMessage("Using existing price as basePrice: $basePrice");
    } else {
        // Default values based on vehicle type
        $basePrice = ($vehicleId === 'sedan') ? 2500 : 
                    (($vehicleId === 'ertiga') ? 3200 : 
                    (($vehicleId === 'innova_crysta') ? 3800 : 
                    (($vehicleId === 'luxury') ? 4500 : 
                    (($vehicleId === 'tempo_traveller') ? 5500 : 2000))));
        logMessage("Using default basePrice: $basePrice");
    }
    
    // Price per km
    if (isset($vehicleData['pricePerKm']) && $vehicleData['pricePerKm'] !== "" && $vehicleData['pricePerKm'] > 0) {
        $pricePerKm = floatval($vehicleData['pricePerKm']);
    } else if (isset($vehicleData['price_per_km']) && $vehicleData['price_per_km'] !== "" && $vehicleData['price_per_km'] > 0) {
        $pricePerKm = floatval($vehicleData['price_per_km']);
    } else if ($existingVehicle && isset($existingVehicle['pricePerKm']) && $existingVehicle['pricePerKm'] > 0) {
        $pricePerKm = $existingVehicle['pricePerKm'];
        logMessage("Using existing pricePerKm: $pricePerKm");
    } else {
        // Default values
        $pricePerKm = ($vehicleId === 'sedan') ? 14 : 
                     (($vehicleId === 'ertiga') ? 18 : 
                     (($vehicleId === 'innova_crysta') ? 20 : 
                     (($vehicleId === 'luxury') ? 25 : 
                     (($vehicleId === 'tempo_traveller') ? 22 : 15))));
        logMessage("Using default pricePerKm: $pricePerKm");
    }
    
    // Night halt charge
    if (isset($vehicleData['nightHaltCharge']) && $vehicleData['nightHaltCharge'] !== "" && $vehicleData['nightHaltCharge'] > 0) {
        $nightHaltCharge = floatval($vehicleData['nightHaltCharge']);
    } else if (isset($vehicleData['night_halt_charge']) && $vehicleData['night_halt_charge'] !== "" && $vehicleData['night_halt_charge'] > 0) {
        $nightHaltCharge = floatval($vehicleData['night_halt_charge']);
    } else if ($existingVehicle && isset($existingVehicle['nightHaltCharge']) && $existingVehicle['nightHaltCharge'] > 0) {
        $nightHaltCharge = $existingVehicle['nightHaltCharge'];
        logMessage("Using existing nightHaltCharge: $nightHaltCharge");
    } else {
        $nightHaltCharge = ($vehicleId === 'luxury' || $vehicleId === 'tempo_traveller') ? 1200 : 700;
        logMessage("Using default nightHaltCharge: $nightHaltCharge");
    }
    
    // Driver allowance
    if (isset($vehicleData['driverAllowance']) && $vehicleData['driverAllowance'] !== "" && $vehicleData['driverAllowance'] > 0) {
        $driverAllowance = floatval($vehicleData['driverAllowance']);
    } else if (isset($vehicleData['driver_allowance']) && $vehicleData['driver_allowance'] !== "" && $vehicleData['driver_allowance'] > 0) {
        $driverAllowance = floatval($vehicleData['driver_allowance']);
    } else if ($existingVehicle && isset($existingVehicle['driverAllowance']) && $existingVehicle['driverAllowance'] > 0) {
        $driverAllowance = $existingVehicle['driverAllowance'];
        logMessage("Using existing driverAllowance: $driverAllowance");
    } else {
        $driverAllowance = ($vehicleId === 'luxury' || $vehicleId === 'tempo_traveller') ? 300 : 250;
        logMessage("Using default driverAllowance: $driverAllowance");
    }
    
    // Handle AC field
    $ac = 1; // Default to true
    if (isset($vehicleData['ac'])) {
        $ac = filter_var($vehicleData['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    } else if ($existingVehicle && isset($existingVehicle['ac'])) {
        $ac = filter_var($existingVehicle['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    
    // Handle description and image path
    $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
    if (empty($description) && $existingVehicle && !empty($existingVehicle['description'])) {
        $description = $existingVehicle['description'];
    }
    
    $image = '';
    if (isset($vehicleData['image']) && !empty($vehicleData['image'])) {
        $image = $vehicleData['image'];
    } else if ($existingVehicle && isset($existingVehicle['image']) && !empty($existingVehicle['image'])) {
        $image = $existingVehicle['image'];
    } else {
        $image = "/cars/$vehicleId.png";
    }
    
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
    } else if ($existingVehicle && isset($existingVehicle['amenities']) && !empty($existingVehicle['amenities'])) {
        $amenities = $existingVehicle['amenities'];
    }
    
    if (empty($amenities)) {
        $amenities = ['AC', 'Bottle Water', 'Music System']; // Default amenities
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
    
    logMessage("Final formatted vehicle data: " . json_encode($formattedVehicle, JSON_PARTIAL_OUTPUT_ON_ERROR));
    
    // Update or add the vehicle in persistent data
    if ($vehicleIndex >= 0) {
        // Update existing vehicle - IMPORTANT: Merge to preserve existing fields
        $persistentData[$vehicleIndex] = array_merge($persistentData[$vehicleIndex], $formattedVehicle);
        logMessage("Updated existing vehicle in persistent data");
    } else {
        // Add new vehicle
        $persistentData[] = $formattedVehicle;
        logMessage("Added new vehicle to persistent data");
    }
    
    // CRITICAL FIX: Save the updated data to the persistent cache file with specific error handling
    try {
        $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT | JSON_PARTIAL_OUTPUT_ON_ERROR : 0;
        $jsonData = json_encode($persistentData, $jsonOptions);
        
        // Check if JSON encoding was successful
        if ($jsonData === false) {
            throw new Exception("JSON encoding error: " . json_last_error_msg());
        }
        
        // Make sure cache directory exists
        if (!is_dir($cacheDir)) {
            if (!mkdir($cacheDir, 0755, true)) {
                throw new Exception("Failed to create cache directory: $cacheDir");
            }
            logMessage("Created cache directory: $cacheDir");
        }
        
        // Check if cache directory is writable
        if (!is_writable($cacheDir)) {
            throw new Exception("Cache directory is not writable: $cacheDir");
        }
        
        // Write the data to a temporary file first
        $tempFile = $cacheDir . '/vehicles_temp_' . uniqid() . '.json';
        $bytesWritten = file_put_contents($tempFile, $jsonData);
        
        if ($bytesWritten === false) {
            throw new Exception("Failed to write to temporary file: $tempFile");
        }
        
        logMessage("Successfully wrote " . $bytesWritten . " bytes to temporary file");
        
        // Only replace the original file if the temp file was written successfully
        if (rename($tempFile, $persistentCacheFile)) {
            logMessage("Successfully saved persistent vehicle data with " . count($persistentData) . " vehicles");
            
            // Also backup the data to an additional location for safety
            $backupFile = $cacheDir . '/vehicles_backup_' . date('Ymd_His') . '.json';
            if (copy($persistentCacheFile, $backupFile)) {
                logMessage("Created backup at: $backupFile");
            }
            
            // Clear any regular cache files to ensure fresh data is loaded
            $cacheFiles = glob($cacheDir . '/vehicles_*.json');
            foreach ($cacheFiles as $file) {
                if ($file !== $persistentCacheFile && $file !== $backupFile && !strpos($file, 'backup')) {
                    if (@unlink($file)) {
                        logMessage("Cleared cache file: " . basename($file));
                    }
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
        } else {
            throw new Exception("Failed to rename temporary file to persistent cache file");
        }
    } catch (Exception $saveError) {
        logMessage("ERROR saving data: " . $saveError->getMessage());
        throw $saveError; // rethrow to be caught by outer catch
    }
} catch (Exception $e) {
    logMessage("Error updating vehicle: " . $e->getMessage());
    
    // Check if persistent cache file exists and is readable but not writable
    if (file_exists($persistentCacheFile) && is_readable($persistentCacheFile) && !is_writable($persistentCacheFile)) {
        logMessage("Persistent cache file exists but is not writable - permission issue");
        $response = [
            'status' => 'error',
            'message' => 'Permission denied: Cannot write to persistent cache file',
            'timestamp' => time()
        ];
    } else {
        $response = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'timestamp' => time()
        ];
    }
}

// Send the response
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
exit;
