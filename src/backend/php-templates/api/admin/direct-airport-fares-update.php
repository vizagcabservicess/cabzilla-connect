
<?php
/**
 * Direct Airport Fares Update API
 * 
 * This API endpoint updates or creates airport transfer fares for a specific vehicle.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once dirname(__FILE__) . '/../../config.php';

// Log file setup
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Get JSON data
$inputJSON = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] Raw input received: " . $inputJSON . "\n", FILE_APPEND);

$input = json_decode($inputJSON, true);

// If JSON parsing fails, try to handle it as form data
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, "[$timestamp] JSON parsing failed, trying form data\n", FILE_APPEND);
    $input = $_POST;
    
    // If still no data, try to parse raw input as URL-encoded
    if (empty($input)) {
        parse_str($inputJSON, $input);
    }
}

file_put_contents($logFile, "[$timestamp] Processed input: " . json_encode($input) . "\n", FILE_APPEND);

// Check for data in a nested structure (common when sent from frontend)
if (isset($input['data']) && is_array($input['data'])) {
    $input = $input['data'];
    file_put_contents($logFile, "[$timestamp] Using nested data property\n", FILE_APPEND);
}

// Check required fields - look for vehicle ID in multiple possible fields
$vehicleId = null;
if (isset($input['vehicleId']) && !empty($input['vehicleId'])) {
    $vehicleId = $input['vehicleId'];
} elseif (isset($input['vehicle_id']) && !empty($input['vehicle_id'])) {
    $vehicleId = $input['vehicle_id'];
} elseif (isset($input['id']) && !empty($input['id'])) {
    $vehicleId = $input['id'];
}

if (!$vehicleId) {
    file_put_contents($logFile, "[$timestamp] ERROR: Vehicle ID not found in request data\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

file_put_contents($logFile, "[$timestamp] Processing update for vehicle ID: $vehicleId\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Check if the airport_transfer_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $tableExists = $tableResult && $tableResult->num_rows > 0;
    
    // Create the table if it doesn't exist
    if (!$tableExists) {
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_charges DECIMAL(10,2) DEFAULT 0,
                extra_waiting_charges DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createTableQuery)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Check if columns exist and add them if they don't
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added night_charges column\n", FILE_APPEND);
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column\n", FILE_APPEND);
    }
    
    // Extract values from the input, supporting multiple naming conventions
    $basePrice = isset($input['basePrice']) ? floatval($input['basePrice']) : 0;
    $pricePerKm = isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0;
    $pickupPrice = isset($input['pickupPrice']) ? floatval($input['pickupPrice']) : 0;
    $dropPrice = isset($input['dropPrice']) ? floatval($input['dropPrice']) : 0;
    $tier1Price = isset($input['tier1Price']) ? floatval($input['tier1Price']) : 0;
    $tier2Price = isset($input['tier2Price']) ? floatval($input['tier2Price']) : 0;
    $tier3Price = isset($input['tier3Price']) ? floatval($input['tier3Price']) : 0;
    $tier4Price = isset($input['tier4Price']) ? floatval($input['tier4Price']) : 0;
    $extraKmCharge = isset($input['extraKmCharge']) ? floatval($input['extraKmCharge']) : 0;
    $nightCharges = isset($input['nightCharges']) ? floatval($input['nightCharges']) : 0;
    $extraWaitingCharges = isset($input['extraWaitingCharges']) ? floatval($input['extraWaitingCharges']) : 0;
    
    // Log the extracted values
    file_put_contents($logFile, "[$timestamp] Extracted values: basePrice=$basePrice, pricePerKm=$pricePerKm, " .
        "pickupPrice=$pickupPrice, dropPrice=$dropPrice, tier1Price=$tier1Price, tier2Price=$tier2Price, " .
        "tier3Price=$tier3Price, tier4Price=$tier4Price, extraKmCharge=$extraKmCharge, " .
        "nightCharges=$nightCharges, extraWaitingCharges=$extraWaitingCharges\n", FILE_APPEND);
    
    // Check if fare entry already exists for this vehicle
    $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $exists = $checkResult && $checkResult->num_rows > 0;
    $checkStmt->close();
    
    if ($exists) {
        // Update existing record
        $updateQuery = "
            UPDATE airport_transfer_fares SET 
                base_price = ?, 
                price_per_km = ?, 
                pickup_price = ?, 
                drop_price = ?, 
                tier1_price = ?, 
                tier2_price = ?, 
                tier3_price = ?, 
                tier4_price = ?, 
                extra_km_charge = ?,
                night_charges = ?,
                extra_waiting_charges = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param(
            "ddddddddddds", 
            $basePrice, 
            $pricePerKm, 
            $pickupPrice, 
            $dropPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge,
            $nightCharges,
            $extraWaitingCharges,
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update fare: " . $updateStmt->error);
        }
        
        $updateStmt->close();
        file_put_contents($logFile, "[$timestamp] Updated existing fare record for vehicle $vehicleId\n", FILE_APPEND);
    } else {
        // Insert new record
        $insertQuery = "
            INSERT INTO airport_transfer_fares (
                vehicle_id, 
                base_price, 
                price_per_km, 
                pickup_price, 
                drop_price, 
                tier1_price, 
                tier2_price, 
                tier3_price, 
                tier4_price, 
                extra_km_charge,
                night_charges,
                extra_waiting_charges
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param(
            "sddddddddddd", 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $pickupPrice, 
            $dropPrice, 
            $tier1Price, 
            $tier2Price, 
            $tier3Price, 
            $tier4Price, 
            $extraKmCharge,
            $nightCharges,
            $extraWaitingCharges
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert fare: " . $insertStmt->error);
        }
        
        $insertStmt->close();
        file_put_contents($logFile, "[$timestamp] Inserted new fare record for vehicle $vehicleId\n", FILE_APPEND);
    }
    
    // Return success response
    $response = [
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'vehicleId' => $vehicleId,
        'data' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge,
            'nightCharges' => $nightCharges,
            'extraWaitingCharges' => $extraWaitingCharges
        ],
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    file_put_contents($logFile, "[$timestamp] Successfully processed fare update\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
