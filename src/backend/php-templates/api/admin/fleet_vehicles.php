
<?php
require_once '../../config.php';
require_once '../common/db_helper.php';
require_once 'db_setup.php';

// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get database connection
$conn = getDbConnection();

// Check connection
if (!$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Parse the input data
function getRequestData() {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $inputJSON = file_get_contents('php://input');
        return json_decode($inputJSON, true);
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        return $_POST;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        parse_str(file_get_contents('php://input'), $data);
        return $data;
    }
    
    return [];
}

// Check if fleet_vehicles table exists, if not create it
function ensureTablesExist($conn) {
    $tablesSQL = file_get_contents(__DIR__ . '/fleet_vehicles.sql');
    
    if (!$tablesSQL) {
        error_log("Failed to read fleet_vehicles.sql file");
        return false;
    }
    
    // Split SQL by semicolon to execute multiple statements
    $statements = array_filter(array_map('trim', explode(';', $tablesSQL)));
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            try {
                $result = $conn->query($statement);
                if (!$result) {
                    error_log("SQL Error: " . $conn->error . " in statement: " . $statement);
                }
            } catch (Exception $e) {
                error_log("Exception executing SQL: " . $e->getMessage() . " in statement: " . $statement);
            }
        }
    }
    
    return true;
}

// Ensure tables exist
ensureTablesExist($conn);

try {
    // Get the request path
    $requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathSegments = explode('/', trim($requestPath, '/'));
    $endpoint = end($pathSegments); // Get the last segment
    
    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if we're getting all vehicles or a specific one
        if ($endpoint === 'vehicles') {
            // Get all vehicles
            $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
            
            $query = "SELECT * FROM fleet_vehicles";
            if (!$includeInactive) {
                $query .= " WHERE is_active = 1";
            }
            
            $result = $conn->query($query);
            
            if (!$result) {
                throw new Exception("Error querying fleet vehicles: " . $conn->error);
            }
            
            $vehicles = [];
            while ($row = $result->fetch_assoc()) {
                $vehicles[] = [
                    'id' => $row['id'],
                    'vehicleNumber' => $row['vehicle_number'],
                    'name' => $row['name'],
                    'model' => $row['model'],
                    'make' => $row['make'],
                    'year' => (int)$row['year'],
                    'status' => $row['status'],
                    'lastService' => $row['last_service_date'],
                    'nextServiceDue' => $row['next_service_due'],
                    'fuelType' => $row['fuel_type'],
                    'vehicleType' => $row['vehicle_type'],
                    'cabTypeId' => $row['cab_type_id'],
                    'capacity' => (int)$row['capacity'],
                    'luggageCapacity' => (int)$row['luggage_capacity'],
                    'isActive' => (bool)$row['is_active'],
                    'assignedDriverId' => $row['assigned_driver_id'],
                    'currentOdometer' => (int)$row['current_odometer'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            
            echo json_encode([
                'vehicles' => $vehicles,
                'count' => count($vehicles),
                'timestamp' => time()
            ]);
        } 
        else if (preg_match('/vehicles\/(\d+)/', $requestPath, $matches)) {
            // Get specific vehicle
            $vehicleId = $matches[1];
            
            $stmt = $conn->prepare("SELECT * FROM fleet_vehicles WHERE id = ?");
            $stmt->bind_param("i", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Vehicle not found']);
                exit;
            }
            
            $row = $result->fetch_assoc();
            $vehicle = [
                'id' => $row['id'],
                'vehicleNumber' => $row['vehicle_number'],
                'name' => $row['name'],
                'model' => $row['model'],
                'make' => $row['make'],
                'year' => (int)$row['year'],
                'status' => $row['status'],
                'lastService' => $row['last_service_date'],
                'nextServiceDue' => $row['next_service_due'],
                'fuelType' => $row['fuel_type'],
                'vehicleType' => $row['vehicle_type'],
                'cabTypeId' => $row['cab_type_id'],
                'capacity' => (int)$row['capacity'],
                'luggageCapacity' => (int)$row['luggage_capacity'],
                'isActive' => (bool)$row['is_active'],
                'assignedDriverId' => $row['assigned_driver_id'],
                'currentOdometer' => (int)$row['current_odometer'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            echo json_encode([
                'vehicle' => $vehicle,
                'timestamp' => time()
            ]);
        }
        else if (preg_match('/maintenance\/(\d+)/', $requestPath, $matches)) {
            // Get maintenance records for a specific vehicle
            $vehicleId = $matches[1];
            
            $stmt = $conn->prepare("SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY service_date DESC");
            $stmt->bind_param("i", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $records = [];
            while ($row = $result->fetch_assoc()) {
                $records[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'serviceDate' => $row['service_date'],
                    'serviceType' => $row['service_type'],
                    'description' => $row['description'],
                    'cost' => (float)$row['cost'],
                    'vendor' => $row['vendor'],
                    'odometer' => (int)$row['odometer'],
                    'nextServiceDue' => $row['next_service_due'],
                    'nextServiceOdometer' => (int)$row['next_service_odometer'],
                    'notes' => $row['notes'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            
            echo json_encode([
                'records' => $records,
                'count' => count($records),
                'timestamp' => time()
            ]);
        }
        else if (preg_match('/fuel\/(\d+)/', $requestPath, $matches)) {
            // Get fuel records for a specific vehicle
            $vehicleId = $matches[1];
            
            $stmt = $conn->prepare("SELECT * FROM fuel_records WHERE vehicle_id = ? ORDER BY fill_date DESC");
            $stmt->bind_param("i", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $records = [];
            while ($row = $result->fetch_assoc()) {
                $records[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'fillDate' => $row['fill_date'],
                    'quantity' => (float)$row['quantity'],
                    'pricePerUnit' => (float)$row['price_per_unit'],
                    'totalCost' => (float)$row['total_cost'],
                    'odometer' => (int)$row['odometer'],
                    'fuelStation' => $row['fuel_station'],
                    'paymentMethod' => $row['payment_method'],
                    'notes' => $row['notes'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            
            echo json_encode([
                'records' => $records,
                'count' => count($records),
                'timestamp' => time()
            ]);
        }
        else if (preg_match('/documents\/(\d+)/', $requestPath, $matches)) {
            // Get documents for a specific vehicle
            $vehicleId = $matches[1];
            
            $stmt = $conn->prepare("SELECT * FROM vehicle_documents WHERE vehicle_id = ?");
            $stmt->bind_param("i", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $documents = [];
            while ($row = $result->fetch_assoc()) {
                $documents[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'type' => $row['document_type'],
                    'number' => $row['document_number'],
                    'issuedDate' => $row['issued_date'],
                    'expiryDate' => $row['expiry_date'],
                    'fileUrl' => $row['file_url'],
                    'status' => $row['status'],
                    'notes' => $row['notes'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            
            echo json_encode([
                'documents' => $documents,
                'count' => count($documents),
                'timestamp' => time()
            ]);
        }
        else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }
    // Handle POST requests
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        
        if ($endpoint === 'vehicles') {
            // Add new vehicle
            if (empty($data['vehicleNumber'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Vehicle number is required']);
                exit;
            }
            
            // Check if vehicle number already exists
            $checkStmt = $conn->prepare("SELECT id FROM fleet_vehicles WHERE vehicle_number = ?");
            $checkStmt->bind_param("s", $data['vehicleNumber']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'Vehicle with this number already exists']);
                exit;
            }
            
            // Insert new vehicle
            $stmt = $conn->prepare("
                INSERT INTO fleet_vehicles (
                    vehicle_number, name, model, make, year, status, last_service_date, next_service_due,
                    fuel_type, vehicle_type, cab_type_id, capacity, luggage_capacity, is_active, current_odometer
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $name = $data['name'] ?? $data['vehicleNumber'];
            $model = $data['model'] ?? '';
            $make = $data['make'] ?? '';
            $year = $data['year'] ?? date('Y');
            $status = $data['status'] ?? 'Active';
            $lastService = $data['lastService'] ?? date('Y-m-d');
            $nextServiceDue = $data['nextServiceDue'] ?? date('Y-m-d', strtotime('+3 months'));
            $fuelType = $data['fuelType'] ?? 'Petrol';
            $vehicleType = $data['vehicleType'] ?? '';
            $cabTypeId = $data['cabTypeId'] ?? '';
            $capacity = $data['capacity'] ?? 4;
            $luggageCapacity = $data['luggageCapacity'] ?? 2;
            $isActive = $data['isActive'] ?? true;
            $currentOdometer = $data['currentOdometer'] ?? 0;
            
            $isActiveInt = $isActive ? 1 : 0;
            
            $stmt->bind_param(
                "ssssssssssiiiii",
                $data['vehicleNumber'], $name, $model, $make, $year, $status, $lastService, $nextServiceDue,
                $fuelType, $vehicleType, $cabTypeId, $capacity, $luggageCapacity, $isActiveInt, $currentOdometer
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Error adding vehicle: " . $stmt->error);
            }
            
            $vehicleId = $conn->insert_id;
            
            // Get the newly created vehicle
            $getStmt = $conn->prepare("SELECT * FROM fleet_vehicles WHERE id = ?");
            $getStmt->bind_param("i", $vehicleId);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $row = $result->fetch_assoc();
            
            $vehicle = [
                'id' => $row['id'],
                'vehicleNumber' => $row['vehicle_number'],
                'name' => $row['name'],
                'model' => $row['model'],
                'make' => $row['make'],
                'year' => (int)$row['year'],
                'status' => $row['status'],
                'lastService' => $row['last_service_date'],
                'nextServiceDue' => $row['next_service_due'],
                'fuelType' => $row['fuel_type'],
                'vehicleType' => $row['vehicle_type'],
                'cabTypeId' => $row['cab_type_id'],
                'capacity' => (int)$row['capacity'],
                'luggageCapacity' => (int)$row['luggage_capacity'],
                'isActive' => (bool)$row['is_active'],
                'currentOdometer' => (int)$row['current_odometer'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            echo json_encode([
                'vehicle' => $vehicle,
                'success' => true,
                'message' => 'Vehicle added successfully'
            ]);
        }
        else if ($endpoint === 'maintenance') {
            // Add maintenance record
            if (empty($data['vehicleId'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Vehicle ID is required']);
                exit;
            }
            
            $stmt = $conn->prepare("
                INSERT INTO maintenance_records (
                    vehicle_id, service_date, service_type, description, cost, 
                    vendor, odometer, next_service_due, next_service_odometer, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $serviceDate = $data['serviceDate'] ?? date('Y-m-d');
            $serviceType = $data['serviceType'] ?? '';
            $description = $data['description'] ?? '';
            $cost = $data['cost'] ?? 0;
            $vendor = $data['vendor'] ?? '';
            $odometer = $data['odometer'] ?? 0;
            $nextServiceDue = $data['nextServiceDue'] ?? date('Y-m-d', strtotime('+3 months'));
            $nextServiceOdometer = $data['nextServiceOdometer'] ?? 0;
            $notes = $data['notes'] ?? '';
            
            $stmt->bind_param(
                "isssdsisis",
                $data['vehicleId'], $serviceDate, $serviceType, $description, $cost,
                $vendor, $odometer, $nextServiceDue, $nextServiceOdometer, $notes
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Error adding maintenance record: " . $stmt->error);
            }
            
            $recordId = $conn->insert_id;
            
            // Get the newly created record
            $getStmt = $conn->prepare("SELECT * FROM maintenance_records WHERE id = ?");
            $getStmt->bind_param("i", $recordId);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $row = $result->fetch_assoc();
            
            $record = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicle_id'],
                'serviceDate' => $row['service_date'],
                'serviceType' => $row['service_type'],
                'description' => $row['description'],
                'cost' => (float)$row['cost'],
                'vendor' => $row['vendor'],
                'odometer' => (int)$row['odometer'],
                'nextServiceDue' => $row['next_service_due'],
                'nextServiceOdometer' => (int)$row['next_service_odometer'],
                'notes' => $row['notes'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            echo json_encode([
                'record' => $record,
                'success' => true,
                'message' => 'Maintenance record added successfully'
            ]);
        }
        else if ($endpoint === 'fuel') {
            // Add fuel record
            if (empty($data['vehicleId'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Vehicle ID is required']);
                exit;
            }
            
            $stmt = $conn->prepare("
                INSERT INTO fuel_records (
                    vehicle_id, fill_date, quantity, price_per_unit, total_cost, 
                    odometer, fuel_station, payment_method, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $fillDate = $data['fillDate'] ?? date('Y-m-d');
            $quantity = $data['quantity'] ?? 0;
            $pricePerUnit = $data['pricePerUnit'] ?? 0;
            $totalCost = $data['totalCost'] ?? ($quantity * $pricePerUnit);
            $odometer = $data['odometer'] ?? 0;
            $fuelStation = $data['fuelStation'] ?? '';
            $paymentMethod = $data['paymentMethod'] ?? '';
            $notes = $data['notes'] ?? '';
            
            $stmt->bind_param(
                "isdddsss",
                $data['vehicleId'], $fillDate, $quantity, $pricePerUnit, $totalCost,
                $odometer, $fuelStation, $paymentMethod, $notes
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Error adding fuel record: " . $stmt->error);
            }
            
            $recordId = $conn->insert_id;
            
            // Get the newly created record
            $getStmt = $conn->prepare("SELECT * FROM fuel_records WHERE id = ?");
            $getStmt->bind_param("i", $recordId);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $row = $result->fetch_assoc();
            
            $record = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicle_id'],
                'fillDate' => $row['fill_date'],
                'quantity' => (float)$row['quantity'],
                'pricePerUnit' => (float)$row['price_per_unit'],
                'totalCost' => (float)$row['total_cost'],
                'odometer' => (int)$row['odometer'],
                'fuelStation' => $row['fuel_station'],
                'paymentMethod' => $row['payment_method'],
                'notes' => $row['notes'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            echo json_encode([
                'record' => $record,
                'success' => true,
                'message' => 'Fuel record added successfully'
            ]);
        }
        else if ($endpoint === 'assign') {
            // Assign vehicle to booking
            if (empty($data['vehicleId']) || empty($data['bookingId'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Vehicle ID and Booking ID are required']);
                exit;
            }
            
            // Check if assignment already exists
            $checkStmt = $conn->prepare("SELECT id FROM vehicle_assignments WHERE booking_id = ?");
            $checkStmt->bind_param("i", $data['bookingId']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing assignment
                $assignmentId = $checkResult->fetch_assoc()['id'];
                
                $updateStmt = $conn->prepare("
                    UPDATE vehicle_assignments 
                    SET vehicle_id = ?, driver_id = ?, updated_at = NOW() 
                    WHERE id = ?
                ");
                
                $driverId = !empty($data['driverId']) ? $data['driverId'] : null;
                
                $updateStmt->bind_param("iii", $data['vehicleId'], $driverId, $assignmentId);
                
                if (!$updateStmt->execute()) {
                    throw new Exception("Error updating vehicle assignment: " . $updateStmt->error);
                }
                
                // Update booking with vehicle ID
                $bookingUpdateStmt = $conn->prepare("UPDATE bookings SET fleet_vehicle_id = ? WHERE id = ?");
                $bookingUpdateStmt->bind_param("ii", $data['vehicleId'], $data['bookingId']);
                $bookingUpdateStmt->execute();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Vehicle assignment updated successfully',
                    'assignmentId' => $assignmentId
                ]);
            } else {
                // Create new assignment
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_assignments (
                        vehicle_id, booking_id, driver_id, start_date, status
                    ) VALUES (?, ?, ?, NOW(), 'scheduled')
                ");
                
                $driverId = !empty($data['driverId']) ? $data['driverId'] : null;
                
                $insertStmt->bind_param("iii", $data['vehicleId'], $data['bookingId'], $driverId);
                
                if (!$insertStmt->execute()) {
                    throw new Exception("Error creating vehicle assignment: " . $insertStmt->error);
                }
                
                $assignmentId = $conn->insert_id;
                
                // Update booking with vehicle ID
                $bookingUpdateStmt = $conn->prepare("UPDATE bookings SET fleet_vehicle_id = ? WHERE id = ?");
                $bookingUpdateStmt->bind_param("ii", $data['vehicleId'], $data['bookingId']);
                $bookingUpdateStmt->execute();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Vehicle assigned to booking successfully',
                    'assignmentId' => $assignmentId
                ]);
            }
        }
        else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }
    // Handle PUT requests
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        if (preg_match('/vehicles\/(\d+)/', $requestPath, $matches)) {
            // Update vehicle
            $vehicleId = $matches[1];
            $data = getRequestData();
            
            // Check if vehicle exists
            $checkStmt = $conn->prepare("SELECT id FROM fleet_vehicles WHERE id = ?");
            $checkStmt->bind_param("i", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Vehicle not found']);
                exit;
            }
            
            // Build update query dynamically based on provided fields
            $updateFields = [];
            $params = [];
            $types = "";
            
            $fieldMapping = [
                'vehicleNumber' => ['field' => 'vehicle_number', 'type' => 's'],
                'name' => ['field' => 'name', 'type' => 's'],
                'model' => ['field' => 'model', 'type' => 's'],
                'make' => ['field' => 'make', 'type' => 's'],
                'year' => ['field' => 'year', 'type' => 'i'],
                'status' => ['field' => 'status', 'type' => 's'],
                'lastService' => ['field' => 'last_service_date', 'type' => 's'],
                'nextServiceDue' => ['field' => 'next_service_due', 'type' => 's'],
                'fuelType' => ['field' => 'fuel_type', 'type' => 's'],
                'vehicleType' => ['field' => 'vehicle_type', 'type' => 's'],
                'cabTypeId' => ['field' => 'cab_type_id', 'type' => 's'],
                'capacity' => ['field' => 'capacity', 'type' => 'i'],
                'luggageCapacity' => ['field' => 'luggage_capacity', 'type' => 'i'],
                'isActive' => ['field' => 'is_active', 'type' => 'i'],
                'assignedDriverId' => ['field' => 'assigned_driver_id', 'type' => 'i'],
                'currentOdometer' => ['field' => 'current_odometer', 'type' => 'i']
            ];
            
            foreach ($data as $key => $value) {
                if (isset($fieldMapping[$key])) {
                    $mapping = $fieldMapping[$key];
                    $updateFields[] = "{$mapping['field']} = ?";
                    $types .= $mapping['type'];
                    
                    if ($key === 'isActive') {
                        // Convert boolean to int
                        $params[] = $value ? 1 : 0;
                    } else {
                        $params[] = $value;
                    }
                }
            }
            
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No valid fields to update']);
                exit;
            }
            
            $updateFieldsStr = implode(", ", $updateFields);
            $query = "UPDATE fleet_vehicles SET $updateFieldsStr, updated_at = NOW() WHERE id = ?";
            
            $stmt = $conn->prepare($query);
            $types .= "i";
            $params[] = $vehicleId;
            
            $stmt->bind_param($types, ...$params);
            
            if (!$stmt->execute()) {
                throw new Exception("Error updating vehicle: " . $stmt->error);
            }
            
            // Get updated vehicle data
            $getStmt = $conn->prepare("SELECT * FROM fleet_vehicles WHERE id = ?");
            $getStmt->bind_param("i", $vehicleId);
            $getStmt->execute();
            $result = $getStmt->get_result();
            $row = $result->fetch_assoc();
            
            $vehicle = [
                'id' => $row['id'],
                'vehicleNumber' => $row['vehicle_number'],
                'name' => $row['name'],
                'model' => $row['model'],
                'make' => $row['make'],
                'year' => (int)$row['year'],
                'status' => $row['status'],
                'lastService' => $row['last_service_date'],
                'nextServiceDue' => $row['next_service_due'],
                'fuelType' => $row['fuel_type'],
                'vehicleType' => $row['vehicle_type'],
                'cabTypeId' => $row['cab_type_id'],
                'capacity' => (int)$row['capacity'],
                'luggageCapacity' => (int)$row['luggage_capacity'],
                'isActive' => (bool)$row['is_active'],
                'assignedDriverId' => $row['assigned_driver_id'],
                'currentOdometer' => (int)$row['current_odometer'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            echo json_encode([
                'vehicle' => $vehicle,
                'success' => true,
                'message' => 'Vehicle updated successfully'
            ]);
        }
        else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }
    // Handle DELETE requests
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (preg_match('/vehicles\/(\d+)/', $requestPath, $matches)) {
            // Delete vehicle
            $vehicleId = $matches[1];
            
            // Check if vehicle exists
            $checkStmt = $conn->prepare("SELECT id FROM fleet_vehicles WHERE id = ?");
            $checkStmt->bind_param("i", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Vehicle not found']);
                exit;
            }
            
            // Delete related records first
            $tables = ['maintenance_records', 'fuel_records', 'vehicle_documents', 'vehicle_assignments'];
            
            foreach ($tables as $table) {
                $deleteStmt = $conn->prepare("DELETE FROM $table WHERE vehicle_id = ?");
                $deleteStmt->bind_param("i", $vehicleId);
                $deleteStmt->execute();
            }
            
            // Now delete the vehicle
            $deleteVehicleStmt = $conn->prepare("DELETE FROM fleet_vehicles WHERE id = ?");
            $deleteVehicleStmt->bind_param("i", $vehicleId);
            
            if (!$deleteVehicleStmt->execute()) {
                throw new Exception("Error deleting vehicle: " . $deleteVehicleStmt->error);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Vehicle and related records deleted successfully'
            ]);
        }
        else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }
    else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
