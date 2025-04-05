
<?php
/**
 * Sync Airport Fares API
 * 
 * This endpoint ensures all vehicles have corresponding airport fare entries 
 * with appropriate default values based on vehicle type.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// If using MySQL
require_once dirname(__FILE__) . '/../../config.php';

// Get JSON data if it's a POST request
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Set default options
$applyDefaults = isset($input['applyDefaults']) ? $input['applyDefaults'] : true;
$forceRefresh = isset($_SERVER['HTTP_X_FORCE_CREATION']) && $_SERVER['HTTP_X_FORCE_CREATION'] === 'true';

// Log the request
$logFile = dirname(__FILE__) . '/../../logs/sync_fares.log';
$timestamp = date('Y-m-d H:i:s');

// Create log directory if it doesn't exist
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

file_put_contents($logFile, "[$timestamp] Sync airport fares request\n", FILE_APPEND);

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
    
    // Get all active vehicles
    $vehiclesQuery = "SELECT * FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Failed to fetch vehicles: " . $conn->error);
    }
    
    $synced = 0;
    $updated = 0;
    $created = 0;
    
    // Process each vehicle
    while ($vehicle = $vehiclesResult->fetch_assoc()) {
        $vehicleId = $vehicle['vehicle_id'];
        $vehicleName = strtolower($vehicle['name'] ?? '');
        $vehicleIdLower = strtolower($vehicleId);
        
        // Check if fare entry exists
        $checkQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->num_rows > 0;
        $stmt->close();
        
        // Determine default values based on vehicle type
        $basePrice = 3000;
        $pricePerKm = 15;
        $pickupPrice = 1000;
        $dropPrice = 1000;
        $tier1Price = 800;
        $tier2Price = 1000;
        $tier3Price = 1200;
        $tier4Price = 1400;
        $extraKmCharge = 15;
        $nightCharges = 300;
        $extraWaitingCharges = 200;
        
        // Set vehicle-specific defaults
        if (strpos($vehicleIdLower, 'sedan') !== false || strpos($vehicleName, 'sedan') !== false) {
            $basePrice = 3000;
            $pricePerKm = 12;
            $pickupPrice = 800;
            $dropPrice = 800;
            $tier1Price = 600;
            $tier2Price = 800;
            $tier3Price = 1000;
            $tier4Price = 1200;
            $extraKmCharge = 12;
            $nightCharges = 250;
            $extraWaitingCharges = 150;
        } elseif (strpos($vehicleIdLower, 'ertiga') !== false || strpos($vehicleName, 'ertiga') !== false) {
            $basePrice = 3500;
            $pricePerKm = 15;
            $pickupPrice = 1000;
            $dropPrice = 1000;
            $tier1Price = 800;
            $tier2Price = 1000;
            $tier3Price = 1200;
            $tier4Price = 1400;
            $extraKmCharge = 15;
            $nightCharges = 300;
            $extraWaitingCharges = 200;
        } elseif ((strpos($vehicleIdLower, 'innova') !== false && strpos($vehicleIdLower, 'hycross') !== false) ||
                  (strpos($vehicleName, 'innova') !== false && strpos($vehicleName, 'hycross') !== false)) {
            $basePrice = 4500;
            $pricePerKm = 18;
            $pickupPrice = 1200;
            $dropPrice = 1200;
            $tier1Price = 1000;
            $tier2Price = 1200;
            $tier3Price = 1400;
            $tier4Price = 1600;
            $extraKmCharge = 18;
            $nightCharges = 350;
            $extraWaitingCharges = 250;
        } elseif (strpos($vehicleIdLower, 'innova') !== false || strpos($vehicleName, 'innova') !== false ||
                  strpos($vehicleIdLower, 'crysta') !== false || strpos($vehicleName, 'crysta') !== false) {
            $basePrice = 4000;
            $pricePerKm = 17;
            $pickupPrice = 1200;
            $dropPrice = 1200;
            $tier1Price = 1000;
            $tier2Price = 1200;
            $tier3Price = 1400;
            $tier4Price = 1600;
            $extraKmCharge = 17;
            $nightCharges = 350;
            $extraWaitingCharges = 250;
        } elseif (strpos($vehicleIdLower, 'tempo') !== false || strpos($vehicleName, 'tempo') !== false) {
            $basePrice = 6000;
            $pricePerKm = 19;
            $pickupPrice = 2000;
            $dropPrice = 2000;
            $tier1Price = 1600;
            $tier2Price = 1800;
            $tier3Price = 2000;
            $tier4Price = 2500;
            $extraKmCharge = 19;
            $nightCharges = 400;
            $extraWaitingCharges = 300;
        } elseif (strpos($vehicleIdLower, 'luxury') !== false || strpos($vehicleName, 'luxury') !== false) {
            $basePrice = 7000;
            $pricePerKm = 22;
            $pickupPrice = 2500;
            $dropPrice = 2500;
            $tier1Price = 2000;
            $tier2Price = 2200;
            $tier3Price = 2500;
            $tier4Price = 3000;
            $extraKmCharge = 22;
            $nightCharges = 450;
            $extraWaitingCharges = 350;
        } elseif (strpos($vehicleIdLower, 'dzire') !== false || strpos($vehicleName, 'dzire') !== false) {
            $basePrice = 3200;
            $pricePerKm = 13;
            $pickupPrice = 800;
            $dropPrice = 800;
            $tier1Price = 600;
            $tier2Price = 800;
            $tier3Price = 1000;
            $tier4Price = 1200;
            $extraKmCharge = 13;
            $nightCharges = 250;
            $extraWaitingCharges = 150;
        } elseif (strpos($vehicleIdLower, 'etios') !== false || strpos($vehicleName, 'etios') !== false) {
            $basePrice = 3200;
            $pricePerKm = 13;
            $pickupPrice = 800;
            $dropPrice = 800;
            $tier1Price = 600;
            $tier2Price = 800;
            $tier3Price = 1000;
            $tier4Price = 1200;
            $extraKmCharge = 13;
            $nightCharges = 250;
            $extraWaitingCharges = 150;
        }
        
        if (!$exists) {
            // Create new entry
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
                $created++;
                file_put_contents($logFile, "[$timestamp] Created fare entry for vehicle: $vehicleId\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Failed to create fare entry for vehicle: $vehicleId - " . $stmt->error . "\n", FILE_APPEND);
            }
            
            $stmt->close();
        } else if ($applyDefaults || $forceRefresh) {
            // Get existing fare entry
            $fare = $result->fetch_assoc();
            
            // Check if any values are zero and need updating
            $hasZeroValues = false;
            
            if ($fare['base_price'] == 0 || $fare['price_per_km'] == 0 || 
                $fare['pickup_price'] == 0 || $fare['drop_price'] == 0 || 
                $fare['tier1_price'] == 0 || $fare['tier2_price'] == 0 || 
                $fare['tier3_price'] == 0 || $fare['tier4_price'] == 0 || 
                $fare['extra_km_charge'] == 0 || 
                $fare['night_charges'] == 0 || 
                $fare['extra_waiting_charges'] == 0) {
                $hasZeroValues = true;
            }
            
            if ($hasZeroValues || $forceRefresh) {
                // Update only the zero values with defaults
                if (!$forceRefresh) {
                    if ($fare['base_price'] > 0) $basePrice = $fare['base_price'];
                    if ($fare['price_per_km'] > 0) $pricePerKm = $fare['price_per_km'];
                    if ($fare['pickup_price'] > 0) $pickupPrice = $fare['pickup_price'];
                    if ($fare['drop_price'] > 0) $dropPrice = $fare['drop_price'];
                    if ($fare['tier1_price'] > 0) $tier1Price = $fare['tier1_price'];
                    if ($fare['tier2_price'] > 0) $tier2Price = $fare['tier2_price'];
                    if ($fare['tier3_price'] > 0) $tier3Price = $fare['tier3_price'];
                    if ($fare['tier4_price'] > 0) $tier4Price = $fare['tier4_price'];
                    if ($fare['extra_km_charge'] > 0) $extraKmCharge = $fare['extra_km_charge'];
                    if ($fare['night_charges'] > 0) $nightCharges = $fare['night_charges'];
                    if ($fare['extra_waiting_charges'] > 0) $extraWaitingCharges = $fare['extra_waiting_charges'];
                }
                
                $updateQuery = "UPDATE airport_transfer_fares
                                SET base_price = ?, price_per_km = ?, pickup_price = ?, drop_price = ?,
                                    tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?, 
                                    extra_km_charge = ?, night_charges = ?, extra_waiting_charges = ?,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE vehicle_id = ?";
                
                $stmt = $conn->prepare($updateQuery);
                $stmt->bind_param("dddddddddds", 
                    $basePrice, $pricePerKm, $pickupPrice, $dropPrice, 
                    $tier1Price, $tier2Price, $tier3Price, $tier4Price, $extraKmCharge,
                    $nightCharges, $extraWaitingCharges, $vehicleId);
                
                if ($stmt->execute()) {
                    $updated++;
                    file_put_contents($logFile, "[$timestamp] Updated fare entry for vehicle: $vehicleId with defaults\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "[$timestamp] Failed to update fare entry for vehicle: $vehicleId - " . $stmt->error . "\n", FILE_APPEND);
                }
                
                $stmt->close();
            } else {
                $synced++;
            }
        } else {
            // Fare exists and doesn't need defaults
            $synced++;
        }
    }
    
    // Close the database connection
    $conn->close();
    
    // Output response
    $response = [
        'status' => 'success',
        'message' => "Airport fares synced successfully",
        'details' => [
            'total_vehicles' => $vehiclesResult->num_rows,
            'synced' => $synced,
            'updated' => $updated,
            'created' => $created
        ],
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    
    file_put_contents($logFile, "[$timestamp] Sync complete. Synced: $synced, Updated: $updated, Created: $created\n", FILE_APPEND);
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Output error response
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
    
    echo json_encode($response);
}
