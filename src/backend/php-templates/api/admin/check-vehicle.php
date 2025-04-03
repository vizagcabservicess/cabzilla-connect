
<?php
/**
 * check-vehicle.php - Validate vehicle ID exists and provide mapping if needed
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message, $file = 'check-vehicle.log') {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $file);
}

// Log request information
logMessage("Check vehicle request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'vehicleExists' => false
];

// Define standard vehicle IDs - ALL LOWERCASE for case-insensitive comparison
$standardVehicles = [
    'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 'tempo', 'traveller', 'etios', 'mpv', 'hycross', 'urbania'
];

// Get vehicle ID from request with fallbacks
$vehicleId = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Try using POST data first
    if (!empty($_POST['vehicleId'])) {
        $vehicleId = $_POST['vehicleId'];
    } elseif (!empty($_POST['vehicle_id'])) {
        $vehicleId = $_POST['vehicle_id'];
    } elseif (!empty($_POST['id'])) {
        $vehicleId = $_POST['id'];
    } else {
        // Try to parse JSON from request body
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true);
        
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            if (!empty($jsonData['vehicleId'])) {
                $vehicleId = $jsonData['vehicleId'];
            } elseif (!empty($jsonData['vehicle_id'])) {
                $vehicleId = $jsonData['vehicle_id'];
            } elseif (!empty($jsonData['id'])) {
                $vehicleId = $jsonData['id'];
            }
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_GET['vehicleId'])) {
        $vehicleId = $_GET['vehicleId'];
    } elseif (!empty($_GET['vehicle_id'])) {
        $vehicleId = $_GET['vehicle_id'];
    } elseif (!empty($_GET['id'])) {
        $vehicleId = $_GET['id'];
    }
}

// Log the received vehicle ID
logMessage("Received vehicle ID: " . $vehicleId);

// CRITICAL FIX: Block all numeric IDs that are not explicitly mapped
// Hard-coded mappings for known numeric IDs
$numericMappings = [
    '1' => 'sedan',
    '2' => 'ertiga', 
    '180' => 'etios',
    '1266' => 'innova',
    '592' => 'urbania',
    '1290' => 'sedan',
    '1291' => 'etios',
    '1292' => 'sedan',
    '1293' => 'urbania'
];

// Check if vehicle ID is a numeric value
if (is_numeric($vehicleId)) {
    logMessage("WARNING: Received numeric vehicle ID: $vehicleId");
    
    // Only allow specific mapped numeric IDs
    if (isset($numericMappings[$vehicleId])) {
        $originalId = $vehicleId;
        $vehicleId = $numericMappings[$vehicleId];
        logMessage("Mapped numeric ID $originalId to standard vehicle ID: $vehicleId");
        $response['mapped_id'] = $vehicleId;
        $response['original_id'] = $originalId;
    } else {
        // BLOCK ALL other numeric IDs
        $response['status'] = 'error';
        $response['message'] = 'Invalid numeric vehicle ID. Please use standard vehicle names.';
        $response['validOptions'] = $standardVehicles;
        $response['mapped_ids'] = array_keys($numericMappings);
        
        logMessage("BLOCKED unmapped numeric ID: $vehicleId");
        echo json_encode($response);
        exit;
    }
}

// Validate vehicle ID
if (empty($vehicleId)) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

// Normalize vehicle ID (lowercase, replace spaces with underscores)
$normalizedId = strtolower(str_replace(' ', '_', trim($vehicleId)));

// Check if the normalized ID is a standard vehicle type
$isStandardVehicle = in_array($normalizedId, $standardVehicles);

if (!$isStandardVehicle) {
    // Map common variations
    if ($normalizedId == 'mpv' || $normalizedId == 'innova_hycross' || $normalizedId == 'hycross') {
        $normalizedId = 'innova_crysta';
        $isStandardVehicle = true;
    } elseif ($normalizedId == 'dzire' || $normalizedId == 'swift') {
        $normalizedId = 'sedan';
        $isStandardVehicle = true;
    }
    
    // If it's still not a standard vehicle, reject it
    if (!$isStandardVehicle) {
        $response['status'] = 'error';
        $response['message'] = 'Invalid vehicle type. Please use standard vehicle names.';
        $response['validOptions'] = $standardVehicles;
        
        logMessage("REJECTED non-standard vehicle type: $vehicleId -> $normalizedId");
        echo json_encode($response);
        exit;
    }
}

// Include database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Check if vehicle exists in vehicles table
    $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ? OR name = ?");
    $stmt->bind_param('sss', $normalizedId, $normalizedId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $vehicle = $result->fetch_assoc();
        
        // Vehicle exists
        $response['status'] = 'success';
        $response['message'] = 'Vehicle exists';
        $response['vehicleExists'] = true;
        $response['vehicle'] = $vehicle;
        $response['originalId'] = $vehicleId;
        $response['mappedId'] = $normalizedId;
        
        logMessage("Vehicle exists: " . json_encode($vehicle));
    } else {
        // Check vehicle_types table as fallback
        $stmt = $conn->prepare("SELECT vehicle_id, name FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param('s', $normalizedId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $vehicle = $result->fetch_assoc();
            
            // Vehicle exists in vehicle_types
            $response['status'] = 'success';
            $response['message'] = 'Vehicle exists in vehicle_types';
            $response['vehicleExists'] = true;
            $response['vehicle'] = $vehicle;
            $response['originalId'] = $vehicleId;
            $response['mappedId'] = $normalizedId;
            
            logMessage("Vehicle exists in vehicle_types: " . json_encode($vehicle));
        } else {
            // CRITICAL: Always respond with false for vehicleExists if not found
            // Never set canCreate = true (prevent auto-creation)
            $response['status'] = 'error';
            $response['message'] = 'Vehicle does not exist. Please create it first.';
            $response['vehicleExists'] = false;
            $response['originalId'] = $vehicleId;
            $response['mappedId'] = $normalizedId;
            $response['canCreate'] = false; // CRITICAL: Prevent auto-creation
            
            logMessage("Vehicle does not exist: $normalizedId - Preventing auto-creation");
        }
    }
    
    $conn->close();
} catch (Exception $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    logMessage("Database error: " . $e->getMessage());
}

// Return response as JSON
echo json_encode($response);
?>
