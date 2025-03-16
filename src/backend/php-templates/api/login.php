
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

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
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, phone, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    // Remove password from user data
    unset($user['password']);
    
    // Generate JWT token with longer expiration
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    
    // Log successful login
    logError("Login successful", ['user_id' => $user['id'], 'token_length' => strlen($token)]);
    
    // Send consistent response structure
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
