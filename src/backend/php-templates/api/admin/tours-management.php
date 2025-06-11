
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
    // Handle GET request - Get all tours
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
        $stmt->execute();
        $result = $stmt->get_result();

        $tours = [];
        while ($row = $result->fetch_assoc()) {
            $tour = [
                'id' => intval($row['id']),
                'tourId' => $row['tour_id'],
                'tourName' => $row['tour_name'],
                'sedan' => floatval($row['sedan']),
                'ertiga' => floatval($row['ertiga']),
                'innova' => floatval($row['innova']),
                'tempo' => floatval($row['tempo']),
                'luxury' => floatval($row['luxury']),
                'distance' => intval($row['distance']),
                'days' => intval($row['days']),
                'description' => $row['description'],
                'imageUrl' => $row['image_url'],
                'isActive' => boolval($row['is_active']),
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            $tours[] = $tour;
        }

        sendJsonResponse(['status' => 'success', 'data' => $tours]);
    }
    // Handle POST request - Add new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['tourId']) || !isset($requestData['tourName'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID and name are required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        $tourName = $requestData['tourName'];
        $sedan = isset($requestData['sedan']) ? floatval($requestData['sedan']) : 0;
        $ertiga = isset($requestData['ertiga']) ? floatval($requestData['ertiga']) : 0;
        $innova = isset($requestData['innova']) ? floatval($requestData['innova']) : 0;
        $tempo = isset($requestData['tempo']) ? floatval($requestData['tempo']) : 0;
        $luxury = isset($requestData['luxury']) ? floatval($requestData['luxury']) : 0;
        $distance = isset($requestData['distance']) ? intval($requestData['distance']) : 0;
        $days = isset($requestData['days']) ? intval($requestData['days']) : 1;
        $description = isset($requestData['description']) ? $requestData['description'] : '';
        $imageUrl = isset($requestData['imageUrl']) ? $requestData['imageUrl'] : '';
        
        // Check if tour already exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour with this ID already exists'], 409);
            exit;
        }
        
        // Insert new tour
        $stmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, sedan, ertiga, innova, tempo, luxury, distance, days, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdddddiiqs", $tourId, $tourName, $sedan, $ertiga, $innova, $tempo, $luxury, $distance, $days, $description, $imageUrl);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to add new tour: " . $conn->error);
        }
        
        $newId = $conn->insert_id;
        
        // Get the newly created tour
        $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE id = ?");
        $stmt->bind_param("i", $newId);
        $stmt->execute();
        $result = $stmt->get_result();
        $newTour = $result->fetch_assoc();
        
        $tourData = [
            'id' => intval($newTour['id']),
            'tourId' => $newTour['tour_id'],
            'tourName' => $newTour['tour_name'],
            'sedan' => floatval($newTour['sedan']),
            'ertiga' => floatval($newTour['ertiga']),
            'innova' => floatval($newTour['innova']),
            'tempo' => floatval($newTour['tempo']),
            'luxury' => floatval($newTour['luxury']),
            'distance' => intval($newTour['distance']),
            'days' => intval($newTour['days']),
            'description' => $newTour['description'],
            'imageUrl' => $newTour['image_url'],
            'isActive' => boolval($newTour['is_active'])
        ];
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour added successfully', 'data' => $tourData]);
    }
    // Handle PUT request - Update existing tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        $tourName = isset($requestData['tourName']) ? $requestData['tourName'] : null;
        $sedan = isset($requestData['sedan']) ? floatval($requestData['sedan']) : null;
        $ertiga = isset($requestData['ertiga']) ? floatval($requestData['ertiga']) : null;
        $innova = isset($requestData['innova']) ? floatval($requestData['innova']) : null;
        $tempo = isset($requestData['tempo']) ? floatval($requestData['tempo']) : null;
        $luxury = isset($requestData['luxury']) ? floatval($requestData['luxury']) : null;
        $distance = isset($requestData['distance']) ? intval($requestData['distance']) : null;
        $days = isset($requestData['days']) ? intval($requestData['days']) : null;
        $description = isset($requestData['description']) ? $requestData['description'] : null;
        $imageUrl = isset($requestData['imageUrl']) ? $requestData['imageUrl'] : null;
        $isActive = isset($requestData['isActive']) ? ($requestData['isActive'] ? 1 : 0) : null;
        
        // Build dynamic update query
        $updateFields = [];
        $types = "";
        $values = [];
        
        if ($tourName !== null) { $updateFields[] = "tour_name = ?"; $types .= "s"; $values[] = $tourName; }
        if ($sedan !== null) { $updateFields[] = "sedan = ?"; $types .= "d"; $values[] = $sedan; }
        if ($ertiga !== null) { $updateFields[] = "ertiga = ?"; $types .= "d"; $values[] = $ertiga; }
        if ($innova !== null) { $updateFields[] = "innova = ?"; $types .= "d"; $values[] = $innova; }
        if ($tempo !== null) { $updateFields[] = "tempo = ?"; $types .= "d"; $values[] = $tempo; }
        if ($luxury !== null) { $updateFields[] = "luxury = ?"; $types .= "d"; $values[] = $luxury; }
        if ($distance !== null) { $updateFields[] = "distance = ?"; $types .= "i"; $values[] = $distance; }
        if ($days !== null) { $updateFields[] = "days = ?"; $types .= "i"; $values[] = $days; }
        if ($description !== null) { $updateFields[] = "description = ?"; $types .= "s"; $values[] = $description; }
        if ($imageUrl !== null) { $updateFields[] = "image_url = ?"; $types .= "s"; $values[] = $imageUrl; }
        if ($isActive !== null) { $updateFields[] = "is_active = ?"; $types .= "i"; $values[] = $isActive; }
        
        if (empty($updateFields)) {
            sendJsonResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
            exit;
        }
        
        $updateFields[] = "updated_at = NOW()";
        $types .= "s";
        $values[] = $tourId;
        
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
        
        // Get the updated tour
        $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedTour = $result->fetch_assoc();
        
        $tourData = [
            'id' => intval($updatedTour['id']),
            'tourId' => $updatedTour['tour_id'],
            'tourName' => $updatedTour['tour_name'],
            'sedan' => floatval($updatedTour['sedan']),
            'ertiga' => floatval($updatedTour['ertiga']),
            'innova' => floatval($updatedTour['innova']),
            'tempo' => floatval($updatedTour['tempo']),
            'luxury' => floatval($updatedTour['luxury']),
            'distance' => intval($updatedTour['distance']),
            'days' => intval($updatedTour['days']),
            'description' => $updatedTour['description'],
            'imageUrl' => $updatedTour['image_url'],
            'isActive' => boolval($updatedTour['is_active'])
        ];
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour updated successfully', 'data' => $tourData]);
    }
    // Handle DELETE request - Delete tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
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
    logError("Error in tours-management endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
?>
