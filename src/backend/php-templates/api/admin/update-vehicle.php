
<?php
/**
 * update-vehicle.php - Update an existing vehicle
 * This is a simple proxy to direct-vehicle-update.php
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple error handler
function handleError($message) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $message,
        'timestamp' => time()
    ], JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
    exit;
}

// Get raw input data (handle both form data and raw JSON)
$rawInput = file_get_contents('php://input');
$isJSON = false;

// First check if we have form data
if (isset($_POST) && !empty($_POST)) {
    $data = $_POST;
} else {
    // Try parsing JSON
    try {
        $data = json_decode($rawInput, true, 512, JSON_THROW_ON_ERROR);
        $isJSON = true;
    } catch (Exception $e) {
        handleError("Failed to parse input data: " . $e->getMessage());
    }
}

// If we don't have data in either format, try one more time with raw input
if (empty($data) && !empty($rawInput)) {
    $_SERVER['RAW_HTTP_INPUT'] = $rawInput;
}

try {
    // Enable logging
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/update-vehicle-proxy.log';
    error_log(date('Y-m-d H:i:s') . " - Received " . $_SERVER['REQUEST_METHOD'] . " request\n", 3, $logFile);
    
    if (!empty($data)) {
        error_log(date('Y-m-d H:i:s') . " - Data: " . json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR) . "\n", 3, $logFile);
    } else {
        error_log(date('Y-m-d H:i:s') . " - No data parsed, raw input length: " . strlen($rawInput) . "\n", 3, $logFile);
    }
    
    // Use direct-vehicle-modify.php instead (more reliable implementation)
    $updateFile = __DIR__ . '/direct-vehicle-modify.php';
    if (!file_exists($updateFile)) {
        // Fall back to direct-vehicle-update.php if modify version doesn't exist
        $updateFile = __DIR__ . '/direct-vehicle-update.php';
        if (!file_exists($updateFile)) {
            handleError("Update implementation file not found");
        }
    }
    
    // Store data for access in included file
    $_SERVER['VEHICLE_DATA'] = $data;
    
    // Include the direct implementation file which has the full implementation
    include($updateFile);
} catch (Exception $e) {
    error_log(date('Y-m-d H:i:s') . " - Error: " . $e->getMessage() . "\n", 3, $logFile);
    handleError("Error in update-vehicle.php: " . $e->getMessage());
}
