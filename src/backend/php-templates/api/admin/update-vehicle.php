
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

// Function to get the actual vehicle_id for numeric IDs
function getActualVehicleId($numericId, $conn) {
    try {
        // First try direct vehicle_id lookup
        $query = "SELECT vehicle_id, name FROM vehicles WHERE id = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bind_param('s', $numericId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            logMessage("Found vehicle_id '{$row['vehicle_id']}' for numeric ID $numericId", 'vehicle-update-debug.log');
            return $row['vehicle_id'] ?: $row['name'];
        }
        
        // If not found by ID, check known mappings (this is our failsafe)
        $knownMappings = [
            '1' => 'sedan',
            '2' => 'ertiga',
            '180' => 'etios',
            '1266' => 'MPV',
            '592' => 'Urbania'
        ];
        
        if (isset($knownMappings[$numericId])) {
            logMessage("Using known mapping for numeric ID $numericId: {$knownMappings[$numericId]}", 'vehicle-update-debug.log');
            return $knownMappings[$numericId];
        }
        
        logMessage("No mapping found for numeric ID $numericId", 'vehicle-update-debug.log');
        return null;
    } catch (Exception $e) {
        logMessage("Error in getActualVehicleId: " . $e->getMessage(), 'vehicle-update-errors.log');
        return null;
    }
}

// Function to check if a vehicle already exists to prevent duplicates
function vehicleExists($vehicleId, $conn) {
    try {
        $query = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ? OR id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param('ss', $vehicleId, $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return ($row['count'] > 0);
    } catch (Exception $e) {
        logMessage("Error in vehicleExists: " . $e->getMessage(), 'vehicle-update-errors.log');
        return false;
    }
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

// Better vehicle ID normalization before checking existence
$vehicleId = null;
$originalVehicleId = null;

// Check all possible field names for the vehicle ID
foreach (['id', 'vehicleId', 'vehicle_id', 'vehicle'] as $key) {
    if (!empty($data[$key])) {
        $originalVehicleId = $data[$key];
        $vehicleId = trim($data[$key]);
        // Remove any "item-" prefix if it exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        break;
    }
}

// Log the initial vehicle ID found for debugging
logMessage("Initial vehicle ID found: $vehicleId (original: $originalVehicleId)", 'vehicle-update-debug.log');

// CRITICAL: Special handling for problematic numeric IDs that create duplicates
$knownVehicleIds = ['sedan', 'ertiga', 'etios', 'MPV', 'Urbania'];
if (!in_array($vehicleId, $knownVehicleIds) && is_numeric($vehicleId) && intval($vehicleId) > 0) {
    try {
        $conn = getDbConnectionWithRetry();
        $actualId = getActualVehicleId($vehicleId, $conn);
        
        if (!empty($actualId)) {
            logMessage("Converted numeric ID $vehicleId to actual vehicle_id: $actualId", 'vehicle-update-debug.log');
            $vehicleId = $actualId;
            
            // Update the data array with the actual vehicle ID
            foreach (['id', 'vehicleId', 'vehicle_id', 'vehicle'] as $key) {
                if (isset($data[$key])) {
                    $data[$key] = $vehicleId;
                }
            }
        } else {
            // If we can't convert the ID but it's numeric, this is a dangerous operation - log it
            logMessage("WARNING: Unable to map numeric ID $vehicleId to a known vehicle_id. This may create duplicates.", 'vehicle-update-warning.log');
        }
        $conn->close();
    } catch (Exception $e) {
        logMessage("Warning: Could not convert numeric ID: " . $e->getMessage(), 'vehicle-update-warning.log');
    }
}

// Store the normalized vehicle ID back in the data array with all common keys
if (!empty($vehicleId)) {
    $data['id'] = $vehicleId;
    $data['vehicleId'] = $vehicleId;
    $data['vehicle_id'] = $vehicleId;
}

// Log the vehicle ID we found for debugging
logMessage("Processing update for vehicle ID: $vehicleId", 'vehicle-update-debug.log');

// Only perform the database check if we have a valid vehicle ID
if (!empty($vehicleId)) {
    try {
        // Try to check if vehicle exists in database
        $conn = getDbConnectionWithRetry();
        
        // First check if this is a numeric ID that doesn't exist but might be used as a vehicle_id
        if (is_numeric($vehicleId) && !vehicleExists($vehicleId, $conn)) {
            logMessage("WARNING: Numeric ID $vehicleId doesn't exist as a vehicle. This operation might create a duplicate entry!", 'vehicle-update-warning.log');
            
            // If this looks like an integer ID, try to prevent creation of a duplicate
            if (intval($vehicleId) > 100) { // Probably a database ID and not a vehicle_id string
                handleError("Cannot update vehicle with ID '$vehicleId'. This appears to be a database ID and not a valid vehicle identifier.");
            }
        }
        
        $conn->close();
    } catch (Exception $e) {
        // If we can't check, continue anyway - the update endpoint will handle it
        logMessage("Warning: Could not verify vehicle exists: " . $e->getMessage(), 'vehicle-update-warning.log');
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
