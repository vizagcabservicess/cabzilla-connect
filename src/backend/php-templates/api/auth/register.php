<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

$required = ['name', 'email', 'password', 'phone'];
foreach ($required as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => ucfirst($field) . ' is required']);
        exit();
    }
}

// Accept role from input, default to 'guest' if not provided or invalid
$valid_roles = ['guest', 'provider', 'admin'];
$role = isset($input['role']) ? strtolower($input['role']) : 'guest';
if (!in_array($role, $valid_roles)) {
    // Map possible UI labels to valid roles
    if (strpos($role, 'guest') !== false) {
        $role = 'guest';
    } else if (strpos($role, 'provider') !== false) {
        $role = 'provider';
    } else if (strpos($role, 'admin') !== false) {
        $role = 'admin';
    } else {
        $role = 'guest';
    }
}

// Add debug logging and error display for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    $conn = getDbConnectionWithRetry();
    
    // Check if user already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("ss", $input['email'], $input['phone']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'User already exists with this email or phone']);
        exit();
    }
    
    // Hash password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Insert user with the correct role into pooling_users
    $stmt = $conn->prepare("
        INSERT INTO pooling_users (name, email, phone, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    ");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("sssss", $input['name'], $input['email'], $input['phone'], $hashedPassword, $role);
    $stmt->execute();
    $userId = $conn->insert_id;
    
    // Check if wallet already exists for this user
    $stmt = $conn->prepare("SELECT id FROM pooling_wallets WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        // Only insert if wallet does not exist
        $stmt = $conn->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, 0.00)");
        if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
    }
    
    // Fetch the created user from pooling_users
    $stmt = $conn->prepare("SELECT id, name, email, phone, role, is_active FROM pooling_users WHERE id = ?");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $user['role'] = $role; // Ensure role is set in response
    
    // Generate session token (for consistency with login)
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
    $stmt = $conn->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("iss", $userId, $token, $expiresAt);
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user' => $user,
        'token' => $token
    ]);
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed', 'details' => $e->getMessage()]);
}
?>
