
<?php
// outstation-fares-update.php - Dedicated endpoint for updating outstation fares

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
$logMessage = "[$timestamp] Outstation fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// Get JSON data from request
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Log received data for debugging
error_log('Received outstation fares update data: ' . print_r($data, true));

// Check if data is valid
if (!$data || !isset($data['vehicleId'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicleId field',
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
    $baseFare = isset($data['baseFare']) ? floatval($data['baseFare']) : 0;
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
    $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 0;
    $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
    
    // First ensure vehicle exists in vehicles table
    $checkVehicleStmt = $pdo->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    $checkVehicleStmt->execute([$vehicleId, $vehicleId]);
    
    if ($checkVehicleStmt->rowCount() === 0) {
        // Vehicle doesn't exist, create it
        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $pdo->prepare("
            INSERT INTO vehicles 
            (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        ");
        $insertVehicleStmt->execute([
            $vehicleId, 
            $vehicleId, 
            $vehicleName, 
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance
        ]);
    } else {
        // Update existing vehicle
        $updateVehicleStmt = $pdo->prepare("
            UPDATE vehicles 
            SET 
                base_price = ?, 
                price_per_km = ?, 
                night_halt_charge = ?, 
                driver_allowance = ?, 
                updated_at = NOW() 
            WHERE id = ? OR vehicle_id = ?
        ");
        $updateVehicleStmt->execute([
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance, 
            $vehicleId, 
            $vehicleId
        ]);
    }
    
    // Now update or insert in outstation_fares table
    $checkOutstationStmt = $pdo->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
    $checkOutstationStmt->execute([$vehicleId]);
    
    if ($checkOutstationStmt->rowCount() > 0) {
        // Update existing record
        $updateStmt = $pdo->prepare("
            UPDATE outstation_fares 
            SET 
                base_fare = ?, 
                price_per_km = ?, 
                night_halt_charge = ?, 
                driver_allowance = ?, 
                updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        $updateStmt->execute([
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance, 
            $vehicleId
        ]);
    } else {
        // Insert new record
        $insertStmt = $pdo->prepare("
            INSERT INTO outstation_fares 
            (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ");
        $insertStmt->execute([
            $vehicleId, 
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance
        ]);
    }
    
    // Try alternative direct DB update in case their schema is different
    try {
        // Try vehicle_trip_rates table (alternative schema)
        $alternateSql = "
            INSERT INTO vehicle_trip_rates 
            (vehicle_id, trip_type, base_fare, per_km_rate, night_halt_charge, driver_allowance, updated_at) 
            VALUES (?, 'outstation', ?, ?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
            base_fare = VALUES(base_fare), 
            per_km_rate = VALUES(per_km_rate), 
            night_halt_charge = VALUES(night_halt_charge),
            driver_allowance = VALUES(driver_allowance),
            updated_at = NOW()
        ";
        $alternateStmt = $pdo->prepare($alternateSql);
        $alternateStmt->execute([
            $vehicleId, 
            $baseFare, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance
        ]);
    } catch (Exception $alternateException) {
        // Just log the error, don't fail the entire request
        error_log('Alternative outstation fare update failed: ' . $alternateException->getMessage());
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Outstation fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance
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
