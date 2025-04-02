
<?php
/**
 * direct-outstation-fares.php - Direct API endpoint for outstation fare updates
 * Uses vehicle_id exclusively to prevent duplicate vehicle creation
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be'; 
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (Exception $e) {
        throw new Exception("Database connection error: " . $e->getMessage());
    }
}

// Log message to file
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    error_log($logMessage, 3, __DIR__ . '/../../logs/direct-outstation-fares.log');
}

// CRITICAL: Comprehensive ID mapping with all known numeric IDs and their proper vehicle_ids
$numericIdMapExtended = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '180' => 'etios',
    '1266' => 'MPV',
    '592' => 'Urbania',
    '1270' => 'MPV',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    // Special cases observed in logs
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga',
    // Additional mappings for problematic IDs reported by user
    '1281' => 'MPV',
    '1282' => 'sedan',
    '1,1266,180' => 'sedan', // Handle comma-separated IDs as well
];

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Handle GET request to retrieve outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // IMPORTANT CHANGE: Get all vehicles with left join to outstation_fares
        // This ensures we display ALL vehicles with or without fares
        $query = "
            SELECT v.id, v.vehicle_id, v.name, of.* 
            FROM vehicles v
            LEFT JOIN outstation_fares of ON v.vehicle_id = of.vehicle_id
            WHERE v.is_active = 1 OR :includeInactive = 'true'
            ORDER BY v.name
        ";
        
        $includeInactive = isset($_GET['includeInactive']) ? $_GET['includeInactive'] : 'false';
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':includeInactive', $includeInactive);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $fares = [];
        foreach ($results as $row) {
            $vehicleId = $row['vehicle_id'] ?? $row['id'];
            $fares[$vehicleId] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $row['name'] ?? '',
                'basePrice' => isset($row['base_price']) ? floatval($row['base_price']) : 0,
                'pricePerKm' => isset($row['price_per_km']) ? floatval($row['price_per_km']) : 0,
                'nightHaltCharge' => isset($row['night_halt_charge']) ? floatval($row['night_halt_charge']) : 0,
                'driverAllowance' => isset($row['driver_allowance']) ? floatval($row['driver_allowance']) : 0,
                'roundTripBasePrice' => isset($row['roundtrip_base_price']) ? floatval($row['roundtrip_base_price']) : 0,
                'roundTripPricePerKm' => isset($row['roundtrip_price_per_km']) ? floatval($row['roundtrip_price_per_km']) : 0
            ];
        }
        
        // Convert to array and return for consistency with other endpoints
        echo json_encode([
            'status' => 'success',
            'fares' => array_values($fares), // Return as array instead of object
            'count' => count($fares)
        ]);
        exit;
    }
    
    // Handle POST request to update outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get vehicle ID
        $rawVehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
        logMessage("Original vehicle ID received: " . $rawVehicleId);
        
        // CRITICAL: Never use pure numeric IDs - convert them to proper vehicle_id values
        $vehicleId = $rawVehicleId;
        
        // Remove 'item-' prefix if it exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            logMessage("Removed 'item-' prefix: " . $vehicleId);
        }
        
        // Handle numeric IDs by mapping to proper vehicle_id
        if (is_numeric($vehicleId) || strpos($vehicleId, ',') !== false) {
            if (isset($numericIdMapExtended[$vehicleId])) {
                $originalId = $vehicleId;
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped numeric/list ID $originalId to vehicle_id: $vehicleId");
            } else {
                logMessage("REJECTED: Unmapped numeric/list ID not allowed: " . $vehicleId);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Cannot use ID '$vehicleId'. Please use proper vehicle_id like 'sedan', 'ertiga', etc."
                ]);
                exit;
            }
        }
        
        // Validate vehicle ID
        if (empty($vehicleId)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Vehicle ID is required'
            ]);
            exit;
        }
        
        // Final check to reject any numeric IDs that slipped through
        if (is_numeric($vehicleId) || strpos($vehicleId, ',') !== false) {
            logMessage("FINAL REJECTION: ID is still numeric/list after processing: " . $vehicleId);
            echo json_encode([
                'status' => 'error', 
                'message' => "Cannot use ID '$vehicleId'. Please use proper vehicle_id."
            ]);
            exit;
        }
        
        // Get fare values with fallbacks for different field naming styles
        $basePrice = isset($_POST['basePrice']) ? floatval($_POST['basePrice']) : 
                   (isset($_POST['oneWayBasePrice']) ? floatval($_POST['oneWayBasePrice']) : 0);
                   
        $pricePerKm = isset($_POST['pricePerKm']) ? floatval($_POST['pricePerKm']) : 
                     (isset($_POST['oneWayPricePerKm']) ? floatval($_POST['oneWayPricePerKm']) : 0);
                     
        $nightHaltCharge = isset($_POST['nightHaltCharge']) ? floatval($_POST['nightHaltCharge']) : 
                          (isset($_POST['nightHalt']) ? floatval($_POST['nightHalt']) : 0);
                          
        $driverAllowance = isset($_POST['driverAllowance']) ? floatval($_POST['driverAllowance']) : 0;
        
        $roundTripBasePrice = isset($_POST['roundTripBasePrice']) ? floatval($_POST['roundTripBasePrice']) : 
                            (isset($_POST['roundtripBasePrice']) ? floatval($_POST['roundtripBasePrice']) : 0);
                            
        $roundTripPricePerKm = isset($_POST['roundTripPricePerKm']) ? floatval($_POST['roundTripPricePerKm']) : 
                              (isset($_POST['roundtripPricePerKm']) ? floatval($_POST['roundtripPricePerKm']) : 0);
        
        // Begin transaction
        $conn->beginTransaction();
        
        try {
            // First ensure vehicle exists in vehicles table - ALWAYS USE vehicle_id
            $checkVehicleQuery = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id = ?";
            $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
            $checkVehicleStmt->execute([$vehicleId]);
            $vehicleExists = $checkVehicleStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$vehicleExists) {
                // Vehicle doesn't exist, create it
                $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                
                $insertVehicleQuery = "
                    INSERT INTO vehicles (vehicle_id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, 1, NOW(), NOW())
                ";
                
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->execute([$vehicleId, $vehicleName]);
                
                logMessage("Created new vehicle: " . $vehicleId);
            } else {
                logMessage("Vehicle exists: " . print_r($vehicleExists, true));
            }
            
            // Check if outstation_fares table exists
            $checkTableQuery = "SHOW TABLES LIKE 'outstation_fares'";
            $checkTableStmt = $conn->query($checkTableQuery);
            $tableExists = ($checkTableStmt->rowCount() > 0);
            
            if (!$tableExists) {
                // Create the table
                $createTableQuery = "
                    CREATE TABLE outstation_fares (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                        roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                        roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                $conn->exec($createTableQuery);
                logMessage("Created outstation_fares table");
            }
            
            // Check if fare record exists for this vehicle
            $checkFareQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
            $checkFareStmt = $conn->prepare($checkFareQuery);
            $checkFareStmt->execute([$vehicleId]);
            $fareExists = $checkFareStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($fareExists) {
                // Update existing record
                $updateQuery = "
                    UPDATE outstation_fares
                    SET base_price = ?,
                        price_per_km = ?,
                        night_halt_charge = ?,
                        driver_allowance = ?,
                        roundtrip_base_price = ?,
                        roundtrip_price_per_km = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->execute([
                    $basePrice,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance,
                    $roundTripBasePrice,
                    $roundTripPricePerKm,
                    $vehicleId
                ]);
                
                logMessage("Updated outstation fares for vehicle: " . $vehicleId);
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id,
                        base_price,
                        price_per_km,
                        night_halt_charge,
                        driver_allowance,
                        roundtrip_base_price,
                        roundtrip_price_per_km,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->execute([
                    $vehicleId,
                    $basePrice,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance,
                    $roundTripBasePrice,
                    $roundTripPricePerKm
                ]);
                
                logMessage("Inserted outstation fares for vehicle: " . $vehicleId);
            }
            
            // Also update the vehicle_pricing table for backward compatibility
            $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
            $checkVehiclePricingStmt = $conn->query($checkVehiclePricingQuery);
            $vehiclePricingExists = ($checkVehiclePricingStmt->rowCount() > 0);
            
            if ($vehiclePricingExists) {
                // Check if entry exists
                $checkPricingQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'";
                $checkPricingStmt = $conn->prepare($checkPricingQuery);
                $checkPricingStmt->execute([$vehicleId]);
                $pricingExists = $checkPricingStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($pricingExists) {
                    // Update existing record
                    $updatePricingQuery = "
                        UPDATE vehicle_pricing
                        SET base_fare = ?,
                            price_per_km = ?,
                            night_halt_charge = ?,
                            driver_allowance = ?,
                            updated_at = NOW()
                        WHERE vehicle_id = ? AND trip_type = 'outstation'
                    ";
                    
                    $updatePricingStmt = $conn->prepare($updatePricingQuery);
                    $updatePricingStmt->execute([
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance,
                        $vehicleId
                    ]);
                } else {
                    // Insert new record
                    $insertPricingQuery = "
                        INSERT INTO vehicle_pricing (
                            vehicle_id,
                            trip_type,
                            base_fare,
                            price_per_km, 
                            night_halt_charge,
                            driver_allowance,
                            created_at,
                            updated_at
                        ) VALUES (?, 'outstation', ?, ?, ?, ?, NOW(), NOW())
                    ";
                    
                    $insertPricingStmt = $conn->prepare($insertPricingQuery);
                    $insertPricingStmt->execute([
                        $vehicleId,
                        $basePrice,
                        $pricePerKm,
                        $nightHaltCharge,
                        $driverAllowance
                    ]);
                }
                
                logMessage("Synced to vehicle_pricing for backward compatibility");
            }
            
            // Commit the transaction
            $conn->commit();
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => "Outstation fares updated successfully for $vehicleId",
                'vehicleId' => $vehicleId,
                'originalId' => $rawVehicleId,
                'fares' => [
                    'basePrice' => $basePrice,
                    'pricePerKm' => $pricePerKm,
                    'nightHaltCharge' => $nightHaltCharge,
                    'driverAllowance' => $driverAllowance,
                    'roundTripBasePrice' => $roundTripBasePrice,
                    'roundTripPricePerKm' => $roundTripPricePerKm
                ]
            ]);
            
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollBack();
            logMessage("Error updating fares: " . $e->getMessage());
            throw $e;
        }
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid request method'
        ]);
    }
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
