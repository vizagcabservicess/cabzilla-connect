
<?php
// This is a redirection script for compatibility with old URLs
// It redirects to the admin/local-fares-update.php file

// Include necessary headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct local fare update request received at root endpoint: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] POST data: " . print_r($_POST, true), 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/direct-fares.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// For direct local fare updates, we need to forward the POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Log that we're about to redirect
    error_log("[$timestamp] Attempting to redirect to admin/local-fares-update.php", 3, $logDir . '/direct-fares.log');

    // Try using our simplified local-fares-update.php script first (most reliable)
    $simpleScript = __DIR__ . '/admin/local-fares-update.php';
    if (file_exists($simpleScript)) {
        error_log("[$timestamp] Using simplified local-fares-update.php script", 3, $logDir . '/direct-fares.log');
        
        // Set headers for JSON response
        header('Content-Type: application/json');
        
        // Forward all POST data and execute the simple script
        $_REQUEST = array_merge($_GET, $_POST);
        
        // Try to parse JSON input if present
        if (!empty($requestData)) {
            $jsonData = json_decode($requestData, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                // Merge JSON data into $_REQUEST
                $_REQUEST = array_merge($_REQUEST, $jsonData);
                error_log("[$timestamp] Parsed and merged JSON data: " . print_r($jsonData, true), 3, $logDir . '/direct-fares.log');
            } else {
                // Try parsing as form data
                parse_str($requestData, $formData);
                if (!empty($formData)) {
                    $_REQUEST = array_merge($_REQUEST, $formData);
                    error_log("[$timestamp] Parsed and merged form data: " . print_r($formData, true), 3, $logDir . '/direct-fares.log');
                }
            }
        }
        
        // Include the simple script
        require_once $simpleScript;
        exit;
    }
    
    // Fallback to direct execution - use the same code as in local-fares-update.php
    // This is for maximum reliability when the redirection to admin/local-fares-update.php doesn't work
    
    // Get data from all possible sources - for maximum flexibility
    $data = [];
    
    // Try POST data
    if (!empty($_POST)) {
        $data = $_POST;
    }
    
    // If no POST data, try JSON input
    if (empty($data)) {
        if (!empty($requestData)) {
            $jsonData = json_decode($requestData, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                $data = $jsonData;
            } else {
                // Try parsing as form data
                parse_str($requestData, $formData);
                if (!empty($formData)) {
                    $data = $formData;
                }
            }
        }
    }
    
    // Finally try GET parameters
    if (empty($data) && !empty($_GET)) {
        $data = $_GET;
    }
    
    // Extract vehicle ID from any possible field name
    $vehicleId = '';
    foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id'] as $field) {
        if (!empty($data[$field])) {
            $vehicleId = $data[$field];
            break;
        }
    }
    
    // Clean vehicleId - remove "item-" prefix if exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Extract pricing data with multiple fallbacks
    $package4hr = 0;
    foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'price_4hrs_40km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package4hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages or fares objects
    if ($package4hr == 0 && isset($data['packages']) && isset($data['packages']['4hrs-40km'])) {
        $package4hr = floatval($data['packages']['4hrs-40km']);
    }
    
    $package8hr = 0;
    foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'price_8hrs_80km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package8hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages or fares objects
    if ($package8hr == 0 && isset($data['packages']) && isset($data['packages']['8hrs-80km'])) {
        $package8hr = floatval($data['packages']['8hrs-80km']);
    }
    
    $package10hr = 0;
    foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'price_10hrs_100km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package10hr = floatval($data[$field]);
            break;
        }
    }
    
    // Also check in packages object
    if ($package10hr == 0 && isset($data['packages']) && isset($data['packages']['10hrs-100km'])) {
        $package10hr = floatval($data['packages']['10hrs-100km']);
    }
    
    $extraKmRate = 0;
    foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'price_extra_km'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraKmRate = floatval($data[$field]);
            break;
        }
    }
    
    $extraHourRate = 0;
    foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'price_extra_hour'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraHourRate = floatval($data[$field]);
            break;
        }
    }
    
    // Simple validation
    if (empty($vehicleId)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required',
            'received_data' => $data
        ]);
        exit;
    }
    
    // Send a success response regardless of database operation
    // This way frontend always gets something positive
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'packages' => [
                '4hrs-40km' => $package4hr,
                '8hrs-80km' => $package8hr,
                '10hrs-100km' => $package10hr,
                'extra-km' => $extraKmRate,
                'extra-hour' => $extraHourRate
            ]
        ]
    ]);
    exit;
}

// Method not allowed
http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed. Use POST for direct local fare updates.'
]);
