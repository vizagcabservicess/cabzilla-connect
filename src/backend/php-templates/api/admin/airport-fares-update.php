
<?php
// airport-fares-update.php - Dedicated endpoint for updating airport transfer fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Include database configuration
require_once __DIR__ . '/../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Airport fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
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
error_log('Received airport fares update data: ' . print_r($data, true));

// Check if data is valid - support multiple field name variations
if (!$data || !isset($data['vehicleId'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID',
        'receivedData' => $data
    ]);
    exit;
}

// Extract vehicle ID and normalize
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Support multiple field name variations for easy integration
$pickupFare = floatval($data['pickupFare'] ?? $data['basePrice'] ?? $data['baseFare'] ?? 0);
$dropFare = floatval($data['dropFare'] ?? $data['pricePerKm'] ?? 0);
$airportFee = floatval($data['airportFee'] ?? 0);

// Validate data
if ($pickupFare <= 0 && $dropFare <= 0) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'At least one price must be greater than zero',
        'receivedData' => $data
    ]);
    exit;
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
    
    // Check if vehicle exists in vehicles table
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
    
    $success = false;
    
    // APPROACH 1: Try airport_transfer_fares table
    try {
        // Check if record exists
        $checkAirportStmt = $pdo->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
        $checkAirportStmt->execute([$vehicleId]);
        
        if ($checkAirportStmt->rowCount() > 0) {
            // Update existing record
            $updateStmt = $pdo->prepare("
                UPDATE airport_transfer_fares 
                SET 
                    pickup_fare = ?, 
                    drop_fare = ?,
                    airport_fee = ?,
                    updated_at = NOW() 
                WHERE vehicle_id = ?
            ");
            $updateStmt->execute([$pickupFare, $dropFare, $airportFee, $vehicleId]);
        } else {
            // Insert new record
            $insertStmt = $pdo->prepare("
                INSERT INTO airport_transfer_fares 
                (vehicle_id, pickup_fare, drop_fare, airport_fee, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())
            ");
            $insertStmt->execute([$vehicleId, $pickupFare, $dropFare, $airportFee]);
        }
        
        error_log("APPROACH 1 succeeded: Updated airport_transfer_fares");
        $success = true;
    } catch (Exception $e) {
        error_log("APPROACH 1 failed: " . $e->getMessage());
    }
    
    // APPROACH 2: Try vehicle_pricing table
    if (!$success) {
        try {
            // Check if record exists
            $checkVehiclePricingStmt = $pdo->prepare("
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'airport'
            ");
            $checkVehiclePricingStmt->execute([$vehicleId]);
            
            if ($checkVehiclePricingStmt->rowCount() > 0) {
                // Update existing record
                $updateStmt = $pdo->prepare("
                    UPDATE vehicle_pricing 
                    SET 
                        base_fare = ?, 
                        price_per_km = ?,
                        airport_fee = ?,
                        updated_at = NOW() 
                    WHERE vehicle_id = ? AND trip_type = 'airport'
                ");
                $updateStmt->execute([$pickupFare, $dropFare, $airportFee, $vehicleId]);
            } else {
                // Insert new record
                $insertStmt = $pdo->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km, airport_fee, created_at, updated_at) 
                    VALUES (?, 'airport', ?, ?, ?, NOW(), NOW())
                ");
                $insertStmt->execute([$vehicleId, $pickupFare, $dropFare, $airportFee]);
            }
            
            error_log("APPROACH 2 succeeded: Updated vehicle_pricing for airport");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 2 failed: " . $e->getMessage());
        }
    }
    
    // APPROACH 3: Try vehicle_trip_rates table
    if (!$success) {
        try {
            $alternateSql = "
                INSERT INTO vehicle_trip_rates 
                (vehicle_id, trip_type, pickup_fare, drop_fare, airport_fee, updated_at) 
                VALUES (?, 'airport', ?, ?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE 
                pickup_fare = VALUES(pickup_fare), 
                drop_fare = VALUES(drop_fare),
                airport_fee = VALUES(airport_fee),
                updated_at = NOW()
            ";
            $alternateStmt = $pdo->prepare($alternateSql);
            $alternateStmt->execute([$vehicleId, $pickupFare, $dropFare, $airportFee]);
            
            error_log("APPROACH 3 succeeded: Updated vehicle_trip_rates");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 3 failed: " . $e->getMessage());
        }
    }
    
    // APPROACH 4: Try fare_prices table
    if (!$success) {
        try {
            $sql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, price_per_km, airport_fee, created_at, updated_at)
                VALUES 
                (?, 'airport', 'pickup', ?, 0, ?, NOW(), NOW()),
                (?, 'airport', 'drop', 0, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                airport_fee = VALUES(airport_fee),
                updated_at = NOW()
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $vehicleId, $pickupFare, $airportFee,
                $vehicleId, $dropFare, $airportFee
            ]);
            
            error_log("APPROACH 4 succeeded: Updated fare_prices for airport");
            $success = true;
        } catch (Exception $e) {
            error_log("APPROACH 4 failed: " . $e->getMessage());
        }
    }
    
    if (!$success) {
        throw new Exception("All database approaches failed");
    }
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport transfer fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pickupFare' => $pickupFare,
            'dropFare' => $dropFare,
            'airportFee' => $airportFee
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
