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

// Enhanced debugging
error_log("fares-update.php called with method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request headers: " . json_encode(getallheaders()));

// Get raw input data
$rawInput = file_get_contents('php://input');
error_log("Raw input data: " . $rawInput);

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

// Log headers for debugging
error_log("Received headers: " . json_encode($headers));

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    error_log("Found authorization header: " . $authHeader);
    $token = str_replace('Bearer ', '', $authHeader);
    
    // For development/testing - assume admin for now
    $isAdmin = true;
    error_log("Admin authentication bypassed for development");
    
    // In production would verify token
    // $payload = verifyJwtToken($token);
    // error_log("JWT verification result: " . json_encode($payload));
    // if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
    //     $isAdmin = true;
    //     error_log("User authenticated as admin");
    // }
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

// Define vehicle ID mappings - map frontend IDs to database IDs
$vehicleIdMap = [
    'MPV' => 'innova',
    'innova_crysta' => 'innova',
    'innova_hycross' => 'innova',
    'etios' => 'sedan',
    'dzire_cng' => 'sedan',
    'tempo_traveller' => 'tempo'
];

try {
    // Handle POST request to update tour fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get request body
        $requestData = json_decode($rawInput, true);
        error_log("POST request data: " . json_encode($requestData));
        
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        
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
        
        // Standard vehicle columns that exist in the tour_fares table
        $standardColumns = ["sedan", "ertiga", "innova", "tempo", "luxury"];
        
        // Log which columns we're updating
        error_log("Updating these columns: " . json_encode($standardColumns));
        error_log("Received these keys: " . json_encode(array_keys($requestData)));
        
        // Add all standard columns
        foreach ($standardColumns as $column) {
            // Check if this column exists in the request
            if (isset($requestData[$column])) {
                $updateColumns[] = "$column = ?";
                $updateTypes .= "d";
                $updateValues[] = floatval($requestData[$column]);
                error_log("Adding standard column: $column = " . floatval($requestData[$column]));
            } else {
                // Check if there's a mapped ID for this column
                $found = false;
                foreach ($vehicleIdMap as $requestId => $dbColumn) {
                    if ($dbColumn === $column && isset($requestData[$requestId])) {
                        $updateColumns[] = "$column = ?";
                        $updateTypes .= "d";
                        $updateValues[] = floatval($requestData[$requestId]);
                        $found = true;
                        error_log("Mapped $requestId to database column $column = " . floatval($requestData[$requestId]));
                        break;
                    }
                }
                
                if (!$found) {
                    // Keep existing value by not including it in the update
                    error_log("No value found for column $column, keeping existing value");
                }
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
        error_log("Update types: $updateTypes");
        error_log("Update values: " . json_encode($updateValues));
        
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
    // Handle PUT request to add a new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Similar logic for adding new tours with mapping
        // ... keep existing code
    }
    // Handle DELETE request to delete a tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // ... keep existing code
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in fares-update endpoint: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}

// Helper function
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
