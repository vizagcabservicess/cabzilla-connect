
<?php
/**
 * Direct Airport Fares Update API
 * Updates airport transfer fares for vehicles
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Setup error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the request
file_put_contents($logFile, "[$timestamp] Airport fares update request received\n", FILE_APPEND);

try {
    // Verify request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get request data
    $json = file_get_contents('php://input');
    file_put_contents($logFile, "[$timestamp] Raw input: $json\n", FILE_APPEND);
    
    if (empty($json)) {
        throw new Exception('No data received in request body');
    }
    
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    file_put_contents($logFile, "[$timestamp] Parsed data: " . json_encode($data, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

    // Check for vehicle ID in multiple possible fields
    $vehicleId = null;
    if (!empty($data['vehicleId'])) {
        $vehicleId = $data['vehicleId'];
    } elseif (!empty($data['vehicle_id'])) {
        $vehicleId = $data['vehicle_id'];
    } elseif (!empty($data['id'])) {
        $vehicleId = $data['id'];
    }

    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }

    file_put_contents($logFile, "[$timestamp] Processing fare update for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Extract fare data with default values
    $fareData = [
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'basePrice' => isset($data['basePrice']) ? floatval($data['basePrice']) : 0,
        'pricePerKm' => isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0,
        'pickupPrice' => isset($data['pickupPrice']) ? floatval($data['pickupPrice']) : 0,
        'dropPrice' => isset($data['dropPrice']) ? floatval($data['dropPrice']) : 0,
        'tier1Price' => isset($data['tier1Price']) ? floatval($data['tier1Price']) : 0,
        'tier2Price' => isset($data['tier2Price']) ? floatval($data['tier2Price']) : 0,
        'tier3Price' => isset($data['tier3Price']) ? floatval($data['tier3Price']) : 0,
        'tier4Price' => isset($data['tier4Price']) ? floatval($data['tier4Price']) : 0,
        'extraKmCharge' => isset($data['extraKmCharge']) ? floatval($data['extraKmCharge']) : 0,
        'nightCharges' => isset($data['nightCharges']) ? floatval($data['nightCharges']) : 0,
        'extraWaitingCharges' => isset($data['extraWaitingCharges']) ? floatval($data['extraWaitingCharges']) : 0
    ];

    // This is a mock implementation for the preview
    // In a real environment, this would connect to a database
    file_put_contents($logFile, "[$timestamp] Successfully processed fare update for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Create a response with the validated data
    $response = [
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'data' => $fareData,
        'timestamp' => time()
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
