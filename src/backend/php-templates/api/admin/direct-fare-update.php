
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
        }
    }
    
    // For POST form data
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    
    // For GET parameters
    if (!empty($_GET)) {
        $data = array_merge($data, $_GET);
    }
    
    return $data;
}

// Function to ensure that the local_package_fares table exists
function ensureLocalPackageFaresTableExists($conn) {
    try {
        // Check if the table exists
        $result = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        
        if ($result->num_rows == 0) {
            // Create the table if it doesn't exist
            $createTableQuery = "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB;
            ";
            
            $conn->query($createTableQuery);
            return "Created missing local_package_fares table";
        }
        
        return "local_package_fares table already exists";
    } catch (Exception $e) {
        throw new Exception("Failed to create local_package_fares table: " . $e->getMessage());
    }
}

try {
    // Get request data from multiple sources
    $requestData = getRequestData();
    
    // Get trip type from parameters or default to 'local'
    $tripType = isset($requestData['tripType']) ? strtolower($requestData['tripType']) : 
               (isset($requestData['trip_type']) ? strtolower($requestData['trip_type']) : 'local');
    
    // Get vehicle ID from parameters - try multiple parameter names
    $vehicleId = null;
    $possibleIdKeys = ['vehicleId', 'vehicle_id', 'id', 'cab_id', 'carId', 'car_id'];
    
    foreach ($possibleIdKeys as $key) {
        if (isset($requestData[$key]) && !empty($requestData[$key])) {
            $vehicleId = $requestData[$key];
            break;
        }
    }
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Clean vehicle ID - remove any prefix if present
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Prepare response
    $response = [
        'status' => 'success',
        'message' => 'Fare update request received',
        'timestamp' => time(),
        'data' => [
            'vehicleId' => $vehicleId,
            'tripType' => $tripType,
            'packages' => []
        ],
    ];
    
    // Handle local package fares update
    if ($tripType === 'local') {
        // Ensure table exists
        $tableStatus = ensureLocalPackageFaresTableExists($conn);
        $response['tableStatus'] = $tableStatus;
        
        // Define field mappings - map all possible frontend field names to database column names
        $columnMapping = [
            // Standard field names
            'price_4hrs_40km' => 'price_4hrs_40km',
            'price_8hrs_80km' => 'price_8hrs_80km',
            'price_10hrs_100km' => 'price_10hrs_100km',
            'price_extra_km' => 'price_extra_km',
            'price_extra_hour' => 'price_extra_hour',
            
            // Common variations
            '4hrs-40km' => 'price_4hrs_40km',
            '8hrs-80km' => 'price_8hrs_80km',
            '10hrs-100km' => 'price_10hrs_100km',
            'extraKm' => 'price_extra_km',
            'extraHour' => 'price_extra_hour',
            'extra_km' => 'price_extra_km',
            'extra_hour' => 'price_extra_hour',
            'extraKmRate' => 'price_extra_km',
            'extraHourRate' => 'price_extra_hour',
            
            // Package names
            'package4hr40km' => 'price_4hrs_40km',
            'package8hr80km' => 'price_8hrs_80km',
            'package10hr100km' => 'price_10hrs_100km',
            'package_4hr_40km' => 'price_4hrs_40km',
            'package_8hr_80km' => 'price_8hrs_80km',
            'package_10hr_100km' => 'price_10hrs_100km',
            
            // Frontend field names
            'package4hr' => 'price_4hrs_40km',
            'package8hr' => 'price_8hrs_80km',
            'package10hr' => 'price_10hrs_100km',
            'pkg4hr' => 'price_4hrs_40km',
            'pkg8hr' => 'price_8hrs_80km',
            'pkg10hr' => 'price_10hrs_100km'
        ];
        
        // Extract and normalize package pricing from request data
        $packageData = [];
        
        // Debug logging
        $response['debug'] = [
            'original_request' => $requestData,
            'field_mapping' => [],
        ];
        
        // Loop through request data to find package prices
        foreach ($requestData as $key => $value) {
            // Skip non-price fields
            if (in_array($key, $possibleIdKeys) || in_array($key, ['tripType', 'trip_type'])) {
                continue;
            }
            
            // Try to map the key directly
            $columnName = isset($columnMapping[$key]) ? $columnMapping[$key] : null;
            
            // If no direct mapping, try to normalize the key
            if (!$columnName) {
                $normalizedKey = normalizeColumnName($key);
                $columnName = isset($columnMapping[$normalizedKey]) ? $columnMapping[$normalizedKey] : $normalizedKey;
            }
            
            // If we have a valid column name and value, add to package data
            if ($columnName && is_numeric($value)) {
                $packageData[$columnName] = floatval($value);
                $response['data']['packages'][$key] = floatval($value);
                $response['debug']['field_mapping'][$key] = $columnName;
            }
        }
        
        // Check if we have any package data to update
        if (!empty($packageData)) {
            // First check if record exists
            $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM local_package_fares WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $row = $checkResult->fetch_assoc();
            
            if ($row['count'] > 0) {
                // Update existing record
                $setClauses = [];
                $bindParams = [];
                $bindTypes = "";
                
                foreach ($packageData as $column => $value) {
                    $setClauses[] = "$column = ?";
                    $bindParams[] = $value;
                    $bindTypes .= "d"; // d for double/decimal
                }
                
                $bindParams[] = $vehicleId;
                $bindTypes .= "s"; // s for string
                
                $sql = "UPDATE local_package_fares SET " . implode(", ", $setClauses) . " WHERE vehicle_id = ?";
                
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Error preparing statement: " . $conn->error);
                }
                
                // Create the bind_param arguments dynamically
                $bindArgs = [$bindTypes];
                foreach ($bindParams as $key => $value) {
                    $bindArgs[] = &$bindParams[$key];
                }
                
                call_user_func_array([$stmt, 'bind_param'], $bindArgs);
                
                if (!$stmt->execute()) {
                    throw new Exception("Error executing update: " . $stmt->error);
                }
                
                $response['message'] = "Updated existing record in local_package_fares table";
                $response['rowsAffected'] = $stmt->affected_rows;
            } else {
                // Insert new record
                $columns = array_keys($packageData);
                $placeholders = array_fill(0, count($columns), "?");
                
                // Add vehicle_id to columns and placeholders
                array_unshift($columns, "vehicle_id");
                array_unshift($placeholders, "?");
                
                $sql = "INSERT INTO local_package_fares (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $placeholders) . ")";
                
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Error preparing statement: " . $conn->error);
                }
                
                // Create bind types string (s for string, d for decimal)
                $bindTypes = "s" . str_repeat("d", count($packageData));
                
                // Create the bind_param arguments dynamically
                $bindArgs = [$bindTypes, $vehicleId];
                foreach ($packageData as $value) {
                    $bindArgs[] = $value;
                }
                
                call_user_func_array([$stmt, 'bind_param'], $bindArgs);
                
                if (!$stmt->execute()) {
                    throw new Exception("Error executing insert: " . $stmt->error);
                }
                
                $response['message'] = "Added new record to local_package_fares table";
                $response['insertId'] = $conn->insert_id;
            }
            
            // Additional verification - fetch the record back to make sure it was properly saved
            $verifyStmt = $conn->prepare("SELECT * FROM local_package_fares WHERE vehicle_id = ?");
            $verifyStmt->bind_param("s", $vehicleId);
            $verifyStmt->execute();
            $verifyResult = $verifyStmt->get_result();
            
            if ($row = $verifyResult->fetch_assoc()) {
                $response['verification'] = $row;
            }
        } else {
            $response['warning'] = "No valid package data found in request";
        }
    } else if ($tripType === 'outstation') {
        // Handle outstation fares (redirect to appropriate endpoint)
        $response['message'] = 'Outstation fare update request redirected';
        $response['redirected'] = true;
        include_once 'direct-outstation-fares.php';
        exit;
    } else if ($tripType === 'airport') {
        // Handle airport fares (redirect to appropriate endpoint)
        $response['message'] = 'Airport fare update request redirected';
        $response['redirected'] = true;
        include_once 'direct-airport-fares.php';
        exit;
    }
    
    // Send successful response
    echo json_encode($response);
    
} catch (Exception $e) {
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
