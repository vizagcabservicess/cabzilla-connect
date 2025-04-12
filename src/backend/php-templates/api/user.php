
<?php
// Include configuration and CORS fix
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/fix-cors.php';

// Set content type
header('Content-Type: application/json');

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Log request for debugging
error_log("User API request received - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);
error_log("Headers: " . json_encode(getallheaders()));

// Handle authentication
$headers = getallheaders();
$userId = null;
$isAdmin = false;
$token = '';

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    error_log("Found auth token: " . substr($token, 0, 10) . "...");
    
    try {
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                error_log("User authenticated: $userId, isAdmin: " . ($isAdmin ? 'yes' : 'no'));
            } else {
                error_log("Token payload missing user_id: " . json_encode($payload));
            }
        } else {
            error_log("verifyJwtToken function not available");
        }
    } catch (Exception $e) {
        error_log("JWT verification failed: " . $e->getMessage());
    }
}

// Handle demo token specially
if ($token && strpos($token, 'demo_token_') === 0) {
    error_log("Demo token detected, returning demo user data");
    
    $demoUser = [
        'id' => 999,
        'name' => 'Demo User',
        'email' => 'demo@example.com',
        'phone' => '9876543210',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode([
        'status' => 'success',
        'user' => $demoUser
    ]);
    exit;
}

// If no valid token or verification failed, return sample data
if (!$userId) {
    error_log("No valid authentication, returning sample user data");
    
    // Sample user to return
    $sampleUser = [
        'id' => 101,
        'name' => 'Sample User',
        'email' => 'sample@example.com', 
        'phone' => '1234567890',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-1 day'))
    ];
    
    echo json_encode([
        'status' => 'success',
        'user' => $sampleUser,
        'source' => 'sample_fallback'
    ]);
    exit;
}

// Try to get user from database
try {
    // Try database connection
    $conn = null;
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else {
        // Fallback to direct connection
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Query for user data
    $stmt = $conn->prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // Format user data
        $userData = [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role'],
            'createdAt' => $user['created_at']
        ];
        
        echo json_encode([
            'status' => 'success',
            'user' => $userData,
            'source' => 'database'
        ]);
    } else {
        // No user found with this ID, return error with sample data
        $sampleUser = [
            'id' => $userId,
            'name' => 'User ' . $userId,
            'email' => 'user' . $userId . '@example.com',
            'phone' => '1234567890',
            'role' => 'user',
            'createdAt' => date('Y-m-d H:i:s', strtotime('-1 day'))
        ];
        
        echo json_encode([
            'status' => 'success', 
            'user' => $sampleUser,
            'source' => 'generated_fallback',
            'message' => 'User not found in database'
        ]);
    }
} catch (Exception $e) {
    error_log("Error in user.php: " . $e->getMessage());
    
    // Return fallback user data
    $fallbackUser = [
        'id' => $userId ?? 100,
        'name' => 'Fallback User',
        'email' => 'fallback@example.com',
        'phone' => '9876543210',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode([
        'status' => 'success',
        'user' => $fallbackUser,
        'source' => 'error_fallback',
        'error' => $e->getMessage()
    ]);
}
