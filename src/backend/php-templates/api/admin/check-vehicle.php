
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

// Validate vehicle ID - CRITICAL FIX for random numeric vehicle IDs
if (empty($vehicleId)) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

// CRITICAL FIX: Convert all numeric IDs to standard vehicle IDs
// This prevents creation of random numeric vehicle entries
$originalId = $vehicleId;
$isNumeric = is_numeric($vehicleId);

// Always map numeric IDs to standard vehicle IDs
if ($isNumeric) {
    logMessage("WARNING: Received numeric vehicle ID: $vehicleId - rejecting or mapping to standard");
    
    // Hard-coded mappings for known numeric IDs
    $numericMappings = [
        '1' => 'sedan',
        '2' => 'ertiga', 
        '180' => 'etios',
        '1266' => 'innova',
        '592' => 'urbania',
        '1290' => 'sedan'
    ];
    
    if (isset($numericMappings[$vehicleId])) {
        $vehicleId = $numericMappings[$vehicleId];
        logMessage("Mapped numeric ID $originalId to standard vehicle ID: $vehicleId");
    } else {
        // BLOCK creation of new random numeric IDs
        $response['status'] = 'error';
        $response['message'] = 'Invalid numeric vehicle ID';
        $response['vehicleExists'] = false;
        $response['validOptions'] = $standardVehicles;
        
        logMessage("BLOCKED random numeric ID: $originalId");
        echo json_encode($response);
        exit;
    }
}

// Normalize vehicle ID (lowercase, replace spaces with underscores)
$normalizedId = strtolower(str_replace(' ', '_', trim($vehicleId)));

// Check if the normalized ID is a standard vehicle type
$isStandardVehicle = in_array($normalizedId, $standardVehicles);
$mappedVehicleId = $normalizedId;

// Map vehicle IDs to standard IDs if they're close matches
if (!$isStandardVehicle) {
    // Map common variations
    if ($normalizedId == 'mpv' || $normalizedId == 'innova_hycross' || $normalizedId == 'hycross') {
        $mappedVehicleId = 'innova_crysta';
    } elseif ($normalizedId == 'dzire' || $normalizedId == 'swift') {
        $mappedVehicleId = 'sedan';
    }
}

// Include database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Check if vehicle exists in vehicles table
    $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR id = ? OR name = ?");
    $stmt->bind_param('sss', $mappedVehicleId, $mappedVehicleId, $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $vehicle = $result->fetch_assoc();
        
        // Vehicle exists
        $response['status'] = 'success';
        $response['message'] = 'Vehicle exists';
        $response['vehicleExists'] = true;
        $response['vehicle'] = $vehicle;
        $response['originalId'] = $originalId;
        $response['mappedId'] = $mappedVehicleId;
        
        logMessage("Vehicle exists: " . json_encode($vehicle));
    } else {
        // Check vehicle_types table as fallback
        $stmt = $conn->prepare("SELECT vehicle_id, name FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param('s', $mappedVehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $vehicle = $result->fetch_assoc();
            
            // Vehicle exists in vehicle_types
            $response['status'] = 'success';
            $response['message'] = 'Vehicle exists in vehicle_types';
            $response['vehicleExists'] = true;
            $response['vehicle'] = $vehicle;
            $response['originalId'] = $originalId;
            $response['mappedId'] = $mappedVehicleId;
            
            logMessage("Vehicle exists in vehicle_types: " . json_encode($vehicle));
        } else {
            // Vehicle does not exist
            // CRITICAL FIX: Don't allow non-standard vehicles to be created
            if ($isStandardVehicle) {
                $response['status'] = 'warning';
                $response['message'] = 'Vehicle does not exist but is a standard type';
                $response['vehicleExists'] = false;
                $response['originalId'] = $originalId;
                $response['mappedId'] = $mappedVehicleId;
                
                logMessage("Vehicle does not exist but is standard type: $mappedVehicleId");
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Invalid vehicle type';
                $response['vehicleExists'] = false;
                $response['validOptions'] = $standardVehicles;
                
                logMessage("REJECTED non-standard vehicle type: $vehicleId");
                echo json_encode($response);
                exit;
            }
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
