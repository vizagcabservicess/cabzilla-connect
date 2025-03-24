
<?php
require_once '../../config.php';

// Set headers for CORS and content type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// For OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to convert cases between different naming styles (camelCase, snake_case)
function normalizeColumnName($name, $toSnakeCase = true) {
    if ($toSnakeCase) {
        // Convert camelCase to snake_case (e.g., price4Hrs40Km → price_4hrs_40km)
        $name = preg_replace('/([a-z])([A-Z])/', '$1_$2', $name);
        $name = strtolower($name);
        
        // Handle specific replacements for package columns
        $name = str_replace('package_4hr', 'price_4hrs_40km', $name);
        $name = str_replace('package_8hr', 'price_8hrs_80km', $name);
        $name = str_replace('package_10hr', 'price_10hrs_100km', $name);
        $name = str_replace('local_package_4hr', 'price_4hrs_40km', $name);
        $name = str_replace('local_package_8hr', 'price_8hrs_80km', $name);
        $name = str_replace('local_package_10hr', 'price_10hrs_100km', $name);
        $name = str_replace('pkg4hr', 'price_4hrs_40km', $name);
        $name = str_replace('pkg8hr', 'price_8hrs_80km', $name);
        $name = str_replace('pkg10hr', 'price_10hrs_100km', $name);
        
        // Handle extraKm/extraHour mapping
        $name = str_replace('extrakm', 'price_extra_km', $name);
        $name = str_replace('extrahour', 'price_extra_hour', $name);
        $name = str_replace('extra_km_rate', 'price_extra_km', $name);
        $name = str_replace('extra_hour_rate', 'price_extra_hour', $name);
        $name = str_replace('exkmrate', 'price_extra_km', $name);
        $name = str_replace('exhrrate', 'price_extra_hour', $name);
    } else {
        // Convert snake_case to camelCase (not used in this script)
        $name = lcfirst(str_replace('_', '', ucwords($name, '_')));
    }
    
    return $name;
}

// Try to get data from different request methods/formats
function getRequestData() {
    $data = [];
    
    // For JSON payloads
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        if ($jsonData !== null) {
            $data = array_merge($data, $jsonData);
        } else {
            // Try to parse as form data if JSON parsing fails
            parse_str($rawInput, $formData);
            if (!empty($formData)) {
                $data = array_merge($data, $formData);
            }
        }
    }
    
    // For form data in POST
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    
    // For query parameters in GET
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
    }
    
    return $data;
}

// Function to connect to the database
function connectToDatabase() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            return $conn;
        }
        
        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            return $conn;
        }
        
        // Fallback to hardcoded credentials (for development only)
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e;
    }
}

// Function to ensure tables exist
function ensureTables($conn) {
    // Create local_package_pricing table if not exists
    $localPricingTable = "
    CREATE TABLE IF NOT EXISTS local_package_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // Create airport_pricing table if not exists
    $airportPricingTable = "
    CREATE TABLE IF NOT EXISTS airport_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        pickup_charge DECIMAL(10,2) DEFAULT 0,
        drop_charge DECIMAL(10,2) DEFAULT 0,
        tier1_price DECIMAL(10,2) DEFAULT 0,
        tier2_price DECIMAL(10,2) DEFAULT 0,
        tier3_price DECIMAL(10,2) DEFAULT 0,
        tier4_price DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    // Create outstation_fares table if not exists
    $outstationPricingTable = "
    CREATE TABLE IF NOT EXISTS outstation_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        roundtrip_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        roundtrip_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    if ($conn->query($localPricingTable) !== TRUE) {
        throw new Exception("Error creating local_package_pricing table: " . $conn->error);
    }
    
    if ($conn->query($airportPricingTable) !== TRUE) {
        throw new Exception("Error creating airport_pricing table: " . $conn->error);
    }
    
    if ($conn->query($outstationPricingTable) !== TRUE) {
        throw new Exception("Error creating outstation_fares table: " . $conn->error);
    }
    
    return true;
}

try {
    // Get data from the request
    $data = getRequestData();
    error_log("Request data: " . print_r($data, true));
    
    // Extract vehicle ID and trip type
    $vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? null;
    $tripType = strtolower($data['tripType'] ?? $data['trip_type'] ?? '');
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Clean the vehicle ID (remove any 'item-' prefix)
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    error_log("Processing fare update for vehicle: $vehicleId, trip type: $tripType");
    
    // Connect to the database
    $conn = connectToDatabase();
    
    // Ensure tables exist
    ensureTables($conn);
    
    // Process based on trip type
    if ($tripType == 'local') {
        // Handle local packages
        $package4hr = isset($data['package4hr40km']) ? floatval($data['package4hr40km']) : 0;
        $package8hr = isset($data['package8hr80km']) ? floatval($data['package8hr80km']) : 0;
        $package10hr = isset($data['package10hr100km']) ? floatval($data['package10hr100km']) : 0;
        $extraKmRate = isset($data['extraKmRate']) ? floatval($data['extraKmRate']) : 0;
        $extraHourRate = isset($data['extraHourRate']) ? floatval($data['extraHourRate']) : 0;
        
        // Fallbacks for other naming conventions
        if ($package4hr == 0 && isset($data['package_4hr_40km'])) {
            $package4hr = floatval($data['package_4hr_40km']);
        }
        if ($package8hr == 0 && isset($data['package_8hr_80km'])) {
            $package8hr = floatval($data['package_8hr_80km']);
        }
        if ($package10hr == 0 && isset($data['package_10hr_100km'])) {
            $package10hr = floatval($data['package_10hr_100km']);
        }
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM local_package_pricing WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "
                UPDATE local_package_pricing 
                SET price_4hrs_40km = ?, price_8hrs_80km = ?, price_10hrs_100km = ?, 
                    price_extra_km = ?, price_extra_hour = ?, updated_at = NOW()
                WHERE vehicle_id = ?
            ";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("ddddds", $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate, $vehicleId);
            
            if ($updateStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Local package pricing updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'package4hr40km' => $package4hr,
                        'package8hr80km' => $package8hr,
                        'package10hr100km' => $package10hr,
                        'extraKmRate' => $extraKmRate,
                        'extraHourRate' => $extraHourRate
                    ]
                ]);
            } else {
                throw new Exception("Failed to update local package pricing: " . $updateStmt->error);
            }
        } else {
            // Insert new record
            $insertSql = "
                INSERT INTO local_package_pricing 
                (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("sddddd", $vehicleId, $package4hr, $package8hr, $package10hr, $extraKmRate, $extraHourRate);
            
            if ($insertStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Local package pricing added successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'package4hr40km' => $package4hr,
                        'package8hr80km' => $package8hr,
                        'package10hr100km' => $package10hr,
                        'extraKmRate' => $extraKmRate,
                        'extraHourRate' => $extraHourRate
                    ]
                ]);
            } else {
                throw new Exception("Failed to add local package pricing: " . $insertStmt->error);
            }
        }
    } else if ($tripType == 'airport') {
        // Handle airport fares
        $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
        $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
        $pickupCharge = isset($data['pickupCharge']) ? floatval($data['pickupCharge']) : 0;
        $dropCharge = isset($data['dropCharge']) ? floatval($data['dropCharge']) : 0;
        $tier1Price = isset($data['tier1Price']) ? floatval($data['tier1Price']) : 0;
        $tier2Price = isset($data['tier2Price']) ? floatval($data['tier2Price']) : 0;
        $tier3Price = isset($data['tier3Price']) ? floatval($data['tier3Price']) : 0;
        $tier4Price = isset($data['tier4Price']) ? floatval($data['tier4Price']) : 0;
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM airport_pricing WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "
                UPDATE airport_pricing 
                SET base_price = ?, price_per_km = ?, pickup_charge = ?, drop_charge = ?,
                    tier1_price = ?, tier2_price = ?, tier3_price = ?, tier4_price = ?, 
                    updated_at = NOW()
                WHERE vehicle_id = ?
            ";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("dddddddds", $basePrice, $pricePerKm, $pickupCharge, $dropCharge, 
                                  $tier1Price, $tier2Price, $tier3Price, $tier4Price, $vehicleId);
            
            if ($updateStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Airport pricing updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'pickupCharge' => $pickupCharge,
                        'dropCharge' => $dropCharge,
                        'tier1Price' => $tier1Price,
                        'tier2Price' => $tier2Price,
                        'tier3Price' => $tier3Price,
                        'tier4Price' => $tier4Price
                    ]
                ]);
            } else {
                throw new Exception("Failed to update airport pricing: " . $updateStmt->error);
            }
        } else {
            // Insert new record
            $insertSql = "
                INSERT INTO airport_pricing 
                (vehicle_id, base_price, price_per_km, pickup_charge, drop_charge, 
                tier1_price, tier2_price, tier3_price, tier4_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("sdddddddd", $vehicleId, $basePrice, $pricePerKm, $pickupCharge, $dropCharge, 
                                  $tier1Price, $tier2Price, $tier3Price, $tier4Price);
            
            if ($insertStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Airport pricing added successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'pickupCharge' => $pickupCharge,
                        'dropCharge' => $dropCharge,
                        'tier1Price' => $tier1Price,
                        'tier2Price' => $tier2Price,
                        'tier3Price' => $tier3Price,
                        'tier4Price' => $tier4Price
                    ]
                ]);
            } else {
                throw new Exception("Failed to add airport pricing: " . $insertStmt->error);
            }
        }
    } else {
        // Default to outstation fares
        // Pass the request to the dedicated outstation fares endpoint for better handling
        
        // Prepare data for direct-outstation-fares.php
        $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
        $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
        $roundTripBasePrice = isset($data['roundTripBasePrice']) ? floatval($data['roundTripBasePrice']) : 0;
        $roundTripPricePerKm = isset($data['roundTripPricePerKm']) ? floatval($data['roundTripPricePerKm']) : 0;
        $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
        $nightHalt = isset($data['nightHalt']) ? floatval($data['nightHalt']) : 0;
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing record
            $updateSql = "
                UPDATE outstation_fares 
                SET base_price = ?, price_per_km = ?, roundtrip_base_price = ?, 
                    roundtrip_price_per_km = ?, driver_allowance = ?, night_halt_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ";
            
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param(
                "dddddds",
                $basePrice,
                $pricePerKm,
                $roundTripBasePrice,
                $roundTripPricePerKm,
                $driverAllowance,
                $nightHalt,
                $vehicleId
            );
            
            if ($updateStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Outstation fares updated successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'roundTripBasePrice' => $roundTripBasePrice,
                        'roundTripPricePerKm' => $roundTripPricePerKm,
                        'driverAllowance' => $driverAllowance,
                        'nightHalt' => $nightHalt
                    ]
                ]);
            } else {
                throw new Exception("Failed to update outstation fares: " . $updateStmt->error);
            }
        } else {
            // Insert new record
            $insertSql = "
                INSERT INTO outstation_fares 
                (vehicle_id, base_price, price_per_km, roundtrip_base_price, 
                roundtrip_price_per_km, driver_allowance, night_halt_charge)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ";
            
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param(
                "sdddddd",
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $roundTripBasePrice,
                $roundTripPricePerKm,
                $driverAllowance,
                $nightHalt
            );
            
            if ($insertStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Outstation fares added successfully',
                    'data' => [
                        'vehicleId' => $vehicleId,
                        'basePrice' => $basePrice,
                        'pricePerKm' => $pricePerKm,
                        'roundTripBasePrice' => $roundTripBasePrice,
                        'roundTripPricePerKm' => $roundTripPricePerKm,
                        'driverAllowance' => $driverAllowance,
                        'nightHalt' => $nightHalt
                    ]
                ]);
            } else {
                throw new Exception("Failed to add outstation fares: " . $insertStmt->error);
            }
        }
    }
} catch (Exception $e) {
    error_log("Error in direct-fare-update.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ]);
}
?>
