
<?php
require_once '../../config.php';

// CORS Headers already set in .htaccess

// Check authentication and admin role
$headers = getallheaders();
$isAuthenticated = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['role']) && ($payload['role'] === 'admin' || $payload['role'] === 'user')) {
        $isAuthenticated = true;
    }
}

if (!$isAuthenticated) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Authentication required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle GET request for fetching drivers
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if specific driver ID is requested
        $driverId = isset($_GET['id']) ? $_GET['id'] : null;
        
        if ($driverId) {
            // Fetch specific driver
            $stmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
            $stmt->bind_param("i", $driverId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
                exit;
            }
            
            $driver = $result->fetch_assoc();
            sendJsonResponse(['status' => 'success', 'data' => $driver]);
        } else {
            // Fetch all drivers
            $stmt = $conn->prepare("SELECT * FROM drivers ORDER BY name");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $drivers = [];
            while ($row = $result->fetch_assoc()) {
                // Format the driver data
                $drivers[] = [
                    'id' => intval($row['id']),
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'email' => $row['email'],
                    'vehicleType' => $row['vehicle_type'],
                    'vehicleNumber' => $row['vehicle_number'],
                    'status' => $row['status'],
                    'location' => $row['location'],
                    'rating' => floatval($row['rating']),
                    'rides' => intval($row['rides']),
                    'earnings' => floatval($row['earnings']),
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            
            sendJsonResponse(['status' => 'success', 'data' => $drivers]);
        }
    }
    // Handle POST request for adding a new driver
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Only admin can add drivers
        if (!isset($payload['role']) || $payload['role'] !== 'admin') {
            sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
            exit;
        }
        
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['name']) || !isset($requestData['phone']) || !isset($requestData['vehicleType'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Name, phone, and vehicle type are required'], 400);
            exit;
        }
        
        $name = $requestData['name'];
        $phone = $requestData['phone'];
        $email = isset($requestData['email']) ? $requestData['email'] : '';
        $vehicleType = $requestData['vehicleType'];
        $vehicleNumber = isset($requestData['vehicleNumber']) ? $requestData['vehicleNumber'] : '';
        $status = isset($requestData['status']) ? $requestData['status'] : 'Available';
        $location = isset($requestData['location']) ? $requestData['location'] : '';
        $rating = isset($requestData['rating']) ? floatval($requestData['rating']) : 0;
        
        // Insert new driver
        $stmt = $conn->prepare("
            INSERT INTO drivers 
            (name, phone, email, vehicle_type, vehicle_number, status, location, rating, rides, earnings, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
        ");
        $stmt->bind_param("sssssssd", $name, $phone, $email, $vehicleType, $vehicleNumber, $status, $location, $rating);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to add driver: " . $conn->error);
        }
        
        $newDriverId = $conn->insert_id;
        
        // Get the newly created driver
        $stmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->bind_param("i", $newDriverId);
        $stmt->execute();
        $result = $stmt->get_result();
        $newDriver = $result->fetch_assoc();
        
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Driver added successfully', 
            'data' => $newDriver
        ]);
    }
    // Handle PUT request for updating a driver
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Only admin can update drivers
        if (!isset($payload['role']) || $payload['role'] !== 'admin') {
            sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
            exit;
        }
        
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['id'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Driver ID is required'], 400);
            exit;
        }
        
        $driverId = $requestData['id'];
        
        // Check if driver exists
        $stmt = $conn->prepare("SELECT id FROM drivers WHERE id = ?");
        $stmt->bind_param("i", $driverId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
            exit;
        }
        
        // Build update query dynamically based on provided fields
        $updateFields = [];
        $bindTypes = "";
        $bindValues = [];
        
        if (isset($requestData['name'])) {
            $updateFields[] = "name = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['name'];
        }
        
        if (isset($requestData['phone'])) {
            $updateFields[] = "phone = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['phone'];
        }
        
        if (isset($requestData['email'])) {
            $updateFields[] = "email = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['email'];
        }
        
        if (isset($requestData['vehicleType'])) {
            $updateFields[] = "vehicle_type = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['vehicleType'];
        }
        
        if (isset($requestData['vehicleNumber'])) {
            $updateFields[] = "vehicle_number = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['vehicleNumber'];
        }
        
        if (isset($requestData['status'])) {
            $updateFields[] = "status = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['status'];
        }
        
        if (isset($requestData['location'])) {
            $updateFields[] = "location = ?";
            $bindTypes .= "s";
            $bindValues[] = $requestData['location'];
        }
        
        if (isset($requestData['rating'])) {
            $updateFields[] = "rating = ?";
            $bindTypes .= "d";
            $bindValues[] = floatval($requestData['rating']);
        }
        
        if (isset($requestData['rides'])) {
            $updateFields[] = "rides = ?";
            $bindTypes .= "i";
            $bindValues[] = intval($requestData['rides']);
        }
        
        if (isset($requestData['earnings'])) {
            $updateFields[] = "earnings = ?";
            $bindTypes .= "d";
            $bindValues[] = floatval($requestData['earnings']);
        }
        
        // Add updated_at field
        $updateFields[] = "updated_at = NOW()";
        
        if (empty($updateFields)) {
            sendJsonResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
            exit;
        }
        
        // Create update query
        $query = "UPDATE drivers SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $bindTypes .= "i";
        $bindValues[] = $driverId;
        
        // Execute update
        $stmt = $conn->prepare($query);
        $stmt->bind_param($bindTypes, ...$bindValues);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update driver: " . $conn->error);
        }
        
        // Get the updated driver
        $stmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->bind_param("i", $driverId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedDriver = $result->fetch_assoc();
        
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'Driver updated successfully', 
            'data' => $updatedDriver
        ]);
    }
    // Handle DELETE request for deleting a driver
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Only admin can delete drivers
        if (!isset($payload['role']) || $payload['role'] !== 'admin') {
            sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
            exit;
        }
        
        // Get driver ID from query string
        $driverId = isset($_GET['id']) ? $_GET['id'] : null;
        
        if (!$driverId) {
            sendJsonResponse(['status' => 'error', 'message' => 'Driver ID is required'], 400);
            exit;
        }
        
        // Check if driver exists
        $stmt = $conn->prepare("SELECT id FROM drivers WHERE id = ?");
        $stmt->bind_param("i", $driverId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
            exit;
        }
        
        // Delete the driver
        $stmt = $conn->prepare("DELETE FROM drivers WHERE id = ?");
        $stmt->bind_param("i", $driverId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to delete driver: " . $conn->error);
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Driver deleted successfully']);
    } 
    else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in drivers endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
