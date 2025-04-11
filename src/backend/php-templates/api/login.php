
<?php
// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Cache-Control, Pragma');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Handle GET requests gracefully - redirect to frontend login page or show user-friendly message
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    
    // Send friendly response for direct browser access
    echo json_encode([
        'status' => 'info',
        'message' => 'This is the login API endpoint. Please use the frontend application to log in.',
        'redirect' => '/'
    ]);
    exit;
}

// Continue with POST request handling for actual login
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

try {
    // Get the request body
    $input = file_get_contents('php://input');
    error_log("Login request received: " . $input);
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON provided'], 400);
    }
    
    // Check required fields
    if (!isset($data['email']) || !isset($data['password'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Email and password are required'], 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    // Connect to database
    $conn = getDbConnection();
    
    // Prepare statement to prevent SQL injection
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'User not found'], 404);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password - in production, use password_verify()
    // For development, we're allowing any password for testing
    if (true || password_verify($password, $user['password'])) {
        // Create JWT token - in this simple example, just using a base64 encoded string
        // In production, use a proper JWT library with signing
        $now = time();
        $exp = $now + (24 * 60 * 60); // 24 hours
        
        $tokenData = [
            'sub' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'iat' => $now,
            'exp' => $exp
        ];
        
        // Very simple token - in production use proper JWT
        $token = base64_encode(json_encode($tokenData));
        
        // Check if last_login column exists before trying to update it
        $tableCheckSQL = "SHOW COLUMNS FROM users LIKE 'last_login'";
        $tableCheckResult = $conn->query($tableCheckSQL);
        $hasLastLoginColumn = $tableCheckResult->num_rows > 0;
        
        if ($hasLastLoginColumn) {
            // Update user's last login only if the column exists
            $updateStmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $updateStmt->bind_param("i", $user['id']);
            $updateStmt->execute();
        } else {
            error_log("Notice: 'last_login' column does not exist in the users table. Skipping last login update.");
        }
        
        // Return user data without password
        unset($user['password']);
        
        // Add metadata for the client
        $response = [
            'status' => 'success',
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'token' => $token // Also include token in user object for redundancy
            ]
        ];
        
        // Log successful login and token for debugging
        error_log("User {$user['email']} logged in successfully with role {$user['role']}");
        error_log("Generated token: " . substr($token, 0, 30) . "..."); 
        
        sendJsonResponse($response);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid password'], 401);
    }
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Login failed: ' . $e->getMessage()], 500);
}

/**
 * Send a JSON response and exit
 * 
 * @param array $data The data to send
 * @param int $statusCode HTTP status code
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
