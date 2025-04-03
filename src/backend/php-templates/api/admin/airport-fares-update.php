
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data
    $postData = $_POST;
    
    // If no POST data, try to get it from the request body
    if (empty($postData)) {
        $json = file_get_contents('php://input');
        file_put_contents($logFile, "[$timestamp] Raw input: $json\n", FILE_APPEND);
        
        $postData = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON: ' . json_last_error_msg());
        }
    }
    
    file_put_contents($logFile, "[$timestamp] Parsed data: " . json_encode($postData) . "\n", FILE_APPEND);

    // Check required fields - look for vehicle ID in multiple possible fields
    $vehicleId = null;
    if (isset($postData['vehicleId']) && !empty($postData['vehicleId'])) {
        $vehicleId = $postData['vehicleId'];
    } elseif (isset($postData['vehicle_id']) && !empty($postData['vehicle_id'])) {
        $vehicleId = $postData['vehicle_id'];
    } elseif (isset($postData['id']) && !empty($postData['id'])) {
        $vehicleId = $postData['id'];
    }

    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    file_put_contents($logFile, "[$timestamp] Found vehicle ID: $vehicleId\n", FILE_APPEND);

    $priceOneWay = isset($postData['priceOneWay']) ? floatval($postData['priceOneWay']) : 0;
    $priceRoundTrip = isset($postData['priceRoundTrip']) ? floatval($postData['priceRoundTrip']) : 0;
    $nightCharges = isset($postData['nightCharges']) ? floatval($postData['nightCharges']) : 0;
    $extraWaitingCharges = isset($postData['extraWaitingCharges']) ? floatval($postData['extraWaitingCharges']) : 0;

    // This is a mock implementation for the Lovable preview
    // In a real environment, this would connect to a database
    
    file_put_contents($logFile, "[$timestamp] Successfully processed fare update for vehicle: $vehicleId\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] OneWay: $priceOneWay, RoundTrip: $priceRoundTrip, Night: $nightCharges, Waiting: $extraWaitingCharges\n", FILE_APPEND);

    // Create a lock file to prevent immediate syncing after an update
    // (helps prevent infinite loops)
    file_put_contents($logDir . '/airport_fares_updated.lock', time());
    
    // In a mock implementation, we'll just return success
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'vehicle_id' => $vehicleId,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(400); // Changed from 500 to 400 for "Bad Request" which is more accurate for missing vehicle ID
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
