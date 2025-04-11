<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

// Log headers for debugging
error_log("Received headers: " . json_encode($headers));

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    error_log("Found authorization header: " . $authHeader);
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    error_log("JWT verification result: " . json_encode($payload));
    if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
        $isAdmin = true;
        error_log("User authenticated as admin");
    } else {
        error_log("User authentication failed or not admin role");
    }
} else {
    error_log("No authorization header found in the request");
}

if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle POST request to update tour fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        error_log("POST request data: " . json_encode($requestData));
        
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        
        // Get all available vehicle IDs from the vehicles table
        $vehiclesStmt = $conn->query("SELECT id, vehicle_id FROM vehicles WHERE is_active = 1");
        $activeVehicles = [];
        while ($vehicle = $vehiclesStmt->fetch_assoc()) {
            $vehicleId = !empty($vehicle['vehicle_id']) ? $vehicle['vehicle_id'] : $vehicle['id'];
            $activeVehicles[] = $vehicleId;
        }
        
        error_log("Active vehicles found: " . json_encode($activeVehicles));
        
        // First, check if the tour exists
        $checkTourStmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $checkTourStmt->bind_param("s", $tourId);
        $checkTourStmt->execute();
        $checkResult = $checkTourStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Tour doesn't exist, create it if we have a tour name
            if (!isset($requestData['tourName'])) {
                sendJsonResponse(['status' => 'error', 'message' => 'Tour not found and no tour name provided for creation'], 404);
                exit;
            }
            
            $tourName = $requestData['tourName'];
            
            // Insert basic tour data
            $insertTourStmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, created_at) VALUES (?, ?, NOW())");
            $insertTourStmt->bind_param("ss", $tourId, $tourName);
            $insertTourStmt->execute();
            
            $tourFareId = $conn->insert_id;
            error_log("Created new tour with ID: $tourFareId");
        }
        
        // Prepare the dynamic SQL for the update
        $updateColumns = [];
        $updateTypes = "";
        $updateValues = [];
        
        // Standard vehicle columns
        $standardColumns = ["sedan", "ertiga", "innova", "tempo", "luxury"];
        
        // Add all standard columns
        foreach ($standardColumns as $column) {
            $updateColumns[] = "$column = ?";
            $updateTypes .= "d";
            $updateValues[] = isset($requestData[$column]) ? floatval($requestData[$column]) : 0;
        }
        
        // Add all active vehicle columns that are not standard
        foreach ($activeVehicles as $vehicleId) {
            if (!in_array($vehicleId, $standardColumns) && isset($requestData[$vehicleId])) {
                // Check if the column exists in the tour_fares table
                $checkColumnStmt = $conn->query("SHOW COLUMNS FROM tour_fares LIKE '$vehicleId'");
                
                if ($checkColumnStmt->num_rows === 0) {
                    // Column doesn't exist, add it
                    error_log("Adding new column for vehicle: $vehicleId");
                    $conn->query("ALTER TABLE tour_fares ADD COLUMN `$vehicleId` DECIMAL(10,2) NOT NULL DEFAULT 0");
                }
                
                $updateColumns[] = "`$vehicleId` = ?";
                $updateTypes .= "d";
                $updateValues[] = floatval($requestData[$vehicleId]);
            }
        }
        
        // Add updated_at to the query
        $updateColumns[] = "updated_at = NOW()";
        
        // Add tourId to values array and update type
        $updateValues[] = $tourId;
        $updateTypes .= "s";
        
        // Build the final SQL query
        $updateSql = "UPDATE tour_fares SET " . implode(", ", $updateColumns) . " WHERE tour_id = ?";
        error_log("Update SQL: $updateSql");
        
        // Prepare and execute the update
        $updateStmt = $conn->prepare($updateSql);
        
        // Dynamically bind parameters
        $updateParams = array_merge([$updateTypes], $updateValues);
        $updateStmt->bind_param(...$updateParams);
        $success = $updateStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update tour fare: " . $conn->error);
        }
        
        if ($updateStmt->affected_rows === 0 && $checkResult->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
            exit;
        }
        
        // Get the updated tour fare
        $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedFare = $result->fetch_assoc();
        
        $fareData = [
            'id' => intval($updatedFare['id']),
            'tourId' => $updatedFare['tour_id'],
            'tourName' => $updatedFare['tour_name'],
        ];
        
        // Add all columns from the result
        foreach ($updatedFare as $key => $value) {
            if (!in_array($key, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'])) {
                $fareData[$key] = floatval($value);
            }
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour fare updated successfully', 'data' => $fareData]);
    }
    // Handle POST request to add a new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        error_log("PUT request data: " . json_encode($requestData));
        
        if (!isset($requestData['tourId']) || !isset($requestData['tourName'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID and name are required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        $tourName = $requestData['tourName'];
        
        // Get all available vehicle IDs from the vehicles table
        $vehiclesStmt = $conn->query("SELECT id, vehicle_id FROM vehicles WHERE is_active = 1");
        $activeVehicles = [];
        while ($vehicle = $vehiclesStmt->fetch_assoc()) {
            $vehicleId = !empty($vehicle['vehicle_id']) ? $vehicle['vehicle_id'] : $vehicle['id'];
            $activeVehicles[] = $vehicleId;
        }
        
        error_log("Active vehicles for new tour: " . json_encode($activeVehicles));
        
        // Check if tour already exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour with this ID already exists'], 409);
            exit;
        }
        
        // Standard vehicle columns
        $standardColumns = ["sedan", "ertiga", "innova", "tempo", "luxury"];
        $columnsList = [];
        $valuesList = [];
        $placeholders = [];
        $types = "ss"; // First two are tourId and tourName
        
        // Add standard columns
        foreach ($standardColumns as $column) {
            $columnsList[] = "`$column`";
            $valuesList[] = isset($requestData[$column]) ? floatval($requestData[$column]) : 0;
            $placeholders[] = "?";
            $types .= "d";
        }
        
        // Add all active vehicle columns that are not standard
        foreach ($activeVehicles as $vehicleId) {
            if (!in_array($vehicleId, $standardColumns) && isset($requestData[$vehicleId])) {
                // Check if the column exists in the tour_fares table
                $checkColumnStmt = $conn->query("SHOW COLUMNS FROM tour_fares LIKE '$vehicleId'");
                
                if ($checkColumnStmt->num_rows === 0) {
                    // Column doesn't exist, add it
                    error_log("Adding new column for vehicle in PUT: $vehicleId");
                    $conn->query("ALTER TABLE tour_fares ADD COLUMN `$vehicleId` DECIMAL(10,2) NOT NULL DEFAULT 0");
                }
                
                $columnsList[] = "`$vehicleId`";
                $valuesList[] = floatval($requestData[$vehicleId]);
                $placeholders[] = "?";
                $types .= "d";
            }
        }
        
        // Build the SQL
        $sql = "INSERT INTO tour_fares (tour_id, tour_name, " . implode(", ", $columnsList) . ") 
                VALUES (?, ?, " . implode(", ", $placeholders) . ")";
        
        error_log("Insert SQL: $sql");
        error_log("Types: $types");
        
        // Prepare the statement
        $stmt = $conn->prepare($sql);
        
        // Create the parameter array
        $params = array_merge([$types, $tourId, $tourName], $valuesList);
        
        // Bind parameters and execute
        $stmt->bind_param(...$params);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to add new tour: " . $conn->error);
        }
        
        $newId = $conn->insert_id;
        
        // Get the newly created tour fare
        $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE id = ?");
        $stmt->bind_param("i", $newId);
        $stmt->execute();
        $result = $stmt->get_result();
        $newFare = $result->fetch_assoc();
        
        $fareData = [
            'id' => intval($newFare['id']),
            'tourId' => $newFare['tour_id'],
            'tourName' => $newFare['tour_name'],
        ];
        
        // Add all columns from the result
        foreach ($newFare as $key => $value) {
            if (!in_array($key, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'])) {
                $fareData[$key] = floatval($value);
            }
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'New tour added successfully', 'data' => $fareData]);
    }
    // Handle DELETE request to delete a tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Get tour ID from query string
        $tourId = isset($_GET['tourId']) ? $_GET['tourId'] : null;
        
        if (!$tourId) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        // Check if tour exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
            exit;
        }
        
        // Delete the tour
        $stmt = $conn->prepare("DELETE FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to delete tour: " . $conn->error);
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour deleted successfully']);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in fares-update endpoint: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
