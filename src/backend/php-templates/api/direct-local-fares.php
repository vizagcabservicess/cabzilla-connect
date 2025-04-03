
<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS - FIX: Set these headers consistently
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// CRITICAL FIX: Turn off error output to response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-local-fares.log');
}

// Log basic request information
logMessage("Request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);
logMessage("Raw input: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response data
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'debug' => []
];

try {
    // Include the database helper for connection
    require_once __DIR__ . '/common/db_helper.php';
    
    // Handle direct request instead of forwarding
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Capture raw post data
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        // If JSON decode fails, try to parse as form data
        if (json_last_error() !== JSON_ERROR_NONE) {
            parse_str($rawInput, $data);
        }
        
        // If still no data, try $_POST directly
        if (empty($data)) {
            $data = $_POST;
        }
        
        logMessage("Parsed input data: " . json_encode($data));
        
        // Extract vehicle ID
        $vehicleId = '';
        $possibleFields = ['vehicleId', 'vehicle_id', 'id', 'cabType'];
        foreach ($possibleFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $vehicleId = $data[$field];
                break;
            }
        }
        
        if (empty($vehicleId)) {
            throw new Exception("Vehicle ID is required");
        }
        
        // Extract fare data with fallbacks for different field names
        $price4hr40km = isset($data['price_4hrs_40km']) ? floatval($data['price_4hrs_40km']) : 
                       (isset($data['package4hr40km']) ? floatval($data['package4hr40km']) : 0);
                       
        $price8hr80km = isset($data['price_8hrs_80km']) ? floatval($data['price_8hrs_80km']) : 
                       (isset($data['package8hr80km']) ? floatval($data['package8hr80km']) : 0);
                       
        $price10hr100km = isset($data['price_10hrs_100km']) ? floatval($data['price_10hrs_100km']) : 
                         (isset($data['package10hr100km']) ? floatval($data['package10hr100km']) : 0);
                         
        $extraKmRate = isset($data['price_extra_km']) ? floatval($data['price_extra_km']) : 
                      (isset($data['extraKmRate']) ? floatval($data['extraKmRate']) : 0);
                      
        $extraHourRate = isset($data['price_extra_hour']) ? floatval($data['price_extra_hour']) : 
                        (isset($data['extraHourRate']) ? floatval($data['extraHourRate']) : 0);
        
        // Get a database connection
        $conn = getDbConnectionWithRetry();
        
        // Normalize vehicle ID (lowercase, and map numeric IDs if needed)
        $originalId = $vehicleId;
        
        // Hard-coded mappings for numeric IDs
        $numericMappings = [
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
            '1299' => 'toyota'
        ];
        
        // Check if vehicleId is numeric and has a mapping
        if (is_numeric($vehicleId) && isset($numericMappings[$vehicleId])) {
            $vehicleId = $numericMappings[$vehicleId];
            logMessage("Mapped numeric ID $originalId to $vehicleId");
        }
        
        // Normalize to lowercase and replace spaces with underscores
        $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
        
        // Check if local_package_fares table exists, create it if not
        $tableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        $tableExists = $tableCheckResult && $tableCheckResult->num_rows > 0;
        
        if (!$tableExists) {
            // Create the table with the correct field names
            $createTableQuery = "
                CREATE TABLE `local_package_fares` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `vehicle_id` varchar(50) NOT NULL,
                  `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0.00,
                  `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0.00,
                  `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0.00,
                  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `vehicle_id` (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            
            $conn->query($createTableQuery);
            logMessage("Created local_package_fares table");
        }
        
        // Begin transaction
        $conn->begin_transaction();
        
        try {
            // Insert or update record in local_package_fares table
            $insertQuery = "
                INSERT INTO local_package_fares (
                    vehicle_id, 
                    price_4hrs_40km, 
                    price_8hrs_80km, 
                    price_10hrs_100km, 
                    price_extra_km, 
                    price_extra_hour, 
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    price_4hrs_40km = VALUES(price_4hrs_40km),
                    price_8hrs_80km = VALUES(price_8hrs_80km),
                    price_10hrs_100km = VALUES(price_10hrs_100km),
                    price_extra_km = VALUES(price_extra_km),
                    price_extra_hour = VALUES(price_extra_hour),
                    updated_at = NOW()
            ";
            
            $stmt = $conn->prepare($insertQuery);
            if (!$stmt) {
                throw new Exception("Database prepare error: " . $conn->error);
            }
            
            $stmt->bind_param(
                "sddddd",
                $vehicleId,
                $price4hr40km,
                $price8hr80km,
                $price10hr100km,
                $extraKmRate,
                $extraHourRate
            );
            
            $result = $stmt->execute();
            if (!$result) {
                throw new Exception("Failed to update local_package_fares: " . $stmt->error);
            }
            
            // Also update vehicle_pricing table for backwards compatibility if it exists
            $vpTableCheck = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
            if ($vpTableCheck && $vpTableCheck->num_rows > 0) {
                // Check if the vehicle exists in vehicle_pricing table
                $checkStmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'");
                $checkStmt->bind_param("s", $vehicleId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                
                if ($checkResult->num_rows > 0) {
                    // Update existing record
                    $updateStmt = $conn->prepare("
                        UPDATE vehicle_pricing 
                        SET 
                            local_package_4hr = ?,
                            local_package_8hr = ?,
                            local_package_10hr = ?,
                            extra_km_charge = ?,
                            extra_hour_charge = ?,
                            updated_at = NOW()
                        WHERE vehicle_id = ? AND trip_type = 'local'
                    ");
                    
                    $updateStmt->bind_param(
                        "ddddds",
                        $price4hr40km,
                        $price8hr80km,
                        $price10hr100km,
                        $extraKmRate,
                        $extraHourRate,
                        $vehicleId
                    );
                    
                    $updateStmt->execute();
                } else {
                    // Insert new record
                    $insertVpStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing (
                            vehicle_id,
                            trip_type,
                            local_package_4hr,
                            local_package_8hr,
                            local_package_10hr,
                            extra_km_charge,
                            extra_hour_charge,
                            created_at,
                            updated_at
                        ) VALUES (?, 'local', ?, ?, ?, ?, ?, NOW(), NOW())
                    ");
                    
                    $insertVpStmt->bind_param(
                        "sddddd",
                        $vehicleId,
                        $price4hr40km,
                        $price8hr80km,
                        $price10hr100km,
                        $extraKmRate,
                        $extraHourRate
                    );
                    
                    $insertVpStmt->execute();
                }
            }
            
            // Commit transaction
            $conn->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Local package fares updated successfully',
                'vehicleId' => $vehicleId,
                'originalId' => $originalId,
                'data' => [
                    'price_4hrs_40km' => $price4hr40km,
                    'price_8hrs_80km' => $price8hr80km,
                    'price_10hrs_100km' => $price10hr100km,
                    'price_extra_km' => $extraKmRate,
                    'price_extra_hour' => $extraHourRate
                ],
                'timestamp' => time()
            ];
            
            logMessage("Successfully updated local package fares for vehicle: $vehicleId");
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollback();
            throw $e;
        }
    } else {
        throw new Exception("Invalid request method");
    }
} catch (Exception $e) {
    logMessage("Error processing request: " . $e->getMessage());
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
}

// Ensure clean output (no PHP errors)
ob_clean();
echo json_encode($response);
exit;
