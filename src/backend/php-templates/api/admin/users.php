
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get user ID from JWT token and check if admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

// Check if user is admin
if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle GET request to fetch all users
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Query to get all users
        $query = "SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC";
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Failed to fetch users: " . $conn->error);
        }
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => intval($row['id']),
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'role' => $row['role'],
                'createdAt' => $row['created_at']
            ];
        }
        
        sendJsonResponse(['status' => 'success', 'data' => $users]);
    }
    // Handle PUT request to update user role
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Get request body
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($requestData['userId']) || !isset($requestData['role'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'User ID and role are required'], 400);
            exit;
        }
        
        $targetUserId = $requestData['userId'];
        $newRole = $requestData['role'];
        
        // Validate role
        if (!in_array($newRole, ['user', 'admin'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid role. Must be either "user" or "admin"'], 400);
            exit;
        }
        
        // Prevent admins from removing their own admin status
        if ($targetUserId == $userId && $newRole !== 'admin') {
            sendJsonResponse(['status' => 'error', 'message' => 'You cannot remove your own admin status'], 403);
            exit;
        }
        
        // Check if user exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->bind_param("i", $targetUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'User not found'], 404);
            exit;
        }
        
        // Update user role
        $stmt = $conn->prepare("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("si", $newRole, $targetUserId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update user role: " . $conn->error);
        }
        
        // Get updated user info
        $stmt = $conn->prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?");
        $stmt->bind_param("i", $targetUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        $userData = $result->fetch_assoc();
        
        $updatedUser = [
            'id' => intval($userData['id']),
            'name' => $userData['name'],
            'email' => $userData['email'],
            'phone' => $userData['phone'],
            'role' => $userData['role'],
            'createdAt' => $userData['created_at']
        ];
        
        sendJsonResponse(['status' => 'success', 'message' => 'User role updated successfully', 'data' => $updatedUser]);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in admin users endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
