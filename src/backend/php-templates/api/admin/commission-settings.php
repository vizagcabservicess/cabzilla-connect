
<?php
// Set proper headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once __DIR__ . '/../../config.php';

// Function to log errors
function logCommissionError($message, $data = []) {
    error_log("COMMISSION ERROR: $message " . json_encode($data));
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    // Connect to the database
    $conn = getDbConnection();

    // Get request method
    $method = $_SERVER['REQUEST_METHOD'];
    
    // GET - Fetch commission settings
    if ($method === 'GET') {
        // Check if we're getting a specific setting or all settings
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM fleet_commission_settings WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Commission setting not found'], 404);
            }
            
            $setting = $result->fetch_assoc();
            sendResponse(['status' => 'success', 'data' => $setting]);
        } 
        else {
            // Get all commission settings
            $result = $conn->query("SELECT * FROM fleet_commission_settings ORDER BY created_at DESC");
            $settings = [];
            
            while ($row = $result->fetch_assoc()) {
                $settings[] = $row;
            }
            
            sendResponse(['status' => 'success', 'data' => $settings]);
        }
    }
    
    // POST - Create a new commission setting
    else if ($method === 'POST') {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['name']) || !isset($data['default_percentage'])) {
            sendResponse(['status' => 'error', 'message' => 'Missing required fields'], 400);
        }
        
        $name = $data['name'];
        $description = $data['description'] ?? '';
        $defaultPercentage = floatval($data['default_percentage']);
        $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : true;
        
        // Validate percentage (between 0 and 100)
        if ($defaultPercentage < 0 || $defaultPercentage > 100) {
            sendResponse(['status' => 'error', 'message' => 'Percentage must be between 0 and 100'], 400);
        }
        
        // Insert new commission setting
        $stmt = $conn->prepare("INSERT INTO fleet_commission_settings (name, description, default_percentage, is_active) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssdi", $name, $description, $defaultPercentage, $isActive);
        
        if ($stmt->execute()) {
            $id = $conn->insert_id;
            
            // Fetch the created setting
            $result = $conn->query("SELECT * FROM fleet_commission_settings WHERE id = $id");
            $setting = $result->fetch_assoc();
            
            sendResponse(['status' => 'success', 'message' => 'Commission setting created successfully', 'data' => $setting]);
        } else {
            logCommissionError("Error creating commission setting", ['error' => $conn->error]);
            sendResponse(['status' => 'error', 'message' => 'Failed to create commission setting'], 500);
        }
    }
    
    // PUT - Update an existing commission setting
    else if ($method === 'PUT') {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            sendResponse(['status' => 'error', 'message' => 'Commission setting ID is required'], 400);
        }
        
        $id = intval($data['id']);
        
        // Check if setting exists
        $checkStmt = $conn->prepare("SELECT id FROM fleet_commission_settings WHERE id = ?");
        $checkStmt->bind_param("i", $id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            sendResponse(['status' => 'error', 'message' => 'Commission setting not found'], 404);
        }
        
        // Prepare update fields
        $updateFields = [];
        $queryParams = [];
        $bindTypes = "";
        
        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $queryParams[] = $data['name'];
            $bindTypes .= "s";
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $queryParams[] = $data['description'];
            $bindTypes .= "s";
        }
        
        if (isset($data['default_percentage'])) {
            $defaultPercentage = floatval($data['default_percentage']);
            
            // Validate percentage (between 0 and 100)
            if ($defaultPercentage < 0 || $defaultPercentage > 100) {
                sendResponse(['status' => 'error', 'message' => 'Percentage must be between 0 and 100'], 400);
            }
            
            $updateFields[] = "default_percentage = ?";
            $queryParams[] = $defaultPercentage;
            $bindTypes .= "d";
        }
        
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            $queryParams[] = (bool)$data['is_active'];
            $bindTypes .= "i";
        }
        
        if (empty($updateFields)) {
            sendResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
        }
        
        // Add ID as the last parameter
        $queryParams[] = $id;
        $bindTypes .= "i";
        
        // Update commission setting
        $updateQuery = "UPDATE fleet_commission_settings SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        
        // Dynamically bind parameters
        $updateStmt->bind_param($bindTypes, ...$queryParams);
        
        if ($updateStmt->execute()) {
            // Fetch the updated setting
            $result = $conn->query("SELECT * FROM fleet_commission_settings WHERE id = $id");
            $setting = $result->fetch_assoc();
            
            sendResponse(['status' => 'success', 'message' => 'Commission setting updated successfully', 'data' => $setting]);
        } else {
            logCommissionError("Error updating commission setting", ['error' => $conn->error]);
            sendResponse(['status' => 'error', 'message' => 'Failed to update commission setting'], 500);
        }
    }
    
    // DELETE - Delete a commission setting
    else if ($method === 'DELETE') {
        // Get ID from URL
        if (!isset($_GET['id'])) {
            sendResponse(['status' => 'error', 'message' => 'Commission setting ID is required'], 400);
        }
        
        $id = intval($_GET['id']);
        
        // Check if setting exists
        $checkStmt = $conn->prepare("SELECT id FROM fleet_commission_settings WHERE id = ?");
        $checkStmt->bind_param("i", $id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            sendResponse(['status' => 'error', 'message' => 'Commission setting not found'], 404);
        }
        
        // Delete commission setting
        $deleteStmt = $conn->prepare("DELETE FROM fleet_commission_settings WHERE id = ?");
        $deleteStmt->bind_param("i", $id);
        
        if ($deleteStmt->execute()) {
            sendResponse(['status' => 'success', 'message' => 'Commission setting deleted successfully']);
        } else {
            logCommissionError("Error deleting commission setting", ['error' => $conn->error]);
            sendResponse(['status' => 'error', 'message' => 'Failed to delete commission setting'], 500);
        }
    }
    
    // Unsupported method
    else {
        sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logCommissionError("Commission settings API error", ['error' => $e->getMessage()]);
    sendResponse(['status' => 'error', 'message' => 'An error occurred: ' . $e->getMessage()], 500);
}

// Close database connection
if (isset($conn)) {
    $conn->close();
}
