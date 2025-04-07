
<?php
/**
 * Simple Direct Airport Fares API
 * Handles both retrieval and updates of airport fares
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Direct airport fares request received: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

try {
    // This is a simplified script for the Lovable preview
    // In production, you would use a real database connection
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Handle fare update
        
        // Get data from various possible sources
        $data = [];
        
        // Try to get JSON data from request body
        $inputJSON = file_get_contents('php://input');
        if (!empty($inputJSON)) {
            file_put_contents($logFile, "[$timestamp] Raw JSON input: $inputJSON\n", FILE_APPEND);
            $jsonData = json_decode($inputJSON, true);
            if ($jsonData !== null) {
                $data = $jsonData;
                file_put_contents($logFile, "[$timestamp] Parsed JSON data\n", FILE_APPEND);
            }
        }
        
        // If no JSON data, try POST data
        if (empty($data) && !empty($_POST)) {
            $data = $_POST;
            file_put_contents($logFile, "[$timestamp] Using POST data\n", FILE_APPEND);
        }
        
        // Log all received data
        file_put_contents($logFile, "[$timestamp] Received data: " . print_r($data, true) . "\n", FILE_APPEND);
        
        // Check for vehicle ID in multiple formats
        $vehicleId = null;
        if (!empty($data['vehicleId'])) {
            $vehicleId = $data['vehicleId'];
        } elseif (!empty($data['vehicle_id'])) {
            $vehicleId = $data['vehicle_id'];
        } elseif (!empty($data['id'])) {
            $vehicleId = $data['id'];
        }
        
        if (empty($vehicleId)) {
            throw new Exception('Vehicle ID is required');
        }
        
        file_put_contents($logFile, "[$timestamp] Vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Extract fare data with safe defaults
        $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
        $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
        $pickupPrice = isset($data['pickupPrice']) ? floatval($data['pickupPrice']) : 0;
        $dropPrice = isset($data['dropPrice']) ? floatval($data['dropPrice']) : 0;
        $tier1Price = isset($data['tier1Price']) ? floatval($data['tier1Price']) : 0;
        $tier2Price = isset($data['tier2Price']) ? floatval($data['tier2Price']) : 0;
        $tier3Price = isset($data['tier3Price']) ? floatval($data['tier3Price']) : 0;
        $tier4Price = isset($data['tier4Price']) ? floatval($data['tier4Price']) : 0;
        $extraKmCharge = isset($data['extraKmCharge']) ? floatval($data['extraKmCharge']) : 0;
        $nightCharges = isset($data['nightCharges']) ? floatval($data['nightCharges']) : 0;
        $extraWaitingCharges = isset($data['extraWaitingCharges']) ? floatval($data['extraWaitingCharges']) : 0;
        
        // Log the extracted values
        file_put_contents($logFile, "[$timestamp] Extracted fares - Base: $basePrice, PerKm: $pricePerKm, Pickup: $pickupPrice, Drop: $dropPrice\n", FILE_APPEND);
        
        // Create a response with all the data
        $response = [
            'status' => 'success',
            'message' => 'Airport fare updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'pickupPrice' => $pickupPrice,
                'dropPrice' => $dropPrice,
                'tier1Price' => $tier1Price,
                'tier2Price' => $tier2Price,
                'tier3Price' => $tier3Price,
                'tier4Price' => $tier4Price,
                'extraKmCharge' => $extraKmCharge,
                'nightCharges' => $nightCharges,
                'extraWaitingCharges' => $extraWaitingCharges
            ],
            'timestamp' => time()
        ];
        
        // Encode and return the response
        $jsonResponse = json_encode($response);
        if ($jsonResponse === false) {
            throw new Exception('Failed to encode response: ' . json_last_error_msg());
        }
        
        echo $jsonResponse;
        file_put_contents($logFile, "[$timestamp] Successfully processed fare update\n", FILE_APPEND);
        
    } else {
        // Handle fare retrieval (GET request)
        
        // Check for vehicle ID in query params
        $vehicleId = isset($_GET['id']) ? $_GET['id'] : (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);
        
        // Sample data for testing/preview
        $sampleFares = [
            'sedan' => [
                'id' => 'sedan',
                'vehicleId' => 'sedan',
                'vehicle_id' => 'sedan',
                'name' => 'Sedan',
                'basePrice' => 3000,
                'pricePerKm' => 12,
                'pickupPrice' => 800,
                'dropPrice' => 800,
                'tier1Price' => 600,
                'tier2Price' => 800,
                'tier3Price' => 1000,
                'tier4Price' => 1200,
                'extraKmCharge' => 12,
                'nightCharges' => 250,
                'extraWaitingCharges' => 150
            ],
            'ertiga' => [
                'id' => 'ertiga',
                'vehicleId' => 'ertiga',
                'vehicle_id' => 'ertiga',
                'name' => 'Ertiga',
                'basePrice' => 3500,
                'pricePerKm' => 15,
                'pickupPrice' => 1000,
                'dropPrice' => 1000,
                'tier1Price' => 800,
                'tier2Price' => 1000,
                'tier3Price' => 1200,
                'tier4Price' => 1400,
                'extraKmCharge' => 15,
                'nightCharges' => 300,
                'extraWaitingCharges' => 200
            ],
            'innova_crysta' => [
                'id' => 'innova_crysta',
                'vehicleId' => 'innova_crysta',
                'vehicle_id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'basePrice' => 4000,
                'pricePerKm' => 17,
                'pickupPrice' => 1200,
                'dropPrice' => 1200,
                'tier1Price' => 1000,
                'tier2Price' => 1200,
                'tier3Price' => 1400,
                'tier4Price' => 1600,
                'extraKmCharge' => 17,
                'nightCharges' => 350,
                'extraWaitingCharges' => 250
            ],
            'tempo_traveller' => [
                'id' => 'tempo_traveller',
                'vehicleId' => 'tempo_traveller',
                'vehicle_id' => 'tempo_traveller',
                'name' => 'Tempo Traveller',
                'basePrice' => 6000,
                'pricePerKm' => 19,
                'pickupPrice' => 2000,
                'dropPrice' => 2000,
                'tier1Price' => 1600,
                'tier2Price' => 1800,
                'tier3Price' => 2000,
                'tier4Price' => 2500,
                'extraKmCharge' => 19,
                'nightCharges' => 400,
                'extraWaitingCharges' => 300
            ],
            'luxury' => [
                'id' => 'luxury',
                'vehicleId' => 'luxury',
                'vehicle_id' => 'luxury',
                'name' => 'Luxury Sedan',
                'basePrice' => 7000,
                'pricePerKm' => 22,
                'pickupPrice' => 2500,
                'dropPrice' => 2500,
                'tier1Price' => 2000,
                'tier2Price' => 2200,
                'tier3Price' => 2500,
                'tier4Price' => 3000,
                'extraKmCharge' => 22,
                'nightCharges' => 450,
                'extraWaitingCharges' => 350
            ]
        ];
        
        if ($vehicleId) {
            // Return fare for specific vehicle
            if (isset($sampleFares[$vehicleId])) {
                echo json_encode([
                    'status' => 'success',
                    'fares' => $sampleFares[$vehicleId],
                    'timestamp' => time()
                ]);
            } else {
                // Create a default entry for this vehicle
                $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                $defaultFare = [
                    'id' => $vehicleId,
                    'vehicleId' => $vehicleId,
                    'vehicle_id' => $vehicleId,
                    'name' => $vehicleName,
                    'basePrice' => 3500,
                    'pricePerKm' => 15,
                    'pickupPrice' => 1000,
                    'dropPrice' => 1000,
                    'tier1Price' => 800,
                    'tier2Price' => 1000,
                    'tier3Price' => 1200,
                    'tier4Price' => 1400,
                    'extraKmCharge' => 15,
                    'nightCharges' => 300,
                    'extraWaitingCharges' => 200
                ];
                
                echo json_encode([
                    'status' => 'success',
                    'fares' => $defaultFare,
                    'timestamp' => time()
                ]);
            }
        } else {
            // Return all fares
            echo json_encode([
                'status' => 'success',
                'fares' => array_values($sampleFares),
                'timestamp' => time()
            ]);
        }
    }
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Ensure proper JSON error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
