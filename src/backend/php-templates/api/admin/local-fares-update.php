
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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

require_once '../../config.php';

try {
    // Get JSON input data
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // If no JSON data, try to get from POST
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }
    
    // Log the received data for debugging
    error_log('Received local fares update data: ' . print_r($data, true));
    
    // Get vehicleId and normalize it
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : 
               (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
    
    // Remove any 'item-' prefix
    if ($vehicleId && strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Extract pricing data with multiple possible field names
    $price4hrs40km = floatval($data['price4hrs40km'] ?? $data['price_4hrs_40km'] ?? 0);
    $price8hrs80km = floatval($data['price8hrs80km'] ?? $data['price_8hrs_80km'] ?? 0);
    $price10hrs100km = floatval($data['price10hrs100km'] ?? $data['price_10hrs_100km'] ?? 0);
    $priceExtraKm = floatval($data['priceExtraKm'] ?? $data['price_extra_km'] ?? 0);
    $priceExtraHour = floatval($data['priceExtraHour'] ?? $data['price_extra_hour'] ?? 0);
    
    // Validate required fields
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }
    
    // Get database connection
    $conn = getDbConnection();
    
    // Check if local_package_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'local_package_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    if (!$checkResult || $checkResult->num_rows === 0) {
        // Create the table if it doesn't exist
        $conn->query("
            CREATE TABLE local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }
    
    // Check if the vehicle already exists in the table
    $checkVehicleQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
    $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
    $checkVehicleStmt->bind_param('s', $vehicleId);
    $checkVehicleStmt->execute();
    $checkVehicleResult = $checkVehicleStmt->get_result();
    
    if ($checkVehicleResult->num_rows > 0) {
        // Update existing record
        $updateQuery = "
            UPDATE local_package_fares
            SET 
                price_4hrs_40km = ?,
                price_8hrs_80km = ?,
                price_10hrs_100km = ?,
                price_extra_km = ?,
                price_extra_hour = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param('ddddds', $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update local package fares: " . $conn->error);
        }
    } else {
        // Insert new record
        $insertQuery = "
            INSERT INTO local_package_fares (
                vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                price_extra_km, price_extra_hour
            ) VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param('sddddd', $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert local package fares: " . $conn->error);
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local package fares updated successfully',
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
    error_log('Error in local-fares-update.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
