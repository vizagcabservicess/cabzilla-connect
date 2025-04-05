
<?php
/**
 * Sync Local Fares API
 * 
 * This endpoint ensures all vehicles have corresponding local fare entries 
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

file_put_contents($logFile, "[$timestamp] Sync local fares request\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Check if the local_package_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $tableExists = $tableResult->num_rows > 0;
    
    // Create the table if it doesn't exist
    if (!$tableExists) {
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createTableQuery)) {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created local_package_fares table\n", FILE_APPEND);
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
        $checkQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->num_rows > 0;
        $stmt->close();
        
        // Determine default values based on vehicle type
        $price4hrs40km = 2000;
        $price8hrs80km = 3200;
        $price10hrs100km = 4000;
        $priceExtraKm = 14;
        $priceExtraHour = 250;
        
        // Set vehicle-specific defaults
        if (strpos($vehicleIdLower, 'sedan') !== false || strpos($vehicleName, 'sedan') !== false) {
            $price4hrs40km = 1800;
            $price8hrs80km = 3000;
            $price10hrs100km = 3600;
            $priceExtraKm = 12;
            $priceExtraHour = 200;
        } elseif (strpos($vehicleIdLower, 'ertiga') !== false || strpos($vehicleName, 'ertiga') !== false) {
            $price4hrs40km = 2200;
            $price8hrs80km = 3600;
            $price10hrs100km = 4500;
            $priceExtraKm = 15;
            $priceExtraHour = 250;
        } elseif ((strpos($vehicleIdLower, 'innova') !== false && strpos($vehicleIdLower, 'hycross') !== false) ||
                  (strpos($vehicleName, 'innova') !== false && strpos($vehicleName, 'hycross') !== false)) {
            $price4hrs40km = 3000;
            $price8hrs80km = 4500;
            $price10hrs100km = 5500;
            $priceExtraKm = 18;
            $priceExtraHour = 300;
        } elseif (strpos($vehicleIdLower, 'innova') !== false || strpos($vehicleName, 'innova') !== false ||
                  strpos($vehicleIdLower, 'crysta') !== false || strpos($vehicleName, 'crysta') !== false) {
            $price4hrs40km = 2600;
            $price8hrs80km = 4200;
            $price10hrs100km = 5200;
            $priceExtraKm = 18;
            $priceExtraHour = 300;
        } elseif (strpos($vehicleIdLower, 'tempo') !== false || strpos($vehicleName, 'tempo') !== false) {
            $price4hrs40km = 4500;
            $price8hrs80km = 7000;
            $price10hrs100km = 8500;
            $priceExtraKm = 22;
            $priceExtraHour = 400;
        } elseif (strpos($vehicleIdLower, 'luxury') !== false || strpos($vehicleName, 'luxury') !== false) {
            $price4hrs40km = 3500;
            $price8hrs80km = 5500;
            $price10hrs100km = 6500;
            $priceExtraKm = 22;
            $priceExtraHour = 350;
        } elseif (strpos($vehicleIdLower, 'dzire') !== false || strpos($vehicleName, 'dzire') !== false) {
            $price4hrs40km = 2000;
            $price8hrs80km = 3200;
            $price10hrs100km = 4000;
            $priceExtraKm = 13;
            $priceExtraHour = 200;
        } elseif (strpos($vehicleIdLower, 'etios') !== false || strpos($vehicleName, 'etios') !== false) {
            $price4hrs40km = 2000;
            $price8hrs80km = 3200;
            $price10hrs100km = 4000;
            $priceExtraKm = 13;
            $priceExtraHour = 200;
        }
        
        if (!$exists) {
            // Create new entry
            $insertQuery = "INSERT INTO local_package_fares 
                            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
                            VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertQuery);
            $stmt->bind_param("sddddd", 
                $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
            
            if ($stmt->execute()) {
                $created++;
                file_put_contents($logFile, "[$timestamp] Created local fare entry for vehicle: $vehicleId\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Failed to create local fare entry for vehicle: $vehicleId - " . $stmt->error . "\n", FILE_APPEND);
            }
            
            $stmt->close();
        } else if ($applyDefaults || $forceRefresh) {
            // Get existing fare entry
            $fare = $result->fetch_assoc();
            
            // Check if any values are zero and need updating
            $hasZeroValues = false;
            
            if ($fare['price_4hrs_40km'] == 0 || $fare['price_8hrs_80km'] == 0 || 
                $fare['price_10hrs_100km'] == 0 || $fare['price_extra_km'] == 0 || 
                $fare['price_extra_hour'] == 0) {
                $hasZeroValues = true;
            }
            
            if ($hasZeroValues || $forceRefresh) {
                // Update only the zero values with defaults
                if (!$forceRefresh) {
                    if ($fare['price_4hrs_40km'] > 0) $price4hrs40km = $fare['price_4hrs_40km'];
                    if ($fare['price_8hrs_80km'] > 0) $price8hrs80km = $fare['price_8hrs_80km'];
                    if ($fare['price_10hrs_100km'] > 0) $price10hrs100km = $fare['price_10hrs_100km'];
                    if ($fare['price_extra_km'] > 0) $priceExtraKm = $fare['price_extra_km'];
                    if ($fare['price_extra_hour'] > 0) $priceExtraHour = $fare['price_extra_hour'];
                }
                
                $updateQuery = "UPDATE local_package_fares
                                SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?, 
                                    price_extra_km = ?, price_extra_hour = ?,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE vehicle_id = ?";
                
                $stmt = $conn->prepare($updateQuery);
                $stmt->bind_param("ddddds", 
                    $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                
                if ($stmt->execute()) {
                    $updated++;
                    file_put_contents($logFile, "[$timestamp] Updated local fare entry for vehicle: $vehicleId with defaults\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "[$timestamp] Failed to update local fare entry for vehicle: $vehicleId - " . $stmt->error . "\n", FILE_APPEND);
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
        'message' => "Local fares synced successfully",
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
