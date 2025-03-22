
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
require_once __DIR__ . '/../config.php';

// Log incoming request for debugging
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Local fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// Get JSON data from request
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Ensure we have valid JSON input
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON parse error: " . json_last_error_msg());
    
    // Try to decode as URL encoded form data if JSON fails
    parse_str($rawInput, $formData);
    if (!empty($formData)) {
        $data = $formData;
        error_log("Parsed as form data: " . print_r($data, true));
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
    // Connect to database - try multiple connection approaches
    $pdo = null;
    $connectionError = null;
    
    try {
        $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        $connectionError = $e->getMessage();
        error_log("Primary DB connection failed: " . $connectionError);
        
        // Try alternative connection (sometimes configuration varies)
        try {
            require_once __DIR__ . '/../../config.php';
            $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $connectionError = null;
        } catch (PDOException $e2) {
            $connectionError .= "; Alternative connection also failed: " . $e2->getMessage();
        }
    }
    
    if (!$pdo) {
        throw new Exception("Database connection failed: " . $connectionError);
    }
    
    // APPROACH 1: Try vehicle_pricing table first
    $success = false;
    
    try {
        // Check if the vehicle exists in vehicles table
        $checkVehicleStmt = $pdo->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
        $checkVehicleStmt->execute([$vehicleId, $vehicleId]);
        
        if ($checkVehicleStmt->rowCount() === 0) {
            // Vehicle doesn't exist, create it
            $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
            $insertVehicleStmt = $pdo->prepare("
                INSERT INTO vehicles 
                (id, vehicle_id, name, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            ");
            $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName]);
            error_log("Created new vehicle: $vehicleId");
        }
        
        // Check if record exists in vehicle_pricing table
        $checkStmt = $pdo->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'");
        $checkStmt->execute([$vehicleId]);
        
        if ($checkStmt->rowCount() > 0) {
            // Update existing record
            $updateStmt = $pdo->prepare("
                UPDATE vehicle_pricing 
                SET 
                    price_8hrs_80km = ?,
                    price_10hrs_100km = ?,
                    price_extra_km = ?,
                    price_extra_hour = ?,
                    updated_at = NOW()
                WHERE vehicle_id = ? AND trip_type = 'local'
            ");
            
            $updateStmt->execute([
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour,
                $vehicleId
            ]);
            
            error_log("Updated existing record in vehicle_pricing");
            $success = true;
        } else {
            // Insert new record
            $insertStmt = $pdo->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at)
                VALUES (?, 'local', ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $insertStmt->execute([
                $vehicleId,
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour
            ]);
            
            error_log("Inserted new record in vehicle_pricing");
            $success = true;
        }
    } catch (Exception $e) {
        error_log("APPROACH 1 failed: " . $e->getMessage());
    }
    
    // APPROACH 2: Try local_package_fares table
    if (!$success) {
        try {
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
            
            $alternateStmt = $pdo->prepare($alternateSql);
            $alternateStmt->execute([
                $vehicleId,
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour
            ]);
            
            error_log("APPROACH 2 succeeded: Updated local_package_fares");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 2 failed: " . $e->getMessage());
        }
    }
    
    // APPROACH 3: Try direct fare prices table
    if (!$success) {
        try {
            $sql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, price, extra_km_rate, extra_hour_rate, created_at, updated_at)
                VALUES 
                (?, 'local', '8hrs_80km', ?, ?, ?, NOW(), NOW()),
                (?, 'local', '10hrs_100km', ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                price = VALUES(price),
                extra_km_rate = VALUES(extra_km_rate),
                extra_hour_rate = VALUES(extra_hour_rate),
                updated_at = NOW()
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $vehicleId, $price8hrs80km, $priceExtraKm, $priceExtraHour,
                $vehicleId, $price10hrs100km, $priceExtraKm, $priceExtraHour
            ]);
            
            error_log("APPROACH 3 succeeded: Updated fare_prices");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 3 failed: " . $e->getMessage());
        }
    }
    
    // Return success response
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
