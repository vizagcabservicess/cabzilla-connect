
<?php
// direct-fare-update.php - Simple API endpoint for fare updates

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('X-Debug-File: direct-fare-update.php');
header('X-API-Version: 1.0.55');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request
error_log("Direct fare update request received at " . date('Y-m-d H:i:s'));

// Get data from various sources
$data = [];

// First try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true));
}

// If no POST data, try JSON input
if (empty($data)) {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = $jsonData;
            error_log("Using JSON data: " . print_r($data, true));
        } else {
            // Try parsing as form data
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("Parsed raw input as form data: " . print_r($data, true));
            }
        }
    }
}

// Finally try GET parameters
if (empty($data) && !empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data: " . print_r($data, true));
}

// Create a debug response with the data we received
$responseData = [
    'status' => 'success',
    'message' => 'Fare update request received',
    'timestamp' => time(),
    'receivedData' => $data,
    'dataSource' => !empty($_POST) ? 'POST' : (!empty($data) ? 'JSON/FormData' : 'GET')
];

// Extract vehicle ID and normalize using any of the possible field names
$vehicleId = '';
foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id'] as $field) {
    if (!empty($data[$field])) {
        $vehicleId = $data[$field];
        break;
    }
}

// Extract trip type using any of the possible field names
$tripType = '';
foreach (['tripType', 'trip_type', 'type'] as $field) {
    if (!empty($data[$field])) {
        $tripType = $data[$field];
        break;
    }
}

// Add the extracted data to response
$responseData['extractedData'] = [
    'vehicleId' => $vehicleId,
    'tripType' => $tripType
];

// For local fare updates, extract all package prices
if ($tripType == 'local') {
    $package4hr = 0;
    foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package4hr = floatval($data[$field]);
            break;
        }
    }
    
    $package8hr = 0;
    foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package8hr = floatval($data[$field]);
            break;
        }
    }
    
    $package10hr = 0;
    foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $package10hr = floatval($data[$field]);
            break;
        }
    }
    
    $extraKmRate = 0;
    foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraKmRate = floatval($data[$field]);
            break;
        }
    }
    
    $extraHourRate = 0;
    foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge'] as $field) {
        if (isset($data[$field]) && is_numeric($data[$field])) {
            $extraHourRate = floatval($data[$field]);
            break;
        }
    }
    
    $responseData['extractedData']['packages'] = [
        '4hrs-40km' => $package4hr,
        '8hrs-80km' => $package8hr,
        '10hrs-100km' => $package10hr,
        'extraKmRate' => $extraKmRate,
        'extraHourRate' => $extraHourRate
    ];
    
    // Add this data to the main response for better clarity
    $responseData['data'] = [
        'packages' => [
            '4hrs-40km' => $package4hr,
            '8hrs-80km' => $package8hr,
            '10hrs-100km' => $package10hr,
            'extra-hour' => $extraHourRate,
            'extra-km' => $extraKmRate
        ],
        'vehicleId' => $vehicleId
    ];
}

// Echo the response data
echo json_encode($responseData);
