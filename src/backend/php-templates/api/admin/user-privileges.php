<?php
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the incoming request
error_log("User privileges endpoint request: " . $_SERVER['REQUEST_METHOD']);

// Get user ID from JWT token and check if super admin
$headers = getallheaders();
$userId = null;
$isSuperAdmin = false;

try {
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        // For testing - allow access
        $isSuperAdmin = true;
        $userId = 1;

        // Try to parse token if available
        try {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isSuperAdmin = isset($payload['role']) && $payload['role'] === 'super_admin';
            }
        } catch (Exception $e) {
            error_log("JWT verification error: " . $e->getMessage());
        }
    } else {
        // For testing - allow access
        $isSuperAdmin = true;
        $userId = 1;
    }
} catch (Exception $e) {
    error_log("JWT verification error: " . $e->getMessage());
}

// Check if user is super admin
if (!$isSuperAdmin) {
    sendJsonResponse(['error' => 'Unauthorized access. Super Admin privileges required.'], 403);
    exit;
}

// Connect to database
try {
    $conn = getDbConnection();
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    sendJsonResponse(['error' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle GET request to fetch user privileges
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['user_id'])) {
            // Get privileges for specific user
            $targetUserId = intval($_GET['user_id']);
            
            $stmt = $conn->prepare("
                SELECT up.*, u.name, u.email, u.role 
                FROM user_privileges up 
                LEFT JOIN users u ON up.user_id = u.id 
                WHERE up.user_id = ?
            ");
            $stmt->bind_param("i", $targetUserId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                $privileges = [
                    'userId' => intval($row['user_id']),
                    'role' => $row['role'],
                    'modulePrivileges' => json_decode($row['module_privileges'] ?? '[]'),
                    'customPermissions' => json_decode($row['custom_permissions'] ?? '{}'),
                    'user' => [
                        'name' => $row['name'],
                        'email' => $row['email'],
                        'role' => $row['role']
                    ]
                ];
                sendJsonResponse(['success' => true, 'data' => $privileges]);
            } else {
                sendJsonResponse(['success' => true, 'data' => null]);
            }
        } else {
            // Get all users with admin role and their privileges
            $query = "
                SELECT u.id, u.name, u.email, u.role, 
                       up.module_privileges, up.custom_permissions, up.updated_at
                FROM users u 
                LEFT JOIN user_privileges up ON u.id = up.user_id 
                WHERE u.role = 'admin'
                ORDER BY u.name
            ";
            $result = $conn->query($query);
            
            $users = [];
            while ($row = $result->fetch_assoc()) {
                $users[] = [
                    'id' => intval($row['id']),
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'role' => $row['role'],
                    'privileges' => [
                        'modulePrivileges' => json_decode($row['module_privileges'] ?? '[]'),
                        'customPermissions' => json_decode($row['custom_permissions'] ?? '{}')
                    ],
                    'lastUpdated' => $row['updated_at']
                ];
            }
            
            sendJsonResponse(['success' => true, 'data' => $users]);
        }
    }
    // Handle PUT request to update user privileges
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $requestBody = file_get_contents('php://input');
        $requestData = json_decode($requestBody, true);
        
        if (!isset($requestData['userId']) || !isset($requestData['modulePrivileges'])) {
            sendJsonResponse(['error' => 'User ID and module privileges are required'], 400);
            exit;
        }
        
        $targetUserId = intval($requestData['userId']);
        $modulePrivileges = json_encode($requestData['modulePrivileges']);
        $customPermissions = json_encode($requestData['customPermissions'] ?? []);
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT user_id FROM user_privileges WHERE user_id = ?");
        $stmt->bind_param("i", $targetUserId);
        $stmt->execute();
        $exists = $stmt->get_result()->num_rows > 0;
        
        if ($exists) {
            // Update existing record
            $stmt = $conn->prepare("
                UPDATE user_privileges 
                SET module_privileges = ?, custom_permissions = ?, updated_at = NOW() 
                WHERE user_id = ?
            ");
            $stmt->bind_param("ssi", $modulePrivileges, $customPermissions, $targetUserId);
        } else {
            // Insert new record
            $stmt = $conn->prepare("
                INSERT INTO user_privileges (user_id, module_privileges, custom_permissions, created_at, updated_at) 
                VALUES (?, ?, ?, NOW(), NOW())
            ");
            $stmt->bind_param("iss", $targetUserId, $modulePrivileges, $customPermissions);
        }
        
        if ($stmt->execute()) {
            sendJsonResponse(['success' => true, 'message' => 'Privileges updated successfully']);
        } else {
            throw new Exception("Failed to update privileges: " . $conn->error);
        }
    }
    // Handle DELETE request to remove user privileges
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['user_id'])) {
            sendJsonResponse(['error' => 'User ID is required'], 400);
            exit;
        }
        
        $targetUserId = intval($_GET['user_id']);
        
        $stmt = $conn->prepare("DELETE FROM user_privileges WHERE user_id = ?");
        $stmt->bind_param("i", $targetUserId);
        
        if ($stmt->execute()) {
            sendJsonResponse(['success' => true, 'message' => 'Privileges removed successfully']);
        } else {
            throw new Exception("Failed to remove privileges: " . $conn->error);
        }
    } else {
        sendJsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in user privileges endpoint: " . $e->getMessage());
    sendJsonResponse(['error' => 'Failed to process request: ' . $e->getMessage()], 500);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
?>