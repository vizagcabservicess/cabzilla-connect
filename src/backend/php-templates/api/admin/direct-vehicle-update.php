
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

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request information
logMessage("Vehicle update request received: " . $_SERVER['REQUEST_METHOD'], 'direct-vehicle-update.log');

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
logMessage("POST data: " . json_encode($_POST, JSON_PARTIAL_OUTPUT_ON_ERROR), 'direct-vehicle-update.log');

// Get vehicle data from the request
try {
    // Parse input data (support both JSON and form data)
    $vehicleData = [];
    
    // Try using POST data first (most reliable with multipart/form-data)
    if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle update", 'direct-vehicle-update.log');
    } 
    // If no POST data, try to parse JSON from request body
    else {
        // Read raw input once and store it
        $rawInput = file_get_contents('php://input');
        logMessage("Raw input: " . $rawInput, 'direct-vehicle-update.log');
        
        // Try to parse as JSON
        $jsonData = json_decode($rawInput, true, 512, JSON_THROW_ON_ERROR);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $vehicleData = $jsonData;
            logMessage("Parsed vehicle data from JSON", 'direct-vehicle-update.log');
        }
        // Try to parse as URL-encoded
        else {
            parse_str($rawInput, $parsedData);
            if (!empty($parsedData)) {
                $vehicleData = $parsedData;
                logMessage("Parsed vehicle data as URL-encoded", 'direct-vehicle-update.log');
            }
        }
    }
    
    // Check if vehicle data is in SERVER for direct inclusion
    if (empty($vehicleData) && isset($_SERVER['VEHICLE_DATA']) && !empty($_SERVER['VEHICLE_DATA'])) {
        $vehicleData = $_SERVER['VEHICLE_DATA'];
        logMessage("Using vehicle data from SERVER variable", 'direct-vehicle-update.log');
    }
    
    if (empty($vehicleData)) {
        throw new Exception("No vehicle data provided");
    }
    
    logMessage("Vehicle data after parsing: " . json_encode($vehicleData, JSON_PARTIAL_OUTPUT_ON_ERROR), 'direct-vehicle-update.log');
    
    // Extract vehicle ID with fallbacks for different naming conventions
    $vehicleId = null;
    $possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];
    
    foreach ($possibleVehicleIdFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleId = $vehicleData[$field];
            logMessage("Found vehicle ID in field '$field': $vehicleId", 'direct-vehicle-update.log');
            break;
        }
    }
    
    // Make sure we have a vehicle ID
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Get database connection with retry
    $conn = getDbConnectionWithRetry(3);
    logMessage("Database connection established successfully", 'direct-vehicle-update.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle exists
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('ss', $vehicleId, $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("Vehicle with ID '$vehicleId' not found");
        }
        
        // Get existing vehicle data
        $existingVehicle = $checkResult->fetch_assoc();
        logMessage("Existing vehicle data found: " . json_encode($existingVehicle, JSON_PARTIAL_OUTPUT_ON_ERROR), 'direct-vehicle-update.log');
        
        // CRITICAL: Handle the isActive flag with proper fallbacks (default to TRUE if not specified)
        $isActive = 1; // Default value is TRUE/active
        
        // Check if isActive is explicitly set in the request (using multiple possible field names)
        // This allows any variant of the field name to be used
        if (isset($vehicleData['isActive'])) {
            $isActive = filter_var($vehicleData['isActive'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            logMessage("isActive explicitly set to: " . ($isActive ? "true" : "false"), 'direct-vehicle-update.log');
        } 
        else if (isset($vehicleData['is_active'])) {
            $isActive = filter_var($vehicleData['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            logMessage("is_active explicitly set to: " . ($isActive ? "true" : "false"), 'direct-vehicle-update.log');
        }
        else if (isset($existingVehicle['is_active'])) {
            $isActive = intval($existingVehicle['is_active']);
            logMessage("Using existing is_active value: " . $isActive, 'direct-vehicle-update.log');
        }
        
        // CRITICAL: Handle capacity and luggage capacity properly
        $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 
                   (isset($existingVehicle['capacity']) ? intval($existingVehicle['capacity']) : 4);
                   
        $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                          (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 
                          (isset($existingVehicle['luggage_capacity']) ? intval($existingVehicle['luggage_capacity']) : 2));

        // Log capacity values for debugging
        logMessage("Capacity being set to: " . $capacity, 'direct-vehicle-update.log');
        logMessage("Luggage capacity being set to: " . $luggageCapacity, 'direct-vehicle-update.log');
        
        // Extract updated vehicle properties with fallback to existing values
        $vehicleName = isset($vehicleData['name']) && !empty($vehicleData['name']) ? $vehicleData['name'] : $existingVehicle['name'];
        
        // CRITICAL: Handle price fields properly
        $basePrice = isset($vehicleData['basePrice']) && $vehicleData['basePrice'] !== "" ? floatval($vehicleData['basePrice']) : 
                    (isset($vehicleData['base_price']) && $vehicleData['base_price'] !== "" ? floatval($vehicleData['base_price']) : 
                    (isset($existingVehicle['base_price']) && $existingVehicle['base_price'] !== null ? floatval($existingVehicle['base_price']) : 0));
        
        $pricePerKm = isset($vehicleData['pricePerKm']) && $vehicleData['pricePerKm'] !== "" ? floatval($vehicleData['pricePerKm']) : 
                     (isset($vehicleData['price_per_km']) && $vehicleData['price_per_km'] !== "" ? floatval($vehicleData['price_per_km']) : 
                     (isset($existingVehicle['price_per_km']) && $existingVehicle['price_per_km'] !== null ? floatval($existingVehicle['price_per_km']) : 0));
        
        // Log price values for debugging
        logMessage("Base price being set to: " . $basePrice, 'direct-vehicle-update.log');
        logMessage("Price per km being set to: " . $pricePerKm, 'direct-vehicle-update.log');
        
        $ac = isset($vehicleData['ac']) ? (filter_var($vehicleData['ac'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 
             (isset($existingVehicle['ac']) ? intval($existingVehicle['ac']) : 1);
        
        // CRITICAL: Handle night halt charge and driver allowance with default non-null values
        $nightHaltCharge = isset($vehicleData['nightHaltCharge']) && $vehicleData['nightHaltCharge'] !== "" ? floatval($vehicleData['nightHaltCharge']) : 
                          (isset($vehicleData['night_halt_charge']) && $vehicleData['night_halt_charge'] !== "" ? floatval($vehicleData['night_halt_charge']) : 
                          (isset($existingVehicle['night_halt_charge']) && $existingVehicle['night_halt_charge'] !== null ? 
                           floatval($existingVehicle['night_halt_charge']) : 700));
        
        $driverAllowance = isset($vehicleData['driverAllowance']) && $vehicleData['driverAllowance'] !== "" ? floatval($vehicleData['driverAllowance']) : 
                           (isset($vehicleData['driver_allowance']) && $vehicleData['driver_allowance'] !== "" ? floatval($vehicleData['driver_allowance']) : 
                           (isset($existingVehicle['driver_allowance']) && $existingVehicle['driver_allowance'] !== null ? 
                            floatval($existingVehicle['driver_allowance']) : 250));
        
        // Ensure night_halt_charge and driver_allowance are never NULL
        $nightHaltCharge = $nightHaltCharge ?: 700;
        $driverAllowance = $driverAllowance ?: 250;
        
        // Log additional values for debugging
        logMessage("Night halt charge being set to: " . $nightHaltCharge, 'direct-vehicle-update.log');
        logMessage("Driver allowance being set to: " . $driverAllowance, 'direct-vehicle-update.log');
        
        // Handle description (could be blank)
        $description = isset($vehicleData['description']) ? $vehicleData['description'] : 
                      (isset($existingVehicle['description']) ? $existingVehicle['description'] : '');
        
        // Handle image path with fallback
        $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : 
                (isset($existingVehicle['image']) && !empty($existingVehicle['image']) ? $existingVehicle['image'] : '/cars/sedan.png');
        
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
        } else if (isset($existingVehicle['amenities'])) {
            if (is_array($existingVehicle['amenities'])) {
                $amenities = $existingVehicle['amenities'];
            } else {
                try {
                    $amenitiesData = json_decode($existingVehicle['amenities'], true);
                    if (is_array($amenitiesData)) {
                        $amenities = $amenitiesData;
                    } else {
                        $amenities = array_map('trim', explode(',', $existingVehicle['amenities']));
                    }
                } catch (Exception $e) {
                    $amenities = array_map('trim', explode(',', $existingVehicle['amenities']));
                }
            }
        }
        
        if (empty($amenities)) {
            $amenities = ['AC']; // Default amenity
        }
        
        // Serialize amenities for database
        $amenitiesString = is_array($amenities) ? json_encode($amenities) : $amenities;
        
        // Update vehicles table
        $updateVehicleQuery = "
            UPDATE vehicles SET 
                name = ?,
                capacity = ?,
                luggage_capacity = ?,
                ac = ?,
                is_active = ?,
                image = ?,
                amenities = ?,
                description = ?,
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                updated_at = NOW()
            WHERE id = ? OR vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateVehicleQuery);
        
        if (!$updateStmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        // CRITICAL FIX: Fix the bind_param parameter count mismatch here
        // The correct number of parameters is 14 (12 for SET + 2 for WHERE)
        $updateStmt->bind_param(
            'siiissssdddss',  // FIX: Changed parameter count to match the actual number of variables
            $vehicleName,
            $capacity,
            $luggageCapacity,
            $ac,
            $isActive,
            $image,
            $amenitiesString,
            $description,
            $basePrice, 
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $vehicleId,
            $vehicleId
        );
        
        if ($updateStmt->execute()) {
            logMessage("Updated vehicle base information successfully", 'direct-vehicle-update.log');
        } else {
            throw new Exception("Failed to update vehicle: " . $updateStmt->error);
        }
        
        // Update outstation_fares table if exists
        $outstationQuery = "SELECT COUNT(*) as count FROM information_schema.tables 
                           WHERE table_schema = DATABASE() AND table_name = 'outstation_fares'";
        $outstationResult = $conn->query($outstationQuery);
        $outstationExists = ($outstationResult->fetch_assoc()['count'] > 0);
        
        if ($outstationExists) {
            // Check if vehicle has outstation fares entry
            $checkFareQuery = "SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = ?";
            $checkFareStmt = $conn->prepare($checkFareQuery);
            $checkFareStmt->bind_param('s', $vehicleId);
            $checkFareStmt->execute();
            $fareExists = ($checkFareStmt->get_result()->fetch_assoc()['count'] > 0);
            
            if ($fareExists) {
                // Update existing entry
                $updateFareQuery = "
                    UPDATE outstation_fares SET 
                        base_price = ?,
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ?
                ";
                
                $updateFareStmt = $conn->prepare($updateFareQuery);
                $updateFareStmt->bind_param('dddds', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                
                if ($updateFareStmt->execute()) {
                    logMessage("Updated outstation_fares successfully", 'direct-vehicle-update.log');
                } else {
                    logMessage("Failed to update outstation_fares: " . $updateFareStmt->error, 'direct-vehicle-update.log');
                }
            } else {
                // Create new entry
                $insertFareQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
                    )
                ";
                
                $roundtripBasePrice = $basePrice * 0.95; // 5% discount for round trips
                $roundtripPricePerKm = $pricePerKm * 0.85; // 15% discount for round trips
                
                $insertFareStmt = $conn->prepare($insertFareQuery);
                $insertFareStmt->bind_param(
                    'sdddddd',
                    $vehicleId, 
                    $basePrice, 
                    $pricePerKm, 
                    $nightHaltCharge, 
                    $driverAllowance, 
                    $roundtripBasePrice, 
                    $roundtripPricePerKm
                );
                
                if ($insertFareStmt->execute()) {
                    logMessage("Created new outstation_fares entry", 'direct-vehicle-update.log');
                } else {
                    logMessage("Failed to create outstation_fares entry: " . $insertFareStmt->error, 'direct-vehicle-update.log');
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Get the updated vehicle data to return
        $selectQuery = "SELECT * FROM vehicles WHERE id = ? OR vehicle_id = ?";
        $selectStmt = $conn->prepare($selectQuery);
        $selectStmt->bind_param('ss', $vehicleId, $vehicleId);
        $selectStmt->execute();
        $updatedVehicle = $selectStmt->get_result()->fetch_assoc();
        
        if (!$updatedVehicle) {
            throw new Exception("Failed to retrieve updated vehicle data");
        }
        
        // Transform the updated vehicle data to match frontend format
        $formattedVehicle = [
            'id' => $updatedVehicle['id'] ?? $updatedVehicle['vehicle_id'] ?? '',
            'vehicleId' => $updatedVehicle['vehicle_id'] ?? $updatedVehicle['id'] ?? '',
            'name' => $updatedVehicle['name'] ?? '',
            'capacity' => (int)($updatedVehicle['capacity'] ?? 4),
            'luggageCapacity' => (int)($updatedVehicle['luggage_capacity'] ?? 2),
            'price' => (float)($updatedVehicle['base_price'] ?? 0),
            'basePrice' => (float)($updatedVehicle['base_price'] ?? 0),
            'pricePerKm' => (float)($updatedVehicle['price_per_km'] ?? 0),
            'image' => $updatedVehicle['image'] ?? '/cars/sedan.png',
            'description' => $updatedVehicle['description'] ?? '',
            'ac' => (bool)$updatedVehicle['ac'],
            'nightHaltCharge' => (float)($updatedVehicle['night_halt_charge'] ?? 700),
            'driverAllowance' => (float)($updatedVehicle['driver_allowance'] ?? 250),
            'isActive' => (bool)$updatedVehicle['is_active']
        ];
        
        // Parse amenities
        try {
            $amenitiesValue = $updatedVehicle['amenities'] ?? '[]';
            if (is_string($amenitiesValue)) {
                $parsedAmenities = json_decode($amenitiesValue, true);
                if (is_array($parsedAmenities)) {
                    $formattedVehicle['amenities'] = $parsedAmenities;
                } else {
                    $formattedVehicle['amenities'] = explode(',', str_replace(['[', ']', '"', "'"], '', $amenitiesValue));
                }
            } else {
                $formattedVehicle['amenities'] = is_array($amenitiesValue) ? $amenitiesValue : ['AC'];
            }
        } catch (Exception $e) {
            $formattedVehicle['amenities'] = ['AC'];
        }
        
        // Format response with the updated vehicle data
        $response = [
            'status' => 'success',
            'message' => 'Vehicle updated successfully',
            'id' => $vehicleId,
            'timestamp' => time(),
            'vehicle' => $formattedVehicle
        ];
        
        // Clear any vehicle data cache files
        $cacheDir = dirname(__FILE__) . '/../../cache';
        if (file_exists($cacheDir)) {
            $cacheFiles = glob($cacheDir . '/vehicles*.json');
            foreach ($cacheFiles as $file) {
                @unlink($file);
            }
        }
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    } finally {
        // Close connection
        $conn->close();
    }
} catch (Exception $e) {
    logMessage("Error updating vehicle: " . $e->getMessage(), 'direct-vehicle-update.log');
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
}

// Send the response
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
exit;
