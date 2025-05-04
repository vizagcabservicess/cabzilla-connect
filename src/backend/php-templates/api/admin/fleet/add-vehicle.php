
<?php
/**
 * Add/Create vehicle API for fleet management
 * 
 * This API endpoint adds a new vehicle to the fleet_vehicles table
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Fleet-Vehicle');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Function to log debug info
function logFleetDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/fleet_vehicle_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

logFleetDebug("Starting fleet vehicle add process");

// Get the JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    logFleetDebug("No input data received or invalid JSON");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid input data'
    ]);
    exit;
}

logFleetDebug("Received vehicle data", $input);

// Check required fields
$requiredFields = ['vehicleNumber', 'make', 'model', 'year'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        logFleetDebug("Missing required field: $field");
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => "Missing required field: $field"
        ]);
        exit;
    }
}

// Prepare vehicle data
$vehicleNumber = $input['vehicleNumber'];
$name = $input['name'] ?? "{$input['make']} {$input['model']}";
$model = $input['model'];
$make = $input['make'];
$year = (int)$input['year'];
$status = $input['status'] ?? 'Active';
$lastServiceDate = $input['lastService'] ?? date('Y-m-d');
$nextServiceDue = $input['nextServiceDue'] ?? date('Y-m-d', strtotime('+3 months'));
$fuelType = $input['fuelType'] ?? 'Petrol';
$vehicleType = $input['vehicleType'] ?? null;
$cabTypeId = $input['cabTypeId'] ?? null;
$capacity = (int)($input['capacity'] ?? 4);
$luggageCapacity = (int)($input['luggageCapacity'] ?? 2);
$isActive = isset($input['isActive']) ? (bool)$input['isActive'] : true;
$currentOdometer = (int)($input['currentOdometer'] ?? 0);

// Try to connect to database if config exists
try {
    require_once __DIR__ . '/../../../config.php';
    
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
        
        if ($conn) {
            logFleetDebug("Connected to database successfully");
            
            // Check if vehicle with this number already exists
            $checkSql = "SELECT id FROM fleet_vehicles WHERE vehicle_number = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("s", $vehicleNumber);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                logFleetDebug("Vehicle with number $vehicleNumber already exists");
                http_response_code(409);
                echo json_encode([
                    'status' => 'error',
                    'message' => "Vehicle with number $vehicleNumber already exists"
                ]);
                exit;
            }
            
            // Insert new vehicle
            $sql = "INSERT INTO fleet_vehicles 
                    (vehicle_number, name, model, make, year, status, last_service_date, next_service_due, 
                     fuel_type, vehicle_type, cab_type_id, capacity, luggage_capacity, is_active, current_odometer) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            
            // Convert boolean to integer for MySQL
            $isActiveInt = $isActive ? 1 : 0;
            
            $stmt->bind_param("ssssisssssiiiis", 
                $vehicleNumber,
                $name,
                $model,
                $make,
                $year,
                $status,
                $lastServiceDate,
                $nextServiceDue,
                $fuelType,
                $vehicleType,
                $cabTypeId,
                $capacity,
                $luggageCapacity,
                $isActiveInt,
                $currentOdometer
            );
            
            if ($stmt->execute()) {
                $newVehicleId = $conn->insert_id;
                logFleetDebug("Vehicle added successfully with ID: $newVehicleId");
                
                // Get the inserted vehicle data
                $selectSql = "SELECT * FROM fleet_vehicles WHERE id = ?";
                $selectStmt = $conn->prepare($selectSql);
                $selectStmt->bind_param("i", $newVehicleId);
                $selectStmt->execute();
                $result = $selectStmt->get_result();
                $vehicle = $result->fetch_assoc();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Fleet vehicle added successfully',
                    'vehicle' => $vehicle
                ]);
            } else {
                logFleetDebug("Database error: " . $stmt->error);
                http_response_code(500);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Failed to add vehicle: ' . $stmt->error
                ]);
            }
            
            $conn->close();
            exit;
        }
    }
} catch (Exception $e) {
    logFleetDebug("Database error: " . $e->getMessage());
}

// If we got here, either the database connection failed or we don't have config
// Return a mock response for testing/development
logFleetDebug("No database connection available, returning mock response");

// Generate a mock vehicle with an ID
$mockVehicle = $input;
$mockVehicle['id'] = mt_rand(1000, 9999);
$mockVehicle['created_at'] = date('Y-m-d H:i:s');
$mockVehicle['updated_at'] = date('Y-m-d H:i:s');

echo json_encode([
    'status' => 'success',
    'message' => 'Fleet vehicle added successfully (mock)',
    'mock' => true,
    'vehicle' => $mockVehicle
]);
