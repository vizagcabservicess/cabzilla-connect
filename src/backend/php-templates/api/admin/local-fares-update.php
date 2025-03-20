
<?php
// local-fares-update.php - Endpoint for updating local trip fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Include database configuration
require_once '../config.php';

// Get JSON data from request
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Log received data for debugging
error_log('Received local fares update data: ' . print_r($data, true));

// Check if data is valid
if (
    !$data ||
    !isset($data['vehicleId']) ||
    !isset($data['price8hrs80km']) || 
    !isset($data['price10hrs100km']) || 
    !isset($data['priceExtraKm'])
) {
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
    $price8hrs80km = floatval($data['price8hrs80km']);
    $price10hrs100km = floatval($data['price10hrs100km']);
    $priceExtraKm = floatval($data['priceExtraKm']);
    
    // First check if record exists for this vehicle and trip type
    $checkStmt = $pdo->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'");
    $checkStmt->execute([$vehicleId]);
    
    if ($checkStmt->rowCount() > 0) {
        // Update existing record
        $updateStmt = $pdo->prepare("
            UPDATE vehicle_pricing 
            SET 
                price_8hrs_80km = ?,
                price_10hrs_100km = ?,
                price_extra_km = ?,
                updated_at = NOW()
            WHERE vehicle_id = ? AND trip_type = 'local'
        ");
        
        $result = $updateStmt->execute([
            $price8hrs80km,
            $price10hrs100km,
            $priceExtraKm,
            $vehicleId
        ]);
    } else {
        // Insert new record
        $insertStmt = $pdo->prepare("
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, price_8hrs_80km, price_10hrs_100km, price_extra_km, created_at, updated_at)
            VALUES (?, 'local', ?, ?, ?, NOW(), NOW())
        ");
        
        $result = $insertStmt->execute([
            $vehicleId,
            $price8hrs80km,
            $price10hrs100km,
            $priceExtraKm
        ]);
    }
    
    // Try alternative table format if the first one doesn't work
    // Some implementations use different table structures
    try {
        $alternateSql = "
            INSERT INTO vehicle_trip_rates 
            (vehicle_id, trip_type, hr8_km80, hr10_km100, extra_km_rate, updated_at)
            VALUES (?, 'local', ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            hr8_km80 = VALUES(hr8_km80),
            hr10_km100 = VALUES(hr10_km100),
            extra_km_rate = VALUES(extra_km_rate),
            updated_at = NOW()
        ";
        
        $alternateStmt = $pdo->prepare($alternateSql);
        $alternateStmt->execute([
            $vehicleId,
            $price8hrs80km,
            $price10hrs100km,
            $priceExtraKm
        ]);
    } catch (Exception $alternateException) {
        // Log but don't fail if this doesn't work
        error_log('Alternative table update failed: ' . $alternateException->getMessage());
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'price8hrs80km' => $price8hrs80km,
            'price10hrs100km' => $price10hrs100km,
            'priceExtraKm' => $priceExtraKm
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
