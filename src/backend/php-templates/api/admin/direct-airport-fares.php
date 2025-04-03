
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config.php';

try {
    $conn = getDbConnection();
    
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Check if airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $airportTableExists = $checkResult && $checkResult->num_rows > 0;
    
    if ($airportTableExists) {
        $query = "SELECT * FROM airport_transfer_fares";
        if ($vehicleId) {
            $query .= " WHERE vehicle_id = ?";
        }
        
        $stmt = $conn->prepare($query);
        
        if ($vehicleId) {
            $stmt->bind_param('s', $vehicleId);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $fares = [];
        while ($row = $result->fetch_assoc()) {
            $fares[] = [
                'vehicleId' => $row['vehicle_id'],
                'basePrice' => floatval($row['base_price']),
                'pricePerKm' => floatval($row['price_per_km']),
                'pickupPrice' => floatval($row['pickup_price']),
                'dropPrice' => floatval($row['drop_price']),
                'tier1Price' => floatval($row['tier1_price']),
                'tier2Price' => floatval($row['tier2_price']),
                'tier3Price' => floatval($row['tier3_price']),
                'tier4Price' => floatval($row['tier4_price']),
                'extraKmCharge' => floatval($row['extra_km_charge'])
            ];
        }
    } else {
        // Fallback to vehicle_pricing table if airport_transfer_fares doesn't exist
        $query = "SELECT * FROM vehicle_pricing WHERE trip_type = 'airport'";
        if ($vehicleId) {
            $query .= " AND vehicle_id = ?";
        }
        
        $stmt = $conn->prepare($query);
        
        if ($vehicleId) {
            $stmt->bind_param('s', $vehicleId);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $fares = [];
        while ($row = $result->fetch_assoc()) {
            $fares[] = [
                'vehicleId' => $row['vehicle_id'],
                'basePrice' => floatval($row['airport_base_price']),
                'pricePerKm' => floatval($row['airport_price_per_km']),
                'pickupPrice' => floatval($row['airport_pickup_price']),
                'dropPrice' => floatval($row['airport_drop_price']),
                'tier1Price' => floatval($row['airport_tier1_price']),
                'tier2Price' => floatval($row['airport_tier2_price']),
                'tier3Price' => floatval($row['airport_tier3_price']),
                'tier4Price' => floatval($row['airport_tier4_price']),
                'extraKmCharge' => floatval($row['airport_extra_km_charge'])
            ];
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'fares' => $fares
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
