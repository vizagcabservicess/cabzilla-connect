
<?php
require_once '../config.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($data['email']) || !isset($data['password'])) {
    sendJsonResponse(['error' => 'Email and password are required'], 400);
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
    sendJsonResponse(['error' => 'Invalid email or password'], 401);
}

$user = $result->fetch_assoc();

// Verify password
if (!password_verify($password, $user['password'])) {
    sendJsonResponse(['error' => 'Invalid email or password'], 401);
}

// Remove password from user data
unset($user['password']);

// Generate JWT token
$token = generateJwtToken($user['id'], $user['email'], $user['role']);

// Send response
sendJsonResponse([
    'success' => true,
    'message' => 'Login successful',
    'token' => $token,
    'user' => $user
]);
