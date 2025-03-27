
<?php
/**
 * This API endpoint updates outstation fares for a vehicle
 * It handles the update in both outstation_fares and vehicle_pricing tables for backward compatibility
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.4');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get POST data with multiple field name fallbacks
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
    $basePrice = isset($_POST['basePrice']) ? floatval($_POST['basePrice']) : (isset($_POST['base_price']) ? floatval($_POST['base_price']) : 0);
    $pricePerKm = isset($_POST['pricePerKm']) ? floatval($_POST['pricePerKm']) : (isset($_POST['price_per_km']) ? floatval($_POST['price_per_km']) : 0);
    $nightHalt = isset($_POST['nightHalt']) ? floatval($_POST['nightHalt']) : (isset($_POST['nightHaltCharge']) ? floatval($_POST['nightHaltCharge']) : (isset($_POST['night_halt_charge']) ? floatval($_POST['night_halt_charge']) : 0));
    $driverAllowance = isset($_POST['driverAllowance']) ? floatval($_POST['driverAllowance']) : (isset($_POST['driver_allowance']) ? floatval($_POST['driver_allowance']) : 0);
    $roundTripBasePrice = isset($_POST['roundTripBasePrice']) ? floatval($_POST['roundTripBasePrice']) : (isset($_POST['roundtrip_base_price']) ? floatval($_POST['roundtrip_base_price']) : 0);
    $roundTripPricePerKm = isset($_POST['roundTripPricePerKm']) ? floatval($_POST['roundTripPricePerKm']) : (isset($_POST['roundtrip_price_per_km']) ? floatval($_POST['roundtrip_price_per_km']) : 0);

    // If round trip values are not provided, use one-way values with a small discount
    if ($roundTripBasePrice <= 0 && $basePrice > 0) {
        $roundTripBasePrice = $basePrice * 0.95; // 5% discount on base price for round trip
    }
    
    if ($roundTripPricePerKm <= 0 && $pricePerKm > 0) {
        $roundTripPricePerKm = $pricePerKm * 0.85; // 15% discount on per km for round trip
    }

    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    // Log the request details
    error_log("Updating outstation fares for vehicle $vehicleId: basePrice=$basePrice, pricePerKm=$pricePerKm, nightHalt=$nightHalt, driverAllowance=$driverAllowance, roundTripBasePrice=$roundTripBasePrice, roundTripPricePerKm=$roundTripPricePerKm");

    // Begin transaction
    $conn->begin_transaction();

    // First check if the tables exist, if not create them
    $checkTableQueries = [
        "outstation_fares" => "SHOW TABLES LIKE 'outstation_fares'",
        "vehicle_pricing" => "SHOW TABLES LIKE 'vehicle_pricing'"
    ];
    
    foreach ($checkTableQueries as $table => $query) {
        $result = $conn->query($query);
        if ($result && $result->num_rows === 0) {
            // Table doesn't exist, create it
            if ($table === "outstation_fares") {
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS outstation_fares (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                if (!$conn->query($createTableSql)) {
                    throw new Exception("Failed to create outstation_fares table: " . $conn->error);
                }
                
                error_log("Created outstation_fares table");
            } else if ($table === "vehicle_pricing") {
                $createVehiclePricingSQL = "
                    CREATE TABLE IF NOT EXISTS vehicle_pricing (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        trip_type VARCHAR(50) NOT NULL,
                        base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                if (!$conn->query($createVehiclePricingSQL)) {
                    throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
                }
                
                error_log("Created vehicle_pricing table");
            }
        }
    }

    // ALWAYS update outstation_fares table first - it's our primary source
    // Check if the vehicle already exists in the specialized table
    $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Update existing record
        $updateQuery = "
            UPDATE outstation_fares
            SET base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                roundtrip_base_price = ?,
                roundtrip_price_per_km = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param('dddddds', $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm, $vehicleId);
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update outstation_fares: " . $conn->error);
        }
        
        error_log("Updated existing record in outstation_fares for $vehicleId");
    } else {
        // Insert new record
        $insertQuery = "
            INSERT INTO outstation_fares (
                vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, roundtrip_base_price, roundtrip_price_per_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sdddddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance, $roundTripBasePrice, $roundTripPricePerKm);
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert into outstation_fares: " . $conn->error);
        }
        
        error_log("Inserted new record in outstation_fares for $vehicleId");
    }

    // Now make sure this vehicle exists in the vehicles table (for completeness)
    $checkVehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
    $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
    $checkVehicleStmt->bind_param('ss', $vehicleId, $vehicleId);
    $checkVehicleStmt->execute();
    $checkVehicleResult = $checkVehicleStmt->get_result();
    
    if ($checkVehicleResult->num_rows === 0) {
        // Vehicle doesn't exist in vehicles table, add it
        $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
        $insertVehicleQuery = "
            INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        ";
        
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        $insertVehicleStmt->bind_param('sss', $vehicleId, $vehicleId, $vehicleName);
        
        if (!$insertVehicleStmt->execute()) {
            error_log("Warning: Could not insert into vehicles table: " . $conn->error);
            // Continue anyway - this is not critical
        } else {
            error_log("Added vehicle to vehicles table: $vehicleId");
        }
    }

    // Now sync this data to vehicle_pricing for backward compatibility
    $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
    $checkVehiclePricingResult = $conn->query($checkVehiclePricingQuery);
    $vehiclePricingExists = $checkVehiclePricingResult && $checkVehiclePricingResult->num_rows > 0;

    if ($vehiclePricingExists) {
        // First sync the one-way fares
        $syncOneWayQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            ) VALUES (?, 'outstation', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        $syncOneWayStmt = $conn->prepare($syncOneWayQuery);
        $syncOneWayStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance);
        
        if (!$syncOneWayStmt->execute()) {
            throw new Exception("Failed to sync to vehicle_pricing outstation: " . $conn->error);
        }
        
        // Also for outstation-one-way type
        $syncOneWayTypeQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            ) VALUES (?, 'outstation-one-way', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        $syncOneWayTypeStmt = $conn->prepare($syncOneWayTypeQuery);
        $syncOneWayTypeStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHalt, $driverAllowance);
        
        if (!$syncOneWayTypeStmt->execute()) {
            throw new Exception("Failed to sync to vehicle_pricing one-way: " . $conn->error);
        }
        
        error_log("Synced one-way fares to vehicle_pricing for $vehicleId");
        
        // Now sync the round-trip fares
        $syncRoundTripQuery = "
            INSERT INTO vehicle_pricing (
                vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, updated_at
            ) VALUES (?, 'outstation-round-trip', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE 
                base_fare = VALUES(base_fare),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        $syncRoundTripStmt = $conn->prepare($syncRoundTripQuery);
        $syncRoundTripStmt->bind_param('sdddd', $vehicleId, $roundTripBasePrice, $roundTripPricePerKm, $nightHalt, $driverAllowance);
        
        if (!$syncRoundTripStmt->execute()) {
            throw new Exception("Failed to sync to vehicle_pricing round-trip: " . $conn->error);
        }
        
        error_log("Synced round-trip fares to vehicle_pricing for $vehicleId");
    }

    // Commit transaction
    $conn->commit();
    
    // Explicitly set the force refresh flag for the client-side
    $_SESSION['force_fare_refresh'] = true;
    
    // Create a debug object for response
    $debug = [
        'post_data' => $_POST,
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'request_params' => [
            'tripType' => 'outstation',
            'vehicleId' => $vehicleId, 
            'vehicle_id' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'timestamp' => date('Y-m-d H:i:s')
        ],
        'vehicle_created' => true
    ];
    
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully updated outstation fares for $vehicleId",
        'details' => [
            'vehicle_id' => $vehicleId,
            'base_price' => $basePrice,
            'price_per_km' => $pricePerKm,
            'night_halt_charge' => $nightHalt,
            'driver_allowance' => $driverAllowance,
            'roundtrip_base_price' => $roundTripBasePrice,
            'roundtrip_price_per_km' => $roundTripPricePerKm,
            'vehicle_created' => true,
            'synced_to_vehicle_pricing' => true
        ],
        'debug' => $debug
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in direct-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
