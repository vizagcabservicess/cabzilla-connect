
<?php
/**
 * direct-airport-fares.php - Endpoint for directly managing airport transfer fares
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message, $file = 'direct-airport-fares.log') {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/' . $file);
}

// Log request information
logMessage("Direct airport fares request received: " . $_SERVER['REQUEST_METHOD']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Define standard vehicle IDs for validation
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
    '1290' => 'sedan'
];

// Process based on request method
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Get request data
    $rawInput = file_get_contents('php://input');
    logMessage("Raw input: " . $rawInput);
    
    // Try to parse as JSON
    $requestData = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE || empty($requestData)) {
        // Try as form data
        parse_str($rawInput, $requestData);
    }
    
    // If still empty, try $_POST
    if (empty($requestData)) {
        $requestData = $_POST;
    }
    
    // Extract and validate vehicle ID
    $vehicleId = '';
    if (isset($requestData['vehicleId'])) {
        $vehicleId = $requestData['vehicleId'];
    } elseif (isset($requestData['vehicle_id'])) {
        $vehicleId = $requestData['vehicle_id'];
    } elseif (isset($requestData['id'])) {
        $vehicleId = $requestData['id'];
    }
    
    if (empty($vehicleId)) {
        $response['message'] = 'Vehicle ID is required';
        echo json_encode($response);
        exit;
    }
    
    // Handle numeric IDs
    if (is_numeric($vehicleId)) {
        if (isset($numericMappings[$vehicleId])) {
            $originalId = $vehicleId;
            $vehicleId = $numericMappings[$vehicleId];
            logMessage("Mapped numeric ID $originalId to standard vehicle ID: $vehicleId");
        } else {
            $response['message'] = 'Invalid numeric vehicle ID';
            echo json_encode($response);
            exit;
        }
    }
    
    // Normalize vehicle ID
    $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
    
    try {
        // Connect to database
        $conn = getDbConnectionWithRetry();
        logMessage("Database connection established");
        
        // Start transaction
        $conn->begin_transaction();
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            // Extract fare data with fallbacks and defaults
            $basePrice = isset($requestData['basePrice']) ? floatval($requestData['basePrice']) : 
                       (isset($requestData['base_price']) ? floatval($requestData['base_price']) : 0);
            
            $pricePerKm = isset($requestData['pricePerKm']) ? floatval($requestData['pricePerKm']) : 
                         (isset($requestData['price_per_km']) ? floatval($requestData['price_per_km']) : 0);
            
            $pickupPrice = isset($requestData['pickupPrice']) ? floatval($requestData['pickupPrice']) : 
                          (isset($requestData['pickup_price']) ? floatval($requestData['pickup_price']) : 0);
            
            $dropPrice = isset($requestData['dropPrice']) ? floatval($requestData['dropPrice']) : 
                        (isset($requestData['drop_price']) ? floatval($requestData['drop_price']) : 0);
            
            $tier1Price = isset($requestData['tier1Price']) ? floatval($requestData['tier1Price']) : 
                         (isset($requestData['tier1_price']) ? floatval($requestData['tier1_price']) : 0);
            
            $tier2Price = isset($requestData['tier2Price']) ? floatval($requestData['tier2Price']) : 
                         (isset($requestData['tier2_price']) ? floatval($requestData['tier2_price']) : 0);
            
            $tier3Price = isset($requestData['tier3Price']) ? floatval($requestData['tier3Price']) : 
                         (isset($requestData['tier3_price']) ? floatval($requestData['tier3_price']) : 0);
            
            $tier4Price = isset($requestData['tier4Price']) ? floatval($requestData['tier4Price']) : 
                         (isset($requestData['tier4_price']) ? floatval($requestData['tier4_price']) : 0);
            
            $extraKmCharge = isset($requestData['extraKmCharge']) ? floatval($requestData['extraKmCharge']) : 
                            (isset($requestData['extra_km_charge']) ? floatval($requestData['extra_km_charge']) : 0);
            
            // Check if record exists
            $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bind_param('s', $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing record
                $updateQuery = "UPDATE airport_transfer_fares SET 
                              base_price = ?,
                              price_per_km = ?,
                              pickup_price = ?,
                              drop_price = ?,
                              tier1_price = ?,
                              tier2_price = ?,
                              tier3_price = ?,
                              tier4_price = ?,
                              extra_km_charge = ?,
                              updated_at = NOW()
                              WHERE vehicle_id = ?";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bind_param(
                    'ddddddddds', 
                    $basePrice, 
                    $pricePerKm, 
                    $pickupPrice, 
                    $dropPrice, 
                    $tier1Price, 
                    $tier2Price, 
                    $tier3Price, 
                    $tier4Price, 
                    $extraKmCharge, 
                    $vehicleId
                );
                
                if ($updateStmt->execute()) {
                    logMessage("Updated airport transfer fares for $vehicleId");
                    $response['status'] = 'success';
                    $response['message'] = "Airport transfer fares updated for $vehicleId";
                } else {
                    throw new Exception("Failed to update airport transfer fares: " . $updateStmt->error);
                }
            } else {
                // Insert new record
                $insertQuery = "INSERT INTO airport_transfer_fares 
                              (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                               tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param(
                    'sddddddddd', 
                    $vehicleId, 
                    $basePrice, 
                    $pricePerKm, 
                    $pickupPrice, 
                    $dropPrice, 
                    $tier1Price, 
                    $tier2Price, 
                    $tier3Price, 
                    $tier4Price, 
                    $extraKmCharge
                );
                
                if ($insertStmt->execute()) {
                    // Check if the vehicle exists in the vehicles table
                    $checkVehicleQuery = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?";
                    $checkVehicleStmt = $conn->prepare($checkVehicleQuery);
                    $checkVehicleStmt->bind_param('s', $vehicleId);
                    $checkVehicleStmt->execute();
                    $vehicleExists = ($checkVehicleStmt->get_result()->fetch_assoc()['count'] > 0);
                    
                    if (!$vehicleExists) {
                        // Create vehicle entry for consistency
                        $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
                        $insertVehicleQuery = "INSERT INTO vehicles (id, vehicle_id, name, is_active) VALUES (?, ?, ?, 1)";
                        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                        $insertVehicleStmt->bind_param('sss', $vehicleId, $vehicleId, $vehicleName);
                        
                        if ($insertVehicleStmt->execute()) {
                            logMessage("Created missing vehicle record for $vehicleId");
                        } else {
                            logMessage("Warning: Failed to create vehicle record: " . $insertVehicleStmt->error);
                        }
                    }
                    
                    logMessage("Created airport transfer fares for $vehicleId");
                    $response['status'] = 'success';
                    $response['message'] = "Airport transfer fares created for $vehicleId";
                } else {
                    throw new Exception("Failed to create airport transfer fares: " . $insertStmt->error);
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['data'] = [
            'vehicle_id' => $vehicleId,
            'base_price' => $basePrice ?? null,
            'price_per_km' => $pricePerKm ?? null,
            'pickup_price' => $pickupPrice ?? null,
            'drop_price' => $dropPrice ?? null,
            'tier1_price' => $tier1Price ?? null,
            'tier2_price' => $tier2Price ?? null,
            'tier3_price' => $tier3Price ?? null,
            'tier4_price' => $tier4Price ?? null,
            'extra_km_charge' => $extraKmCharge ?? null
        ];
        
    } catch (Exception $e) {
        // Rollback transaction on error
        if (isset($conn)) {
            $conn->rollback();
        }
        
        $response['status'] = 'error';
        $response['message'] = 'Error: ' . $e->getMessage();
        logMessage("ERROR: " . $e->getMessage());
    } finally {
        // Close connection
        if (isset($conn)) {
            $conn->close();
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Connect to database
        $conn = getDbConnectionWithRetry();
        
        // Get vehicle ID from query params
        $vehicleId = '';
        if (isset($_GET['vehicleId'])) {
            $vehicleId = $_GET['vehicleId'];
        } elseif (isset($_GET['vehicle_id'])) {
            $vehicleId = $_GET['vehicle_id'];
        }
        
        // Normalize vehicle ID if provided
        if (!empty($vehicleId)) {
            if (is_numeric($vehicleId) && isset($numericMappings[$vehicleId])) {
                $vehicleId = $numericMappings[$vehicleId];
            }
            $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
            
            // Fetch data for specific vehicle
            $query = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $fares = $result->fetch_assoc();
                $response['status'] = 'success';
                $response['message'] = "Airport transfer fares retrieved";
                $response['data'] = $fares;
            } else {
                $response['status'] = 'error';
                $response['message'] = "No airport transfer fares found for $vehicleId";
            }
        } else {
            // Fetch all airport transfer fares
            $query = "SELECT * FROM airport_transfer_fares";
            $result = $conn->query($query);
            
            if ($result) {
                $fares = [];
                while ($row = $result->fetch_assoc()) {
                    $fares[] = $row;
                }
                
                $response['status'] = 'success';
                $response['message'] = "Retrieved all airport transfer fares";
                $response['data'] = $fares;
                $response['count'] = count($fares);
            } else {
                throw new Exception("Failed to retrieve airport transfer fares: " . $conn->error);
            }
        }
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Error: ' . $e->getMessage();
        logMessage("ERROR: " . $e->getMessage());
    } finally {
        // Close connection
        if (isset($conn)) {
            $conn->close();
        }
    }
} else {
    $response['message'] = 'Method not allowed';
}

// Send response
echo json_encode($response);
?>
