
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
        
        if (!empty($json)) {
            $postData = json_decode($json, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // Try to handle non-JSON data (might be URL encoded or form data)
                parse_str($json, $parsedData);
                if (!empty($parsedData)) {
                    $postData = $parsedData;
                    file_put_contents($logFile, "[$timestamp] Parsed as URL encoded data\n", FILE_APPEND);
                } else {
                    throw new Exception('Invalid input format: ' . json_last_error_msg());
                }
            }
        } else {
            throw new Exception('No data received in request body');
        }
    }
    
    // Check if data is in a nested 'data' property (common when sent from frontend)
    if (isset($postData['data']) && is_array($postData['data'])) {
        $postData = $postData['data'];
        file_put_contents($logFile, "[$timestamp] Using nested data property\n", FILE_APPEND);
    }
    
    // Check if __data field exists (used by directVehicleOperation)
    if (isset($postData['__data']) && is_array($postData['__data'])) {
        $postData = $postData['__data'];
        file_put_contents($logFile, "[$timestamp] Using __data field\n", FILE_APPEND);
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
        // Detailed logging of all available keys to debug the issue
        file_put_contents($logFile, "[$timestamp] ERROR: Vehicle ID not found in request data. Available keys: " . 
            implode(", ", array_keys($postData)) . "\n", FILE_APPEND);
        throw new Exception('Vehicle ID is required');
    }

    file_put_contents($logFile, "[$timestamp] Found vehicle ID: $vehicleId\n", FILE_APPEND);

    // Extract fare data - support various naming conventions
    $priceOneWay = isset($postData['priceOneWay']) ? floatval($postData['priceOneWay']) : 
                  (isset($postData['oneWayPrice']) ? floatval($postData['oneWayPrice']) : 0);
    
    $priceRoundTrip = isset($postData['priceRoundTrip']) ? floatval($postData['priceRoundTrip']) : 
                     (isset($postData['roundTripPrice']) ? floatval($postData['roundTripPrice']) : 0);
    
    $nightCharges = isset($postData['nightCharges']) ? floatval($postData['nightCharges']) : 0;
    $extraWaitingCharges = isset($postData['extraWaitingCharges']) ? floatval($postData['extraWaitingCharges']) : 0;
    
    // Support for standard field naming from airport_transfer_fares table
    $basePrice = isset($postData['basePrice']) ? floatval($postData['basePrice']) : 0;
    $pricePerKm = isset($postData['pricePerKm']) ? floatval($postData['pricePerKm']) : 0;
    $pickupPrice = isset($postData['pickupPrice']) ? floatval($postData['pickupPrice']) : 0;
    $dropPrice = isset($postData['dropPrice']) ? floatval($postData['dropPrice']) : 0;
    $tier1Price = isset($postData['tier1Price']) ? floatval($postData['tier1Price']) : 0;
    $tier2Price = isset($postData['tier2Price']) ? floatval($postData['tier2Price']) : 0;
    $tier3Price = isset($postData['tier3Price']) ? floatval($postData['tier3Price']) : 0;
    $tier4Price = isset($postData['tier4Price']) ? floatval($postData['tier4Price']) : 0;
    $extraKmCharge = isset($postData['extraKmCharge']) ? floatval($postData['extraKmCharge']) : 0;

    // This is a mock implementation for the Lovable preview
    // In a real environment, this would connect to a database
    
    file_put_contents($logFile, "[$timestamp] Successfully processed fare update for vehicle: $vehicleId\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] OneWay: $priceOneWay, RoundTrip: $priceRoundTrip, Night: $nightCharges, Waiting: $extraWaitingCharges\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] BasePrice: $basePrice, PricePerKm: $pricePerKm, Tier1: $tier1Price, Tier2: $tier2Price, Tier3: $tier3Price, Tier4: $tier4Price\n", FILE_APPEND);

    // Create a lock file to prevent immediate syncing after an update
    // (helps prevent infinite loops)
    file_put_contents($logDir . '/airport_fares_updated.lock', time());
    
    // Create a response with all relevant data
    $response = [
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'vehicle_id' => $vehicleId,
        'data' => [
            'priceOneWay' => $priceOneWay,
            'priceRoundTrip' => $priceRoundTrip,
            'nightCharges' => $nightCharges,
            'extraWaitingCharges' => $extraWaitingCharges,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'pickupPrice' => $pickupPrice,
            'dropPrice' => $dropPrice,
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge
        ],
        'timestamp' => time()
    ];
    
    // Output valid JSON
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(400); // Changed from 500 to 400 for "Bad Request" which is more accurate for missing vehicle ID
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
