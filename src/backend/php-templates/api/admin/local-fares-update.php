
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Set up log file
$logFile = $logDir . '/local_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log helper function
function logMessage($message) {
    global $logFile, $timestamp;
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Log the request
logMessage("Request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Request payload: " . file_get_contents('php://input'));

require_once '../../config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data
    $postData = $_POST;
    
    // If no POST data, try to get it from the request body
    if (empty($postData)) {
        $json = file_get_contents('php://input');
        $postData = json_decode($json, true);
    }

    // Log the processed data
    logMessage("Processed data: " . print_r($postData, true));

    // Check required fields
    if (!isset($postData['vehicleId']) && !isset($postData['vehicle_id'])) {
        throw new Exception('Vehicle ID is required');
    }

    $vehicleId = isset($postData['vehicleId']) ? $postData['vehicleId'] : $postData['vehicle_id'];
    $price4hrs40km = isset($postData['price4hrs40km']) ? floatval($postData['price4hrs40km']) : 0;
    $price8hrs80km = isset($postData['price8hrs80km']) ? floatval($postData['price8hrs80km']) : 0;
    $price10hrs100km = isset($postData['price10hrs100km']) ? floatval($postData['price10hrs100km']) : 0;
    $priceExtraKm = isset($postData['priceExtraKm']) ? floatval($postData['priceExtraKm']) : 0;
    $priceExtraHour = isset($postData['priceExtraHour']) ? floatval($postData['priceExtraHour']) : 0;

    // Log the extracted values
    logMessage("Extracted values: 
        vehicleId = $vehicleId, 
        price4hrs40km = $price4hrs40km, 
        price8hrs80km = $price8hrs80km, 
        price10hrs100km = $price10hrs100km, 
        priceExtraKm = $priceExtraKm, 
        priceExtraHour = $priceExtraHour");

    $conn = getDbConnection();

    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Check if the table exists
    $tableCheckQuery = "SELECT COUNT(*) as count FROM information_schema.tables 
                         WHERE table_schema = DATABASE() AND table_name = 'local_package_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    $tableExists = ($tableCheckResult->fetch_assoc()['count'] > 0);

    // Create table if it doesn't exist
    if (!$tableExists) {
        $createTableSql = "CREATE TABLE local_package_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            price_4hrs_40km DECIMAL(10, 2) NOT NULL DEFAULT 0,
            price_8hrs_80km DECIMAL(10, 2) NOT NULL DEFAULT 0,
            price_10hrs_100km DECIMAL(10, 2) NOT NULL DEFAULT 0,
            price_extra_km DECIMAL(10, 2) NOT NULL DEFAULT 0,
            price_extra_hour DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (vehicle_id)
        )";
        
        if (!$conn->query($createTableSql)) {
            logMessage("Failed to create local_package_fares table: " . $conn->error);
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
        
        logMessage("Created local_package_fares table");
    }

    // Check the table structure to ensure column names match
    $columnsQuery = "SHOW COLUMNS FROM local_package_fares";
    $columnsResult = $conn->query($columnsQuery);
    $columns = [];
    
    while ($column = $columnsResult->fetch_assoc()) {
        $columns[] = $column['Field'];
    }
    
    // Define the expected column names and any alternatives
    $expectedColumns = [
        'price_4hrs_40km' => ['price_4hr_40km', 'price_4hr', 'local_package_4hr'],
        'price_8hrs_80km' => ['price_8hr_80km', 'price_8hr', 'local_package_8hr'],
        'price_10hrs_100km' => ['price_10hr_100km', 'price_10hr', 'local_package_10hr'],
        'price_extra_km' => ['extra_km', 'extra_km_rate', 'extra_km_charge'],
        'price_extra_hour' => ['extra_hour', 'extra_hour_rate', 'extra_hour_charge']
    ];
    
    // Check if we need to alter the table to match our expected column names
    $alterSql = '';
    foreach ($expectedColumns as $expected => $alternatives) {
        if (!in_array($expected, $columns)) {
            // Expected column doesn't exist, check for alternatives
            $found = false;
            foreach ($alternatives as $alt) {
                if (in_array($alt, $columns)) {
                    // Alternative found, rename it
                    $alterSql .= "ALTER TABLE local_package_fares CHANGE `$alt` `$expected` DECIMAL(10,2) NOT NULL DEFAULT 0; ";
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                // No alternative found, add the column
                $alterSql .= "ALTER TABLE local_package_fares ADD COLUMN `$expected` DECIMAL(10,2) NOT NULL DEFAULT 0; ";
            }
        }
    }
    
    // Execute any ALTER TABLE statements
    if (!empty($alterSql)) {
        $statements = explode(';', $alterSql);
        foreach ($statements as $statement) {
            if (trim($statement) !== '') {
                if (!$conn->query($statement)) {
                    logMessage("Error altering table: " . $statement . " - " . $conn->error);
                } else {
                    logMessage("Successfully executed: " . $statement);
                }
            }
        }
    }

    // Check if fare exists
    $checkFareQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkFareQuery);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $fareExists = ($checkResult->num_rows > 0);

    logMessage("Fare exists for vehicle $vehicleId: " . ($fareExists ? 'Yes' : 'No'));

    if ($fareExists) {
        // Update existing fare
        $updateQuery = "UPDATE local_package_fares SET 
                        price_4hrs_40km = ?,
                        price_8hrs_80km = ?,
                        price_10hrs_100km = ?,
                        price_extra_km = ?,
                        price_extra_hour = ?,
                        updated_at = NOW()
                        WHERE vehicle_id = ?";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param('ddddds', 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm, 
            $priceExtraHour, 
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            logMessage("Failed to update local fare: " . $updateStmt->error);
            throw new Exception("Failed to update local fare: " . $updateStmt->error);
        }
        
        logMessage("Successfully updated local fare for vehicle $vehicleId");
    } else {
        // Insert new fare
        $insertQuery = "INSERT INTO local_package_fares 
                        (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                        VALUES (?, ?, ?, ?, ?, ?)";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sddddd', 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm, 
            $priceExtraHour
        );
        
        if (!$insertStmt->execute()) {
            logMessage("Failed to insert local fare: " . $insertStmt->error);
            throw new Exception("Failed to insert local fare: " . $insertStmt->error);
        }
        
        logMessage("Successfully inserted local fare for vehicle $vehicleId");
    }

    // Also update the vehicle_pricing table for compatibility with other parts of the system
    // First check if it has the required local_package columns
    $checkVehiclePricingColumnsStmt = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'local_package_%'");
    $hasLocalPackageColumns = $checkVehiclePricingColumnsStmt->num_rows > 0;
    
    if ($hasLocalPackageColumns) {
        $syncQuery = "
            INSERT INTO vehicle_pricing (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge)
            VALUES (?, 'local', ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                local_package_4hr = VALUES(local_package_4hr),
                local_package_8hr = VALUES(local_package_8hr),
                local_package_10hr = VALUES(local_package_10hr),
                extra_km_charge = VALUES(extra_km_charge),
                extra_hour_charge = VALUES(extra_hour_charge)
        ";
        
        $syncStmt = $conn->prepare($syncQuery);
        $syncStmt->bind_param('sddddd', 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $priceExtraKm, 
            $priceExtraHour
        );
        
        if (!$syncStmt->execute()) {
            logMessage("Warning: Failed to sync with vehicle_pricing: " . $syncStmt->error);
            // We don't throw exception here to prevent failure of the main operation
        } else {
            logMessage("Successfully synced with vehicle_pricing table");
        }
    }

    // Send success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fare updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'price4hrs40km' => $price4hrs40km,
            'price8hrs80km' => $price8hrs80km,
            'price10hrs100km' => $price10hrs100km,
            'priceExtraKm' => $priceExtraKm,
            'priceExtraHour' => $priceExtraHour
        ]
    ]);
    
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
