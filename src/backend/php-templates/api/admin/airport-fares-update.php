
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
require_once '../config.php';

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
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Log received data for debugging
error_log('Received airport fares update data: ' . print_r($data, true));

// Check if data is valid
if (!$data || !isset($data['vehicleId']) || !isset($data['pickupFare']) || !isset($data['dropFare'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required fields',
        'receivedData' => $data
    ]);
    exit;
}

try {
    // Connect to database
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Extract data
    $vehicleId = $data['vehicleId'];
    $pickupFare = floatval($data['pickupFare']);
    $dropFare = floatval($data['dropFare']);
    
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
        ");
        $insertVehicleStmt->execute([$vehicleId, $vehicleId, $vehicleName]);
    }
    
    // Check if record exists in airport_transfer_fares
    $checkAirportStmt = $pdo->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
    $checkAirportStmt->execute([$vehicleId]);
    
    if ($checkAirportStmt->rowCount() > 0) {
        // Update existing record
        $updateStmt = $pdo->prepare("
            UPDATE airport_transfer_fares 
            SET 
                pickup_fare = ?, 
                drop_fare = ?, 
                updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        $updateStmt->execute([$pickupFare, $dropFare, $vehicleId]);
    } else {
        // Insert new record
        $insertStmt = $pdo->prepare("
            INSERT INTO airport_transfer_fares 
            (vehicle_id, pickup_fare, drop_fare, created_at, updated_at) 
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        $insertStmt->execute([$vehicleId, $pickupFare, $dropFare]);
    }
    
    // Try alternative direct DB update in case their schema is different
    try {
        // Try vehicle_trip_rates table (alternative schema)
        $alternateSql = "
            INSERT INTO vehicle_trip_rates 
            (vehicle_id, trip_type, pickup_fare, drop_fare, updated_at) 
            VALUES (?, 'airport', ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
            pickup_fare = VALUES(pickup_fare), 
            drop_fare = VALUES(drop_fare),
            updated_at = NOW()
        ";
        $alternateStmt = $pdo->prepare($alternateSql);
        $alternateStmt->execute([$vehicleId, $pickupFare, $dropFare]);
    } catch (Exception $alternateException) {
        // Just log the error, don't fail the entire request
        error_log('Alternative airport fare update failed: ' . $alternateException->getMessage());
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport transfer fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'pickupFare' => $pickupFare,
            'dropFare' => $dropFare
        ]
    ]);
    
} catch (PDOException $e) {
    // Log the full error
    error_log('Database error: ' . $e->getMessage());
    
    // Return error response
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'receivedData' => $data
    ]);
}
?>
