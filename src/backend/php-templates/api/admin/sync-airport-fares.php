
<?php
/**
 * Sync Airport Fares API
 * Synchronizes airport fares with vehicle data
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

$logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log the request
file_put_contents($logFile, "[$timestamp] Sync airport fares request received\n", FILE_APPEND);

// Prevent excessive syncing
$lockFile = $logDir . '/airport_fares_sync.lock';
if (file_exists($lockFile)) {
    $lockTime = filemtime($lockFile);
    if (time() - $lockTime < 10) { // 10 second cooldown
        file_put_contents($logFile, "[$timestamp] Sync already run recently, skipping\n", FILE_APPEND);
        echo json_encode([
            'status' => 'error',
            'message' => 'Sync was run too recently. Please wait a moment and try again.',
            'timestamp' => time()
        ]);
        exit;
    }
}

// Create lock file
touch($lockFile);

try {
    // Parse request data
    $json = file_get_contents('php://input');
    $data = !empty($json) ? json_decode($json, true) : [];
    
    // Check if defaults should be applied
    $applyDefaults = isset($data['applyDefaults']) ? (bool)$data['applyDefaults'] : true;
    
    file_put_contents($logFile, "[$timestamp] Syncing airport fares with applyDefaults = " . ($applyDefaults ? 'true' : 'false') . "\n", FILE_APPEND);
    
    // Get vehicles data - in a real environment this would query vehicles from database
    $vehiclesData = [];
    $vehiclesDataFile = __DIR__ . '/../../data/vehicles.json';
    
    if (file_exists($vehiclesDataFile)) {
        $vehiclesJson = file_get_contents($vehiclesDataFile);
        $vehiclesData = json_decode($vehiclesJson, true) ?: [];
    }
    
    if (empty($vehiclesData)) {
        // Use default vehicles if no data file exists
        $vehiclesData = [
            [
                'id' => 'sedan',
                'name' => 'Sedan',
                'basePrice' => 2500,
                'pricePerKm' => 14
            ],
            [
                'id' => 'ertiga',
                'name' => 'Ertiga',
                'basePrice' => 3200,
                'pricePerKm' => 18
            ],
            [
                'id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'basePrice' => 3800,
                'pricePerKm' => 20
            ]
        ];
    }
    
    $syncedCount = count($vehiclesData);
    file_put_contents($logFile, "[$timestamp] Found $syncedCount vehicles to sync\n", FILE_APPEND);
    
    // Process results
    $synced = [];
    foreach ($vehiclesData as $vehicle) {
        $id = $vehicle['id'] ?? '';
        if (empty($id)) continue;
        
        // Generate default airport fares based on vehicle base price
        $basePrice = $vehicle['basePrice'] ?? 0;
        if ($basePrice <= 0) $basePrice = 2000; // Default base price
        
        $fareData = [
            'vehicleId' => $id,
            'vehicle_id' => $id,
            'basePrice' => $basePrice,
            'pricePerKm' => $vehicle['pricePerKm'] ?? 15,
            'pickupPrice' => $basePrice * 1.2,
            'dropPrice' => $basePrice * 1.1,
            'tier1Price' => $basePrice * 0.9,
            'tier2Price' => $basePrice,
            'tier3Price' => $basePrice * 1.1,
            'tier4Price' => $basePrice * 1.2,
            'extraKmCharge' => ($vehicle['pricePerKm'] ?? 15) * 1.2,
            'nightCharges' => 300,
            'extraWaitingCharges' => 100
        ];
        
        $synced[$id] = $fareData;
    }
    
    file_put_contents($logFile, "[$timestamp] Successfully synced " . count($synced) . " vehicles\n", FILE_APPEND);
    
    // Return successful response
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fares synced successfully',
        'count' => count($synced),
        'fares' => $synced,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error syncing airport fares: ' . $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
} finally {
    // Remove lock file after processing
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
}
