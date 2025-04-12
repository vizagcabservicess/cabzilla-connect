
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

// Handle authentication
$headers = getallheaders();
$userId = null;
$isAdmin = false;
$token = '';

error_log("Headers received: " . json_encode($headers));

// Extract authorization header manually - handle both camel case and lowercase
$authHeader = null;
foreach($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

if ($authHeader) {
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
            // Try to extract user_id directly from token (for demo/testing)
            $tokenParts = explode('.', $token);
            if (count($tokenParts) >= 2) {
                $payload = json_decode(base64_decode($tokenParts[1]), true);
                if ($payload && isset($payload['user_id'])) {
                    $userId = $payload['user_id'];
                    $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                    error_log("Manually extracted user from token: $userId");
                }
            }
        }
    } catch (Exception $e) {
        error_log("JWT verification failed: " . $e->getMessage());
    }
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
        } else {
            error_log("Direct database connection successful");
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // For demo token, we will still return sample data
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
            'user' => $demoUser,
            'source' => 'demo'
        ]);
        exit;
    }
    
    // If no valid token or for testing purposes - attempt to query real data
    // Check if users table exists first
    $tableCheck = $conn->query("SHOW TABLES LIKE 'users'");
    if ($tableCheck && $tableCheck->num_rows > 0) {
        error_log("Users table exists, proceeding with query");
        
        // Try a simple select to get any user if userId is not set
        if (!$userId) {
            $userQuery = "SELECT id, name, email, phone, role, created_at FROM users LIMIT 1";
            $userResult = $conn->query($userQuery);
            
            if ($userResult && $userResult->num_rows > 0) {
                $userRow = $userResult->fetch_assoc();
                $userId = $userRow['id'];
                error_log("No userId in token, using first user found: " . $userId);
            } else {
                error_log("No users found in database");
            }
        }
        
        // Query for user data
        if ($userId) {
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
                error_log("Successfully returned user data from database for user ID: " . $userId);
                exit;
            } else {
                error_log("User ID $userId not found in database");
            }
        }
    } else {
        error_log("Users table does not exist in the database");
    }
    
    // If we reach here, we were unable to get user data from database
    // Return a sample user as fallback, but with a clear source indicator
    $sampleUser = [
        'id' => $userId ?? 2, // Default to ID 2 if no user ID found
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
    error_log("Returned sample user data as fallback with ID: " . ($userId ?? 2));
    
} catch (Exception $e) {
    error_log("Error in user.php: " . $e->getMessage());
    
    // Return fallback user data
    $fallbackUser = [
        'id' => $userId ?? 2, // Default to ID 2 if no user ID found
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
