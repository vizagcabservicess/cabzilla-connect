
<?php
/**
 * update-vehicle.php - Update an existing vehicle
 * This is a simple proxy to direct-vehicle-update.php
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Simple error handler
function handleError($message) {
    logMessage("Error in update-vehicle.php: $message", 'vehicle-update-errors.log');
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

// If possible, do a quick check to see if vehicle exists before forwarding
if (!empty($data) && (isset($data['id']) || isset($data['vehicleId']) || isset($data['vehicle_id']))) {
    $vehicleId = $data['id'] ?? $data['vehicleId'] ?? $data['vehicle_id'] ?? '';
    
    if (!empty($vehicleId)) {
        try {
            // Try to check if vehicle exists in database
            $conn = getDbConnectionWithRetry();
            $query = "SELECT COUNT(*) as count FROM vehicles WHERE id = ? OR vehicle_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('ss', $vehicleId, $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] == 0) {
                $conn->close();
                handleError("Vehicle with ID '$vehicleId' not found in database");
            }
            
            $conn->close();
        } catch (Exception $e) {
            // If we can't check, continue anyway - the update endpoint will handle it
            logMessage("Warning: Could not verify vehicle exists: " . $e->getMessage(), 'vehicle-update-warning.log');
        }
    }
}

try {
    // Enable logging
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/update-vehicle-proxy.log';
    logMessage("Received " . $_SERVER['REQUEST_METHOD'] . " request", 'update-vehicle-proxy.log');
    
    if (!empty($data)) {
        logMessage("Data: " . json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR), 'update-vehicle-proxy.log');
    } else {
        logMessage("No data parsed, raw input length: " . strlen($rawInput), 'update-vehicle-proxy.log');
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
    logMessage("Error: " . $e->getMessage(), 'update-vehicle-proxy.log');
    handleError("Error in update-vehicle.php: " . $e->getMessage());
}
