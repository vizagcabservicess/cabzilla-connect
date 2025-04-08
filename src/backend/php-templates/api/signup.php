
<?php
// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';

// Handle OPTIONS requests for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Handle GET requests gracefully - redirect to frontend signup page or show user-friendly message
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    
    // Send friendly response for direct browser access
    echo json_encode([
        'status' => 'info',
        'message' => 'This is the signup API endpoint. Please use the frontend application to create an account.',
        'redirect' => '/'
    ]);
    exit;
}

// Allow only POST requests for actual signup
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
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
