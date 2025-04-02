
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

try {
    // Check if direct-vehicle-update.php exists
    $updateFile = __DIR__ . '/direct-vehicle-update.php';
    if (!file_exists($updateFile)) {
        handleError("Update implementation file not found");
    }

    // Get raw input before including any files (to avoid multiple reading of the input stream)
    $rawInput = file_get_contents('php://input');
    $_SERVER['RAW_HTTP_INPUT'] = $rawInput; // Store for access in included file
    
    // Include the direct-vehicle-update.php file which has the full implementation
    include($updateFile);
} catch (Exception $e) {
    handleError("Error in update-vehicle.php: " . $e->getMessage());
}
?>
