
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
    $priceOneWay = isset($postData['priceOneWay']) ? floatval($postData['priceOneWay']) : 0;
    $priceRoundTrip = isset($postData['priceRoundTrip']) ? floatval($postData['priceRoundTrip']) : 0;
    $nightCharges = isset($postData['nightCharges']) ? floatval($postData['nightCharges']) : 0;
    $extraWaitingCharges = isset($postData['extraWaitingCharges']) ? floatval($postData['extraWaitingCharges']) : 0;

    $conn = getDbConnection();

    // Check if the table exists
    $tableCheckQuery = "SELECT COUNT(*) as count FROM information_schema.tables 
                         WHERE table_schema = DATABASE() AND table_name = 'airport_transfer_fares'";
    $tableCheckResult = $conn->query($tableCheckQuery);
    $tableExists = ($tableCheckResult->fetch_assoc()['count'] > 0);

    // Create table if it doesn't exist
    if (!$tableExists) {
        $createTableSql = "CREATE TABLE airport_transfer_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            price_one_way DECIMAL(10, 2) NOT NULL DEFAULT 0,
            price_round_trip DECIMAL(10, 2) NOT NULL DEFAULT 0,
            night_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
            extra_waiting_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (vehicle_id)
        )";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
    }

    // Check if fare exists
    $checkFareQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkFareQuery);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $fareExists = ($checkResult->num_rows > 0);

    if ($fareExists) {
        // Update existing fare
        $updateQuery = "UPDATE airport_transfer_fares SET 
                        price_one_way = ?,
                        price_round_trip = ?,
                        night_charges = ?,
                        extra_waiting_charges = ?,
                        updated_at = NOW()
                        WHERE vehicle_id = ?";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param('dddds', 
            $priceOneWay, 
            $priceRoundTrip, 
            $nightCharges, 
            $extraWaitingCharges, 
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update airport fare: " . $updateStmt->error);
        }
    } else {
        // Insert new fare
        $insertQuery = "INSERT INTO airport_transfer_fares 
                        (vehicle_id, price_one_way, price_round_trip, night_charges, extra_waiting_charges)
                        VALUES (?, ?, ?, ?, ?)";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sdddd', 
            $vehicleId, 
            $priceOneWay, 
            $priceRoundTrip, 
            $nightCharges, 
            $extraWaitingCharges
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert airport fare: " . $insertStmt->error);
        }
    }

    // Send success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fare updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
