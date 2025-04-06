
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

// Get JSON data
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Check for required fields
if (!isset($input['vehicleId']) && !isset($input['vehicle_id'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

// Get vehicle ID from either format
$vehicleId = $input['vehicleId'] ?? $input['vehicle_id'];

// Log the request
$logFile = dirname(__FILE__) . '/../../logs/airport_fares_update.log';
$timestamp = date('Y-m-d H:i:s');

// Create log directory if it doesn't exist
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

file_put_contents($logFile, "[$timestamp] Update airport fares request for vehicle: $vehicleId\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Check if the airport_transfer_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $tableExists = $tableResult->num_rows > 0;
    
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
    if ($columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added night_charges column\n", FILE_APPEND);
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
    if ($columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column\n", FILE_APPEND);
    }
    
    // Extract values with fallbacks
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
    
    // Apply default values if any important values are zero
    if ($basePrice == 0 || $pricePerKm == 0 || $pickupPrice == 0 || $dropPrice == 0 ||
        $tier1Price == 0 || $tier2Price == 0 || $tier3Price == 0 || $tier4Price == 0 || $extraKmCharge == 0) {
        
        $vehicleIdLower = strtolower($vehicleId);
        
        // Determine default values based on vehicle type
        if (strpos($vehicleIdLower, 'sedan') !== false) {
            if ($basePrice == 0) $basePrice = 3000;
            if ($pricePerKm == 0) $pricePerKm = 12;
            if ($pickupPrice == 0) $pickupPrice = 800;
            if ($dropPrice == 0) $dropPrice = 800;
            if ($tier1Price == 0) $tier1Price = 600;
            if ($tier2Price == 0) $tier2Price = 800;
            if ($tier3Price == 0) $tier3Price = 1000;
            if ($tier4Price == 0) $tier4Price = 1200;
            if ($extraKmCharge == 0) $extraKmCharge = 12;
            if ($nightCharges == 0) $nightCharges = 250;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 150;
        } elseif (strpos($vehicleIdLower, 'ertiga') !== false) {
            if ($basePrice == 0) $basePrice = 3500;
            if ($pricePerKm == 0) $pricePerKm = 15;
            if ($pickupPrice == 0) $pickupPrice = 1000;
            if ($dropPrice == 0) $dropPrice = 1000;
            if ($tier1Price == 0) $tier1Price = 800;
            if ($tier2Price == 0) $tier2Price = 1000;
            if ($tier3Price == 0) $tier3Price = 1200;
            if ($tier4Price == 0) $tier4Price = 1400;
            if ($extraKmCharge == 0) $extraKmCharge = 15;
            if ($nightCharges == 0) $nightCharges = 300;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 200;
        } elseif (strpos($vehicleIdLower, 'innova') !== false && strpos($vehicleIdLower, 'hycross') !== false) {
            if ($basePrice == 0) $basePrice = 4500;
            if ($pricePerKm == 0) $pricePerKm = 18;
            if ($pickupPrice == 0) $pickupPrice = 1200;
            if ($dropPrice == 0) $dropPrice = 1200;
            if ($tier1Price == 0) $tier1Price = 1000;
            if ($tier2Price == 0) $tier2Price = 1200;
            if ($tier3Price == 0) $tier3Price = 1400;
            if ($tier4Price == 0) $tier4Price = 1600;
            if ($extraKmCharge == 0) $extraKmCharge = 18;
            if ($nightCharges == 0) $nightCharges = 350;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 250;
        } elseif (strpos($vehicleIdLower, 'innova') !== false || strpos($vehicleIdLower, 'crysta') !== false) {
            if ($basePrice == 0) $basePrice = 4000;
            if ($pricePerKm == 0) $pricePerKm = 17;
            if ($pickupPrice == 0) $pickupPrice = 1200;
            if ($dropPrice == 0) $dropPrice = 1200;
            if ($tier1Price == 0) $tier1Price = 1000;
            if ($tier2Price == 0) $tier2Price = 1200;
            if ($tier3Price == 0) $tier3Price = 1400;
            if ($tier4Price == 0) $tier4Price = 1600;
            if ($extraKmCharge == 0) $extraKmCharge = 17;
            if ($nightCharges == 0) $nightCharges = 350;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 250;
        } elseif (strpos($vehicleIdLower, 'tempo') !== false) {
            if ($basePrice == 0) $basePrice = 6000;
            if ($pricePerKm == 0) $pricePerKm = 19;
            if ($pickupPrice == 0) $pickupPrice = 2000;
            if ($dropPrice == 0) $dropPrice = 2000;
            if ($tier1Price == 0) $tier1Price = 1600;
            if ($tier2Price == 0) $tier2Price = 1800;
            if ($tier3Price == 0) $tier3Price = 2000;
            if ($tier4Price == 0) $tier4Price = 2500;
            if ($extraKmCharge == 0) $extraKmCharge = 19;
            if ($nightCharges == 0) $nightCharges = 400;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 300;
        } elseif (strpos($vehicleIdLower, 'luxury') !== false) {
            if ($basePrice == 0) $basePrice = 7000;
            if ($pricePerKm == 0) $pricePerKm = 22;
            if ($pickupPrice == 0) $pickupPrice = 2500;
            if ($dropPrice == 0) $dropPrice = 2500;
            if ($tier1Price == 0) $tier1Price = 2000;
            if ($tier2Price == 0) $tier2Price = 2200;
            if ($tier3Price == 0) $tier3Price = 2500;
            if ($tier4Price == 0) $tier4Price = 3000;
            if ($extraKmCharge == 0) $extraKmCharge = 22;
            if ($nightCharges == 0) $nightCharges = 450;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 350;
        } else {
            // Default values for other vehicle types
            if ($basePrice == 0) $basePrice = 3000;
            if ($pricePerKm == 0) $pricePerKm = 15;
            if ($pickupPrice == 0) $pickupPrice = 1000;
            if ($dropPrice == 0) $dropPrice = 1000;
            if ($tier1Price == 0) $tier1Price = 800;
            if ($tier2Price == 0) $tier2Price = 1000;
            if ($tier3Price == 0) $tier3Price = 1200;
            if ($tier4Price == 0) $tier4Price = 1400;
            if ($extraKmCharge == 0) $extraKmCharge = 15;
            if ($nightCharges == 0) $nightCharges = 300;
            if ($extraWaitingCharges == 0) $extraWaitingCharges = 200;
        }
    }
    
    // Check if record exists
    $checkQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $exists = $result->num_rows > 0;
    $stmt->close();
    
    if ($exists) {
        // Update existing record
        $updateQuery = "UPDATE airport_transfer_fares
                        SET base_price = ?, price_per_km = ?, pickup_price = ?, drop_price = ?,
                            tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?, 
                            extra_km_charge = ?, night_charges = ?, extra_waiting_charges = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE vehicle_id = ?";
        
        $stmt = $conn->prepare($updateQuery);
        $stmt->bind_param("ddddddddddds", 
            $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
            $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge,
            $nightCharges, $extraWaitingCharges, $vehicleId);
        
        if ($stmt->execute()) {
            file_put_contents($logFile, "[$timestamp] Updated airport fare entry for vehicle: $vehicleId\n", FILE_APPEND);
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => 'Airport fares updated successfully',
                'vehicle_id' => $vehicleId
            ]);
        } else {
            throw new Exception("Failed to update airport fares: " . $stmt->error);
        }
        
        $stmt->close();
    } else {
        // Insert new record
        $insertQuery = "INSERT INTO airport_transfer_fares 
                        (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                         tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                         night_charges, extra_waiting_charges) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($insertQuery);
        $stmt->bind_param("sddddddddddd", 
            $vehicleId, $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
            $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge,
            $nightCharges, $extraWaitingCharges);
        
        if ($stmt->execute()) {
            file_put_contents($logFile, "[$timestamp] Created airport fare entry for vehicle: $vehicleId\n", FILE_APPEND);
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => 'Airport fares created successfully',
                'vehicle_id' => $vehicleId
            ]);
        } else {
            throw new Exception("Failed to create airport fares: " . $stmt->error);
        }
        
        $stmt->close();
    }
    
    // Close the database connection
    $conn->close();
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
