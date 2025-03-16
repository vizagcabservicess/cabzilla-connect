
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// Log the incoming request
logError("Login endpoint called", [
    'method' => $_SERVER['REQUEST_METHOD'], 
    'headers' => getAllHeaders(), 
    'raw_input' => file_get_contents('php://input')
]);

// Allow CORS for OPTIONS requests (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400'); // 24 hours cache for preflight
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Set cache control headers to prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');

try {
    // Get the request body
    $input = file_get_contents('php://input');
    logError("Login request received", ['raw_input' => $input]);
    
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
        logError("Database prepare failed", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
    }
    
    $stmt->bind_param("s", $email);
    $result = $stmt->execute();
    
    if (!$result) {
        logError("Database query failed", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        logError("User not found", ['email' => $email]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        logError("Password verification failed", ['email' => $email]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    // Remove password from user data
    unset($user['password']);
    
    // Generate JWT token
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    
    // Log successful login
    logError("Login successful for user", [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'token_length' => strlen($token)
    ]);
    
    // Send response with proper format
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user
    ]);
} catch (Exception $e) {
    logError('Login exception: ' . $e->getMessage(), [
        'trace' => $e->getTraceAsString(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}
