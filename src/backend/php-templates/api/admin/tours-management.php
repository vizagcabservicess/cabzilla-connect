
<?php
require_once '../../config.php';

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

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
        $isAdmin = true;
    }
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
    // Handle GET request - Get all tours or vehicles
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : 'tours';
        
        if ($action === 'vehicles') {
            // Fetch all active vehicles for tour pricing
            $stmt = $conn->prepare("SELECT vehicle_id, name FROM vehicles WHERE is_active = 1 ORDER BY name");
            $stmt->execute();
            $result = $stmt->get_result();

            $vehicles = [];
            while ($row = $result->fetch_assoc()) {
                $vehicles[] = [
                    'id' => $row['vehicle_id'],
                    'name' => $row['name']
                ];
            }

            sendJsonResponse(['status' => 'success', 'data' => $vehicles]);
        } else {
            // Fetch all tours
            $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
            $stmt->execute();
            $result = $stmt->get_result();

            $tours = [];
            while ($row = $result->fetch_assoc()) {
                $tour = [
                    'id' => intval($row['id']),
                    'tourId' => $row['tour_id'],
                    'tourName' => $row['tour_name'],
                    'distance' => intval($row['distance']),
                    'days' => intval($row['days']),
                    'description' => $row['description'],
                    'imageUrl' => $row['image_url'],
                    'isActive' => boolval($row['is_active']),
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at'],
                    'pricing' => []
                ];
                
                // Get dynamic vehicle pricing
                $vehicleStmt = $conn->prepare("SELECT vehicle_id, name FROM vehicles WHERE is_active = 1 ORDER BY name");
                $vehicleStmt->execute();
                $vehicleResult = $vehicleStmt->get_result();
                
                while ($vehicle = $vehicleResult->fetch_assoc()) {
                    $vehicleId = $vehicle['vehicle_id'];
                    $columnName = $vehicleId; // Use vehicle_id as column name
                    
                    // Check if column exists in tour_fares table
                    $columnStmt = $conn->prepare("SHOW COLUMNS FROM tour_fares LIKE ?");
                    $columnStmt->bind_param("s", $columnName);
                    $columnStmt->execute();
                    $columnExists = $columnStmt->get_result()->num_rows > 0;
                    
                    if ($columnExists) {
                        $tour['pricing'][$vehicleId] = floatval($row[$columnName] ?? 0);
                    } else {
                        $tour['pricing'][$vehicleId] = 0;
                    }
                }
                
                $tours[] = $tour;
            }

            sendJsonResponse(['status' => 'success', 'data' => $tours]);
        }
    }
    // Handle POST request - Add new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['tourId']) || !isset($requestData['tourName'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID and name are required'], 400);
            exit;
        }
        
        // Check if tour already exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $requestData['tourId']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour with this ID already exists'], 409);
            exit;
        }
        
        // Build dynamic insert query based on available vehicles
        $vehicleStmt = $conn->prepare("SELECT vehicle_id FROM vehicles WHERE is_active = 1");
        $vehicleStmt->execute();
        $vehicleResult = $vehicleStmt->get_result();
        
        $columns = ['tour_id', 'tour_name', 'distance', 'days', 'description', 'image_url'];
        $values = [$requestData['tourId'], $requestData['tourName'], 
                  intval($requestData['distance'] ?? 0), intval($requestData['days'] ?? 1),
                  $requestData['description'] ?? '', $requestData['imageUrl'] ?? ''];
        $placeholders = ['?', '?', '?', '?', '?', '?'];
        $types = 'ssisss';
        
        while ($vehicle = $vehicleResult->fetch_assoc()) {
            $vehicleId = $vehicle['vehicle_id'];
            // Check if column exists
            $columnStmt = $conn->prepare("SHOW COLUMNS FROM tour_fares LIKE ?");
            $columnStmt->bind_param("s", $vehicleId);
            $columnStmt->execute();
            $columnExists = $columnStmt->get_result()->num_rows > 0;
            
            if ($columnExists) {
                $columns[] = $vehicleId;
                $values[] = floatval($requestData['pricing'][$vehicleId] ?? 0);
                $placeholders[] = '?';
                $types .= 'd';
            }
        }
        
        $sql = "INSERT INTO tour_fares (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $placeholders) . ")";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to add new tour: " . $conn->error);
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour added successfully']);
    }
    // Handle PUT request - Update existing tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        // Build dynamic update query
        $updateFields = [];
        $types = "";
        $values = [];
        
        if (isset($requestData['tourName'])) { 
            $updateFields[] = "tour_name = ?"; 
            $types .= "s"; 
            $values[] = $requestData['tourName']; 
        }
        if (isset($requestData['distance'])) { 
            $updateFields[] = "distance = ?"; 
            $types .= "i"; 
            $values[] = intval($requestData['distance']); 
        }
        if (isset($requestData['days'])) { 
            $updateFields[] = "days = ?"; 
            $types .= "i"; 
            $values[] = intval($requestData['days']); 
        }
        if (isset($requestData['description'])) { 
            $updateFields[] = "description = ?"; 
            $types .= "s"; 
            $values[] = $requestData['description']; 
        }
        if (isset($requestData['imageUrl'])) { 
            $updateFields[] = "image_url = ?"; 
            $types .= "s"; 
            $values[] = $requestData['imageUrl']; 
        }
        if (isset($requestData['isActive'])) { 
            $updateFields[] = "is_active = ?"; 
            $types .= "i"; 
            $values[] = $requestData['isActive'] ? 1 : 0; 
        }
        
        // Handle dynamic vehicle pricing updates
        if (isset($requestData['pricing'])) {
            foreach ($requestData['pricing'] as $vehicleId => $price) {
                // Check if column exists
                $columnStmt = $conn->prepare("SHOW COLUMNS FROM tour_fares LIKE ?");
                $columnStmt->bind_param("s", $vehicleId);
                $columnStmt->execute();
                $columnExists = $columnStmt->get_result()->num_rows > 0;
                
                if ($columnExists) {
                    $updateFields[] = "$vehicleId = ?";
                    $types .= "d";
                    $values[] = floatval($price);
                }
            }
        }
        
        if (empty($updateFields)) {
            sendJsonResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
            exit;
        }
        
        $updateFields[] = "updated_at = NOW()";
        $types .= "s";
        $values[] = $requestData['tourId'];
        
        $sql = "UPDATE tour_fares SET " . implode(", ", $updateFields) . " WHERE tour_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update tour: " . $conn->error);
        }
        
        if ($stmt->affected_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
            exit;
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour updated successfully']);
    }
    // Handle DELETE request - Delete tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $tourId = isset($_GET['tourId']) ? $_GET['tourId'] : null;
        
        if (!$tourId) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
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
    logError("Error in tours-management endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
?>
