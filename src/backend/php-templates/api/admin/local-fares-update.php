
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

    $conn = getDbConnection();

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
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
    }

    // Check if fare exists
    $checkFareQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkFareQuery);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $fareExists = ($checkResult->num_rows > 0);

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
            throw new Exception("Failed to update local fare: " . $updateStmt->error);
        }
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
            throw new Exception("Failed to insert local fare: " . $insertStmt->error);
        }
    }

    // Send success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fare updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
