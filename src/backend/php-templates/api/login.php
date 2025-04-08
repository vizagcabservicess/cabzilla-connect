
<?php
// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

try {
    // Get the request body
    $input = file_get_contents('php://input');
    logError("Login request received", ['input_length' => strlen($input)]);
    
    $data = json_decode($input, true);
    
    // Validate input
    if (!isset($data['email']) || !isset($data['password'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Email and password are required'], 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    logError("Login attempt", ['email' => $email]);
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, phone, password, role FROM users WHERE email = ?");
    if (!$stmt) {
        logError("Statement preparation failed", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    $stmt->bind_param("s", $email);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logError("Statement execution failed", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        exit;
    }
    
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
    
    // Generate JWT token with longer expiration (30 days)
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    logError("Login successful - token generated", [
        'user_id' => $user['id'], 
        'token_length' => strlen($token),
        'token_parts' => substr_count($token, '.') + 1
    ]);
    
    // Send response with clear status and message
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user
    ]);
} catch (Exception $e) {
    logError('Login exception: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}
