
<?php
// direct-fare-update.php - Ultra simplified direct fare update endpoint

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request to a file
$timestamp = date('Y-m-d H:i:s');
$logMessage = "[$timestamp] Direct fare update request received" . PHP_EOL;
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . PHP_EOL;
$logMessage .= "URL: " . $_SERVER['REQUEST_URI'] . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../logs/direct-fares.log');

// Get data from ALL possible sources
$data = [];

// First try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
}

// If no POST data, try JSON input
if (empty($data)) {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = $jsonData;
            error_log("Using JSON data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
        } else {
            // Try parsing as form data
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = $formData;
                error_log("Parsed raw input as form data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
            }
        }
    }
}

// Finally try GET parameters
if (empty($data) && !empty($_GET)) {
    $data = $_GET;
    error_log("Using GET data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
}

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

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

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
    
    // Create response with the compiled data
    $responseData = [
        'status' => 'success',
        'message' => 'Local fare update request received',
        'timestamp' => time(),
        'data' => [
            'packages' => [
                '4hrs-40km' => $package4hr,
                '8hrs-80km' => $package8hr,
                '10hrs-100km' => $package10hr,
                'extra-hour' => $extraHourRate,
                'extra-km' => $extraKmRate
            ],
            'vehicleId' => $vehicleId
        ]
    ];
    
    // Also save to database if we have a vehicle ID
    if (!empty($vehicleId)) {
        // Try database connection
        try {
            $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // First try updating the fare_prices table (which has package-based structure)
            try {
                // 1. Update or insert 4hrs package
                $sql4hr = "INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'local', '4hrs-40km', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()";
                $stmt4hr = $pdo->prepare($sql4hr);
                $stmt4hr->execute([$vehicleId, $package4hr]);
                
                // 2. Update or insert 8hrs package
                $sql8hr = "INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'local', '8hrs-80km', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()";
                $stmt8hr = $pdo->prepare($sql8hr);
                $stmt8hr->execute([$vehicleId, $package8hr]);
                
                // 3. Update or insert 10hrs package
                $sql10hr = "INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'local', '10hrs-100km', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()";
                $stmt10hr = $pdo->prepare($sql10hr);
                $stmt10hr->execute([$vehicleId, $package10hr]);
                
                // 4. Update or insert extra km rate
                $sqlKm = "INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'local', 'extra-km', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()";
                $stmtKm = $pdo->prepare($sqlKm);
                $stmtKm->execute([$vehicleId, $extraKmRate]);
                
                // 5. Update or insert extra hour rate
                $sqlHr = "INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'local', 'extra-hour', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()";
                $stmtHr = $pdo->prepare($sqlHr);
                $stmtHr->execute([$vehicleId, $extraHourRate]);
                
                $responseData['database'] = 'Updated fare_prices table successfully';
            } catch (Exception $e) {
                $responseData['databaseError'] = $e->getMessage();
            }
        } catch (Exception $e) {
            $responseData['databaseConnectionError'] = $e->getMessage();
        }
    }
    
    // Output the response
    echo json_encode($responseData);
    exit;
}

// If we get here, this is not a local fare update, just return the received data
echo json_encode([
    'status' => 'success',
    'message' => 'Fare update request received',
    'timestamp' => time(),
    'receivedData' => $data,
    'vehicleId' => $vehicleId,
    'tripType' => $tripType
]);
