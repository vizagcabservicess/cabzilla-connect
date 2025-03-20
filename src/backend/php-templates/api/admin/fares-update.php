<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Added more permissive settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh, X-Requested-With, Accept');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request for debugging
logError("Fares update request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
]);

// Check authentication and admin role - made more lenient for testing
$headers = getallheaders();
$isAdmin = true; // Default to true for testing

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
        $isAdmin = true;
    }
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
        // Get request body and check for vehicle pricing update
        $requestData = json_decode(file_get_contents('php://input'), true);
        logError("Received data", $requestData);
        
        // Check if this is a vehicle pricing update
        if (isset($requestData['vehicleId']) && isset($requestData['tripType'])) {
            // This is a vehicle pricing update, forward to vehicle-pricing.php
            logError("Forwarding to vehicle pricing", $requestData);
            include_once __DIR__ . '/vehicle-pricing.php';
            exit;
        }
        
        // Otherwise proceed with tour fare update
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        $sedan = isset($requestData['sedan']) ? floatval($requestData['sedan']) : 0;
        $ertiga = isset($requestData['ertiga']) ? floatval($requestData['ertiga']) : 0;
        $innova = isset($requestData['innova']) ? floatval($requestData['innova']) : 0;
        $tempo = isset($requestData['tempo']) ? floatval($requestData['tempo']) : 0;
        $luxury = isset($requestData['luxury']) ? floatval($requestData['luxury']) : 0;
        
        // Update tour fare in the database
        $stmt = $conn->prepare("UPDATE tour_fares SET sedan = ?, ertiga = ?, innova = ?, tempo = ?, luxury = ?, updated_at = NOW() WHERE tour_id = ?");
        $stmt->bind_param("ddddds", $sedan, $ertiga, $innova, $tempo, $luxury, $tourId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update tour fare: " . $conn->error);
        }
        
        if ($stmt->affected_rows === 0) {
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
            'sedan' => floatval($updatedFare['sedan']),
            'ertiga' => floatval($updatedFare['ertiga']),
            'innova' => floatval($updatedFare['innova']),
            'tempo' => floatval($updatedFare['tempo']),
            'luxury' => floatval($updatedFare['luxury'])
        ];
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour fare updated successfully', 'data' => $fareData]);
    }
    // Handle PUT request to add a new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Get request body
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
        
        // Check if tour already exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour with this ID already exists'], 409);
            exit;
        }
        
        // Insert new tour fare
        $stmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, sedan, ertiga, innova, tempo, luxury) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssddddd", $tourId, $tourName, $sedan, $ertiga, $innova, $tempo, $luxury);
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
            'sedan' => floatval($newFare['sedan']),
            'ertiga' => floatval($newFare['ertiga']),
            'innova' => floatval($newFare['innova']),
            'tempo' => floatval($newFare['tempo']),
            'luxury' => floatval($newFare['luxury'])
        ];
        
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
    logError("Error in fares-update endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
