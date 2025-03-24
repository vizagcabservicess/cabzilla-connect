
<?php
// airport-fares-update.php - Dedicated endpoint for updating airport trip fares

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Include database configuration
require_once __DIR__ . '/../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$logMessage = "[$timestamp] Airport fares update request: Method=$requestMethod, URI=$requestUri" . PHP_EOL;
error_log($logMessage, 3, __DIR__ . '/../error.log');

// DEBUG: Log all request data
error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . $_SERVER['CONTENT_TYPE'] ?? 'not set');
error_log("ALL HEADERS: " . json_encode(getallheaders()));

// Get JSON data from request
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Ensure we have valid JSON input
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON parse error: " . json_last_error_msg());
    
    // Try to decode as URL encoded form data if JSON fails
    parse_str($rawInput, $formData);
    if (!empty($formData)) {
        $data = $formData;
        error_log("Parsed as form data: " . print_r($data, true));
    }
}

// If still no data, try $_POST directly
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
    error_log("Using _POST data: " . print_r($data, true));
}

// Log received data for debugging
error_log('Received airport fares update data: ' . print_r($data, true));

// Check if data is valid - support multiple field name variations
if (!$data || (!isset($data['vehicleId']) && !isset($data['vehicle_id']) && !isset($data['vehicleType']))) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing vehicle ID',
        'receivedData' => $data
    ]);
    exit;
}

// Extract vehicle ID and normalize
$vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? '';

// Normalize vehicle ID (remove any 'item-' prefix)
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Extract pricing data with multiple possible field names
$basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? $data['airport_base_price'] ?? 0);
$pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? $data['airport_price_per_km'] ?? 0);
$dropPrice = floatval($data['dropPrice'] ?? $data['drop_price'] ?? $data['airport_drop_price'] ?? 0);
$pickupPrice = floatval($data['pickupPrice'] ?? $data['pickup_price'] ?? $data['airport_pickup_price'] ?? 0);

// Extract tier pricing data
$tier1Price = floatval($data['tier1Price'] ?? $data['tier_1_price'] ?? $data['airport_tier1_price'] ?? 0);
$tier2Price = floatval($data['tier2Price'] ?? $data['tier_2_price'] ?? $data['airport_tier2_price'] ?? 0);
$tier3Price = floatval($data['tier3Price'] ?? $data['tier_3_price'] ?? $data['airport_tier3_price'] ?? 0);
$tier4Price = floatval($data['tier4Price'] ?? $data['tier_4_price'] ?? $data['airport_tier4_price'] ?? 0);
$extraKmCharge = floatval($data['extraKmCharge'] ?? $data['extra_km_charge'] ?? $data['airport_extra_km_charge'] ?? 0);

// Validate data
if ($basePrice <= 0 && $pickupPrice <= 0 && $dropPrice <= 0 && 
    $tier1Price <= 0 && $tier2Price <= 0 && $tier3Price <= 0 && $tier4Price <= 0) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'At least one price value must be greater than zero',
        'receivedData' => $data
    ]);
    exit;
}

try {
    // Connect to database - try multiple connection approaches
    $pdo = null;
    $connectionError = null;
    
    try {
        // Try using constants first
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_DATABASE, DB_USERNAME, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        $connectionError = $e->getMessage();
        error_log("First DB connection attempt failed: " . $connectionError);
        
        // Try with variables from config.php
        try {
            // Try accessing global variables from config.php
            global $db_host, $db_name, $db_user, $db_pass;
            
            if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $connectionError = null;
                error_log("Connected using global variables");
            } else {
                error_log("Global DB variables not set");
                
                // Try alternative file location
                require_once __DIR__ . '/../../config.php';
                
                // Try again with global variables
                if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $connectionError = null;
                    error_log("Connected using global variables from alternative location");
                } else {
                    // Last resort - hardcoded credentials (for testing only)
                    $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $connectionError = null;
                    error_log("Connected using hardcoded credentials");
                }
            }
        } catch (PDOException $e2) {
            $connectionError .= "; Alternative connection also failed: " . $e2->getMessage();
            error_log("All DB connection attempts failed: " . $connectionError);
        }
    }
    
    if (!$pdo) {
        throw new Exception("Database connection failed: " . $connectionError);
    }
    
    error_log("Database connection successful");
    
    // Check if vehicle exists in vehicle_pricing table
    $checkVehicleStmt = $pdo->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_type = ?");
    $checkVehicleStmt->execute([$vehicleId]);
    
    // Use a transaction to ensure all operations succeed or fail together
    $pdo->beginTransaction();
    
    if ($checkVehicleStmt->rowCount() > 0) {
        // Update existing record with all the new pricing information
        $updateSql = "
            UPDATE vehicle_pricing 
            SET 
                airport_base_price = ?,
                airport_price_per_km = ?,
                airport_drop_price = ?,
                airport_pickup_price = ?,
                airport_tier1_price = ?,
                airport_tier2_price = ?,
                airport_tier3_price = ?,
                airport_tier4_price = ?,
                airport_extra_km_charge = ?,
                updated_at = NOW() 
            WHERE vehicle_type = ?
        ";
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            $basePrice, 
            $pricePerKm, 
            $dropPrice, 
            $pickupPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge,
            $vehicleId
        ]);
        
        error_log("Updated airport fares for vehicle: $vehicleId");
    } else {
        // Insert new record with all the pricing information
        $insertSql = "
            INSERT INTO vehicle_pricing (
                vehicle_type, airport_base_price, airport_price_per_km, 
                airport_drop_price, airport_pickup_price,
                airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price,
                airport_extra_km_charge,
                base_price, price_per_km, night_halt_charge, driver_allowance,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())
        ";
        
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $dropPrice, 
            $pickupPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge,
            $basePrice,  // Use airport base price as fallback for general base price
            $pricePerKm  // Use airport km price as fallback for general per km price
        ]);
        
        error_log("Inserted new airport fares for vehicle: $vehicleId");
    }
    
    // Try to also update the fare_prices table if it exists (for backward compatibility)
    try {
        // Check if the table exists
        $tableExistsStmt = $pdo->query("SHOW TABLES LIKE 'fare_prices'");
        
        if ($tableExistsStmt->rowCount() > 0) {
            // Update or insert airport base fare
            $farePricesSql = "
                INSERT INTO fare_prices 
                (vehicle_id, trip_type, package_type, base_price, price_per_km, created_at, updated_at)
                VALUES (?, 'airport', 'base', ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                updated_at = NOW()
            ";
            
            $farePricesStmt = $pdo->prepare($farePricesSql);
            $farePricesStmt->execute([$vehicleId, $basePrice, $pricePerKm]);
            
            error_log("Updated fare_prices table for airport base fare");
            
            // Update or insert tier prices
            $tierTypes = [
                'tier1' => $tier1Price,
                'tier2' => $tier2Price,
                'tier3' => $tier3Price,
                'tier4' => $tier4Price,
                'extra-km' => $extraKmCharge
            ];
            
            foreach ($tierTypes as $tierType => $price) {
                $tierSql = "
                    INSERT INTO fare_prices 
                    (vehicle_id, trip_type, package_type, base_price, created_at, updated_at)
                    VALUES (?, 'airport', ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    base_price = VALUES(base_price),
                    updated_at = NOW()
                ";
                
                $tierStmt = $pdo->prepare($tierSql);
                $tierStmt->execute([$vehicleId, $tierType, $price]);
            }
            
            error_log("Updated fare_prices table for airport tier prices");
        }
    } catch (Exception $e) {
        // Log but don't fail if fare_prices table update fails
        error_log("Warning: Could not update fare_prices table: " . $e->getMessage());
    }
    
    $pdo->commit();
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fares updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'dropPrice' => $dropPrice,
            'pickupPrice' => $pickupPrice,
            'tierPrices' => [
                'tier1' => $tier1Price,
                'tier2' => $tier2Price,
                'tier3' => $tier3Price,
                'tier4' => $tier4Price,
                'extraKmCharge' => $extraKmCharge
            ]
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    if ($pdo) {
        $pdo->rollBack();
    }
    
    // Log the full error
    error_log('Database error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'receivedData' => $data
    ]);
}
?>
