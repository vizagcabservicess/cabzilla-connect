
<?php
// direct-fare-update.php - Ultra simple direct fare update endpoint
// Designed to be maximum compatibility and ignores most validation/security

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Debug: Direct fare update endpoint accessed');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
$logMessage = "[$timestamp] Direct fare update request received\n";
$logMessage .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logMessage .= "Headers: " . json_encode(getallheaders()) . "\n";
$logMessage .= "Raw input: $requestData\n";
$logMessage .= "POST data: " . json_encode($_POST) . "\n";
error_log($logMessage, 3, __DIR__ . '/../direct-update.log');

// Database connection parameters
$db_host = 'localhost';
$db_name = 'u644605165_new_bookingdb';
$db_user = 'u644605165_new_bookingusr';
$db_pass = 'Vizag@1213';

// Connect to database
try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Parse input data - try both JSON and form data
$data = null;

// Try JSON first
$json_data = json_decode($requestData, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
    error_log("Using JSON data: " . json_encode($data));
} 
// Then try POST data
else if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
} 
// Finally try parsing raw input as form data
else {
    parse_str($requestData, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
        error_log("Using parsed form data: " . json_encode($data));
    }
}

if (empty($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No data received', 'debug' => [
        'raw_input' => $requestData,
        'post' => $_POST,
        'get' => $_GET
    ]]);
    exit;
}

// Extract vehicle ID from all possible sources
$vehicleId = null;

if (isset($data['vehicleId'])) {
    $vehicleId = $data['vehicleId'];
} else if (isset($data['vehicle_id'])) {
    $vehicleId = $data['vehicle_id']; 
} else if (isset($data['vehicleType'])) {
    $vehicleId = $data['vehicleType'];
} else if (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks
$baseFare = isset($data['oneWayBasePrice']) ? $data['oneWayBasePrice'] : 
           (isset($data['baseFare']) ? $data['baseFare'] : 
           (isset($data['basePrice']) ? $data['basePrice'] : 0));
           
$pricePerKm = isset($data['oneWayPricePerKm']) ? $data['oneWayPricePerKm'] : 
             (isset($data['pricePerKm']) ? $data['pricePerKm'] : 0);

// Extract trip type
$tripType = isset($data['tripType']) ? $data['tripType'] : 'outstation';

if (empty($vehicleId)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required', 'received_data' => $data]);
    exit;
}

// Make sure vehicle exists in vehicles table
$vehicleQuery = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?";
$stmt = $pdo->prepare($vehicleQuery);
$stmt->execute([$vehicleId, $vehicleId]);

if ($stmt->rowCount() === 0) {
    // Vehicle doesn't exist, create it
    $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
    $insertVehicleSql = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, is_active) 
                        VALUES (?, ?, ?, ?, ?, 1)";
    $insertStmt = $pdo->prepare($insertVehicleSql);
    $insertStmt->execute([$vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm]);
    
    error_log("Created new vehicle: $vehicleId with name $vehicleName");
}

// Direct database update based on trip type
try {
    $success = false;
    
    switch ($tripType) {
        case 'outstation':
        case 'outstation-one-way':
            // Update vehicles table
            $updateVehiclesSql = "UPDATE vehicles SET base_price = ?, price_per_km = ? WHERE id = ? OR vehicle_id = ?";
            $updateVehiclesStmt = $pdo->prepare($updateVehiclesSql);
            $updateVehiclesStmt->execute([$baseFare, $pricePerKm, $vehicleId, $vehicleId]);
            
            // Try to update vehicle_pricing table
            try {
                $pricingQuery = "INSERT INTO vehicle_pricing 
                                (vehicle_id, trip_type, base_fare, price_per_km) 
                                VALUES (?, 'outstation-one-way', ?, ?)
                                ON DUPLICATE KEY UPDATE 
                                base_fare = VALUES(base_fare), 
                                price_per_km = VALUES(price_per_km)";
                $pricingStmt = $pdo->prepare($pricingQuery);
                $pricingStmt->execute([$vehicleId, $baseFare, $pricePerKm]);
                
                $success = true;
                error_log("Updated vehicle_pricing for outstation one-way");
            } catch (PDOException $e) {
                error_log("Failed to update vehicle_pricing: " . $e->getMessage());
                // Continue anyway, as we updated the main vehicles table
                $success = true;
            }
            
            // Try to update outstation_fares table
            try {
                $outstationQuery = "INSERT INTO outstation_fares 
                                   (vehicle_id, base_fare, price_per_km) 
                                   VALUES (?, ?, ?)
                                   ON DUPLICATE KEY UPDATE 
                                   base_fare = VALUES(base_fare), 
                                   price_per_km = VALUES(price_per_km)";
                $outstationStmt = $pdo->prepare($outstationQuery);
                $outstationStmt->execute([$vehicleId, $baseFare, $pricePerKm]);
                
                $success = true;
                error_log("Updated outstation_fares table");
            } catch (PDOException $e) {
                error_log("Failed to update outstation_fares: " . $e->getMessage());
                // Continue anyway, as we may have updated other tables
            }
            break;
            
        case 'local':
            // Get local package pricing data
            $price8hrs80km = isset($data['price8hrs80km']) ? $data['price8hrs80km'] : 
                           (isset($data['hr8km80Price']) ? $data['hr8km80Price'] : 0);
            $price10hrs100km = isset($data['price10hrs100km']) ? $data['price10hrs100km'] : 
                             (isset($data['hr10km100Price']) ? $data['hr10km100Price'] : 0);
            $priceExtraKm = isset($data['priceExtraKm']) ? $data['priceExtraKm'] : 
                          (isset($data['extraKmRate']) ? $data['extraKmRate'] : 0);
                          
            // Try to update local_package_fares table
            try {
                $localQuery = "INSERT INTO local_package_fares 
                              (vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km) 
                              VALUES (?, ?, ?, ?)
                              ON DUPLICATE KEY UPDATE 
                              price_8hrs_80km = VALUES(price_8hrs_80km), 
                              price_10hrs_100km = VALUES(price_10hrs_100km), 
                              price_extra_km = VALUES(price_extra_km)";
                $localStmt = $pdo->prepare($localQuery);
                $localStmt->execute([$vehicleId, $price8hrs80km, $price10hrs100km, $priceExtraKm]);
                
                $success = true;
                error_log("Updated local_package_fares table");
            } catch (PDOException $e) {
                error_log("Failed to update local_package_fares: " . $e->getMessage());
                // Continue anyway
            }
            break;
            
        case 'airport':
            // Get airport transfer pricing data
            $pickupFare = isset($data['pickupFare']) ? $data['pickupFare'] : $baseFare;
            $dropFare = isset($data['dropFare']) ? $data['dropFare'] : $pricePerKm;
            
            // Try to update airport_transfer_fares table
            try {
                $airportQuery = "INSERT INTO airport_transfer_fares 
                                (vehicle_id, pickup_fare, drop_fare) 
                                VALUES (?, ?, ?)
                                ON DUPLICATE KEY UPDATE 
                                pickup_fare = VALUES(pickup_fare), 
                                drop_fare = VALUES(drop_fare)";
                $airportStmt = $pdo->prepare($airportQuery);
                $airportStmt->execute([$vehicleId, $pickupFare, $dropFare]);
                
                $success = true;
                error_log("Updated airport_transfer_fares table");
            } catch (PDOException $e) {
                error_log("Failed to update airport_transfer_fares: " . $e->getMessage());
                // Continue anyway
            }
            break;
    }
    
    if ($success) {
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Pricing updated successfully',
            'data' => [
                'vehicleId' => $vehicleId,
                'tripType' => $tripType,
                'pricing' => [
                    'baseFare' => $baseFare,
                    'pricePerKm' => $pricePerKm
                ]
            ]
        ]);
    } else {
        throw new Exception("Failed to update any pricing tables");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
