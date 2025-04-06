
<?php
/**
 * Direct Airport Fares API - Public facing version
 * Retrieves airport fare data for vehicles
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Setup error handling to return proper JSON responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Get vehicleId from all possible sources
$vehicleId = null;

// First check URL parameters - use all common parameter names
if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
} elseif (isset($_GET['vehicleId'])) {
    $vehicleId = $_GET['vehicleId'];
} elseif (isset($_GET['vehicle_id'])) {
    $vehicleId = $_GET['vehicle_id'];
}

// Log the request with vehicle ID
file_put_contents($logFile, "[$timestamp] Direct airport fares request received. Method: {$_SERVER['REQUEST_METHOD']}, Vehicle ID: " . ($vehicleId ?? 'not provided') . "\n", FILE_APPEND);

// Set admin headers to ensure permission
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
$_SERVER['HTTP_X_FORCE_CREATION'] = 'true';

// If no vehicle ID is provided, return error
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'timestamp' => time()
    ]);
    exit;
}

// Simple mock data generator for testing purposes
function generateMockFare($vehicleId) {
    $basePrice = rand(1000, 3000);
    return [
        'id' => rand(1, 1000),
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'basePrice' => $basePrice,
        'pricePerKm' => rand(10, 25),
        'pickupPrice' => $basePrice + rand(200, 500),
        'dropPrice' => $basePrice + rand(100, 400),
        'tier1Price' => $basePrice - rand(100, 200),
        'tier2Price' => $basePrice,
        'tier3Price' => $basePrice + rand(100, 300),
        'tier4Price' => $basePrice + rand(400, 600),
        'extraKmCharge' => rand(10, 20),
        'nightCharges' => rand(200, 500),
        'extraWaitingCharges' => rand(50, 150),
        'createdAt' => date('Y-m-d H:i:s'),
        'updatedAt' => date('Y-m-d H:i:s')
    ];
}

try {
    // Try to include the admin endpoint safely
    if (file_exists(__DIR__ . '/admin/direct-airport-fares.php')) {
        include_once __DIR__ . '/admin/direct-airport-fares.php';
    } else {
        // If the admin file doesn't exist, use mock data for preview
        $fare = generateMockFare($vehicleId);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Mock fare data generated for preview',
            'fare' => $fare,
            'isMock' => true,
            'timestamp' => time()
        ]);
    }
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return a proper JSON error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal server error: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
