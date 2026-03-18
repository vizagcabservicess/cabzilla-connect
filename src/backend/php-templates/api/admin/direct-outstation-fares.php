
<?php
/**
 * direct-outstation-fares.php - Direct API endpoint for outstation fare updates
 * Uses vehicle_id exclusively to prevent duplicate vehicle creation
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Use same DB as outstation-fares-update.php so read/write stay in sync
require_once __DIR__ . '/../../config.php';
if (!function_exists('getPdoConnection')) {
    function getPdoConnection() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("SET time_zone = '+05:30'");
        return $pdo;
    }
}
function getDbConnection() {
    return getPdoConnection();
}

// Log message to file
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    error_log($logMessage, 3, __DIR__ . '/../../logs/direct-outstation-fares.log');
}

// ENHANCED: More comprehensive ID mapping with all known numeric IDs
$numericIdMapExtended = [
    '1' => 'sedan',
    '2' => 'ertiga',
    '3' => 'innova',
    '4' => 'crysta',
    '5' => 'tempo',
    '6' => 'bus',
    '7' => 'van',
    '8' => 'suv',
    '9' => 'traveller',
    '10' => 'luxury',
    '180' => 'etios',
    '592' => 'urbania',
    '1266' => 'mpv',
    '1270' => 'mpv',
    '1271' => 'etios',
    '1272' => 'etios',
    '1273' => 'etios',
    '1274' => 'etios',
    '1275' => 'etios',
    '1276' => 'etios',
    '1277' => 'etios',
    '1278' => 'etios',
    '1279' => 'etios',
    '1280' => 'etios',
    '1281' => 'mpv',
    '1282' => 'sedan',
    '1283' => 'sedan',
    '1284' => 'etios',
    '1285' => 'etios',
    '1286' => 'etios',
    '1287' => 'etios',
    '1288' => 'etios',
    '1289' => 'etios',
    '1290' => 'etios',
    '100' => 'sedan',
    '101' => 'sedan',
    '102' => 'sedan',
    '103' => 'sedan',
    '200' => 'ertiga',
    '201' => 'ertiga',
    '202' => 'ertiga',
    '300' => 'innova',
    '301' => 'innova',
    '302' => 'innova',
    '400' => 'crysta',
    '401' => 'crysta',
    '402' => 'crysta',
    '500' => 'tempo',
    '501' => 'tempo',
    '502' => 'tempo'
];

try {
    // Connect to database
    $conn = getDbConnection();
    
    // First, check if the outstation_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'outstation_fares'";
    $checkTableStmt = $conn->prepare($checkTableQuery);
    $checkTableStmt->execute();
    $tableExists = ($checkTableStmt->rowCount() > 0);
    
    if (!$tableExists) {
        // Create the outstation_fares table if it doesn't exist
        $createTableQuery = "
            CREATE TABLE outstation_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                roundtrip_base_price DECIMAL(10,2) DEFAULT NULL,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT NULL,
                -- Tier pricing columns for one-way trips
                tier1_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 1 one-way trips (35-50 km)',
                tier2_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 2 one-way trips (51-75 km)',
                tier3_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 3 one-way trips (76-100 km)',
                tier4_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 4 one-way trips (101-149 km)',
                extra_km_charge DECIMAL(5,2) DEFAULT NULL COMMENT 'Extra charge per km for distances beyond tier 4',
                -- Tier distance ranges (configurable)
                tier1_min_km INT DEFAULT 35 COMMENT 'Minimum km for tier 1',
                tier1_max_km INT DEFAULT 50 COMMENT 'Maximum km for tier 1',
                tier2_min_km INT DEFAULT 51 COMMENT 'Minimum km for tier 2',
                tier2_max_km INT DEFAULT 75 COMMENT 'Maximum km for tier 2',
                tier3_min_km INT DEFAULT 76 COMMENT 'Minimum km for tier 3',
                tier3_max_km INT DEFAULT 100 COMMENT 'Maximum km for tier 3',
                tier4_min_km INT DEFAULT 101 COMMENT 'Minimum km for tier 4',
                tier4_max_km INT DEFAULT 149 COMMENT 'Maximum km for tier 4',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $conn->exec($createTableQuery);
        logMessage("Created outstation_fares table");
    } else {
        // Table exists, check if tier columns exist and add them if missing
        $tierColumns = [
            'tier1_price' => "ALTER TABLE outstation_fares ADD COLUMN tier1_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 1 one-way trips (35-50 km)'",
            'tier2_price' => "ALTER TABLE outstation_fares ADD COLUMN tier2_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 2 one-way trips (51-75 km)'",
            'tier3_price' => "ALTER TABLE outstation_fares ADD COLUMN tier3_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 3 one-way trips (76-100 km)'",
            'tier4_price' => "ALTER TABLE outstation_fares ADD COLUMN tier4_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 4 one-way trips (101-149 km)'",
            'extra_km_charge' => "ALTER TABLE outstation_fares ADD COLUMN extra_km_charge DECIMAL(5,2) DEFAULT NULL COMMENT 'Extra charge per km for distances beyond tier 4'",
            'tier1_min_km' => "ALTER TABLE outstation_fares ADD COLUMN tier1_min_km INT DEFAULT 35 COMMENT 'Minimum km for tier 1'",
            'tier1_max_km' => "ALTER TABLE outstation_fares ADD COLUMN tier1_max_km INT DEFAULT 50 COMMENT 'Maximum km for tier 1'",
            'tier2_min_km' => "ALTER TABLE outstation_fares ADD COLUMN tier2_min_km INT DEFAULT 51 COMMENT 'Minimum km for tier 2'",
            'tier2_max_km' => "ALTER TABLE outstation_fares ADD COLUMN tier2_max_km INT DEFAULT 75 COMMENT 'Maximum km for tier 2'",
            'tier3_min_km' => "ALTER TABLE outstation_fares ADD COLUMN tier3_min_km INT DEFAULT 76 COMMENT 'Minimum km for tier 3'",
            'tier3_max_km' => "ALTER TABLE outstation_fares ADD COLUMN tier3_max_km INT DEFAULT 100 COMMENT 'Maximum km for tier 3'",
            'tier4_min_km' => "ALTER TABLE outstation_fares ADD COLUMN tier4_min_km INT DEFAULT 101 COMMENT 'Minimum km for tier 4'",
            'tier4_max_km' => "ALTER TABLE outstation_fares ADD COLUMN tier4_max_km INT DEFAULT 149 COMMENT 'Maximum km for tier 4'"
        ];

        foreach ($tierColumns as $columnName => $alterSql) {
            $checkColumnStmt = $conn->prepare("SHOW COLUMNS FROM outstation_fares LIKE ?");
            $checkColumnStmt->execute([$columnName]);
            if ($checkColumnStmt->rowCount() === 0) {
                $conn->exec($alterSql);
                logMessage("Added column $columnName to outstation_fares table");
            }
        }
    }
    
    // Handle GET request to retrieve outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all vehicles with their outstation fares
        $query = "
            SELECT v.id, v.vehicle_id, v.name, v.capacity, v.luggage_capacity, v.image, 
                   v.is_active, of.* 
            FROM vehicles v
            LEFT JOIN outstation_fares of ON v.vehicle_id = of.vehicle_id
            WHERE v.is_active = 1 OR :includeInactive = 'true'
            ORDER BY v.name
        ";
        
        $includeInactive = isset($_GET['includeInactive']) ? $_GET['includeInactive'] : 'false';
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':includeInactive', $includeInactive);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $fares = [];
        foreach ($results as $row) {
            // Always use vehicle_id as the primary identifier
            $vehicleId = $row['vehicle_id'] ?? $row['id'];
            
            // Skip if we somehow have a numeric vehicle_id (shouldn't happen)
            if (is_numeric($vehicleId)) {
                logMessage("Warning: Found numeric vehicle_id: $vehicleId - skipping");
                continue;
            }
            
            // Check if this vehicle already exists in our results (avoid duplicates)
            if (isset($fares[$vehicleId])) {
                logMessage("Skipping duplicate vehicle entry for: $vehicleId");
                continue;
            }
            
            // Debug: Log the raw row data for tier pricing
            logMessage("Raw tier pricing data for $vehicleId: " . json_encode([
                'tier1_price' => $row['tier1_price'] ?? 'NULL',
                'tier2_price' => $row['tier2_price'] ?? 'NULL',
                'tier3_price' => $row['tier3_price'] ?? 'NULL',
                'tier4_price' => $row['tier4_price'] ?? 'NULL',
                'extra_km_charge' => $row['extra_km_charge'] ?? 'NULL'
            ]));
            
            // Create a standardized fare object
            $fares[$vehicleId] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $row['name'] ?? ucfirst($vehicleId),
                'capacity' => isset($row['capacity']) ? intval($row['capacity']) : 4,
                'luggageCapacity' => isset($row['luggage_capacity']) ? intval($row['luggage_capacity']) : 2,
                'image' => $row['image'] ?? '/cars/sedan.png',
                'isActive' => isset($row['is_active']) ? (bool)$row['is_active'] : true,
                'oneWayBasePrice' => isset($row['base_price']) ? floatval($row['base_price']) : 0,
                'oneWayPricePerKm' => isset($row['price_per_km']) ? floatval($row['price_per_km']) : 0,
                'driverAllowance' => isset($row['driver_allowance']) ? floatval($row['driver_allowance']) : 300,
                'nightHaltCharge' => isset($row['night_halt_charge']) ? floatval($row['night_halt_charge']) : 700,
                'roundTripBasePrice' => isset($row['roundtrip_base_price']) ? floatval($row['roundtrip_base_price']) : 0,
                'roundTripPricePerKm' => isset($row['roundtrip_price_per_km']) ? floatval($row['roundtrip_price_per_km']) : 0,
                // Tier pricing fields - check for null/empty values and use defaults
                'tier1Price' => (isset($row['tier1_price']) && $row['tier1_price'] !== null && $row['tier1_price'] !== '') ? floatval($row['tier1_price']) : 3500,
                'tier2Price' => (isset($row['tier2_price']) && $row['tier2_price'] !== null && $row['tier2_price'] !== '') ? floatval($row['tier2_price']) : 4200,
                'tier3Price' => (isset($row['tier3_price']) && $row['tier3_price'] !== null && $row['tier3_price'] !== '') ? floatval($row['tier3_price']) : 4900,
                'tier4Price' => (isset($row['tier4_price']) && $row['tier4_price'] !== null && $row['tier4_price'] !== '') ? floatval($row['tier4_price']) : 5600,
                'extraKmCharge' => (isset($row['extra_km_charge']) && $row['extra_km_charge'] !== null && $row['extra_km_charge'] !== '') ? floatval($row['extra_km_charge']) : 14,
                'tier1MinKm' => isset($row['tier1_min_km']) ? intval($row['tier1_min_km']) : 35,
                'tier1MaxKm' => isset($row['tier1_max_km']) ? intval($row['tier1_max_km']) : 50,
                'tier2MinKm' => isset($row['tier2_min_km']) ? intval($row['tier2_min_km']) : 51,
                'tier2MaxKm' => isset($row['tier2_max_km']) ? intval($row['tier2_max_km']) : 75,
                'tier3MinKm' => isset($row['tier3_min_km']) ? intval($row['tier3_min_km']) : 76,
                'tier3MaxKm' => isset($row['tier3_max_km']) ? intval($row['tier3_max_km']) : 100,
                'tier4MinKm' => isset($row['tier4_min_km']) ? intval($row['tier4_min_km']) : 101,
                'tier4MaxKm' => isset($row['tier4_max_km']) ? intval($row['tier4_max_km']) : 149
            ];
            
            // Debug: Log the processed tier pricing data
            logMessage("Processed tier pricing data for $vehicleId: " . json_encode([
                'tier1Price' => $fares[$vehicleId]['tier1Price'],
                'tier2Price' => $fares[$vehicleId]['tier2Price'],
                'tier3Price' => $fares[$vehicleId]['tier3Price'],
                'tier4Price' => $fares[$vehicleId]['tier4Price'],
                'extraKmCharge' => $fares[$vehicleId]['extraKmCharge']
            ]));
        }
        
        echo json_encode([
            'status' => 'success',
            'fares' => $fares,
            'count' => count($fares)
        ]);
        exit;
    }
    
    // Handle POST request to update outstation fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Accept both JSON (mobile/web) and form-urlencoded
        $postData = $_POST;
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $rawInput = file_get_contents('php://input');
            $jsonData = json_decode($rawInput, true);
            if (is_array($jsonData)) {
                $postData = $jsonData;
                logMessage("Parsed JSON input: " . substr($rawInput, 0, 200));
            }
        }
        // Get vehicle ID from various possible sources
        $rawVehicleId = isset($postData['vehicleId']) ? $postData['vehicleId'] : 
                    (isset($postData['vehicle_id']) ? $postData['vehicle_id'] : 
                    (isset($postData['id']) ? $postData['id'] : null));
        
        logMessage("Original vehicle ID received: " . $rawVehicleId);
        
        // CRITICAL: Never use pure numeric IDs - convert them to proper vehicle_id values
        $vehicleId = $rawVehicleId;
        
        // Remove 'item-' prefix if it exists
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            logMessage("Removed 'item-' prefix: " . $vehicleId);
        }
        
        // Handle comma-separated lists and extract first ID
        if (strpos($vehicleId, ',') !== false) {
            $idParts = explode(',', $vehicleId);
            $oldId = $vehicleId;
            $vehicleId = trim($idParts[0]);
            logMessage("Found comma-separated list, using first ID: $vehicleId");
            
            // Check if first ID needs mapping
            if (is_numeric($vehicleId) && isset($numericIdMapExtended[$vehicleId])) {
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped first ID from list to: $vehicleId");
            }
        }
        
        // Handle numeric IDs by mapping to proper vehicle_id
        if (is_numeric($vehicleId)) {
            if (isset($numericIdMapExtended[$vehicleId])) {
                $originalId = $vehicleId;
                $vehicleId = $numericIdMapExtended[$vehicleId];
                logMessage("Mapped numeric ID $originalId to vehicle_id: $vehicleId");
            } else {
                logMessage("REJECTED: Unmapped numeric ID not allowed: " . $vehicleId);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id like 'sedan', 'ertiga', etc."
                ]);
                exit;
            }
        }
        
        // Validate vehicle ID
        if (empty($vehicleId) || $vehicleId === 'undefined' || $vehicleId === 'null') {
            $vehicleId = 'sedan'; // Default fallback
            logMessage("Empty or invalid vehicle ID - using default: sedan");
        }
        
        // Final check to reject any numeric IDs that slipped through
        if (is_numeric($vehicleId)) {
            logMessage("FINAL REJECTION: ID is still numeric after processing: " . $vehicleId);
            echo json_encode([
                'status' => 'error', 
                'message' => "Cannot use numeric ID '$vehicleId'. Please use proper vehicle_id."
            ]);
            exit;
        }
        
        // Normalize vehicle ID to lowercase to prevent duplicates with different case
        $vehicleId = strtolower($vehicleId);
        logMessage("Normalized vehicle ID to lowercase: $vehicleId");
        
        // Get outstation fare values with fallbacks (use $postData for JSON compat)
        $oneWayBasePrice = isset($postData['oneWayBasePrice']) && is_numeric($postData['oneWayBasePrice']) ? 
                          floatval($postData['oneWayBasePrice']) : 
                          (isset($postData['basePrice']) && is_numeric($postData['basePrice']) ? 
                          floatval($postData['basePrice']) : 0);
                          
        $oneWayPricePerKm = isset($postData['oneWayPricePerKm']) && is_numeric($postData['oneWayPricePerKm']) ? 
                           floatval($postData['oneWayPricePerKm']) : 
                           (isset($postData['pricePerKm']) && is_numeric($postData['pricePerKm']) ? 
                           floatval($postData['pricePerKm']) : 0);
                          
        $roundTripBasePrice = isset($postData['roundTripBasePrice']) && is_numeric($postData['roundTripBasePrice']) ? 
                             floatval($postData['roundTripBasePrice']) : 
                             (isset($postData['roundtrip_base_price']) && is_numeric($postData['roundtrip_base_price']) ? 
                             floatval($postData['roundtrip_base_price']) : $oneWayBasePrice * 0.9);
                             
        $roundTripPricePerKm = isset($postData['roundTripPricePerKm']) && is_numeric($postData['roundTripPricePerKm']) ? 
                              floatval($postData['roundTripPricePerKm']) : 
                              (isset($postData['roundtrip_price_per_km']) && is_numeric($postData['roundtrip_price_per_km']) ? 
                              floatval($postData['roundtrip_price_per_km']) : $oneWayPricePerKm * 0.85);
                     
        $driverAllowance = isset($postData['driverAllowance']) && is_numeric($postData['driverAllowance']) ? 
                          floatval($postData['driverAllowance']) : 
                          (isset($postData['driver_allowance']) && is_numeric($postData['driver_allowance']) ? 
                          floatval($postData['driver_allowance']) : 300);
                          
        $nightHaltCharge = isset($postData['nightHaltCharge']) && is_numeric($postData['nightHaltCharge']) ? 
                          floatval($postData['nightHaltCharge']) : 
                          (isset($postData['night_halt_charge']) && is_numeric($postData['night_halt_charge']) ? 
                          floatval($postData['night_halt_charge']) : 700);
        
        // Extract tier pricing values - allow 0 values but use defaults if not set
        $tier1Price = isset($postData['tier1Price']) && is_numeric($postData['tier1Price']) ? floatval($postData['tier1Price']) : 3500;
        $tier2Price = isset($postData['tier2Price']) && is_numeric($postData['tier2Price']) ? floatval($postData['tier2Price']) : 4200;
        $tier3Price = isset($postData['tier3Price']) && is_numeric($postData['tier3Price']) ? floatval($postData['tier3Price']) : 4900;
        $tier4Price = isset($postData['tier4Price']) && is_numeric($postData['tier4Price']) ? floatval($postData['tier4Price']) : 5600;
        $extraKmCharge = isset($postData['extraKmCharge']) && is_numeric($postData['extraKmCharge']) ? floatval($postData['extraKmCharge']) : 14;
        
        // Extract tier distance ranges
        $tier1MinKm = isset($postData['tier1MinKm']) && is_numeric($postData['tier1MinKm']) ? intval($postData['tier1MinKm']) : 35;
        $tier1MaxKm = isset($postData['tier1MaxKm']) && is_numeric($postData['tier1MaxKm']) ? intval($postData['tier1MaxKm']) : 50;
        $tier2MinKm = isset($postData['tier2MinKm']) && is_numeric($postData['tier2MinKm']) ? intval($postData['tier2MinKm']) : 51;
        $tier2MaxKm = isset($postData['tier2MaxKm']) && is_numeric($postData['tier2MaxKm']) ? intval($postData['tier2MaxKm']) : 75;
        $tier3MinKm = isset($postData['tier3MinKm']) && is_numeric($postData['tier3MinKm']) ? intval($postData['tier3MinKm']) : 76;
        $tier3MaxKm = isset($postData['tier3MaxKm']) && is_numeric($postData['tier3MaxKm']) ? intval($postData['tier3MaxKm']) : 100;
        $tier4MinKm = isset($postData['tier4MinKm']) && is_numeric($postData['tier4MinKm']) ? intval($postData['tier4MinKm']) : 101;
        $tier4MaxKm = isset($postData['tier4MaxKm']) && is_numeric($postData['tier4MaxKm']) ? intval($postData['tier4MaxKm']) : 149;
        
        // Debug: Log the parsed data for tier pricing
        logMessage("Parsed fare data for tier pricing: " . json_encode([
            'tier1Price' => $tier1Price,
            'tier2Price' => $tier2Price,
            'tier3Price' => $tier3Price,
            'tier4Price' => $tier4Price,
            'extraKmCharge' => $extraKmCharge
        ]));
        
        logMessage("Tier pricing values: tier1Price=$tier1Price, tier2Price=$tier2Price, tier3Price=$tier3Price, tier4Price=$tier4Price, extraKmCharge=$extraKmCharge");
        
        // Begin transaction
        $conn->beginTransaction();
        
        try {
            // First ensure vehicle exists in vehicles table - ALWAYS USE vehicle_id
            $checkVehicleQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ?";
            $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
            $checkVehicleStmt->execute([$vehicleId]);
            $vehicleExists = $checkVehicleStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$vehicleExists) {
                // Try a case-insensitive search before creating a new vehicle
                $checkCaseInsensitiveQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?)";
                $checkCaseStmt = $conn->prepare($checkCaseInsensitiveQuery);
                $checkCaseStmt->execute([$vehicleId]);
                $caseResult = $checkCaseStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($caseResult) {
                    // Found a vehicle with case-insensitive match
                    $vehicleExists = $caseResult;
                    $vehicleId = $caseResult['vehicle_id']; // Use the existing case
                    logMessage("Found vehicle with case-insensitive match. Using: " . $vehicleId);
                } else {
                    // Vehicle doesn't exist, create it
                    $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
                    
                    $insertVehicleQuery = "
                        INSERT INTO vehicles (vehicle_id, name, is_active, created_at, updated_at)
                        VALUES (?, ?, 1, NOW(), NOW())
                    ";
                    
                    $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                    $insertVehicleStmt->execute([$vehicleId, $vehicleName]);
                    
                    logMessage("Created new vehicle: " . $vehicleId);
                }
            } else {
                logMessage("Vehicle exists: " . json_encode($vehicleExists));
                // Use the exact vehicle_id from the database to maintain case consistency
                $vehicleId = $vehicleExists['vehicle_id'];
            }
            
            // Check if fare record exists for this vehicle
            $checkFareQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = ?";
            $checkFareStmt = $conn->prepare($checkFareQuery);
            $checkFareStmt->execute([$vehicleId]);
            $fareExists = $checkFareStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$fareExists) {
                // Try case-insensitive search
                $checkCaseFareQuery = "SELECT id, vehicle_id FROM outstation_fares WHERE LOWER(vehicle_id) = LOWER(?)";
                $checkCaseFareStmt = $conn->prepare($checkCaseFareQuery);
                $checkCaseFareStmt->execute([$vehicleId]);
                $caseFareExists = $checkCaseFareStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($caseFareExists) {
                    $fareExists = $caseFareExists;
                    // Use existing vehicle_id from fare record for consistency
                    $vehicleId = $caseFareExists['vehicle_id'];
                    logMessage("Found fare with case-insensitive match. Using: " . $vehicleId);
                }
            }
            
            if ($fareExists) {
                // Update existing record
                $updateQuery = "
                    UPDATE outstation_fares
                    SET base_price = ?,
                        price_per_km = ?,
                        driver_allowance = ?,
                        night_halt_charge = ?,
                        roundtrip_base_price = ?,
                        roundtrip_price_per_km = ?,
                        tier1_price = ?,
                        tier2_price = ?,
                        tier3_price = ?,
                        tier4_price = ?,
                        extra_km_charge = ?,
                        tier1_min_km = ?,
                        tier1_max_km = ?,
                        tier2_min_km = ?,
                        tier2_max_km = ?,
                        tier3_min_km = ?,
                        tier3_max_km = ?,
                        tier4_min_km = ?,
                        tier4_max_km = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ?
                ";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->execute([
                    $oneWayBasePrice,
                    $oneWayPricePerKm,
                    $driverAllowance,
                    $nightHaltCharge,
                    $roundTripBasePrice,
                    $roundTripPricePerKm,
                    $tier1Price,
                    $tier2Price,
                    $tier3Price,
                    $tier4Price,
                    $extraKmCharge,
                    $tier1MinKm,
                    $tier1MaxKm,
                    $tier2MinKm,
                    $tier2MaxKm,
                    $tier3MinKm,
                    $tier3MaxKm,
                    $tier4MinKm,
                    $tier4MaxKm,
                    $vehicleId
                ]);
                
                logMessage("Updated outstation fare for vehicle: " . $vehicleId);
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id,
                        base_price,
                        price_per_km,
                        driver_allowance,
                        night_halt_charge,
                        roundtrip_base_price,
                        roundtrip_price_per_km,
                        tier1_price,
                        tier2_price,
                        tier3_price,
                        tier4_price,
                        extra_km_charge,
                        tier1_min_km,
                        tier1_max_km,
                        tier2_min_km,
                        tier2_max_km,
                        tier3_min_km,
                        tier3_max_km,
                        tier4_min_km,
                        tier4_max_km,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->execute([
                    $vehicleId,
                    $oneWayBasePrice,
                    $oneWayPricePerKm,
                    $driverAllowance,
                    $nightHaltCharge,
                    $roundTripBasePrice,
                    $roundTripPricePerKm,
                    $tier1Price,
                    $tier2Price,
                    $tier3Price,
                    $tier4Price,
                    $extraKmCharge,
                    $tier1MinKm,
                    $tier1MaxKm,
                    $tier2MinKm,
                    $tier2MaxKm,
                    $tier3MinKm,
                    $tier3MaxKm,
                    $tier4MinKm,
                    $tier4MaxKm
                ]);
                
                logMessage("Inserted new outstation fare for vehicle: " . $vehicleId);
            }
            
            // Also update vehicle_pricing table for compatibility
            $oneWayTripType = 'outstation-one-way';
            $roundTripTripType = 'outstation-round-trip';
            
            // Check if the vehicle_pricing table exists
            $checkPricingTableQuery = "SHOW TABLES LIKE 'vehicle_pricing'";
            $checkPricingTableStmt = $conn->prepare($checkPricingTableQuery);
            $checkPricingTableStmt->execute();
            $pricingTableExists = ($checkPricingTableStmt->rowCount() > 0);
            
            if ($pricingTableExists) {
                // Update one-way pricing
                $upsertOneWayQuery = "
                    INSERT INTO vehicle_pricing (
                        vehicle_id, 
                        trip_type, 
                        base_fare, 
                        price_per_km, 
                        driver_allowance, 
                        night_halt_charge, 
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                        base_fare = VALUES(base_fare),
                        price_per_km = VALUES(price_per_km),
                        driver_allowance = VALUES(driver_allowance),
                        night_halt_charge = VALUES(night_halt_charge),
                        updated_at = NOW()
                ";
                
                $upsertOneWayStmt = $conn->prepare($upsertOneWayQuery);
                $upsertOneWayStmt->execute([
                    $vehicleId,
                    $oneWayTripType,
                    $oneWayBasePrice,
                    $oneWayPricePerKm,
                    $driverAllowance,
                    $nightHaltCharge
                ]);
                
                // Update round-trip pricing
                $upsertRoundTripStmt = $conn->prepare($upsertOneWayQuery);
                $upsertRoundTripStmt->execute([
                    $vehicleId,
                    $roundTripTripType,
                    $roundTripBasePrice,
                    $roundTripPricePerKm,
                    $driverAllowance,
                    $nightHaltCharge
                ]);
                
                logMessage("Updated vehicle_pricing table for both trip types");
            }
            
            // Commit the transaction
            $conn->commit();
            
            // Send success response
            echo json_encode([
                'status' => 'success',
                'message' => 'Outstation fare updated successfully',
                'data' => [
                    'vehicleId' => $vehicleId,
                    'vehicle_id' => $vehicleId,
                    'oneWayBasePrice' => $oneWayBasePrice,
                    'oneWayPricePerKm' => $oneWayPricePerKm,
                    'roundTripBasePrice' => $roundTripBasePrice,
                    'roundTripPricePerKm' => $roundTripPricePerKm,
                    'driverAllowance' => $driverAllowance,
                    'nightHaltCharge' => $nightHaltCharge
                ]
            ]);
        } catch (Exception $e) {
            // Rollback the transaction on error
            $conn->rollBack();
            
            logMessage("Error updating outstation fare: " . $e->getMessage());
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to update outstation fare: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ]);
        }
    } else {
        // Handle unsupported HTTP methods
        if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Unsupported HTTP method: ' . $_SERVER['REQUEST_METHOD']
            ]);
        }
    }
} catch (Exception $e) {
    logMessage("Critical error in direct-outstation-fares.php: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
