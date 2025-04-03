<?php
/**
 * Direct Local Fares Endpoint 
 * Highly robust endpoint for updating local package fares
 * with extensive error handling and fallback mechanisms
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// CRITICAL FIX: Clear any existing output before processing
ob_clean();
ob_start();

// Turn off errors to prevent them from being output in the JSON response
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
        // Update these to match your database schema (without the 's')
        $price4hr40km = isset($data['price_4hrs_40km']) ? floatval($data['price_4hrs_40km']) : 
                      (isset($data['price_4hr_40km']) ? floatval($data['price_4hr_40km']) : 
                      (isset($data['package4hr40km']) ? floatval($data['package4hr40km']) : 0));
                      
        $price8hr80km = isset($data['price_8hrs_80km']) ? floatval($data['price_8hrs_80km']) : 
                      (isset($data['price_8hr_80km']) ? floatval($data['price_8hr_80km']) : 
                      (isset($data['package8hr80km']) ? floatval($data['package8hr80km']) : 0));
                      
        $price10hr100km = isset($data['price_10hrs_100km']) ? floatval($data['price_10hrs_100km']) : 
                        (isset($data['price_10hr_100km']) ? floatval($data['price_10hr_100km']) : 
                        (isset($data['package10hr100km']) ? floatval($data['package10hr100km']) : 0));
                         
        $extraKmRate = isset($data['price_extra_km']) ? floatval($data['price_extra_km']) : 
                      (isset($data['extraKmRate']) ? floatval($data['extraKmRate']) : 0);
                      
        $extraHourRate = isset($data['price_extra_hour']) ? floatval($data['price_extra_hour']) : 
                        (isset($data['extraHourRate']) ? floatval($data['extraHourRate']) : 0);
        
        // Get a database connection
        $conn = getDbConnectionWithRetry();
        
        // Normalize vehicle ID (lowercase, and map numeric IDs if needed)
        $originalId = $vehicleId;
        
        // Hard-coded mappings for numeric IDs - KEEP IN SYNC WITH FRONTEND
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
        
        // Check if vehicleId is numeric and has a mapping
        if (is_numeric($vehicleId) && isset($numericMappings[$vehicleId])) {
            $vehicleId = $numericMappings[$vehicleId];
            logMessage("Mapped numeric ID $originalId to $vehicleId");
        }
        
        // Normalize to lowercase and replace spaces with underscores
        $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
        
        // Ensure the table exists
        ensureLocalPackageFaresTable($conn);
        
        // Begin transaction
        $conn->begin_transaction();
        
        try {
            // Check for the existence of columns to adapt our query
            $columnResult = $conn->query("DESCRIBE local_package_fares");
            $columns = [];
            
            while ($column = $columnResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
            
            logMessage("Available columns: " . implode(", ", $columns));
            
            // Dynamically build the query based on actual column names
            // Use the column names that actually exist in your database
            $insertColumns = ['vehicle_id'];
            $updateValues = [];
            $values = [$vehicleId];
            $types = 's';
            
            // Check for 4hr/4hrs column
            if (in_array('price_4hr_40km', $columns)) {
                $insertColumns[] = 'price_4hr_40km';
                $updateValues[] = 'price_4hr_40km = VALUES(price_4hr_40km)';
                $values[] = $price4hr40km;
                $types .= 'd';
            } else if (in_array('price_4hrs_40km', $columns)) {
                $insertColumns[] = 'price_4hrs_40km';
                $updateValues[] = 'price_4hrs_40km = VALUES(price_4hrs_40km)';
                $values[] = $price4hr40km;
                $types .= 'd';
            }
            
            // Check for 8hr/8hrs column
            if (in_array('price_8hr_80km', $columns)) {
                $insertColumns[] = 'price_8hr_80km';
                $updateValues[] = 'price_8hr_80km = VALUES(price_8hr_80km)';
                $values[] = $price8hr80km;
                $types .= 'd';
            } else if (in_array('price_8hrs_80km', $columns)) {
                $insertColumns[] = 'price_8hrs_80km';
                $updateValues[] = 'price_8hrs_80km = VALUES(price_8hrs_80km)';
                $values[] = $price8hr80km;
                $types .= 'd';
            }
            
            // Check for 10hr/10hrs column
            if (in_array('price_10hr_100km', $columns)) {
                $insertColumns[] = 'price_10hr_100km';
                $updateValues[] = 'price_10hr_100km = VALUES(price_10hr_100km)';
                $values[] = $price10hr100km;
                $types .= 'd';
            } else if (in_array('price_10hrs_100km', $columns)) {
                $insertColumns[] = 'price_10hrs_100km';
                $updateValues[] = 'price_10hrs_100km = VALUES(price_10hrs_100km)';
                $values[] = $price10hr100km;
                $types .= 'd';
            }
            
            // Extra km rate
            if (in_array('price_extra_km', $columns)) {
                $insertColumns[] = 'price_extra_km';
                $updateValues[] = 'price_extra_km = VALUES(price_extra_km)';
                $values[] = $extraKmRate;
                $types .= 'd';
            }
            
            // Extra hour rate
            if (in_array('price_extra_hour', $columns)) {
                $insertColumns[] = 'price_extra_hour';
                $updateValues[] = 'price_extra_hour = VALUES(price_extra_hour)';
                $values[] = $extraHourRate;
                $types .= 'd';
            }
            
            // Add updated_at to the query
            $insertColumns[] = 'updated_at';
            $values[] = date('Y-m-d H:i:s');
            $types .= 's';
            
            // Build the query
            $placeholders = array_fill(0, count($values), '?');
            
            $insertQuery = "
                INSERT INTO local_package_fares (
                    " . implode(', ', $insertColumns) . "
                ) VALUES (" . implode(', ', $placeholders) . ")
                ON DUPLICATE KEY UPDATE
                    " . implode(', ', $updateValues) . ",
                    updated_at = NOW()
            ";
            
            logMessage("Generated query: " . $insertQuery);
            logMessage("Values: " . implode(', ', $values));
            logMessage("Types: " . $types);
            
            $stmt = $conn->prepare($insertQuery);
            if (!$stmt) {
                throw new Exception("Database prepare error: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$values);
            
            $result = $stmt->execute();
            if (!$result) {
                throw new Exception("Failed to update local_package_fares: " . $stmt->error);
            }
            
            // Commit transaction
            $conn->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Local package fares updated successfully',
                'vehicleId' => $vehicleId,
                'originalId' => $originalId,
                'data' => [
                    'price_4hr_40km' => $price4hr40km,
                    'price_8hr_80km' => $price8hr80km,
                    'price_10hr_100km' => $price10hr100km,
                    'price_extra_km' => $extraKmRate,
                    'price_extra_hour' => $extraHourRate
                ],
                'timestamp' => time()
            ];
            
            logMessage("Successfully updated local package fares for vehicle: $vehicleId");
            
            // Try to run sync endpoint to ensure consistency
            try {
                $syncEndpoint = getApiUrl('/api/admin/sync-local-fares') . '?t=' . time();
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $syncEndpoint);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                curl_exec($ch);
                curl_close($ch);
                
                logMessage("Triggered sync endpoint after successful update");
            } catch (Exception $syncError) {
                // Ignore sync errors, the main update was successful
                logMessage("Failed to trigger sync endpoint: " . $syncError->getMessage());
            }
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
ob_end_clean();
echo json_encode($response);
exit;
