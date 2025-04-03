
<?php
/**
 * direct-local-fares.php - Update local package fares for a vehicle with strict validation
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message, $file = 'direct-local-fares.log') {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logDir . '/' . $file, "[$timestamp] " . $message . "\n", FILE_APPEND);
}

// Log request information
logMessage("Local fares update request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

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

// Only allow POST methods for updates
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    $response['message'] = 'Only POST or PUT methods are allowed';
    echo json_encode($response);
    exit;
}

// Parse input data from various sources
$fareData = [];
$rawInput = file_get_contents('php://input');
logMessage("Raw input: $rawInput");

// Try to parse as JSON first
$jsonData = json_decode($rawInput, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
    $fareData = $jsonData;
} else {
    // If not JSON, use POST data
    $fareData = $_POST;
}

// Log the received data
logMessage("Received fare data: " . json_encode($fareData));

// Extract vehicle ID with fallbacks for different naming conventions
$vehicleId = null;
$possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id', 'cabType'];

foreach ($possibleVehicleIdFields as $field) {
    if (isset($fareData[$field]) && !empty($fareData[$field])) {
        $vehicleId = $fareData[$field];
        logMessage("Found vehicle ID in field '$field': $vehicleId");
        break;
    }
}

// Check if we have a vehicle ID
if (empty($vehicleId)) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

// CRITICAL: Validate vehicle ID - Check if ID is numeric and block unless it's a mapped ID
if (is_numeric($vehicleId)) {
    logMessage("WARNING: Received numeric vehicle ID: $vehicleId");
    
    // Only allow specific mapped numeric IDs
    if (isset($numericMappings[$vehicleId])) {
        $originalId = $vehicleId;
        $vehicleId = $numericMappings[$vehicleId];
        logMessage("Mapped numeric ID $originalId to standard vehicle ID: $vehicleId");
    } else {
        // BLOCK ALL other numeric IDs
        $response['message'] = 'Invalid numeric vehicle ID. Please use standard vehicle names.';
        $response['validOptions'] = $standardVehicles;
        logMessage("BLOCKED unmapped numeric ID: $vehicleId");
        echo json_encode($response);
        exit;
    }
}

// Normalize vehicle ID (lowercase, replace spaces with underscores)
$normalizedId = strtolower(str_replace(' ', '_', trim($vehicleId)));

// Check if the normalized ID is a standard vehicle type
$isStandardVehicle = in_array($normalizedId, $standardVehicles);

if (!$isStandardVehicle) {
    // Map common variations
    if ($normalizedId == 'mpv' || $normalizedId == 'innova_hycross' || $normalizedId == 'hycross') {
        $normalizedId = 'innova_crysta';
        $isStandardVehicle = true;
    } elseif ($normalizedId == 'dzire' || $normalizedId == 'swift') {
        $normalizedId = 'sedan';
        $isStandardVehicle = true;
    }
    
    // If it's still not a standard vehicle, reject it
    if (!$isStandardVehicle) {
        $response['message'] = 'Invalid vehicle type. Please use standard vehicle names.';
        $response['validOptions'] = $standardVehicles;
        logMessage("REJECTED non-standard vehicle type: $vehicleId -> $normalizedId");
        echo json_encode($response);
        exit;
    }
}

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // CRITICAL: Check if vehicle exists in vehicles table
    $checkVehicleStmt = $conn->prepare("SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $normalizedId);
    $checkVehicleStmt->execute();
    $result = $checkVehicleStmt->get_result();
    
    $vehicleExists = false;
    if ($result->num_rows > 0) {
        $vehicleExists = true;
        $vehicleData = $result->fetch_assoc();
        logMessage("Vehicle found in vehicles table: " . json_encode($vehicleData));
    } else {
        // Check in vehicle_types table as fallback
        $checkTypesStmt = $conn->prepare("SELECT vehicle_id, name FROM vehicle_types WHERE vehicle_id = ?");
        $checkTypesStmt->bind_param("s", $normalizedId);
        $checkTypesStmt->execute();
        $typesResult = $checkTypesStmt->get_result();
        
        if ($typesResult->num_rows > 0) {
            $vehicleExists = true;
            $vehicleData = $typesResult->fetch_assoc();
            logMessage("Vehicle found in vehicle_types table: " . json_encode($vehicleData));
        }
    }
    
    if (!$vehicleExists) {
        throw new Exception("Vehicle with ID '$normalizedId' not found. Please create the vehicle first.");
    }
    
    // Extract fare values with multiple field name possibilities
    $price4hr40km = isset($fareData['price_4hrs_40km']) ? floatval($fareData['price_4hrs_40km']) : 
                    (isset($fareData['package4hr40km']) ? floatval($fareData['package4hr40km']) : 0);
    
    $price8hr80km = isset($fareData['price_8hrs_80km']) ? floatval($fareData['price_8hrs_80km']) : 
                    (isset($fareData['package8hr80km']) ? floatval($fareData['package8hr80km']) : 0);
    
    $price10hr100km = isset($fareData['price_10hrs_100km']) ? floatval($fareData['price_10hrs_100km']) : 
                      (isset($fareData['package10hr100km']) ? floatval($fareData['package10hr100km']) : 0);
    
    $extraKmRate = isset($fareData['price_extra_km']) ? floatval($fareData['price_extra_km']) : 
                  (isset($fareData['extraKmRate']) ? floatval($fareData['extraKmRate']) : 15);
    
    $extraHourRate = isset($fareData['price_extra_hour']) ? floatval($fareData['price_extra_hour']) : 
                     (isset($fareData['extraHourRate']) ? floatval($fareData['extraHourRate']) : 150);
    
    logMessage("Fare values: 4hr=$price4hr40km, 8hr=$price8hr80km, 10hr=$price10hr100km, ExtraKm=$extraKmRate, ExtraHr=$extraHourRate");
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if local_package_fares table exists
        $checkTableStmt = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        $tableExists = $checkTableStmt->num_rows > 0;
        
        if (!$tableExists) {
            // Create local_package_fares table if it doesn't exist
            $conn->query("
                CREATE TABLE IF NOT EXISTS local_package_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                    price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            logMessage("Created local_package_fares table");
        }
        
        // Update or insert record in local_package_fares table
        $updateFaresStmt = $conn->prepare("
            INSERT INTO local_package_fares 
            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            price_4hrs_40km = VALUES(price_4hrs_40km),
            price_8hrs_80km = VALUES(price_8hrs_80km),
            price_10hrs_100km = VALUES(price_10hrs_100km),
            price_extra_km = VALUES(price_extra_km),
            price_extra_hour = VALUES(price_extra_hour),
            updated_at = NOW()
        ");
        
        $updateFaresStmt->bind_param("sddddd", 
            $normalizedId, 
            $price4hr40km, 
            $price8hr80km, 
            $price10hr100km, 
            $extraKmRate, 
            $extraHourRate
        );
        
        $updateFaresStmt->execute();
        logMessage("Updated local_package_fares table");
        
        // Check if vehicle_pricing table exists
        $checkPricingTableStmt = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        $pricingTableExists = $checkPricingTableStmt->num_rows > 0;
        
        if ($pricingTableExists) {
            // Also update vehicle_pricing table for backward compatibility
            // First check if record exists
            $checkPricingStmt = $conn->prepare("
                SELECT id FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'local'
            ");
            $checkPricingStmt->bind_param("s", $normalizedId);
            $checkPricingStmt->execute();
            $pricingResult = $checkPricingStmt->get_result();
            $pricingExists = $pricingResult->num_rows > 0;
            
            if ($pricingExists) {
                // Update existing record
                $updatePricingStmt = $conn->prepare("
                    UPDATE vehicle_pricing 
                    SET local_package_4hr = ?, 
                        local_package_8hr = ?, 
                        local_package_10hr = ?,
                        extra_km_charge = ?,
                        extra_hour_charge = ?,
                        updated_at = NOW()
                    WHERE vehicle_id = ? AND trip_type = 'local'
                ");
                
                $updatePricingStmt->bind_param("ddddds", 
                    $price4hr40km, 
                    $price8hr80km, 
                    $price10hr100km, 
                    $extraKmRate, 
                    $extraHourRate, 
                    $normalizedId
                );
                
                $updatePricingStmt->execute();
                logMessage("Updated existing record in vehicle_pricing table");
            } else {
                // Insert new record
                $insertPricingStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                     extra_km_charge, extra_hour_charge, updated_at)
                    VALUES (?, 'local', ?, ?, ?, ?, ?, NOW())
                ");
                
                $insertPricingStmt->bind_param("sddddd", 
                    $normalizedId, 
                    $price4hr40km, 
                    $price8hr80km, 
                    $price10hr100km, 
                    $extraKmRate, 
                    $extraHourRate
                );
                
                $insertPricingStmt->execute();
                logMessage("Inserted new record in vehicle_pricing table");
            }
        }
        
        // Commit the transaction
        $conn->commit();
        
        // Clear any fare cache files
        $cacheDir = dirname(__FILE__) . '/../../cache';
        if (file_exists($cacheDir)) {
            $cacheFiles = glob($cacheDir . '/fares_*.json');
            foreach ($cacheFiles as $file) {
                @unlink($file);
            }
        }
        
        // Return success response
        $response = [
            'status' => 'success',
            'message' => 'Local fares updated successfully',
            'vehicleId' => $normalizedId,
            'originalId' => $vehicleId,
            'timestamp' => time()
        ];
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error: " . $e->getMessage());
}

echo json_encode($response);
