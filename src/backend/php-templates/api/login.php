
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed', 'method' => $_SERVER['REQUEST_METHOD']], 405);
}

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

try {
    // Log request details for debugging
    logError("Login endpoint accessed", [
        'method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'none'
    ]);
    
    // Get the request body
    $input = file_get_contents('php://input');
    logError("Login request received", ['input' => $input]);
    
    $data = json_decode($input, true);
    
    // Validate input
    if (!isset($data['email']) || !isset($data['password'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Email and password are required'], 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, phone, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        logError("Login failed - user not found", ['email' => $email]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        logError("Login failed - password mismatch", ['email' => $email]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    // Remove password from user data
    unset($user['password']);
    
    // Generate JWT token with longer expiration (14 days)
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    logError("Login successful - token generated", ['user_id' => $user['id'], 'token_length' => strlen($token)]);
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user
    ]);
} catch (Exception $e) {
    logError('Login exception: ' . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}
