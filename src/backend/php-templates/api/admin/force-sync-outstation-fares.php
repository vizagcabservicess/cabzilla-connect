
<?php
/**
 * This API endpoint force syncs between outstation_fares and vehicle_pricing tables
 * It can be called from frontend to ensure data consistency
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.0.1');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to log debugging information
function logDebug($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $logMessage .= " - " . json_encode($data);
    }
    error_log($logMessage);
}

logDebug("Starting force-sync-outstation-fares.php execution");

try {
    // Increase PHP limits for this script
    ini_set('max_execution_time', 300); // 5 minutes
    ini_set('memory_limit', '256M');    // 256 MB
    
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logDebug("Database connection successful");
    
    // Get vehicle ID if specified
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    $direction = isset($_GET['direction']) ? $_GET['direction'] : 'to_vehicle_pricing';
    $debugMode = isset($_GET['debug']) && $_GET['debug'] === 'true';
    
    // Log the operation
    logDebug("Starting force sync operation", [
        'vehicle_id' => $vehicleId ?: 'all vehicles',
        'direction' => $direction,
        'debug_mode' => $debugMode ? 'true' : 'false'
    ]);
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Make sure both tables exist
    $tables = ['outstation_fares', 'vehicle_pricing'];
    $tablesCreated = [];
    
    foreach ($tables as $table) {
        $checkTableQuery = "SHOW TABLES LIKE '$table'";
        $tableExists = $conn->query($checkTableQuery)->num_rows > 0;
        
        if (!$tableExists) {
            logDebug("Table $table does not exist, creating it");
            
            if ($table === 'outstation_fares') {
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
                
                if ($conn->query($createTableSql)) {
                    $tablesCreated[] = $table;
                    logDebug("Created table: $table");
                } else {
                    throw new Exception("Failed to create table $table: " . $conn->error);
                }
                
                // Add default entries to the outstation_fares table
                $defaultData = "INSERT IGNORE INTO outstation_fares (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                            roundtrip_base_price, roundtrip_price_per_km) VALUES
                ('sedan', 4200, 14, 700, 250, 4000, 12),
                ('ertiga', 5400, 18, 1000, 250, 5000, 15),
                ('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
                ('tempo', 9000, 22, 1500, 300, 8500, 19),
                ('luxury', 10500, 25, 1500, 300, 10000, 22)";
                
                if ($conn->query($defaultData)) {
                    logDebug("Added default data to outstation_fares table");
                } else {
                    logDebug("Failed to add default data to outstation_fares table: " . $conn->error);
                }
                
            } else if ($table === 'vehicle_pricing') {
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
                
                if ($conn->query($createVehiclePricingSQL)) {
                    $tablesCreated[] = $table;
                    logDebug("Created table: $table");
                } else {
                    throw new Exception("Failed to create table $table: " . $conn->error);
                }
            }
        } else {
            logDebug("Table $table already exists");
        }
    }
    
    $updated = 0;
    $inserted = 0;
    $errors = [];
    
    if ($direction === 'to_vehicle_pricing') {
        // Sync from outstation_fares to vehicle_pricing
        logDebug("Syncing from outstation_fares to vehicle_pricing");
        
        // Build the query to get fares
        $fareQuery = "SELECT * FROM outstation_fares";
        if ($vehicleId) {
            $fareQuery .= " WHERE vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        logDebug("Executing query: $fareQuery");
        $faresResult = $conn->query($fareQuery);
        
        if (!$faresResult) {
            throw new Exception("Failed to fetch fares: " . $conn->error);
        }
        
        if ($faresResult->num_rows === 0) {
            logDebug("No outstation fares found. Adding default fares.");
            
            // Add default entries if the table is empty
            $defaultData = "INSERT IGNORE INTO outstation_fares (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km) VALUES
            ('sedan', 4200, 14, 700, 250, 4000, 12),
            ('ertiga', 5400, 18, 1000, 250, 5000, 15),
            ('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
            ('tempo', 9000, 22, 1500, 300, 8500, 19),
            ('luxury', 10500, 25, 1500, 300, 10000, 22)";
            
            if ($conn->query($defaultData)) {
                logDebug("Added default data to outstation_fares table");
                // Re-run the query to get the newly inserted fares
                $faresResult = $conn->query($fareQuery);
                if (!$faresResult) {
                    throw new Exception("Failed to fetch fares after adding defaults: " . $conn->error);
                }
            } else {
                logDebug("Failed to add default data to outstation_fares table: " . $conn->error);
            }
        }
        
        while ($fare = $faresResult->fetch_assoc()) {
            $vid = $fare['vehicle_id'];
            $basePrice = $fare['base_price'];
            $pricePerKm = $fare['price_per_km'];
            $roundtripBasePrice = $fare['roundtrip_base_price'];
            $roundtripPricePerKm = $fare['roundtrip_price_per_km'];
            $driverAllowance = $fare['driver_allowance'];
            $nightHaltCharge = $fare['night_halt_charge'];
            
            logDebug("Processing vehicle: $vid");
            
            // Update or insert one-way record
            $oneWayQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $basePrice,
                    price_per_km = $pricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($oneWayQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                    logDebug("Updated outstation fare for $vid");
                }
            } else {
                $errorMsg = "Failed to sync outstation fares for $vid: " . $conn->error;
                $errors[] = $errorMsg;
                logDebug($errorMsg);
            }
            
            // Also for outstation-one-way type
            $oneWayTypeQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation-one-way', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $basePrice,
                    price_per_km = $pricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($oneWayTypeQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                    logDebug("Updated outstation-one-way fare for $vid");
                }
            } else {
                $errorMsg = "Failed to sync outstation-one-way fares for $vid: " . $conn->error;
                $errors[] = $errorMsg;
                logDebug($errorMsg);
            }
            
            // Update or insert round-trip record
            $roundTripQuery = "
                INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance)
                VALUES 
                    ('$vid', 'outstation-round-trip', $roundtripBasePrice, $roundtripPricePerKm, $nightHaltCharge, $driverAllowance)
                ON DUPLICATE KEY UPDATE 
                    base_fare = $roundtripBasePrice,
                    price_per_km = $roundtripPricePerKm,
                    night_halt_charge = $nightHaltCharge,
                    driver_allowance = $driverAllowance,
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            if ($conn->query($roundTripQuery)) {
                if ($conn->affected_rows > 0) {
                    $updated++;
                    logDebug("Updated round-trip fare for $vid");
                }
            } else {
                $errorMsg = "Failed to sync round-trip fares for $vid: " . $conn->error;
                $errors[] = $errorMsg;
                logDebug($errorMsg);
            }
        }
    } else {
        // Sync from vehicle_pricing to outstation_fares
        logDebug("Syncing from vehicle_pricing to outstation_fares");
        
        // First get the one-way prices from vehicle_pricing
        $outstationTypes = ['outstation', 'outstation-one-way'];
        $typesStr = "'" . implode("','", $outstationTypes) . "'";
        
        $pricingQuery = "SELECT vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance FROM vehicle_pricing WHERE trip_type IN ($typesStr)";
        if ($vehicleId) {
            $pricingQuery .= " AND vehicle_id = '" . $conn->real_escape_string($vehicleId) . "'";
        }
        
        logDebug("Executing query: $pricingQuery");
        $pricingResult = $conn->query($pricingQuery);
        
        if (!$pricingResult) {
            throw new Exception("Failed to fetch pricing: " . $conn->error);
        }
        
        if ($pricingResult->num_rows === 0) {
            logDebug("No vehicle_pricing records found for outstation/outstation-one-way trip types");
        } else {
            // Process each vehicle's one-way pricing
            $processedVehicles = [];
            while ($pricing = $pricingResult->fetch_assoc()) {
                $vid = $pricing['vehicle_id'];
                
                // Skip if we've already processed this vehicle
                if (in_array($vid, $processedVehicles)) {
                    continue;
                }
                
                $processedVehicles[] = $vid;
                $basePrice = $pricing['base_fare'];
                $pricePerKm = $pricing['price_per_km'];
                $nightHaltCharge = $pricing['night_halt_charge'];
                $driverAllowance = $pricing['driver_allowance'];
                
                logDebug("Processing vehicle from vehicle_pricing: $vid");
                
                // Get round-trip data
                $rtQuery = "SELECT base_fare, price_per_km FROM vehicle_pricing WHERE vehicle_id = '$vid' AND trip_type = 'outstation-round-trip'";
                $rtResult = $conn->query($rtQuery);
                
                // Default round-trip prices (if no specific record)
                $roundtripBasePrice = $basePrice * 0.95; // 5% discount
                $roundtripPricePerKm = $pricePerKm * 0.85; // 15% discount
                
                if ($rtResult && $rtResult->num_rows > 0) {
                    $rtData = $rtResult->fetch_assoc();
                    $roundtripBasePrice = $rtData['base_fare'];
                    $roundtripPricePerKm = $rtData['price_per_km'];
                    logDebug("Found round-trip pricing for $vid");
                } else {
                    logDebug("No round-trip pricing found for $vid, using calculated values");
                }
                
                // Check if the vehicle exists in outstation_fares
                $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '$vid'";
                $checkResult = $conn->query($checkQuery);
                
                if ($checkResult && $checkResult->num_rows > 0) {
                    // Update existing record
                    $updateQuery = "
                        UPDATE outstation_fares SET
                            base_price = $basePrice,
                            price_per_km = $pricePerKm,
                            night_halt_charge = $nightHaltCharge,
                            driver_allowance = $driverAllowance,
                            roundtrip_base_price = $roundtripBasePrice,
                            roundtrip_price_per_km = $roundtripPricePerKm,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE vehicle_id = '$vid'
                    ";
                    
                    if ($conn->query($updateQuery)) {
                        if ($conn->affected_rows > 0) {
                            $updated++;
                            logDebug("Updated outstation_fares for $vid");
                        }
                    } else {
                        $errorMsg = "Failed to update outstation_fares for $vid: " . $conn->error;
                        $errors[] = $errorMsg;
                        logDebug($errorMsg);
                    }
                } else {
                    // Insert new record
                    $insertQuery = "
                        INSERT INTO outstation_fares (
                            vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                            roundtrip_base_price, roundtrip_price_per_km
                        ) VALUES (
                            '$vid', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance,
                            $roundtripBasePrice, $roundtripPricePerKm
                        )
                    ";
                    
                    if ($conn->query($insertQuery)) {
                        $inserted++;
                        logDebug("Inserted new record in outstation_fares for $vid");
                    } else {
                        $errorMsg = "Failed to insert into outstation_fares for $vid: " . $conn->error;
                        $errors[] = $errorMsg;
                        logDebug($errorMsg);
                    }
                }
            }
        }
    }
    
    // Commit the transaction
    $conn->commit();
    logDebug("Transaction committed successfully");
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced records between outstation_fares and vehicle_pricing",
        'direction' => $direction === 'to_vehicle_pricing' ? 'outstation_fares → vehicle_pricing' : 'vehicle_pricing → outstation_fares',
        'updated' => $updated,
        'inserted' => $inserted,
        'tablesCreated' => $tablesCreated,
        'timestamp' => time(),
        'errors' => $errors
    ]);
    
    logDebug("Completed force-sync-outstation-fares.php execution successfully");
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
        logDebug("Transaction rolled back due to error");
    }
    
    $errorMessage = $e->getMessage();
    $errorTrace = $e->getTraceAsString();
    
    logDebug("Error in force-sync-outstation-fares.php: $errorMessage", ['trace' => $errorTrace]);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage,
        'trace' => $errorTrace,
        'timestamp' => time()
    ]);
}

// Exit cleanly
exit;
