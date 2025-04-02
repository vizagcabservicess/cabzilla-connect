
<?php
/**
 * direct-local-fares.php - Direct API endpoint for local fare package updates
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
    error_log($logMessage, 3, __DIR__ . '/../../logs/direct-local-fares.log');
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
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga'
];

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Handle GET request to retrieve local fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all vehicles with their local package fares
        $query = "
            SELECT v.id, v.vehicle_id, v.name, lpf.* 
            FROM vehicles v
            LEFT JOIN local_package_fares lpf ON v.vehicle_id = lpf.vehicle_id
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
                'price4hrs40km' => isset($row['price_4hr_40km']) ? floatval($row['price_4hr_40km']) : 0,
                'price8hrs80km' => isset($row['price_8hr_80km']) ? floatval($row['price_8hr_80km']) : 0,
                'price10hrs100km' => isset($row['price_10hr_100km']) ? floatval($row['price_10hr_100km']) : 0,
                'priceExtraKm' => isset($row['extra_km_rate']) ? floatval($row['extra_km_rate']) : 0,
                'priceExtraHour' => isset($row['extra_hour_rate']) ? floatval($row['extra_hour_rate']) : 0
            ];
        }
        
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'count' => count($fares)
        ]);
        exit;
    }
    
    // Handle POST request to update local fares
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
        if (is_numeric($vehicleId)) {
            if (isset($numericIdMapExtended[$vehicleId])) {
                $originalId = $vehicleId;
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped numeric ID $originalId to vehicle_id: $vehicleId");
            } else {
                logMessage("REJECTED: Unmapped numeric ID not allowed: " . $vehicleId);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id like 'sedan', 'ertiga', etc."
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
        if (is_numeric($vehicleId)) {
            logMessage("FINAL REJECTION: ID is still numeric after processing: " . $vehicleId);
            echo json_encode([
                'status' => 'error', 
                'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id."
            ]);
            exit;
        }
        
        // Get fare values with fallbacks for different field naming styles
        $price4hrs40km = isset($_POST['price4hr40km']) ? floatval($_POST['price4hr40km']) : 
                      (isset($_POST['price4hrs40km']) ? floatval($_POST['price4hrs40km']) : 
                      (isset($_POST['package4hr40km']) ? floatval($_POST['package4hr40km']) : 0));
                      
        $price8hrs80km = isset($_POST['price8hr80km']) ? floatval($_POST['price8hr80km']) : 
                      (isset($_POST['price8hrs80km']) ? floatval($_POST['price8hrs80km']) : 
                      (isset($_POST['package8hr80km']) ? floatval($_POST['package8hr80km']) : 0));
                      
        $price10hrs100km = isset($_POST['price10hr100km']) ? floatval($_POST['price10hr100km']) : 
                        (isset($_POST['price10hrs100km']) ? floatval($_POST['price10hrs100km']) : 
                        (isset($_POST['package10hr100km']) ? floatval($_POST['package10hr100km']) : 0));
                        
        $priceExtraKm = isset($_POST['extraKmRate']) ? floatval($_POST['extraKmRate']) : 
                      (isset($_POST['priceExtraKm']) ? floatval($_POST['priceExtraKm']) : 0);
                      
        $priceExtraHour = isset($_POST['extraHourRate']) ? floatval($_POST['extraHourRate']) : 
                        (isset($_POST['priceExtraHour']) ? floatval($_POST['priceExtraHour']) : 0);
        
        // Process packages JSON if provided
        if (isset($_POST['packages'])) {
            $packages = $_POST['packages'];
            if (!is_array($packages)) {
                try {
                    $packageData = json_decode($packages, true);
                    if (is_array($packageData)) {
                        if (isset($packageData['4hrs-40km'])) {
                            $price4hrs40km = floatval($packageData['4hrs-40km']);
                        }
                        if (isset($packageData['8hrs-80km'])) {
                            $price8hrs80km = floatval($packageData['8hrs-80km']);
                        }
                        if (isset($packageData['10hrs-100km'])) {
                            $price10hrs100km = floatval($packageData['10hrs-100km']);
                        }
                    }
                } catch (Exception $e) {
                    logMessage("Error parsing packages JSON: " . $e->getMessage());
                }
            }
        }
        
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
                    INSERT INTO vehicles (id, vehicle_id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, 1, NOW(), NOW())
                ";
                
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName]);
                
                logMessage("Created new vehicle: " . $vehicleId);
            } else {
                logMessage("Vehicle exists: " . print_r($vehicleExists, true));
            }
            
            // Check if local_package_fares table exists
            $checkTableQuery = "SHOW TABLES LIKE 'local_package_fares'";
            $checkTableStmt = $conn->query($checkTableQuery);
            $tableExists = ($checkTableStmt->rowCount() > 0);
            
            if (!$tableExists) {
                // Create the table
                $createTableQuery = "
                    CREATE TABLE local_package_fares (
                        id INT(11) NOT NULL AUTO_INCREMENT,
                        vehicle_id VARCHAR(50) NOT NULL,
                        price_4hr_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_8hr_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_10hr_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        extra_km_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
                        extra_hour_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                $conn->exec($createTableQuery);
                logMessage("Created local_package_fares table");
            }
            
            // Check if fare record exists for this vehicle
            $checkFareQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
            $checkFareStmt = $conn->prepare($checkFareQuery);
            $checkFareStmt->execute([$vehicleId]);
            $fareExists = $checkFareStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($fareExists) {
                // Update existing record
                $updateQuery = "
                    UPDATE local_package_fares
                    SET price_4hr_40km = ?,
                        price_8hr_80km = ?,
                        price_10hr_100km = ?,
                        extra_km_rate = ?,
                        extra_hour_rate = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->execute([
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour,
                    $vehicleId
                ]);
                
                logMessage("Updated local fares for vehicle: " . $vehicleId);
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO local_package_fares (
                        vehicle_id,
                        price_4hr_40km,
                        price_8hr_80km,
                        price_10hr_100km,
                        extra_km_rate,
                        extra_hour_rate,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->execute([
                    $vehicleId,
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour
                ]);
                
                logMessage("Inserted local fares for vehicle: " . $vehicleId);
            }
            
            // Also update the vehicle_pricing table for backward compatibility
            $checkVehiclePricingQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
            $checkVehiclePricingStmt = $conn->query($checkVehiclePricingQuery);
            $vehiclePricingExists = ($checkVehiclePricingStmt->rowCount() > 0);
            
            if ($vehiclePricingExists) {
                // Check if entry exists
                $checkPricingQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
                $checkPricingStmt = $conn->prepare($checkPricingQuery);
                $checkPricingStmt->execute([$vehicleId]);
                $pricingExists = $checkPricingStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($pricingExists) {
                    // Update existing record
                    $updatePricingQuery = "
                        UPDATE vehicle_pricing
                        SET local_package_4hr = ?,
                            local_package_8hr = ?,
                            local_package_10hr = ?,
                            extra_km_charge = ?,
                            extra_hour_charge = ?,
                            updated_at = NOW()
                        WHERE vehicle_id = ? AND trip_type = 'local'
                    ";
                    
                    $updatePricingStmt = $conn->prepare($updatePricingQuery);
                    $updatePricingStmt->execute([
                        $price4hrs40km,
                        $price8hrs80km,
                        $price10hrs100km,
                        $priceExtraKm,
                        $priceExtraHour,
                        $vehicleId
                    ]);
                } else {
                    // Insert new record
                    $insertPricingQuery = "
                        INSERT INTO vehicle_pricing (
                            vehicle_id,
                            trip_type,
                            local_package_4hr,
                            local_package_8hr,
                            local_package_10hr,
                            extra_km_charge,
                            extra_hour_charge,
                            created_at,
                            updated_at
                        ) VALUES (?, 'local', ?, ?, ?, ?, ?, NOW(), NOW())
                    ";
                    
                    $insertPricingStmt = $conn->prepare($insertPricingQuery);
                    $insertPricingStmt->execute([
                        $vehicleId,
                        $price4hrs40km,
                        $price8hrs80km,
                        $price10hrs100km,
                        $priceExtraKm,
                        $priceExtraHour
                    ]);
                }
                
                logMessage("Synced to vehicle_pricing for backward compatibility");
            }
            
            // Commit the transaction
            $conn->commit();
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => "Fare updated successfully for $vehicleId",
                'vehicleId' => $vehicleId,
                'originalId' => $rawVehicleId,
                'fares' => [
                    'price4hrs40km' => $price4hrs40km,
                    'price8hrs80km' => $price8hrs80km,
                    'price10hrs100km' => $price10hrs100km,
                    'priceExtraKm' => $priceExtraKm,
                    'priceExtraHour' => $priceExtraHour
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
