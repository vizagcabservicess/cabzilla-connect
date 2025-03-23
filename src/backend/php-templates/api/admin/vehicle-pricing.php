
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/headers.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

// Set necessary headers for CORS and JSON responses
setHeaders();

// Connect to the database
$conn = connectToDatabase();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendEmptyResponse();
    exit;
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Log incoming request for debugging
logError("Vehicle pricing request received", [
    'method' => $method,
    'uri' => $_SERVER['REQUEST_URI'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? ''
]);

// Function to check if a vehicle exists
function vehicleExists($conn, $vehicleId) {
    $stmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare stmt for checking if vehicle exists", ['error' => $conn->error]);
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

// Function to update or create outstation fares
function updateOutstationFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating outstation fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Check required fields - make baseFare and pricePerKm optional with defaults
    $baseFare = isset($fareData['baseFare']) ? floatval($fareData['baseFare']) : 0;
    $pricePerKm = isset($fareData['pricePerKm']) ? floatval($fareData['pricePerKm']) : 0;
    $nightHaltCharge = isset($fareData['nightHaltCharge']) ? floatval($fareData['nightHaltCharge']) : 0;
    $driverAllowance = isset($fareData['driverAllowance']) ? floatval($fareData['driverAllowance']) : 0;
    
    // Check for round trip pricing if available
    $roundtripBaseFare = isset($fareData['roundtripBasePrice']) ? floatval($fareData['roundtripBasePrice']) : 0;
    $roundtripPricePerKm = isset($fareData['roundtripPricePerKm']) ? floatval($fareData['roundtripPricePerKm']) : 0;
    
    // First check if vehicle exists in vehicles table, if not create it
    $vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
    $vehicleStmt = $conn->prepare($vehicleQuery);
    if (!$vehicleStmt) {
        logError("Failed to prepare statement for vehicle check", ['error' => $conn->error]);
        return false;
    }
    
    $vehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
    $vehicleStmt->execute();
    $vehicleResult = $vehicleStmt->get_result();
    
    if ($vehicleResult->num_rows == 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, is_active, created_at, updated_at) 
                              VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())";
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        if (!$insertVehicleStmt) {
            logError("Failed to prepare statement for vehicle insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertVehicleStmt->bind_param("sssdd", $vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm);
        $insertVehicleStmt->execute();
        logError("Created new vehicle record", ['vehicleId' => $vehicleId]);
    }
    
    // First, try to update vehicle_pricing table (with round trip columns)
    try {
        $updateQuery = "
            UPDATE vehicle_pricing 
            SET 
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                roundtrip_base_price = ?,
                roundtrip_price_per_km = ?,
                updated_at = NOW() 
            WHERE vehicle_type = ?
        ";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            throw new Exception($conn->error);
        }
        
        $updateStmt->bind_param("dddddds", 
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $roundtripBaseFare,
            $roundtripPricePerKm,
            $vehicleId
        );
        
        $success = $updateStmt->execute();
        if ($updateStmt->affected_rows > 0) {
            logError("Successfully updated vehicle_pricing with round trip data", ['vehicleId' => $vehicleId]);
            return true;
        }
    } catch (Exception $e) {
        logError("Failed to update vehicle_pricing with roundtrip columns. Trying without...", ['error' => $e->getMessage()]);
    }
    
    // If vehicle_pricing table update with round trip columns failed, try without them
    try {
        $updateQuery = "
            UPDATE vehicle_pricing 
            SET 
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                updated_at = NOW() 
            WHERE vehicle_type = ?
        ";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            throw new Exception($conn->error);
        }
        
        $updateStmt->bind_param("dddds", 
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $vehicleId
        );
        
        $success = $updateStmt->execute();
        if ($updateStmt->affected_rows > 0) {
            logError("Successfully updated vehicle_pricing without round trip data", ['vehicleId' => $vehicleId]);
            return true;
        }
    } catch (Exception $e) {
        logError("Failed to update vehicle_pricing. Trying outstation_fares...", ['error' => $e->getMessage()]);
    }
    
    // Check if record exists in outstation_fares
    $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for outstation fare check", ['error' => $conn->error]);
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $success = false;
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE outstation_fares SET base_fare = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            logError("Failed to prepare statement for outstation fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
        $success = $updateStmt->execute();
        
        if (!$success) {
            logError("Failed to execute outstation fare update", ['error' => $updateStmt->error]);
        }
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for outstation fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
        $success = $insertStmt->execute();
        
        if (!$success) {
            logError("Failed to execute outstation fare insert", ['error' => $insertStmt->error]);
        }
    }
    
    if (!$success) {
        logError("Database error updating outstation fares", ['error' => $conn->error]);
        return false;
    }
    
    // Also update the main vehicles table to keep pricing consistent
    $updateVehicleQuery = "UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?";
    $updateVehicleStmt = $conn->prepare($updateVehicleQuery);
    if (!$updateVehicleStmt) {
        logError("Failed to prepare statement for vehicle update", ['error' => $conn->error]);
        return false;
    }
    
    $updateVehicleStmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
    $updateVehicleSuccess = $updateVehicleStmt->execute();
    
    if (!$updateVehicleSuccess) {
        logError("Failed to update main vehicle record", ['error' => $updateVehicleStmt->error]);
    }
    
    logError("Successfully updated outstation fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Function to update or create local package fares
function updateLocalFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating local fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
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
    
    // First, try to update the vehicle_pricing table with all the local package fields
    try {
        $updateQuery = "
            UPDATE vehicle_pricing 
            SET 
                local_package_4hr = ?,
                local_package_8hr = ?,
                local_package_10hr = ?,
                extra_km_charge = ?,
                extra_hour_charge = ?,
                updated_at = NOW() 
            WHERE vehicle_type = ?
        ";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            throw new Exception($conn->error);
        }
        
        $updateStmt->bind_param("ddddds", 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm,
            $priceExtraHour,
            $vehicleId
        );
        
        $success = $updateStmt->execute();
        if ($updateStmt->affected_rows > 0) {
            logError("Successfully updated vehicle_pricing with local package data", ['vehicleId' => $vehicleId]);
            return true;
        }
    } catch (Exception $e) {
        logError("Failed to update vehicle_pricing with local package columns", ['error' => $e->getMessage()]);
    }
    
    // Check if we have a record in local_package_fares table
    $stmt = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for local fare check", ['error' => $conn->error]);
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
            logError("Failed to prepare statement for local fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for local fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        $success = $insertStmt->execute();
    }
    
    if (!$success) {
        logError("Database error updating local fares", ['error' => $stmt->error]);
        return false;
    }
    
    logError("Successfully updated local fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Function to update or create airport transfer fares
function updateAirportFares($conn, $vehicleId, $fareData) {
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($vehicleId);
    
    // Log what we're trying to update
    logError("Updating airport fares", [
        'vehicleId' => $vehicleId,
        'data' => $fareData
    ]);
    
    // Get prices with multiple fallbacks
    $pickupFare = isset($fareData['pickupFare']) ? floatval($fareData['pickupFare']) : 
                (isset($fareData['airport_pickup_price']) ? floatval($fareData['airport_pickup_price']) : 0);
                
    $dropFare = isset($fareData['dropFare']) ? floatval($fareData['dropFare']) : 
              (isset($fareData['airport_drop_price']) ? floatval($fareData['airport_drop_price']) : 0);
              
    $airportBasePrice = isset($fareData['airportBasePrice']) ? floatval($fareData['airportBasePrice']) : 
                      (isset($fareData['airport_base_price']) ? floatval($fareData['airport_base_price']) : 0);
                      
    $airportPricePerKm = isset($fareData['airportPricePerKm']) ? floatval($fareData['airportPricePerKm']) : 
                       (isset($fareData['airport_price_per_km']) ? floatval($fareData['airport_price_per_km']) : 0);
    
    // First, try to update the vehicle_pricing table with airport columns
    try {
        $updateQuery = "
            UPDATE vehicle_pricing 
            SET 
                airport_base_price = ?,
                airport_price_per_km = ?,
                airport_pickup_price = ?,
                airport_drop_price = ?,
                updated_at = NOW() 
            WHERE vehicle_type = ?
        ";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            throw new Exception($conn->error);
        }
        
        $updateStmt->bind_param("dddds", 
            $airportBasePrice, 
            $airportPricePerKm, 
            $pickupFare, 
            $dropFare,
            $vehicleId
        );
        
        $success = $updateStmt->execute();
        if ($updateStmt->affected_rows > 0) {
            logError("Successfully updated vehicle_pricing with airport data", ['vehicleId' => $vehicleId]);
            return true;
        }
    } catch (Exception $e) {
        logError("Failed to update vehicle_pricing with airport columns", ['error' => $e->getMessage()]);
    }
    
    // Check if record exists in airport_transfer_fares table
    $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        logError("Failed to prepare statement for airport fare check", ['error' => $conn->error]);
        return false;
    }
    
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $updateQuery = "UPDATE airport_transfer_fares SET pickup_fare = ?, drop_fare = ?, updated_at = NOW() WHERE vehicle_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        if (!$updateStmt) {
            logError("Failed to prepare statement for airport fare update", ['error' => $conn->error]);
            return false;
        }
        
        $updateStmt->bind_param("dds", $pickupFare, $dropFare, $vehicleId);
        $success = $updateStmt->execute();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO airport_transfer_fares (vehicle_id, pickup_fare, drop_fare, created_at, updated_at) 
                       VALUES (?, ?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            logError("Failed to prepare statement for airport fare insert", ['error' => $conn->error]);
            return false;
        }
        
        $insertStmt->bind_param("sdd", $vehicleId, $pickupFare, $dropFare);
        $success = $insertStmt->execute();
    }
    
    if (!$success) {
        logError("Database error updating airport fares", ['error' => $stmt->error]);
        return false;
    }
    
    logError("Successfully updated airport fares", ['vehicleId' => $vehicleId]);
    return true;
}

// Handle POST request to update pricing
if ($method === 'POST') {
    // Get request body
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Log the incoming data
    logError("Received vehicle pricing update request", $data);
    
    if ($json === false || $data === null) {
        logError("Invalid JSON in request", ['raw_input' => file_get_contents('php://input')]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON format'], 400);
        exit;
    }
    
    // Validate required fields
    if (!isset($data['vehicleId']) || !isset($data['tripType'])) {
        logError("Missing required fields in request", $data);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required fields: vehicleId and tripType'], 400);
        exit;
    }
    
    // Clean the vehicle ID
    $vehicleId = cleanVehicleId($data['vehicleId']);
    $tripType = $data['tripType'];
    
    // Log the cleaned data
    logError("Cleaned vehicle pricing data", ['vehicleId' => $vehicleId, 'tripType' => $tripType]);
    
    // Switch based on trip type
    $success = false;
    
    // Handle different trip types
    switch ($tripType) {
        case 'outstation':
        case 'outstation-one-way':
        case 'outstation-round-trip':
            $success = updateOutstationFares($conn, $vehicleId, $data);
            break;
            
        case 'local':
            $success = updateLocalFares($conn, $vehicleId, $data);
            break;
            
        case 'airport':
            $success = updateAirportFares($conn, $vehicleId, $data);
            break;
            
        case 'base':
            // Handle base price updates directly in the vehicles table
            $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
            $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
            $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 0;
            $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
            
            // Check if vehicle exists, if not add it
            $vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
            $vehicleStmt = $conn->prepare($vehicleQuery);
            if (!$vehicleStmt) {
                logError("Failed to prepare statement for vehicle check in base pricing", ['error' => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                exit;
            }
            
            $vehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
            $vehicleStmt->execute();
            $vehicleResult = $vehicleStmt->get_result();
            
            if ($vehicleResult->num_rows > 0) {
                // Update existing vehicle
                $updateQuery = "UPDATE vehicles SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?";
                $updateStmt = $conn->prepare($updateQuery);
                if (!$updateStmt) {
                    logError("Failed to prepare statement for vehicle update in base pricing", ['error' => $conn->error]);
                    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                    exit;
                }
                
                $updateStmt->bind_param("ddddss", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
                $success = $updateStmt->execute();
            } else {
                // Insert new vehicle
                $name = ucfirst(str_replace('_', ' ', $vehicleId));
                $insertQuery = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
                $insertStmt = $conn->prepare($insertQuery);
                if (!$insertStmt) {
                    logError("Failed to prepare statement for vehicle insert in base pricing", ['error' => $conn->error]);
                    sendJsonResponse(['status' => 'error', 'message' => 'Database error'], 500);
                    exit;
                }
                
                $insertStmt->bind_param("sssdddd", $vehicleId, $vehicleId, $name, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                $success = $insertStmt->execute();
            }
            
            if (!$success) {
                logError("Database error updating base pricing", ['error' => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
                exit;
            }
            
            // Also update in vehicle_pricing table for consistency
            try {
                $updateVehiclePricingQuery = "
                    UPDATE vehicle_pricing 
                    SET 
                        base_price = ?,
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        updated_at = NOW() 
                    WHERE vehicle_type = ?
                ";
                $updateVehiclePricingStmt = $conn->prepare($updateVehiclePricingQuery);
                if ($updateVehiclePricingStmt) {
                    $updateVehiclePricingStmt->bind_param("dddds", 
                        $basePrice, 
                        $pricePerKm, 
                        $nightHaltCharge, 
                        $driverAllowance,
                        $vehicleId
                    );
                    $updateVehiclePricingStmt->execute();
                }
            } catch (Exception $e) {
                logError("Non-critical error updating vehicle_pricing table: " . $e->getMessage());
                // Continue anyway since we updated the main vehicles table
            }
            
            // Also update outstation_fares for consistency
            $success = updateOutstationFares($conn, $vehicleId, [
                'baseFare' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'nightHaltCharge' => $nightHaltCharge,
                'driverAllowance' => $driverAllowance
            ]);
            
            break;
            
        default:
            logError("Invalid trip type", ['tripType' => $tripType]);
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid trip type: ' . $tripType], 400);
            exit;
    }
    
    if ($success) {
        sendJsonResponse(['status' => 'success', 'message' => 'Pricing updated successfully for ' . $tripType, 'vehicleId' => $vehicleId]);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to update pricing'], 500);
    }
} 
// Handle GET request to fetch pricing
else if ($method === 'GET') {
    // Get all vehicles pricing data
    $query = "SELECT id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance FROM vehicles WHERE is_active = 1 ORDER BY name";
    $result = $conn->query($query);
    
    if (!$result) {
        logError("Database error fetching vehicle pricing", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    $vehicles = [];
    
    while ($row = $result->fetch_assoc()) {
        $vehicleId = $row['id'] ?? $row['vehicle_id'];
        $vehicles[] = [
            'vehicleId' => $vehicleId,
            'vehicleType' => $row['name'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'nightHaltCharge' => (float)$row['night_halt_charge'],
            'driverAllowance' => (float)$row['driver_allowance']
        ];
    }
    
    sendJsonResponse($vehicles);
} else {
    // Method not allowed
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close database connection
$conn->close();
?>
