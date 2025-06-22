<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
file_put_contents(__DIR__ . '/debug_login.log', "----\n" . date('c') . "\n", FILE_APPEND);
$rawInput = file_get_contents('php://input');
file_put_contents(__DIR__ . '/debug_login.log', "RAW: " . $rawInput . "\n", FILE_APPEND);
file_put_contents(__DIR__ . '/debug_login.log', "POST: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents(__DIR__ . '/debug_login.log', "HEADERS: " . print_r(getallheaders(), true) . "\n", FILE_APPEND);

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

// Fallback: If JSON is empty, try POST form data
if (!$input || !is_array($input)) {
    $input = $_POST;
}

// Log the final input for debugging
file_put_contents(__DIR__ . '/debug_login.log', "FINAL INPUT: " . print_r($input, true) . "\n", FILE_APPEND);

if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit();
}

try {
    $conn = getDbConnectionWithRetry();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, password_hash, role, is_active FROM pooling_users WHERE email = ?");
    $stmt->bind_param("s", $input['email']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user || !password_verify($input['password'], $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit();
    }
    
    if (!$user['is_active']) {
        http_response_code(403);
        echo json_encode(['error' => 'Account is inactive']);
        exit();
    }
    
    // Generate session token
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Store session
    $stmt = $conn->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $user['id'], $token, $expiresAt);
    $stmt->execute();
    
    // Remove password_hash from response
    unset($user['password_hash']);

    echo json_encode([
        'success' => true,
        'user' => $user,
        'token' => $token
    ]);
    
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Login failed']);
}
?>
