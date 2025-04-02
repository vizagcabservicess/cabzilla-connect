
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
    ]);
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
        $data = json_decode($rawInput, true);
        $isJSON = true;
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $jsonError = json_last_error_msg();
            handleError("JSON parse error: " . $jsonError);
        }
    } catch (Exception $e) {
        handleError("Failed to parse input data: " . $e->getMessage());
    }
}

// If we don't have data in either format, try one more time with raw input
if (empty($data) && !empty($rawInput)) {
    $_SERVER['RAW_HTTP_INPUT'] = $rawInput;
}

try {
    // Check if direct-vehicle-update.php exists
    $updateFile = __DIR__ . '/direct-vehicle-update.php';
    if (!file_exists($updateFile)) {
        handleError("Update implementation file not found");
    }
    
    // Store data for access in included file
    $_SERVER['VEHICLE_DATA'] = $data;
    
    // Include the direct-vehicle-update.php file which has the full implementation
    include($updateFile);
} catch (Exception $e) {
    handleError("Error in update-vehicle.php: " . $e->getMessage());
}
