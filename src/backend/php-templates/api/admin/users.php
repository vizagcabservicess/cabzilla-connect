<?php
// Use same config and DB connection as auth (social-login, login) - ensures User Management
// sees the same users table that Google OAuth writes to
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/../utils/security.php';
require_once __DIR__ . '/../utils/auth.php';

// Simple logging for debugging
function logDebug($message) {
    $logFile = __DIR__ . '/users_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

// Start logging
logDebug("=== USERS.PHP SCRIPT STARTED ===");

// Security functions (only define if not already from security.php)
if (!function_exists('setSecurityHeaders')) {
    function setSecurityHeaders() {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
    }
}
if (!function_exists('secureLog')) {
    function secureLog($message, $level, $data = []) {
        $logFile = __DIR__ . '/users_debug.log';
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message " . json_encode($data) . "\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }
}
if (!function_exists('checkRateLimit')) {
    function checkRateLimit($key, $limit, $window) {
        return true;
    }
}
if (!function_exists('auditLog')) {
    function auditLog($action, $userId, $data = []) {
        secureLog("Audit: $action", "INFO", ['user_id' => $userId, 'data' => $data]);
    }
}

// CORS Headers - SECURITY: Restrict to trusted domains only
$allowedOrigins = ['https://vizagtaxihub.com', 'https://www.vizagtaxihub.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://vizagtaxihub.com');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Debug-Attempt, Pragma, Cache-Control, Expires');
header('Access-Control-Max-Age: 86400'); // 24 hours
header('Content-Type: application/json');

// Set security headers
setSecurityHeaders();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rate limiting for admin endpoints
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!checkRateLimit("admin_users_$clientIP", 50, 60)) { // 50 requests per minute
    secureLog("Rate limit exceeded for admin users endpoint", "WARNING", ['ip' => $clientIP]);
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please try again later.']);
    exit;
}

// Log the incoming request for debugging
secureLog("Admin users endpoint request", "INFO", ['method' => $_SERVER['REQUEST_METHOD'], 'ip' => $clientIP]);

// Get user ID from JWT token and check if admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

try {
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        secureLog("Token received", "DEBUG", ['token_prefix' => substr($token, 0, 10) . "...", 'ip' => $clientIP]);
        
        // Proper JWT verification with debugging
        logDebug("Starting JWT verification...");
        logDebug("Token length: " . strlen($token));
        logDebug("Token starts with: " . substr($token, 0, 20) . "...");
        
        $payload = verifyJwtToken($token);
        logDebug("JWT verification result: " . ($payload ? "SUCCESS" : "FAILED"));
        
        if ($payload) {
            logDebug("JWT payload: " . json_encode($payload));
            logDebug("User ID in payload: " . ($payload['user_id'] ?? 'NOT SET'));
            logDebug("Role in payload: " . ($payload['role'] ?? 'NOT SET'));
        } else {
            logDebug("JWT verification failed - no payload returned");
            logDebug("Check server error logs for JWT verification details");
        }
        if ($payload && isset($payload['user_id']) && isset($payload['role'])) {
            $userId = $payload['user_id'];
            $isAdmin = in_array($payload['role'], ['admin', 'super_admin']);
            secureLog("User authenticated", "INFO", ['user_id' => $userId, 'is_admin' => $isAdmin, 'role' => $payload['role']]);
        } else {
            secureLog("JWT verification failed", "WARNING", ['ip' => $clientIP]);
        }
    } else {
        secureLog("No Authorization header found", "WARNING", ['ip' => $clientIP]);
    }
} catch (Exception $e) {
    secureLog("JWT verification error", "ERROR", ['error' => $e->getMessage(), 'ip' => $clientIP]);
}

// Check if user is admin
if (!$isAdmin) {
    secureLog("Admin check failed", "WARNING", ['user_id' => $userId, 'ip' => $clientIP]);
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access. Admin privileges required.'], 403);
    exit;
}

// Audit log admin access
auditLog('admin_users_access', $userId, ['action' => $_SERVER['REQUEST_METHOD']]);

// Connect to database (same as social-login - uses shared config)
$conn = null;
try {
    $conn = getDbConnectionWithRetry();
    logDebug("Database connection established successfully");
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    secureLog("Database connection failed", "ERROR", ['error' => $errorMessage]);
    logDebug("Database connection failed: $errorMessage");
    
    // Return mock data as a fallback with error information
    $mockUsers = [
        [
            'id' => 101,
            'name' => 'Rahul Sharma',
            'email' => 'rahul@example.com',
            'phone' => '9876543210',
            'role' => 'user',
            'createdAt' => date('Y-m-d H:i:s', strtotime('-1 month'))
        ],
        [
            'id' => 102,
            'name' => 'Priya Patel',
            'email' => 'priya@example.com',
            'phone' => '8765432109',
            'role' => 'user',
            'createdAt' => date('Y-m-d H:i:s', strtotime('-3 weeks'))
        ]
    ];
    
    sendJsonResponse([
        'status' => 'success', 
        'data' => $mockUsers, 
        'source' => 'mock',
        'message' => 'Database connection failed, using mock data',
        'error' => $errorMessage
    ]);
    exit;
}

try {
    // Handle GET request to fetch all users
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Query to get all users with booking counts (include authProvider: google | email)
        $baseCols = "u.id, u.name, u.email, u.phone, u.role, u.created_at";
        $hasAuthProvider = $conn->query("SHOW COLUMNS FROM users LIKE 'auth_provider'");
        if ($hasAuthProvider && $hasAuthProvider->num_rows > 0) {
            $baseCols .= ", COALESCE(u.auth_provider, 'email') as authProvider";
        }
        $bookingsExist = $conn->query("SHOW TABLES LIKE 'bookings'");
        if ($bookingsExist && $bookingsExist->num_rows > 0) {
            $query = "SELECT $baseCols, COUNT(b.id) as bookings_count FROM users u LEFT JOIN bookings b ON u.id = b.user_id GROUP BY u.id ORDER BY u.created_at DESC";
        } else {
            $query = "SELECT $baseCols, 0 as bookings_count FROM users u ORDER BY u.created_at DESC";
        }
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Failed to fetch users: " . $conn->error);
        }
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $u = [
                'id' => intval($row['id']),
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'role' => $row['role'],
                'createdAt' => $row['created_at'],
                'authProvider' => $row['authProvider'] ?? 'email',
                'bookingsCount' => isset($row['bookings_count']) ? (int)$row['bookings_count'] : 0
            ];
            $users[] = $u;
        }
        
        secureLog("Successfully fetched " . count($users) . " users from database", "INFO");
        sendJsonResponse(['status' => 'success', 'data' => $users]);
    }
    // Handle PUT request to update user role
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Get request body
        $requestBody = file_get_contents('php://input');
        secureLog("Received PUT request body", "DEBUG", ['body' => $requestBody]);
        
        $requestData = json_decode($requestBody, true);
        
        if (!isset($requestData['userId']) || !isset($requestData['role'])) {
            secureLog("Invalid request data - missing userId or role", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'User ID and role are required'], 400);
            exit;
        }
        
        $targetUserId = $requestData['userId'];
        $newRole = $requestData['role'];
        
        // Validate role
        if (!in_array($newRole, ['guest', 'user', 'admin', 'super_admin', 'driver', 'provider', 'customer'])) {
            secureLog("Invalid role: $newRole", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid role. Must be one of: "guest", "user", "admin", "super_admin", "driver", "provider", "customer"'], 400);
            exit;
        }
        
        // Prevent admins from removing their own admin status
        if ($targetUserId == $userId && $newRole !== 'admin') {
            secureLog("Attempt to remove own admin status", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'You cannot remove your own admin status'], 403);
            exit;
        }
        
        // Check if user exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->bind_param("i", $targetUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            secureLog("User not found: $targetUserId", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'User not found'], 404);
            exit;
        }
        
        // Update user role
        $stmt = $conn->prepare("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("si", $newRole, $targetUserId);
        $success = $stmt->execute();
        
        if (!$success) {
            secureLog("Failed to update user role: " . $conn->error, "ERROR");
            throw new Exception("Failed to update user role: " . $conn->error);
        }

        $linkPath = __DIR__ . '/../utils/driver_user_link.php';
        if (is_readable($linkPath)) {
            try {
                require_once $linkPath;
                if (function_exists('syncDriverFleetLinkForUserRole')) {
                    syncDriverFleetLinkForUserRole($conn, (int) $targetUserId, (string) $newRole);
                }
            } catch (Throwable $e) {
                secureLog('Driver fleet sync after role change failed (role still saved)', 'WARNING', [
                    'user_id' => $targetUserId,
                    'error' => $e->getMessage(),
                ]);
            }
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
        
        secureLog("Successfully updated user role for user $targetUserId to $newRole", "INFO");
        sendJsonResponse(['status' => 'success', 'message' => 'User role updated successfully', 'data' => $updatedUser]);
    }
    // Handle POST request to create a new user
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestBody = file_get_contents('php://input');
        secureLog("Received POST request body", "DEBUG", ['body' => $requestBody]);
        $requestData = json_decode($requestBody, true);

        // Validate required fields
        if (!isset($requestData['name']) || !isset($requestData['email']) || !isset($requestData['role'])) {
            secureLog("Missing required fields for user creation", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'Name, email, and role are required'], 400);
            exit;
        }

        $name = $requestData['name'];
        $email = $requestData['email'];
        $phone = isset($requestData['phone']) ? $requestData['phone'] : null;
        $role = $requestData['role'];
        
        // Validate role for new user creation
        if (!in_array($role, ['guest', 'user', 'admin', 'super_admin', 'driver', 'provider', 'customer'])) {
            secureLog("Invalid role for new user: $role", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'Invalid role. Must be one of: "guest", "user", "admin", "super_admin", "driver", "provider", "customer"'], 400);
            exit;
        }

        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (name, email, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->bind_param("ssss", $name, $email, $phone, $role);
        $success = $stmt->execute();

        if (!$success) {
            secureLog("Failed to create user: " . $conn->error, "ERROR");
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to create user: ' . $conn->error], 500);
            exit;
        }

        $newUserId = $stmt->insert_id;
        $stmt = $conn->prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?");
        $stmt->bind_param("i", $newUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        $userData = $result->fetch_assoc();

        $createdUser = [
            'id' => intval($userData['id']),
            'name' => $userData['name'],
            'email' => $userData['email'],
            'phone' => $userData['phone'],
            'role' => $userData['role'],
            'createdAt' => $userData['created_at']
        ];

        if ($role === 'driver') {
            $linkPath = __DIR__ . '/../utils/driver_user_link.php';
            if (is_readable($linkPath)) {
                try {
                    require_once $linkPath;
                    if (function_exists('syncDriverFleetLinkForUserRole')) {
                        syncDriverFleetLinkForUserRole($conn, (int) $newUserId, 'driver');
                    }
                } catch (Throwable $e) {
                    secureLog('Driver fleet sync after user create failed', 'WARNING', [
                        'user_id' => $newUserId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        secureLog("Successfully created user $newUserId", "INFO");
        sendJsonResponse(['status' => 'success', 'message' => 'User created successfully', 'data' => $createdUser], 201);
    }
    // Handle DELETE request to delete a user (hard delete)
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Parse user ID from query string or request body
        $userIdToDelete = null;
        if (isset($_GET['user_id'])) {
            $userIdToDelete = intval($_GET['user_id']);
        } else {
            $requestBody = file_get_contents('php://input');
            $requestData = json_decode($requestBody, true);
            if (isset($requestData['user_id'])) {
                $userIdToDelete = intval($requestData['user_id']);
            }
        }
        if (!$userIdToDelete) {
            secureLog("Missing user_id for deletion", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'User ID is required for deletion'], 400);
            exit;
        }
        // Prevent self-deletion
        if ($userIdToDelete == $userId) {
            secureLog("Attempt to delete own user account", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'You cannot delete your own user account'], 403);
            exit;
        }
        // Delete user
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $userIdToDelete);
        $success = $stmt->execute();
        if (!$success) {
            secureLog("Failed to delete user: " . $stmt->error, "ERROR");
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to delete user: ' . $stmt->error], 500);
            exit;
        }
        if ($stmt->affected_rows === 0) {
            secureLog("Delete user: no row removed (missing id or FK blocked without error)", "WARNING");
            sendJsonResponse([
                'status' => 'error',
                'message' => 'User was not deleted (not found). If they still appear in lists, check database foreign keys / related records.',
            ], 404);
            exit;
        }
        secureLog("Successfully deleted user $userIdToDelete", "INFO");
        sendJsonResponse(['status' => 'success', 'message' => 'User deleted successfully']);
    }
    // Handle PATCH request - Reset user password
    else if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $requestBody = json_decode(file_get_contents('php://input'), true);
        $targetUserId = $requestBody['user_id'] ?? null;
        $newPassword = $requestBody['password'] ?? null;
        
        if (!$targetUserId || !$newPassword) {
            secureLog("Missing user_id or password for reset", "WARNING");
            sendJsonResponse(['status' => 'error', 'message' => 'User ID and new password required'], 400);
            exit;
        }
        
        // Hash the new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $resetQuery = "UPDATE users SET password = ? WHERE id = ?";
        $resetStmt = $conn->prepare($resetQuery);
        $resetStmt->bind_param("si", $hashedPassword, $targetUserId);
        
        if ($resetStmt->execute()) {
            secureLog("Successfully reset password for user $targetUserId", "INFO");
            sendJsonResponse(['status' => 'success', 'message' => 'Password reset successfully', 'new_password' => $newPassword]);
        } else {
            secureLog("Failed to reset password: " . $conn->error, "ERROR");
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to reset password: ' . $conn->error], 500);
        }
    } else {
        secureLog("Method not allowed: " . $_SERVER['REQUEST_METHOD'], "WARNING");
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    secureLog("Error in admin users endpoint: " . $e->getMessage(), "ERROR");
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}

// Helper function to send JSON response with appropriate headers
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
