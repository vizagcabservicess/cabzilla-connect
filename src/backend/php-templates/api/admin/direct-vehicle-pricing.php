
<?php
// This is a simplified, direct version of vehicle-pricing.php that bypasses complex auth checks
// and directly attempts to process the update, useful for debugging

// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Set CORS headers aggressively
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh");
header("Access-Control-Max-Age: 3600");
header("X-Debug-Handler: direct-vehicle-pricing.php");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit;
}

// Log incoming request
error_log("DIRECT VEHICLE PRICING: Request received - method: {$_SERVER['REQUEST_METHOD']}, content type: " . 
    ($_SERVER['CONTENT_TYPE'] ?? 'undefined'));

// Connect to the database
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        error_log("DIRECT VEHICLE PRICING: Database connection failed: " . $conn->connect_error);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed',
            'debug' => $conn->connect_error
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log("DIRECT VEHICLE PRICING: Database connection exception: " . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection exception',
        'debug' => $e->getMessage()
    ]);
    exit;
}

// Handle POST request to update pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get raw POST data
    $rawInput = file_get_contents('php://input');
    error_log("DIRECT VEHICLE PRICING: Raw input received: " . $rawInput);
    
    // Try to parse as JSON
    $data = json_decode($rawInput, true);
    
    // Check if JSON parsing failed, try to use $_POST
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        error_log("DIRECT VEHICLE PRICING: JSON parse failed, using $_POST");
        $data = $_POST;
    }
    
    // If still empty, try to parse manually
    if (empty($data)) {
        error_log("DIRECT VEHICLE PRICING: Data still empty, trying manual parsing");
        parse_str($rawInput, $data);
    }
    
    // Log the data we've parsed
    error_log("DIRECT VEHICLE PRICING: Parsed data: " . print_r($data, true));
    
    // Basic validation - need at least vehicleId or id
    if (empty($data['vehicleId']) && empty($data['id'])) {
        error_log("DIRECT VEHICLE PRICING: Missing vehicleId/id in request");
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Missing vehicleId/id in request',
            'data' => $data
        ]);
        exit;
    }
    
    // Clean the vehicle ID to ensure consistency
    $vehicleId = $data['id'] ?? $data['vehicleId'];
    
    // Remove 'item-' prefix if it exists
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    $basePrice = isset($data['basePrice']) ? floatval($data['basePrice']) : 0;
    $pricePerKm = isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0;
    
    // Check if vehicle exists
    $checkStmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ?");
    if (!$checkStmt) {
        error_log("DIRECT VEHICLE PRICING: Prepare statement failed: " . $conn->error);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database error: ' . $conn->error
        ]);
        exit;
    }
    
    $checkStmt->bind_param("ss", $vehicleId, $vehicleId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Update existing vehicle
        $updateStmt = $conn->prepare("UPDATE vehicles SET base_price = ?, price_per_km = ?, updated_at = NOW() WHERE id = ? OR vehicle_id = ?");
        if (!$updateStmt) {
            error_log("DIRECT VEHICLE PRICING: Update prepare failed: " . $conn->error);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $conn->error
            ]);
            exit;
        }
        
        $updateStmt->bind_param("ddss", $basePrice, $pricePerKm, $vehicleId, $vehicleId);
        $success = $updateStmt->execute();
        
        if (!$success) {
            error_log("DIRECT VEHICLE PRICING: Update execute failed: " . $updateStmt->error);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $updateStmt->error
            ]);
            exit;
        }
        
        // Also update corresponding table based on trip type
        if (isset($data['tripType'])) {
            switch ($data['tripType']) {
                case 'outstation':
                    // Update outstation_fares table
                    $nightHaltCharge = isset($data['nightHaltCharge']) ? floatval($data['nightHaltCharge']) : 0;
                    $driverAllowance = isset($data['driverAllowance']) ? floatval($data['driverAllowance']) : 0;
                    
                    // Check if record exists in outstation_fares to determine update or insert
                    $checkOutstationStmt = $conn->prepare("SELECT id FROM outstation_fares WHERE id = ? OR vehicle_id = ?");
                    $checkOutstationStmt->bind_param("ss", $vehicleId, $vehicleId);
                    $checkOutstationStmt->execute();
                    $checkOutstationResult = $checkOutstationStmt->get_result();
                    
                    if ($checkOutstationResult->num_rows > 0) {
                        // Update existing record
                        $fareStmt = $conn->prepare("UPDATE outstation_fares SET 
                                                  id = ?, 
                                                  vehicle_id = ?, 
                                                  base_fare = ?, 
                                                  price_per_km = ?, 
                                                  night_halt_charge = ?, 
                                                  driver_allowance = ?, 
                                                  updated_at = NOW() 
                                                  WHERE id = ? OR vehicle_id = ?");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Outstation fare update prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssddddss", 
                                                $vehicleId, 
                                                $vehicleId, 
                                                $basePrice, 
                                                $pricePerKm, 
                                                $nightHaltCharge, 
                                                $driverAllowance,
                                                $vehicleId,
                                                $vehicleId);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Outstation fare update failed: " . $fareStmt->error);
                            }
                        }
                    } else {
                        // Insert new record
                        $fareStmt = $conn->prepare("INSERT INTO outstation_fares 
                                                  (id, vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                                                  VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Outstation fare insert prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssdddd", 
                                                $vehicleId, 
                                                $vehicleId, 
                                                $basePrice, 
                                                $pricePerKm, 
                                                $nightHaltCharge, 
                                                $driverAllowance);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Outstation fare insert failed: " . $fareStmt->error);
                            }
                        }
                    }
                    break;
                    
                case 'local':
                    // Update local_package_fares table
                    $price8hrs80km = isset($data['price8hrs80km']) ? floatval($data['price8hrs80km']) : 0;
                    $price10hrs100km = isset($data['price10hrs100km']) ? floatval($data['price10hrs100km']) : 0;
                    $priceExtraKm = isset($data['priceExtraKm']) ? floatval($data['priceExtraKm']) : 0;
                    $priceExtraHour = isset($data['priceExtraHour']) ? floatval($data['priceExtraHour']) : 0;
                    
                    // Check if record exists
                    $checkLocalStmt = $conn->prepare("SELECT id FROM local_package_fares WHERE id = ? OR vehicle_id = ?");
                    $checkLocalStmt->bind_param("ss", $vehicleId, $vehicleId);
                    $checkLocalStmt->execute();
                    $checkLocalResult = $checkLocalStmt->get_result();
                    
                    if ($checkLocalResult->num_rows > 0) {
                        // Update existing record
                        $fareStmt = $conn->prepare("UPDATE local_package_fares SET 
                                                  id = ?, 
                                                  vehicle_id = ?, 
                                                  price_8hrs_80km = ?, 
                                                  price_10hrs_100km = ?, 
                                                  price_extra_km = ?, 
                                                  price_extra_hour = ?, 
                                                  updated_at = NOW() 
                                                  WHERE id = ? OR vehicle_id = ?");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Local fare update prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssddddss", 
                                                $vehicleId,
                                                $vehicleId,
                                                $price8hrs80km, 
                                                $price10hrs100km, 
                                                $priceExtraKm, 
                                                $priceExtraHour,
                                                $vehicleId,
                                                $vehicleId);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Local fare update failed: " . $fareStmt->error);
                            }
                        }
                    } else {
                        // Insert new record
                        $fareStmt = $conn->prepare("INSERT INTO local_package_fares 
                                                  (id, vehicle_id, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, created_at, updated_at) 
                                                  VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Local fare insert prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssdddd", 
                                                $vehicleId,
                                                $vehicleId,
                                                $price8hrs80km, 
                                                $price10hrs100km, 
                                                $priceExtraKm, 
                                                $priceExtraHour);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Local fare insert failed: " . $fareStmt->error);
                            }
                        }
                    }
                    break;
                    
                case 'airport':
                    // Update airport_transfer_fares table
                    $pickupFare = isset($data['pickupFare']) ? floatval($data['pickupFare']) : 0;
                    $dropFare = isset($data['dropFare']) ? floatval($data['dropFare']) : 0;
                    
                    // Check if record exists
                    $checkAirportStmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE id = ? OR vehicle_id = ?");
                    $checkAirportStmt->bind_param("ss", $vehicleId, $vehicleId);
                    $checkAirportStmt->execute();
                    $checkAirportResult = $checkAirportStmt->get_result();
                    
                    if ($checkAirportResult->num_rows > 0) {
                        // Update existing record
                        $fareStmt = $conn->prepare("UPDATE airport_transfer_fares SET 
                                                  id = ?, 
                                                  vehicle_id = ?, 
                                                  pickup_fare = ?, 
                                                  drop_fare = ?, 
                                                  updated_at = NOW() 
                                                  WHERE id = ? OR vehicle_id = ?");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Airport fare update prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssddss", 
                                                $vehicleId, 
                                                $vehicleId,
                                                $pickupFare, 
                                                $dropFare,
                                                $vehicleId,
                                                $vehicleId);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Airport fare update failed: " . $fareStmt->error);
                            }
                        }
                    } else {
                        // Insert new record
                        $fareStmt = $conn->prepare("INSERT INTO airport_transfer_fares 
                                                  (id, vehicle_id, pickup_fare, drop_fare, created_at, updated_at) 
                                                  VALUES (?, ?, ?, ?, NOW(), NOW())");
                        
                        if (!$fareStmt) {
                            error_log("DIRECT VEHICLE PRICING: Airport fare insert prepare failed: " . $conn->error);
                        } else {
                            $fareStmt->bind_param("ssdd", 
                                                $vehicleId, 
                                                $vehicleId,
                                                $pickupFare, 
                                                $dropFare);
                            $fareSuccess = $fareStmt->execute();
                            
                            if (!$fareSuccess) {
                                error_log("DIRECT VEHICLE PRICING: Airport fare insert failed: " . $fareStmt->error);
                            }
                        }
                    }
                    break;
            }
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle pricing updated successfully',
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm
        ]);
    } else {
        // Insert new vehicle
        $name = ucfirst(str_replace('_', ' ', $vehicleId));
        
        $insertStmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, is_active, created_at, updated_at) 
                                     VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())");
        if (!$insertStmt) {
            error_log("DIRECT VEHICLE PRICING: Insert prepare failed: " . $conn->error);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $conn->error
            ]);
            exit;
        }
        
        $insertStmt->bind_param("sssdd", $vehicleId, $vehicleId, $name, $basePrice, $pricePerKm);
        $success = $insertStmt->execute();
        
        if (!$success) {
            error_log("DIRECT VEHICLE PRICING: Insert execute failed: " . $insertStmt->error);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $insertStmt->error
            ]);
            exit;
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'New vehicle added successfully',
            'vehicleId' => $vehicleId,
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm
        ]);
    }
} else {
    // Handle GET or other methods
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed',
        'allowedMethods' => ['POST']
    ]);
}

// Close database connection
$conn->close();
?>
