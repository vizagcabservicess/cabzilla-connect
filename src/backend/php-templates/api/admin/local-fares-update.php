
<?php
// local-fares-update.php - Endpoint for updating local trip fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database configuration
include_once __DIR__ . '/../../config.php';

// Log incoming request for debugging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Local fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../../error.log');

// Get JSON data from request
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Try to decode as JSON first
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    // Try to decode as URL encoded form data if JSON fails
    parse_str($rawInput, $formData);
    if (!empty($formData)) {
        $data = $formData;
    } else {
        // Last resort - try to decode line by line
        $lines = explode("\n", $rawInput);
        $data = [];
        foreach ($lines as $line) {
            $parts = explode('=', $line, 2);
            if (count($parts) == 2) {
                $data[trim($parts[0])] = trim($parts[1]);
            }
        }
    }
}

// Log received data for debugging
error_log('Received local fares update data: ' . print_r($data, true));

// Check if data is valid
if (
    !$data ||
    !isset($data['vehicleId']) ||
    !isset($data['price8hrs80km']) && !isset($data['hr8km80Price']) && 
    !isset($data['price10hrs100km']) && !isset($data['hr10km100Price']) && 
    !isset($data['priceExtraKm']) && !isset($data['extraKmRate'])
) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required fields',
        'receivedData' => $data
    ]);
    exit;
}

// Normalize field names
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';
$price8hrs80km = floatval($data['price8hrs80km'] ?? $data['hr8km80Price'] ?? 0);
$price10hrs100km = floatval($data['price10hrs100km'] ?? $data['hr10km100Price'] ?? 0);
$priceExtraKm = floatval($data['priceExtraKm'] ?? $data['extraKmRate'] ?? 0);
$priceExtraHour = floatval($data['priceExtraHour'] ?? $data['extraHourRate'] ?? 0);

// Additional validation
if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'receivedData' => $data
    ]);
    exit;
}

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

try {
    // Connect to database using the config helper
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Success flag
    $success = false;
    
    // APPROACH 1: Try vehicle_pricing table first
    try {
        // Check if the vehicle exists in vehicle_types table
        $checkVehicleStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ? OR id = ?");
        $checkVehicleStmt->bind_param("ss", $vehicleId, $vehicleId);
        $checkVehicleStmt->execute();
        $checkVehicleResult = $checkVehicleStmt->get_result();
        
        if ($checkVehicleResult->num_rows === 0) {
            // Vehicle doesn't exist, create it with a basic record
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            $insertVehicleStmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, is_active, capacity, luggage_capacity, ac, image, created_at, updated_at) 
                VALUES (?, ?, 1, 4, 2, 1, '/cars/sedan.png', NOW(), NOW())
            ");
            $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
            $insertVehicleStmt->execute();
            error_log("Created new vehicle: $vehicleId");
        }
        
        // Check if record exists in vehicle_pricing table
        $checkStmt = $conn->prepare("
            SELECT id FROM vehicle_pricing 
            WHERE vehicle_type = ? AND trip_type = 'local'
        ");
        $checkStmt->bind_param("s", $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $updateStmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET 
                    price_8hrs_80km = ?,
                    price_10hrs_100km = ?,
                    price_extra_km = ?,
                    price_extra_hour = ?,
                    updated_at = NOW()
                WHERE vehicle_type = ? AND trip_type = 'local'
            ");
            
            $updateStmt->bind_param("dddds", 
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour,
                $vehicleId
            );
            
            $updateStmt->execute();
            error_log("Updated existing record in vehicle_pricing");
            $success = true;
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_type, trip_type, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at)
                VALUES (?, 'local', ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $insertStmt->bind_param("sdddd", 
                $vehicleId,
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour
            );
            
            $insertStmt->execute();
            error_log("Inserted new record in vehicle_pricing");
            $success = true;
        }
    } catch (Exception $e) {
        error_log("APPROACH 1 failed: " . $e->getMessage());
    }
    
    // APPROACH 2: Try alternative tables if first approach failed
    if (!$success) {
        try {
            // Try to update local_package_fares table
            $alternateSql = "
                INSERT INTO local_package_fares 
                (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    price_8hrs_80km = VALUES(price_8hrs_80km),
                    price_10hrs_100km = VALUES(price_10hrs_100km),
                    price_extra_km = VALUES(price_extra_km),
                    price_extra_hour = VALUES(price_extra_hour),
                    updated_at = NOW()
            ";
            
            $alternateStmt = $conn->prepare($alternateSql);
            $alternateStmt->bind_param("sdddd", 
                $vehicleId,
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour
            );
            
            $alternateStmt->execute();
            error_log("APPROACH 2 succeeded: Updated local_package_fares");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 2 failed: " . $e->getMessage());
        }
    }
    
    // APPROACH 3: Try direct fare_prices table if previous approaches failed
    if (!$success) {
        try {
            // Try to update fare_prices table
            $sql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, price, extra_km_rate, extra_hour_rate, created_at, updated_at)
                VALUES 
                (?, 'local', '8hrs_80km', ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    price = VALUES(price),
                    extra_km_rate = VALUES(extra_km_rate),
                    extra_hour_rate = VALUES(extra_hour_rate),
                    updated_at = NOW()
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sddd", 
                $vehicleId, 
                $price8hrs80km, 
                $priceExtraKm, 
                $priceExtraHour
            );
            
            $stmt->execute();
            
            // Insert/update the 10hrs package
            $sql2 = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, price, extra_km_rate, extra_hour_rate, created_at, updated_at)
                VALUES 
                (?, 'local', '10hrs_100km', ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    price = VALUES(price),
                    extra_km_rate = VALUES(extra_km_rate),
                    extra_hour_rate = VALUES(extra_hour_rate),
                    updated_at = NOW()
            ";
            
            $stmt2 = $conn->prepare($sql2);
            $stmt2->bind_param("sddd", 
                $vehicleId, 
                $price10hrs100km, 
                $priceExtraKm, 
                $priceExtraHour
            );
            
            $stmt2->execute();
            
            error_log("APPROACH 3 succeeded: Updated fare_prices");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 3 failed: " . $e->getMessage());
        }
    }
    
    // Final approach - direct SQL if all else fails
    if (!$success) {
        try {
            // Try a direct SQL update that should work with any schema
            $query = "
                UPDATE vehicle_types
                SET 
                    local_8hr_80km_price = {$price8hrs80km},
                    local_10hr_100km_price = {$price10hrs100km},
                    local_extra_km_price = {$priceExtraKm},
                    updated_at = NOW()
                WHERE vehicle_id = '{$vehicleId}' OR id = '{$vehicleId}'
            ";
            
            $conn->query($query);
            error_log("FINAL APPROACH succeeded: Direct SQL update");
            $success = true;
        } catch (Exception $e) {
            error_log("FINAL APPROACH failed: " . $e->getMessage());
        }
    }
    
    // Return response based on success
    if ($success) {
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Local fares updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'price8hrs80km' => $price8hrs80km,
                'price10hrs100km' => $price10hrs100km,
                'priceExtraKm' => $priceExtraKm,
                'priceExtraHour' => $priceExtraHour
            ]
        ]);
    } else {
        throw new Exception("All database update approaches failed");
    }
    
} catch (Exception $e) {
    // Log the full error
    error_log('Database error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'receivedData' => $data
    ]);
}
?>
