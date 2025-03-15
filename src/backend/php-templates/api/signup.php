
<?php
require_once '../config.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    // Get the request body
    $input = file_get_contents('php://input');
    logError("Signup request received", ['input' => $input]);
    
    $data = json_decode($input, true);
    
    // Validate input
    if (!isset($data['name']) || !isset($data['email']) || !isset($data['phone']) || !isset($data['password'])) {
        sendJsonResponse(['error' => 'Name, email, phone and password are required'], 400);
    }
    
    $name = $data['name'];
    $email = $data['email'];
    $phone = $data['phone'];
    $password = password_hash($data['password'], PASSWORD_BCRYPT);
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendJsonResponse(['error' => 'Email already exists'], 409);
    }
    
    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'user')");
    $stmt->bind_param("ssss", $name, $email, $phone, $password);
    
    if (!$stmt->execute()) {
        sendJsonResponse(['error' => 'Failed to create user: ' . $stmt->error], 500);
    }
    
    $userId = $conn->insert_id;
    
    // Get the created user
    $stmt = $conn->prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    // Generate JWT token
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    
    // Send response
    sendJsonResponse([
        'success' => true,
        'message' => 'User created successfully',
        'token' => $token,
        'user' => $user
    ], 201);
} catch (Exception $e) {
    logError('Signup exception: ' . $e->getMessage());
    sendJsonResponse(['error' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}
