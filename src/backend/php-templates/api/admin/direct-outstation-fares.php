
<?php
// This is a simplified standalone API that avoids CORS issues and directly connects to the database
// For outstation fare updates

// Headers for CORS - Enable everything with no restrictions
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-API-Version, Cache-Control, Pragma");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Basic error handling function
function return_error($message, $code = 500) {
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $message,
        'code' => $code,
        'timestamp' => time()
    ]);
    exit;
}

// Success response function
function return_success($data = null, $message = 'Success') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data,
        'timestamp' => time()
    ]);
    exit;
}

// Log to file for debugging
function log_message($message, $data = []) {
    $logFile = __DIR__ . '/../../logs/fare_api_' . date('Y-m-d') . '.log';
    $dir = dirname($logFile);
    
    // Create directory if it doesn't exist
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $dataString = is_array($data) ? json_encode($data) : $data;
    $logMessage = "[$timestamp] $message - $dataString\n";
    
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

// Connect to database
function get_db_connection() {
    $host = "localhost";
    $dbname = "u963587855_cabs";
    $username = "u963587855_cabsuser";
    $password = "3g9U/%1i9Jb";
    
    try {
        $conn = new mysqli($host, $username, $password, $dbname);
        
        if ($conn->connect_error) {
            log_message("Database connection failed", $conn->connect_error);
            return_error("Database connection failed: " . $conn->connect_error);
        }
        
        return $conn;
    } catch (Exception $e) {
        log_message("Database connection exception", $e->getMessage());
        return_error("Database connection exception: " . $e->getMessage());
    }
}

// Main entry point
try {
    log_message("API request received", [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'query' => $_SERVER['QUERY_STRING'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    
    // Test mode - just return test data
    if (isset($_GET['test'])) {
        return_success(['test' => true, 'message' => 'API is responsive']);
    }

    // Get database connection
    $conn = get_db_connection();
    
    // Handle POST request to update fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Parse input data
        $inputJSON = file_get_contents('php://input');
        $inputData = json_decode($inputJSON, true);
        
        // If JSON parsing failed, try POST data
        if (is_null($inputData) && !empty($_POST)) {
            $inputData = $_POST;
        }
        
        // Still no data? Try direct access
        if (is_null($inputData)) {
            parse_str(file_get_contents("php://input"), $inputData);
        }
        
        // Log received data
        log_message("Received data", $inputData);
        
        // Validate input data
        if (empty($inputData)) {
            return_error("No data received", 400);
        }
        
        // Get vehicle ID from input
        $vehicleId = $inputData['vehicleId'] ?? ($inputData['vehicle_id'] ?? null);
        if (!$vehicleId) {
            return_error("Vehicle ID is required", 400);
        }
        
        // Clean the vehicle ID (remove any 'item-' prefix)
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
        }
        
        // Check if price data exists
        $baseFare = isset($inputData['baseFare']) ? floatval($inputData['baseFare']) : 
                   (isset($inputData['basePrice']) ? floatval($inputData['basePrice']) : 0);
                   
        $pricePerKm = isset($inputData['pricePerKm']) ? floatval($inputData['pricePerKm']) : 
                     (isset($inputData['oneWayPricePerKm']) ? floatval($inputData['oneWayPricePerKm']) : 0);
                     
        $nightHaltCharge = isset($inputData['nightHaltCharge']) ? floatval($inputData['nightHaltCharge']) : 
                          (isset($inputData['nightHalt']) ? floatval($inputData['nightHalt']) : 700);
                          
        $driverAllowance = isset($inputData['driverAllowance']) ? floatval($inputData['driverAllowance']) : 
                           (isset($inputData['driverAllowance']) ? floatval($inputData['driverAllowance']) : 250);
        
        // Create vehicle if it does not exist
        $checkSql = "SELECT id FROM vehicles WHERE id = ? OR vehicle_id = ? LIMIT 1";
        $stmt = $conn->prepare($checkSql);
        
        if (!$stmt) {
            log_message("Error preparing check statement", $conn->error);
            return_error("Database error: " . $conn->error);
        }
        
        $stmt->bind_param("ss", $vehicleId, $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Create a new vehicle
            $vehicleName = ucfirst(str_replace(['_', '-'], ' ', $vehicleId));
            $insertSql = "INSERT INTO vehicles (id, vehicle_id, name, base_price, price_per_km, night_halt_charge, driver_allowance, is_active, created_at, updated_at) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
            
            $stmt = $conn->prepare($insertSql);
            if (!$stmt) {
                log_message("Error preparing insert vehicle statement", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $stmt->bind_param("sssdddd", $vehicleId, $vehicleId, $vehicleName, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$stmt->execute()) {
                log_message("Error inserting vehicle", $stmt->error);
                return_error("Error creating vehicle: " . $stmt->error);
            }
            
            log_message("Created new vehicle", ['id' => $vehicleId, 'name' => $vehicleName]);
        } else {
            // Update existing vehicle
            $updateSql = "UPDATE vehicles SET 
                          base_price = ?, 
                          price_per_km = ?, 
                          night_halt_charge = ?, 
                          driver_allowance = ?, 
                          updated_at = NOW() 
                          WHERE id = ? OR vehicle_id = ?";
            
            $stmt = $conn->prepare($updateSql);
            if (!$stmt) {
                log_message("Error preparing update vehicle statement", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $stmt->bind_param("ddddss", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId, $vehicleId);
            
            if (!$stmt->execute()) {
                log_message("Error updating vehicle", $stmt->error);
                return_error("Error updating vehicle: " . $stmt->error);
            }
            
            log_message("Updated vehicle", ['id' => $vehicleId]);
        }
        
        // Check if outstation fare record exists
        $checkSql = "SELECT id FROM outstation_fares WHERE vehicle_id = ? LIMIT 1";
        $stmt = $conn->prepare($checkSql);
        
        if (!$stmt) {
            log_message("Error preparing check outstation fares statement", $conn->error);
            return_error("Database error: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Create new outstation fare record
            $insertSql = "INSERT INTO outstation_fares (vehicle_id, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                          VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
            
            $stmt = $conn->prepare($insertSql);
            if (!$stmt) {
                log_message("Error preparing insert outstation fares statement", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $stmt->bind_param("sdddd", $vehicleId, $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$stmt->execute()) {
                log_message("Error inserting outstation fares", $stmt->error);
                return_error("Error creating outstation fares: " . $stmt->error);
            }
            
            log_message("Created new outstation fare", ['id' => $vehicleId]);
        } else {
            // Update existing outstation fare record
            $updateSql = "UPDATE outstation_fares SET 
                          base_fare = ?, 
                          price_per_km = ?, 
                          night_halt_charge = ?, 
                          driver_allowance = ?, 
                          updated_at = NOW() 
                          WHERE vehicle_id = ?";
            
            $stmt = $conn->prepare($updateSql);
            if (!$stmt) {
                log_message("Error preparing update outstation fares statement", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $stmt->bind_param("dddds", $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            
            if (!$stmt->execute()) {
                log_message("Error updating outstation fares", $stmt->error);
                return_error("Error updating outstation fares: " . $stmt->error);
            }
            
            log_message("Updated outstation fare", ['id' => $vehicleId]);
        }
        
        // Return success
        return_success([
            'vehicleId' => $vehicleId,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance,
        ], "Fare updated successfully");
    }
    // Handle GET request to retrieve fares
    else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $vehicleId = $_GET['vehicleId'] ?? ($_GET['vehicle_id'] ?? null);
        
        if ($vehicleId) {
            // Get specific vehicle
            $sql = "SELECT 
                    v.id, 
                    v.name, 
                    v.base_price as basePrice, 
                    v.price_per_km as pricePerKm, 
                    v.night_halt_charge as nightHaltCharge, 
                    v.driver_allowance as driverAllowance,
                    of.base_fare as baseFare,
                    of.price_per_km as outPricePerKm
                    FROM vehicles v
                    LEFT JOIN outstation_fares of ON v.id = of.vehicle_id
                    WHERE v.id = ? OR v.vehicle_id = ?";
                    
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                log_message("Error preparing get vehicle statement", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $stmt->bind_param("ss", $vehicleId, $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return_error("Vehicle not found", 404);
            }
            
            $vehicle = $result->fetch_assoc();
            return_success($vehicle);
        } else {
            // Get all vehicles with outstation fares
            $sql = "SELECT 
                    v.id, 
                    v.name, 
                    v.base_price as basePrice, 
                    v.price_per_km as pricePerKm, 
                    v.night_halt_charge as nightHaltCharge, 
                    v.driver_allowance as driverAllowance,
                    of.base_fare as baseFare,
                    of.price_per_km as outPricePerKm
                    FROM vehicles v
                    LEFT JOIN outstation_fares of ON v.id = of.vehicle_id
                    WHERE v.is_active = 1
                    ORDER BY v.name";
                    
            $result = $conn->query($sql);
            if (!$result) {
                log_message("Error getting all vehicles", $conn->error);
                return_error("Database error: " . $conn->error);
            }
            
            $vehicles = [];
            while ($row = $result->fetch_assoc()) {
                $vehicles[] = $row;
            }
            
            return_success($vehicles);
        }
    } else {
        return_error("Method not allowed", 405);
    }
} catch (Exception $e) {
    log_message("Uncaught exception", $e->getMessage());
    return_error("Internal server error: " . $e->getMessage());
}
