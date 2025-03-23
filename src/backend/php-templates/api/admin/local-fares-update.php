
<?php
// local-fares-update.php - Dedicated endpoint for updating local trip fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Local fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

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

// Log received data for debugging
error_log('Received local fares update data (combined): ' . print_r($data, true));

// Check if data is valid - support multiple field name variations
if (empty($data)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No data received',
        'receivedData' => [
            'POST' => $_POST,
            'GET' => $_GET,
            'RAW' => file_get_contents('php://input')
        ]
    ]);
    exit;
}

// Extract vehicle ID and normalize using any of the possible field names
$vehicleId = '';
foreach (['vehicleId', 'vehicle_id', 'vehicleType', 'vehicle_type', 'id'] as $field) {
    if (!empty($data[$field])) {
        $vehicleId = $data[$field];
        break;
    }
}

if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID',
        'receivedData' => $data
    ]);
    exit;
}

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple possible field names
$price4hrs40km = 0;
foreach (['package4hr40km', 'price4hrs40km', 'hr4km40Price', 'local_package_4hr', 'local_price_4hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $price4hrs40km = floatval($data[$field]);
        break;
    }
}

$price8hrs80km = 0;
foreach (['package8hr80km', 'price8hrs80km', 'hr8km80Price', 'local_package_8hr', 'local_price_8hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $price8hrs80km = floatval($data[$field]);
        break;
    }
}

$price10hrs100km = 0;
foreach (['package10hr100km', 'price10hrs100km', 'hr10km100Price', 'local_package_10hr', 'local_price_10hr'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $price10hrs100km = floatval($data[$field]);
        break;
    }
}

$priceExtraKm = 0;
foreach (['extraKmRate', 'priceExtraKm', 'extra_km_rate', 'extra_km_charge', 'extraKmCharge'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $priceExtraKm = floatval($data[$field]);
        break;
    }
}

$priceExtraHour = 0;
foreach (['extraHourRate', 'priceExtraHour', 'extra_hour_rate', 'extra_hour_charge', 'extraHourCharge'] as $field) {
    if (isset($data[$field]) && is_numeric($data[$field])) {
        $priceExtraHour = floatval($data[$field]);
        break;
    }
}

error_log("Extracted data: vehicleId=$vehicleId, 4hr=$price4hrs40km, 8hr=$price8hrs80km, 10hr=$price10hrs100km, extraKm=$priceExtraKm, extraHour=$priceExtraHour");

// Prepare response with all packages data
$responseData = [
    'status' => 'success',
    'message' => 'Local fares updated successfully',
    'data' => [
        'vehicleId' => $vehicleId,
        'packages' => [
            '4hrs-40km' => $price4hrs40km,
            '8hrs-80km' => $price8hrs80km,
            '10hrs-100km' => $price10hrs100km,
            'extra-km' => $priceExtraKm,
            'extra-hour' => $priceExtraHour
        ],
        'message' => 'Local fares updated successfully',
        'status' => 'success'
    ]
];

// Echo the response data with more detailed package information
echo json_encode($responseData);
