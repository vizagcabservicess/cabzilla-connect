
<?php
// Redirect to admin endpoint for airport fares

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database config
require_once __DIR__ . '/../config.php';

// Simple sendJSON function 
function sendJSON($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Get the vehicle ID from query params
$vehicleId = $_GET['vehicleId'] ?? $_GET['vehicle_id'] ?? null;

// Create log for debugging
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Airport fares request for vehicle ID: $vehicleId\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // If no vehicle ID specified, return all fares
    $sql = "SELECT * FROM airport_transfer_fares";
    $params = [];
    $types = "";
    
    // If vehicle ID is specified, filter by it
    if ($vehicleId) {
        $sql .= " WHERE vehicle_id = ?";
        $params[] = $vehicleId;
        $types .= "s";
    }
    
    // Prepare and execute the query
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Format the output
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $fares[] = [
            'id' => (int)$row['id'],
            'vehicleId' => $row['vehicle_id'],
            'vehicle_id' => $row['vehicle_id'],
            'basePrice' => (float)$row['base_price'],
            'pricePerKm' => (float)$row['price_per_km'],
            'pickupPrice' => (float)$row['pickup_price'],
            'dropPrice' => (float)$row['drop_price'],
            'tier1Price' => (float)$row['tier1_price'],
            'tier2Price' => (float)$row['tier2_price'],
            'tier3Price' => (float)$row['tier3_price'],
            'tier4Price' => (float)$row['tier4_price'],
            'extraKmCharge' => (float)$row['extra_km_charge'],
            'updatedAt' => $row['updated_at']
        ];
    }
    
    // Return the fares
    sendJSON([
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'data' => $fares,
        'fares' => $fares
    ]);
    
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    sendJSON([
        'status' => 'error',
        'message' => 'Failed to retrieve airport fares: ' . $e->getMessage()
    ], 500);
}
