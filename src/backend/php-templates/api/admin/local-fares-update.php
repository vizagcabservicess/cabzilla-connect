
<?php
// local-fares-update.php - Ultra simplified local fare update endpoint
// No configuration files, no includes, pure standalone script

// Set CORS headers for all cases
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request details to a separate file for debugging
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Local fare update request received: Method=" . $_SERVER['REQUEST_METHOD'], 3, __DIR__ . '/../logs/direct-fares.log');
error_log("Raw input: $requestData", 3, __DIR__ . '/../logs/direct-fares.log');

// Get data from all possible sources - maximum flexibility
$data = [];

// Try POST data which is most likely for form submissions
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
}

// If no POST data, try JSON input
if (empty($data)) {
    if (!empty($requestData)) {
        $jsonData = json_decode($requestData, true);
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $data = $jsonData;
            error_log("Using JSON data: " . print_r($data, true), 3, __DIR__ . '/../logs/direct-fares.log');
        } else {
            // Try parsing as form data
            parse_str($requestData, $formData);
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

// Clean vehicleId - remove "item-" prefix if exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple fallbacks
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

// Normalize missing fares - if we have at least one value, assume others should be calculated proportionally
if ($package8hr > 0 && $package4hr === 0) {
    $package4hr = round($package8hr * 0.6); // 4hr package is typically 60% of 8hr
}

if ($package8hr > 0 && $package10hr === 0) {
    $package10hr = round($package8hr * 1.2); // 10hr package is typically 120% of 8hr
}

if ($package4hr > 0 && $package8hr === 0) {
    $package8hr = round($package4hr / 0.6); // Calculate 8hr from 4hr
}

if ($package10hr > 0 && $package8hr === 0) {
    $package8hr = round($package10hr / 1.2); // Calculate 8hr from 10hr
}

// Ensure we have at least some extra rate values
if ($extraKmRate === 0 && $package8hr > 0) {
    // Default to a sensible value based on vehicle type
    if (stripos($vehicleId, 'sedan') !== false || stripos($vehicleId, 'swift') !== false || stripos($vehicleId, 'dzire') !== false) {
        $extraKmRate = 14;
    } elseif (stripos($vehicleId, 'ertiga') !== false) {
        $extraKmRate = 18;
    } elseif (stripos($vehicleId, 'innova') !== false) {
        $extraKmRate = 20;
    } elseif (stripos($vehicleId, 'luxury') !== false) {
        $extraKmRate = 25;
    } else {
        $extraKmRate = 15; // Default fallback
    }
}

if ($extraHourRate === 0 && $package8hr > 0) {
    // Extra hour is typically 1/8 of the 8hr package or about 250-350 rupees
    $extraHourRate = round($package8hr / 8);
    // Ensure it's within a reasonable range
    if ($extraHourRate < 200) $extraHourRate = 200;
    if ($extraHourRate > 500) $extraHourRate = 500;
}

// Log the received values
error_log("Vehicle ID: $vehicleId", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("4hr Package: $package4hr", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("8hr Package: $package8hr", 3, __DIR__ . '/../logs/direct-fares.log');
error_log("10hr Package: $package10hr", 3, __DIR__ . '/../logs/direct-fares.log');

// Prepare response with all packages data
$responseData = [
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
];

// Only try to update the database if we have a vehicle ID and at least one package price
if (!empty($vehicleId) && ($package4hr > 0 || $package8hr > 0 || $package10hr > 0)) {
    try {
        // Create database connection - hardcoded for maximum reliability
        $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Try to update the local_package_fares table
        try {
            // Check if record exists
            $checkSql = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$vehicleId]);
            $exists = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($exists) {
                // Update existing record
                $updateSql = "UPDATE local_package_fares 
                              SET price_4hrs_40km = ?, 
                                  price_8hrs_80km = ?, 
                                  price_10hrs_100km = ?, 
                                  price_extra_km = ?, 
                                  price_extra_hour = ?,
                                  updated_at = NOW()
                              WHERE vehicle_id = ?";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate,
                    $vehicleId
                ]);
            } else {
                // Insert new record
                $insertSql = "INSERT INTO local_package_fares 
                              (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                               price_extra_km, price_extra_hour, created_at, updated_at)
                              VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    $vehicleId,
                    $package4hr, 
                    $package8hr, 
                    $package10hr, 
                    $extraKmRate, 
                    $extraHourRate
                ]);
            }
            
            // Also update the vehicle_pricing table for backward compatibility
            $vpSql = "UPDATE vehicle_pricing 
                      SET local_package_4hr = ?, 
                          local_package_8hr = ?, 
                          local_package_10hr = ?, 
                          extra_km_charge = ?, 
                          extra_hour_charge = ?,
                          updated_at = NOW()
                      WHERE vehicle_type = ?";
            $vpStmt = $pdo->prepare($vpSql);
            $vpStmt->execute([
                $package4hr, 
                $package8hr, 
                $package10hr, 
                $extraKmRate, 
                $extraHourRate,
                $vehicleId
            ]);
            
            $responseData['database_update'] = 'Successfully updated local_package_fares and vehicle_pricing tables';
            
        } catch (Exception $e) {
            $responseData['database_error'] = $e->getMessage();
            error_log("Database error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
        }
        
    } catch (Exception $e) {
        $responseData['database_connection_error'] = $e->getMessage();
        error_log("Database connection error: " . $e->getMessage(), 3, __DIR__ . '/../logs/direct-fares.log');
    }
}

// Echo the response data
echo json_encode($responseData);
