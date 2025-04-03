
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config.php';

try {
    $conn = getDbConnection();
    
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
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
            'priceOneWay' => floatval($row['price_one_way']),
            'priceRoundTrip' => floatval($row['price_round_trip']),
            'nightCharges' => floatval($row['night_charges']),
            'extraWaitingCharges' => floatval($row['extra_waiting_charges'])
        ];
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
