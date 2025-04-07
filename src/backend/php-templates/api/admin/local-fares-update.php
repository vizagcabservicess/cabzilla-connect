
<?php
/**
 * local-fares-update.php - Updated with stricter validation to prevent numeric vehicle IDs
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message, $file = 'local-fares-update.log') {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $file);
}

// Log request information
logMessage("Local fares update request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Only POST method is allowed';
    echo json_encode($response);
    exit;
}

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Get POST data
$rawInput = file_get_contents('php://input');
logMessage("Raw input: " . $rawInput);

// Try to parse POST data
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    parse_str($rawInput, $data);
}

// If still no data, try $_POST directly
if (empty($data)) {
    $data = $_POST;
}

// Define standard vehicle IDs - ALL LOWERCASE for case-insensitive comparison
$standardVehicles = [
    'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 'tempo', 'traveller', 'etios', 'mpv', 'hycross', 'urbania'
];

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

// Log received data
logMessage("Received data: " . json_encode($data));

// Extract vehicle information
$vehicleId = '';

// Check each possible field name for vehicle ID
$possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];
foreach ($possibleVehicleIdFields as $field) {
    if (isset($data[$field]) && !empty($data[$field])) {
        $vehicleId = $data[$field];
        break;
    }
}

// CRITICAL: Validate and map vehicle ID
if (empty($vehicleId)) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

// Log original vehicle ID
$originalId = $vehicleId;
logMessage("Original vehicle ID: $originalId");

// CRITICAL FIX: Reject or map numeric vehicle IDs
if (is_numeric($vehicleId)) {
    logMessage("WARNING: Received numeric vehicle ID: $vehicleId - attempting to map");
    
    if (isset($numericMappings[$vehicleId])) {
        $vehicleId = $numericMappings[$vehicleId];
        logMessage("Mapped numeric ID $originalId to standard vehicle ID: $vehicleId");
    } else {
        // BLOCK creation with random numeric IDs
        $response['status'] = 'error';
        $response['message'] = 'Invalid numeric vehicle ID. Use standard vehicle names only.';
        $response['validOptions'] = $standardVehicles;
        $response['validNumericIds'] = array_keys($numericMappings);
        
        logMessage("BLOCKED random numeric ID: $originalId");
        echo json_encode($response);
        exit;
    }
}

// Normalize vehicle ID (lowercase, replace spaces with underscores)
$vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));

// Check if this is a standard vehicle type or map to one
$isStandardVehicle = in_array($vehicleId, $standardVehicles);
if (!$isStandardVehicle) {
    // Map common variations
    if ($vehicleId == 'mpv' || $vehicleId == 'innova_hycross' || $vehicleId == 'hycross') {
        $vehicleId = 'innova_crysta';
        $isStandardVehicle = true;
    } elseif ($vehicleId == 'dzire' || $vehicleId == 'swift') {
        $vehicleId = 'sedan';
        $isStandardVehicle = true;
    } else {
        // Reject non-standard vehicle that can't be mapped
        $response['status'] = 'error';
        $response['message'] = 'Invalid vehicle type. Use standard vehicle names only.';
        $response['validOptions'] = $standardVehicles;
        
        logMessage("REJECTED non-standard vehicle type: $originalId -> $vehicleId");
        echo json_encode($response);
        exit;
    }
}

// Extract pricing information
$packages = [
    '4hrs_40km' => [
        'name' => 'price_4hrs_40km',
        'required' => true,
        'value' => null
    ],
    '8hrs_80km' => [
        'name' => 'price_8hrs_80km',
        'required' => true,
        'value' => null
    ],
    '10hrs_100km' => [
        'name' => 'price_10hrs_100km',
        'required' => true,
        'value' => null
    ],
    'extra_km' => [
        'name' => 'price_extra_km',
        'required' => true,
        'value' => null
    ],
    'extra_hour' => [
        'name' => 'price_extra_hour',
        'required' => true,
        'value' => null
    ]
];

// Parse package pricing
foreach ($packages as $key => $package) {
    $fieldName = $package['name'];
    
    if (isset($data[$fieldName])) {
        $packages[$key]['value'] = floatval($data[$fieldName]);
    }
    // Check for alternative field names
    elseif (isset($data['local'][$fieldName])) {
        $packages[$key]['value'] = floatval($data['local'][$fieldName]);
    }
    elseif (isset($data['local'][$key])) {
        $packages[$key]['value'] = floatval($data['local'][$key]);
    }
    
    // Validate required fields
    if ($package['required'] && $packages[$key]['value'] === null) {
        $response['message'] = "Missing required pricing: $fieldName";
        echo json_encode($response);
        exit;
    }
    
    // Ensure numeric values
    if ($packages[$key]['value'] !== null && !is_numeric($packages[$key]['value'])) {
        $packages[$key]['value'] = 0;
    }
}

try {
    // Get database connection with retry
    $conn = getDbConnectionWithRetry();
    logMessage("Database connection established");
    
    // CRITICAL: First verify if this vehicle exists in the vehicles table
    $stmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?) OR LOWER(id) = LOWER(?) LIMIT 1");
    $stmt->bind_param('ss', $vehicleId, $vehicleId);
    $stmt->execute();
    $vehicleResult = $stmt->get_result();
    
    if ($vehicleResult->num_rows === 0) {
        // Not in vehicles table - check vehicle_types
        $stmt = $conn->prepare("SELECT vehicle_id, name FROM vehicle_types WHERE LOWER(vehicle_id) = LOWER(?) LIMIT 1");
        $stmt->bind_param('s', $vehicleId);
        $stmt->execute();
        $typeResult = $stmt->get_result();
        
        if ($typeResult->num_rows === 0) {
            // CRITICAL: If vehicle doesn't exist, DON'T create it here
            // Instead return error and require explicit vehicle creation
            $response['status'] = 'error';
            $response['message'] = "Vehicle '$vehicleId' does not exist. Please create the vehicle first.";
            $response['action'] = "createVehicle";
            $response['vehicleId'] = $vehicleId;
            logMessage("REJECTED: Vehicle does not exist and won't be auto-created: $vehicleId");
            echo json_encode($response);
            exit;
        } else {
            // Use the properly cased vehicle ID from the database
            $vehicleType = $typeResult->fetch_assoc();
            $vehicleId = $vehicleType['vehicle_id']; // Use proper casing from DB
            logMessage("Found vehicle in vehicle_types: $vehicleId");
        }
    } else {
        // Use the properly cased vehicle ID from the database
        $vehicle = $vehicleResult->fetch_assoc();
        $vehicleId = $vehicle['vehicle_id'] ?: $vehicle['id']; // Use proper casing from DB
        logMessage("Found vehicle in vehicles: $vehicleId");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Check if record exists
    $stmt = $conn->prepare("SELECT * FROM local_package_fares WHERE LOWER(vehicle_id) = LOWER(?)");
    $stmt->bind_param('s', $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing record
        $stmt = $conn->prepare("UPDATE local_package_fares SET 
            price_4hrs_40km = ?,
            price_8hrs_80km = ?,
            price_10hrs_100km = ?,
            price_extra_km = ?,
            price_extra_hour = ?,
            updated_at = NOW()
            WHERE LOWER(vehicle_id) = LOWER(?)");
        
        $stmt->bind_param(
            'ddddds',
            $packages['4hrs_40km']['value'],
            $packages['8hrs_80km']['value'],
            $packages['10hrs_100km']['value'],
            $packages['extra_km']['value'],
            $packages['extra_hour']['value'],
            $vehicleId
        );
        
        $stmt->execute();
        logMessage("Updated local_package_fares for vehicle: $vehicleId");
    } else {
        // Insert new record
        $stmt = $conn->prepare("INSERT INTO local_package_fares 
            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
        
        $stmt->bind_param(
            'sddddd',
            $vehicleId,
            $packages['4hrs_40km']['value'],
            $packages['8hrs_80km']['value'],
            $packages['10hrs_100km']['value'],
            $packages['extra_km']['value'],
            $packages['extra_hour']['value']
        );
        
        $stmt->execute();
        logMessage("Inserted local_package_fares for vehicle: $vehicleId");
    }
    
    // Commit transaction
    $conn->commit();
    
    // Success response
    $response['status'] = 'success';
    $response['message'] = 'Local package fares updated successfully';
    $response['vehicleId'] = $vehicleId;
    $response['originalId'] = $originalId;
    $response['packages'] = $packages;
    
    // Trigger refresh in the UI
    $response['refresh'] = true;
    
    // Log success
    logMessage("SUCCESS: Local package fares updated for vehicle: $vehicleId (Original: $originalId)");
    
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    $response['message'] = 'Database error: ' . $e->getMessage();
    logMessage("ERROR: " . $e->getMessage());
} finally {
    // Close connection
    if (isset($conn)) {
        $conn->close();
    }
}

// Return response
echo json_encode($response);
?>
